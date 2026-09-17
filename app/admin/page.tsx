import { Card } from "@/components/ui/card";
import { getStore } from "@/lib/db/store";
import { listRevalidationLogs } from "@/lib/cache/revalidate-log";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const secret = process.env.ADMIN_SECRET;
  if (secret && key !== secret) {
    return <Card>관리자 키가 필요합니다. `/admin?key=`</Card>;
  }
  const store = getStore();
  const logs = await store.listSearchLogs();
  const feedback = await store.listFeedback();
  const revalidations = await listRevalidationLogs();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">검색 로그 / 피드백</h1>
      <section>
        <h2 className="mb-3 font-medium">최근 검색</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-rule text-ink/50 border-b">
                <th className="py-2">시각</th>
                <th>질문</th>
                <th>캐시</th>
                <th>ms</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-rule/60 border-b">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {log.createdAt.slice(0, 19)}
                  </td>
                  <td className="pr-3">{log.query}</td>
                  <td>{log.cacheHit ? "Y" : ""}</td>
                  <td>{log.latencyMs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-medium">피드백</h2>
        <ul className="space-y-2 text-sm">
          {feedback.map((row) => (
            <li key={row.id} className="space-y-1">
              <p>
                {row.rating === "up" ? "도움됨" : "도움되지 않음"} · {row.query}
              </p>
              {row.comment ? (
                <p className="text-muted text-xs whitespace-pre-wrap">{row.comment}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 font-medium">페이지 재검증</h2>
        {revalidations.length === 0 ? (
          <p className="text-muted text-sm">아직 온디맨드 재검증 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-rule text-ink/50 border-b">
                  <th className="py-2">시각</th>
                  <th>이유</th>
                  <th>경로</th>
                </tr>
              </thead>
              <tbody>
                {revalidations.map((row) => (
                  <tr key={row.id} className="border-rule/60 border-b align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {row.createdAt.slice(0, 19)}
                    </td>
                    <td className="pr-3">{row.reason}</td>
                    <td className="text-ink/70">
                      {row.paths.join(", ")}
                      {row.documentIds.length
                        ? ` · 문서 ${row.documentIds.join(", ")}`
                        : ""}
                      {row.statuteIds.length
                        ? ` · 법령 ${row.statuteIds.join(", ")}`
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
