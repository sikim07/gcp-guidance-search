import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SourceChip } from "@/components/source-chip";
import { getStore } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const store = await getStore();
  const documents = await store.listDocuments();
  const statutes = await store.listStatutes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">문서 카탈로그</h1>
        <p className="text-ink/70 mt-2 text-sm">
          가이드라인은 발행일·해시, 법령은 MST·공포일·시행일로 현행을 표시합니다.
        </p>
      </div>
      {documents.length === 0 && statutes.length === 0 ? (
        <Card>적재된 문서가 없습니다.</Card>
      ) : (
        <ul className="space-y-3">
          {statutes.map((row) => (
            <li key={row.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-2">
                  <SourceChip source="statute" />
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
              </Card>
            </li>
          ))}
          {documents.map((doc) => (
            <li key={doc.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-2">
                  <SourceChip source={doc.source} />
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
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
