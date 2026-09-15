import { Card } from "@/components/ui/card";
import { getStore } from "@/lib/db/store";

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
  const store = await getStore();
  const logs = await store.listSearchLogs();
  const feedback = await store.listFeedback();

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
            <li key={row.id}>
              {row.rating} · {row.query}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
