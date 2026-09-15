import { Card } from "@/components/ui/card";
import { SourceChip } from "@/components/source-chip";
import { getStore } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  const store = await getStore();
  const logs = await store.listChangeLogs();
  const documents = await store.listDocuments();
  const byId = new Map(documents.map((d) => [d.id, d]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">개정 피드</h1>
        <p className="mt-2 text-sm text-ink/70">
          카탈로그 비교, 고시일, SHA-256 해시로 감지한 신규·개정·철회입니다.
        </p>
      </div>
      {logs.length === 0 ? (
        <Card>아직 감지된 개정이 없습니다. 시드 코퍼스가 적재되면 초기 적재 로그가 나타납니다.</Card>
      ) : (
        <ol className="space-y-3">
          {logs.map((log) => {
            const doc = byId.get(log.documentId);
            return (
              <li key={log.id}>
                <Card className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {doc ? <SourceChip source={doc.source} /> : null}
                      <span className="text-xs uppercase tracking-wide text-seal">{log.changeKind}</span>
                    </div>
                    <p className="font-medium">{doc?.title ?? log.documentId}</p>
                    <p className="mt-1 text-sm text-ink/70">{log.summary}</p>
                  </div>
                  <time className="text-xs text-ink/50">{log.createdAt.slice(0, 10)}</time>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
