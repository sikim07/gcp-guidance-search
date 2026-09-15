"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { PRESET_QUERIES } from "@/lib/search/presets";
import type { SearchResponse } from "@/lib/types";

type Tab = "answer" | "original" | "translation";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [tab, setTab] = useState<Tab>("answer");
  const [translations, setTranslations] = useState<Record<string, string> | null>(null);
  const [translateNote, setTranslateNote] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  async function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;
    setQuery(nextQuery);
    setLoading(true);
    setError(null);
    setTab("answer");
    setTranslations(null);
    setTranslateNote(null);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const body = (await response.json()) as SearchResponse & { error?: string };
      if (!response.ok) {
        setError(body.error ?? "검색에 실패했습니다.");
        setResult(null);
        return;
      }
      setResult(body);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await runSearch(query);
  }

  async function openTab(next: Tab) {
    setTab(next);
    if (next !== "translation" || !result || translations) return;
    setTranslating(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passages: result.passages }),
      });
      const body = (await response.json()) as {
        translations?: Record<string, string>;
        missingKey?: boolean;
        error?: string;
      };
      if (!response.ok) {
        setTranslateNote(body.error ?? "번역에 실패했습니다.");
        return;
      }
      setTranslations(body.translations ?? {});
      if (body.missingKey) {
        setTranslateNote(
          "모델 키가 없어 영어 원문을 그대로 둡니다. 한국어 조문은 원문과 같습니다.",
        );
      }
    } catch {
      setTranslateNote("번역 요청 중 네트워크 오류가 났습니다.");
    } finally {
      setTranslating(false);
    }
  }

  async function sendFeedback(rating: "up" | "down") {
    if (!result) return;
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchLogId: result.searchLogId,
        query,
        answer: result.answer,
        rating,
      }),
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3">
        <h1 className="font-display text-ink text-2xl">규정 조항을 자연어로 묻습니다</h1>
        <label htmlFor="query" className="sr-only">
          규정 조항을 자연어로 묻습니다
        </label>
        <Textarea
          id="query"
          name="query"
          placeholder="예: 전자기록 감사추적은 어떤 항목을 남겨야 하나?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2" data-testid="preset-list">
          {PRESET_QUERIES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              data-testid={`preset-${preset.id}`}
              className="border-rule text-ink/80 hover:border-ink hover:text-ink bg-paper rounded-full border px-3 py-1 text-xs"
              onClick={() => void runSearch(preset.query)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "조항을 찾는 중…" : "검색"}
          </Button>
          <p className="text-ink/50 text-xs">IP당 하루 20건 · 공식본이 아닙니다</p>
        </div>
      </form>

      {error ? (
        <Card className="border-seal/40 text-seal" role="alert">
          {error}
        </Card>
      ) : null}

      {loading ? (
        <Card className="text-ink/50 animate-pulse">관련 조항을 대조하는 중입니다.</Card>
      ) : null}

      {result ? (
        <Card data-testid="answer-card">
          <div className="border-rule mb-4 flex gap-1 border-b pb-2">
            {(
              [
                ["answer", "답변"],
                ["original", "원문"],
                ["translation", "번역"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                data-testid={`tab-${id}`}
                className={
                  tab === id
                    ? "text-seal border-seal border-b-2 px-3 py-1 text-sm"
                    : "text-ink/50 px-3 py-1 text-sm"
                }
                onClick={() => void openTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "answer" ? (
            <p className="text-ink text-sm leading-7 whitespace-pre-wrap">
              {result.answer}
            </p>
          ) : null}
          {tab === "original" ? (
            <PassageList
              passages={result.passages}
              textFor={(p) => p.original}
              empty="적재된 조항 원문이 없습니다."
            />
          ) : null}
          {tab === "translation" ? (
            translating ? (
              <p className="text-ink/50 text-sm">번역하는 중…</p>
            ) : (
              <>
                {translateNote ? (
                  <p className="text-ink/50 mb-3 text-xs">{translateNote}</p>
                ) : null}
                <PassageList
                  passages={result.passages}
                  textFor={(p) => translations?.[p.chunkId] ?? p.original}
                  empty="번역할 조항이 없습니다."
                />
              </>
            )
          ) : null}
          {result.cacheHit ? (
            <p className="text-ink/40 mt-3 text-xs">캐시된 답변을 재사용했습니다.</p>
          ) : null}
          <ul className="border-rule mt-4 space-y-2 border-t pt-3">
            {result.sources.map((source) => (
              <li key={`${source.url}-${source.section}`} className="text-sm">
                <span
                  className={
                    source.kind === "statute"
                      ? "border-fda/30 bg-fda/10 text-fda mr-2 inline-flex rounded-full border px-2 py-0.5 text-[10px]"
                      : "border-kgcp/30 bg-kgcp/10 text-kgcp mr-2 inline-flex rounded-full border px-2 py-0.5 text-[10px]"
                  }
                >
                  {source.kind === "statute" ? "법령" : "가이드라인"}
                </span>
                <a
                  href={source.url}
                  className="text-fda underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.title}
                </a>
                <span className="text-ink/60"> · {source.section}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="feedback-up"
              onClick={() => sendFeedback("up")}
            >
              <ThumbsUp className="size-4" /> 도움됨
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="feedback-down"
              onClick={() => sendFeedback("down")}
            >
              <ThumbsDown className="size-4" /> 아님
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function PassageList({
  passages,
  textFor,
  empty,
}: {
  passages: SearchResponse["passages"];
  textFor: (passage: SearchResponse["passages"][number]) => string;
  empty: string;
}) {
  if (!passages?.length) {
    return <p className="text-ink/50 text-sm">{empty}</p>;
  }
  return (
    <ol className="space-y-4">
      {passages.map((passage) => (
        <li key={passage.chunkId}>
          <p className="text-ink/50 text-xs">
            {passage.kind === "statute" ? "법령" : "가이드라인"} · {passage.title} ·{" "}
            {passage.section}
          </p>
          <p className="text-ink mt-1 text-sm leading-7 whitespace-pre-wrap">
            {textFor(passage)}
          </p>
        </li>
      ))}
    </ol>
  );
}
