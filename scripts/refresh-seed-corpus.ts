/**
 * Fetch official E6(R2) PDF and 별표 4 JSON through the existing pipeline
 * and write extracted text. Do not paste clause text by hand.
 *
 *   npx tsx scripts/refresh-seed-corpus.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fetchBytes } from "@/lib/pipeline/fetch";
import { extractPdfText } from "@/lib/pipeline/parse-pdf";
import { fetchLawBody, fetchLawSearch } from "@/lib/pipeline/law-client";
import { articlesFromLawBody, pickExactLaw } from "@/lib/pipeline/sources/law-parser";
import { chunkByClause } from "@/lib/pipeline/chunk";

function loadLocalEnv() {
  try {
    const text = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq);
      let value = trimmed.slice(eq + 1);
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

const OUT_DIR = path.join(process.cwd(), "lib/pipeline/seed/extracted");
const E6_PDF_CANDIDATES = [
  "https://www.fda.gov/media/93884/download",
  "https://database.ich.org/sites/default/files/E6_R2_Addendum.pdf",
  "https://database.ich.org/sites/default/files/E6_R2_Guideline.pdf",
];

async function fetchFirstPdf(urls: string[]): Promise<{ url: string; bytes: Buffer }> {
  const errors: string[] = [];
  for (const url of urls) {
    try {
      const bytes = await fetchBytes(url);
      if (bytes.length < 50_000) {
        errors.push(`${url} too small (${bytes.length} bytes)`);
        continue;
      }
      return { url, bytes };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`E6(R2) PDF fetch failed:\n${errors.join("\n")}`);
}

async function writeE6(): Promise<void> {
  const { url, bytes } = await fetchFirstPdf(E6_PDF_CANDIDATES);
  console.info(`E6(R2) fetched from ${url} (${bytes.length} bytes)`);
  const text = await extractPdfText(bytes);
  if (text.trim().length < 20_000) {
    throw new Error(`E6(R2) extract too short (${text.length} chars)`);
  }
  await writeFile(path.join(OUT_DIR, "e6-r2.txt"), `${text.trim()}\n`, "utf8");
  await writeFile(
    path.join(OUT_DIR, "e6-r2.meta.json"),
    `${JSON.stringify({ sourceUrl: url, bytes: bytes.length, chars: text.length }, null, 2)}\n`,
    "utf8",
  );
  const sections = chunkByClause(text, "E6(R2)");
  console.info(`e6-r2.txt ${text.length} chars, ${sections.length} clauses`);
  console.info(
    "sample sections",
    sections
      .map((c) => c.section)
      .filter((s) => /^(4\.8|5\.5|5\.18|8\.)/.test(s))
      .slice(0, 20),
  );
}

async function writeKgcpAnnex(): Promise<void> {
  const list = await fetchLawSearch("의약품 등의 안전에 관한 규칙");
  const hit = pickExactLaw(list, "의약품 등의 안전에 관한 규칙");
  if (!hit)
    throw new Error("법령 목록에서 의약품 등의 안전에 관한 규칙을 찾지 못했습니다");
  const body = await fetchLawBody(hit.lawId);
  const articles = articlesFromLawBody(body, {
    includeAnnexTitle: "의약품 임상시험 관리기준",
  });
  const annex = articles.find((row) => row.kind === "annex");
  if (!annex || annex.text.length < 4_000) {
    throw new Error(`별표 4 extract too short (${annex?.text.length ?? 0} chars)`);
  }
  await writeFile(
    path.join(OUT_DIR, "kgcp-annex-4.txt"),
    `${annex.text.trim()}\n`,
    "utf8",
  );
  const meta = {
    lawId: hit.lawId,
    mst: hit.mst,
    title: hit.title,
    promulgatedDate: hit.promulgatedDate,
    effectiveDate: hit.effectiveDate,
    amendmentType: hit.amendmentType,
    articleKey: annex.articleKey,
    section: annex.section,
  };
  await writeFile(
    path.join(OUT_DIR, "kgcp-annex-4.meta.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf8",
  );
  const sections = chunkByClause(annex.text, annex.section);
  console.info(`kgcp-annex-4.txt ${annex.text.length} chars, ${sections.length} clauses`);
  console.info("sample sections", sections.map((c) => c.section).slice(0, 24));
}

async function main() {
  loadLocalEnv();
  await mkdir(OUT_DIR, { recursive: true });
  await writeE6();
  await writeKgcpAnnex();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
