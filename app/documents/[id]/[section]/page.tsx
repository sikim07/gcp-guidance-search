import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/db/store";
import {
  clauseHref,
  clausePageDescription,
  clausePageTitle,
  decodeClauseSection,
} from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";
import { humanizeChangeSummary } from "@/lib/text/change-copy";
import { readableText } from "@/lib/text/readable";
import { sourceLabel } from "@/lib/utils";
import { clauseStaticParams } from "@/lib/cache/static-params";

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return clauseStaticParams();
}

async function loadClause(id: string, rawSection: string) {
  const section = decodeClauseSection(rawSection);
  const store = await getStore();
  const doc = await store.getDocument(id);
  if (doc) {
    const chunk = (await store.currentChunks()).find(
      (row) => row.documentId === id && row.section === section,
    );
    if (!chunk) return null;
    const versions = await store.listVersions(id);
    return {
      kind: "guideline" as const,
      title: doc.title,
      section: chunk.section,
      text: chunk.text,
      url: doc.url,
      sourceLabel: sourceLabel(doc.source),
      issuedDate: doc.issuedDate,
      currentMst: null as string | null,
      effectiveDate: null as string | null,
      promulgatedDate: null as string | null,
      versions: versions.map((version) => ({
        id: version.id,
        label: version.versionLabel,
        current: version.id === doc.currentVersionId,
        summary: version.diffSummary,
      })),
    };
  }
  const statute = await store.getStatute(id);
  if (!statute) return null;
  const article = (await store.currentStatuteArticles()).find(
    (row) => row.statuteId === id && row.section === section,
  );
  if (!article) return null;
  const revisions = await store.listStatuteRevisions(statute.id);
  return {
    kind: "statute" as const,
    title: statute.title,
    section: article.section,
    text: article.text,
    url: statute.url,
    sourceLabel: sourceLabel("statute"),
    issuedDate: null as string | null,
    currentMst: statute.currentMst,
    effectiveDate: statute.effectiveDate,
    promulgatedDate: statute.promulgatedDate,
    versions: revisions.map((version) => ({
      id: version.id,
      label: version.promulgatedDate ?? version.mst,
      current: version.id === statute.currentRevisionId,
      summary: version.diffSummary,
    })),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; section: string }>;
}): Promise<Metadata> {
  const { id, section } = await params;
  const clause = await loadClause(id, section);
  if (!clause) {
    return { title: "조항", robots: { index: false, follow: true } };
  }
  const title = clausePageTitle(clause.title, clause.section);
  return {
    title: { absolute: `${title} — ${SITE_NAME}` },
    description: clausePageDescription(clause.title, clause.section, clause.text),
    alternates: { canonical: clauseHref(id, clause.section) },
  };
}

export default async function ClausePage({
  params,
}: {
  params: Promise<{ id: string; section: string }>;
}) {
  const { id, section } = await params;
  const clause = await loadClause(id, section);
  if (!clause) notFound();

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-ink/50 text-xs tracking-wide uppercase">
          {clause.sourceLabel}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {clausePageTitle(clause.title, clause.section)}
        </h1>
        <p className="text-muted text-sm">
          {clause.title} · {clause.section}
        </p>
        {clause.kind === "guideline" ? (
          <p className="text-ink/50 text-xs">발행 {clause.issuedDate ?? "미상"}</p>
        ) : (
          <p className="text-ink/50 text-xs">
            공포번호 {clause.currentMst}
            {clause.promulgatedDate ? ` · 공포 ${clause.promulgatedDate}` : ""}
            {clause.effectiveDate ? ` · 시행 ${clause.effectiveDate}` : ""}
          </p>
        )}
        <p className="flex flex-wrap gap-3 text-sm">
          <Link href={`/documents/${id}`} className="underline">
            문서 목록으로
          </Link>
          <a
            href={clause.url}
            className="text-fda underline"
            target="_blank"
            rel="noreferrer"
          >
            공식 원문
          </a>
        </p>
      </header>
      <section aria-labelledby="clause-body-heading" className="space-y-2">
        <h2 id="clause-body-heading" className="text-lg font-semibold">
          조항 원문
        </h2>
        <pre className="font-sans text-sm leading-7 whitespace-pre-wrap">
          {readableText(clause.text)}
        </pre>
        <p className="text-ink/50 text-xs">
          이 페이지는 적재된 청크를 그대로 보여 줍니다. 공식 해석이 아니며 원문 링크를
          확인하세요.
        </p>
      </section>
      <section aria-labelledby="clause-history-heading" className="space-y-2">
        <h2 id="clause-history-heading" className="text-lg font-semibold">
          개정 이력
        </h2>
        <ol className="space-y-2">
          {clause.versions.map((version) => (
            <li key={version.id} className="text-sm leading-6">
              <span className="font-medium">
                {version.current ? "현행" : "이전 본"} · {version.label}
              </span>
              {version.summary ? (
                <span className="text-ink/70">
                  {" "}
                  — {humanizeChangeSummary(version.summary)}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
