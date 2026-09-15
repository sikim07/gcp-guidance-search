#!/usr/bin/env node
/**
 * Claude Code Stop hook.
 * Sends the session git diff to Gemini or GPT and blocks stop when the review
 * finds a serious issue: { "decision": "block", "reason": "..." }
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const LOG = path.join(ROOT, ".claude", "review-log.jsonl");
const STATE = path.join(ROOT, ".claude", "review-state.json");
const MAX_BLOCKS = 3;
const REVIEW_PROMPT =
  "이 코드 변경사항에 버그, 타입 불일치, 놓친 엣지케이스가 있는지 검토해줘. " +
  "심각하면 첫 줄에 SEVERITY: high 를 쓰고 이유를 한국어 또는 영어로 짧게 적는다. " +
  "문제 없거나 경미하면 첫 줄에 SEVERITY: none 이라고만 적는다. " +
  "파이프라인이 검색 UI보다 우선이며, pgvector/벡터DB를 도입하면 high로 본다.";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function gitDiff() {
  const tracked = execSync("git diff HEAD", { cwd: ROOT, encoding: "utf8" });
  const untracked = execSync("git ls-files --others --exclude-standard", {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const extras = [];
  for (const file of untracked.slice(0, 30)) {
    if (file.startsWith(".data/") || file.startsWith("node_modules/")) continue;
    try {
      const body = readFileSync(path.join(ROOT, file), "utf8").slice(0, 8000);
      extras.push(`--- /dev/null\n+++ b/${file}\n${body}`);
    } catch {
      extras.push(`--- /dev/null\n+++ b/${file}\n[binary or unreadable]`);
    }
  }
  return `${tracked}\n${extras.join("\n")}`.trim();
}

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE, "utf8"));
  } catch {
    return { fingerprint: "", blocks: 0 };
  }
}

function saveState(state) {
  mkdirSync(path.dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify(state, null, 2));
}

function logRow(row) {
  mkdirSync(path.dirname(LOG), { recursive: true });
  appendFileSync(LOG, `${JSON.stringify({ ts: new Date().toISOString(), ...row })}\n`);
}

async function reviewWithGemini(diff) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const model = process.env.STOP_REVIEW_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${REVIEW_PROMPT}\n\n<diff>\n${diff.slice(0, 80_000)}\n</diff>` }] }],
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") ?? "";
}

async function reviewWithOpenAI(diff) {
  const key = process.env.STOP_REVIEW_OPENAI_KEY || process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI review key missing");
  const model = process.env.STOP_REVIEW_MODEL || "gpt-4o";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: REVIEW_PROMPT },
        { role: "user", content: diff.slice(0, 80_000) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

function isHigh(text) {
  return /SEVERITY:\s*high/i.test(text) || /decision["']?\s*:\s*["']block["']/i.test(text);
}

async function main() {
  const hookInput = readStdin();
  let parsed = {};
  try {
    parsed = hookInput ? JSON.parse(hookInput) : {};
  } catch {
    parsed = {};
  }
  void parsed;

  const diff = gitDiff();
  if (!diff) {
    logRow({ event: "skip", reason: "empty-diff" });
    return;
  }

  const fingerprint = createHash("sha256").update(diff).digest("hex");
  const state = loadState();
  if (state.fingerprint === fingerprint && state.blocks >= MAX_BLOCKS) {
    logRow({ event: "pass", reason: "max-blocks", fingerprint });
    return;
  }

  const provider = (process.env.STOP_REVIEW_PROVIDER || "gemini").toLowerCase();
  let text = "";
  try {
    text =
      provider === "openai" || provider === "gpt" || provider === "gpt-4"
        ? await reviewWithOpenAI(diff)
        : await reviewWithGemini(diff);
  } catch (error) {
    logRow({
      event: "error-pass",
      reason: error instanceof Error ? error.message : "review failed",
      home: homedir(),
    });
    return;
  }

  logRow({ event: "review", provider, fingerprint, excerpt: text.slice(0, 1500) });

  if (isHigh(text)) {
    saveState({ fingerprint, blocks: (state.fingerprint === fingerprint ? state.blocks : 0) + 1 });
    process.stdout.write(
      JSON.stringify({
        decision: "block",
        reason: text.slice(0, 1200),
      }),
    );
    process.exit(0);
  }

  saveState({ fingerprint, blocks: 0 });
}

main().catch((error) => {
  logRow({ event: "crash-pass", reason: String(error) });
});
