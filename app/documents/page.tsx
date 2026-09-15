import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SourceChip } from "@/components/source-chip";
import { getStore } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const store = await getStore();
  const documents = await store.listDocuments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">문서 카탈로그</h1>
        <p className="mt-2 text-sm text-ink/70">현행 버전 해시와 발행일을 함께 둡니다.</p>
      </div>
      {documents.length === 0 ? (
        <Card>적재된 문서가 없습니다.</Card>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-2">
                  <SourceChip source={doc.source} />
                  <span className="text-xs text-ink/50">{doc.status}</span>
                </div>
                <Link href={`/documents/${doc.id}`} className="mt-2 block font-medium hover:underline">
                  {doc.title}
                </Link>
                <p className="mt-1 text-xs text-ink/50">
                  발행 {doc.issuedDate ?? "미상"} · hash {(doc.fileHash ?? "").slice(0, 12)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
