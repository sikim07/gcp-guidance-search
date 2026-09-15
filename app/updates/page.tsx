import { Card } from "@/components/ui/card";
import { SourceChip } from "@/components/source-chip";
import { getStore } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  const store = await getStore();
  const logs = await store.listChangeLogs();
  const documents = await store.listDocuments();
  const statutes = await store.listStatutes();
  const byId = new Map(documents.map((d) => [d.id, d]));
  const statutesById = new Map(statutes.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">개정 피드</h1>
        <p className="text-ink/70 mt-2 text-sm">
          카탈로그 비교, 고시일, SHA-256 해시, 그리고 법령은 MST·공포일·시행일로 감지한
          신규·개정·철회입니다.
        </p>
      </div>
      {logs.length === 0 ? (
        <Card>
          아직 감지된 개정이 없습니다. 시드 코퍼스가 적재되면 초기 적재 로그가 나타납니다.
        </Card>
      ) : (
        <ol className="space-y-3">
          {logs.map((log) => {
            const doc = byId.get(log.documentId);
            const statute = statutesById.get(log.documentId);
            const title = doc?.title ?? statute?.title ?? log.documentId;
            const source = doc?.source ?? (statute ? "statute" : undefined);
            return (
              <li key={log.id}>
                <Card className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {source ? <SourceChip source={source} /> : null}
                      <span className="text-seal text-xs tracking-wide uppercase">
                        {log.changeKind}
                      </span>
                    </div>
                    <p className="font-medium">{title}</p>
                    <p className="text-ink/70 mt-1 text-sm">{log.summary}</p>
                  </div>
                  <time className="text-ink/50 text-xs">
                    {log.createdAt.slice(0, 10)}
                  </time>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
