import type { Metadata } from "next";
import Link from "next/link";
import { SourceBadge } from "@/components/source-badge";
import { StaticCard } from "@/components/static-card";
import { getStore } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "문서 카탈로그",
  description:
    "적재된 ICH E6, Part 11, eSource, 식약처 ICH GCP 안내서, KGCP와 관련 법령 목록입니다.",
  alternates: { canonical: "/documents" },
};

export default async function DocumentsPage() {
  const store = await getStore();
  const documents = await store.listDocuments();
  const statutes = await store.listStatutes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          문서 카탈로그
        </h1>
        <p className="text-muted mt-2 text-sm leading-6">
          가이드라인은 발행일·해시, 법령은 MST·공포일·시행일로 현행을 표시합니다.
        </p>
      </div>
      {documents.length === 0 && statutes.length === 0 ? (
        <StaticCard>적재된 문서가 없습니다.</StaticCard>
      ) : (
        <ul className="space-y-3">
          {statutes.map((row) => (
            <li key={row.id}>
              <StaticCard>
                <div className="flex flex-wrap items-center gap-2">
                  <SourceBadge source="statute" />
                  <span className="text-ink/50 text-xs">{row.status}</span>
                </div>
                <Link
                  href={`/documents/${row.id}`}
                  className="mt-2 block font-medium hover:underline"
                >
                  {row.title}
                </Link>
                <p className="text-ink/50 mt-1 text-xs">
                  공포 {row.promulgatedDate ?? "미상"} · 시행{" "}
                  {row.effectiveDate ?? "미상"} · MST {row.currentMst}
                </p>
              </StaticCard>
            </li>
          ))}
          {documents.map((doc) => (
            <li key={doc.id}>
              <StaticCard>
                <div className="flex flex-wrap items-center gap-2">
                  <SourceBadge source={doc.source} />
                  <span className="text-ink/50 text-xs">{doc.status}</span>
                </div>
                <Link
                  href={`/documents/${doc.id}`}
                  className="mt-2 block font-medium hover:underline"
                >
                  {doc.title}
                </Link>
                <p className="text-ink/50 mt-1 text-xs">
                  발행 {doc.issuedDate ?? "미상"} · hash{" "}
                  {(doc.fileHash ?? "").slice(0, 12)}
                </p>
              </StaticCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
