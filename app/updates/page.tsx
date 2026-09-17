import type { Metadata } from "next";
import type { ChangeKind } from "@/lib/types";
import {
  collapseRepeatedFeedItems,
  feedKindLabel,
  humanizeChangeSummary,
} from "@/lib/text/change-copy";
import { SourceBadge } from "@/components/source-badge";
import { StaticCard } from "@/components/static-card";
import { getStore } from "@/lib/db/store";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "개정 피드",
  description:
    "FDA·ICH 가이드라인 발행일·파일 해시와 한국 법령 MST·공포일로 임상시험 규정 개정을 기록합니다.",
  alternates: { canonical: "/updates" },
};

export default async function UpdatesPage() {
  const store = await getStore();
  const logs = collapseRepeatedFeedItems(await store.listChangeLogs());
  const documents = await store.listDocuments();
  const statutes = await store.listStatutes();
  const byId = new Map(documents.map((d) => [d.id, d]));
  const statutesById = new Map(statutes.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">개정 피드</h1>
        <p className="text-muted mt-2 text-sm leading-6">
          가이드라인은 발행일과 파일 내용으로, 법령은 공포·시행일과 법령번호로 개정을
          남깁니다.
        </p>
      </div>
      {logs.length === 0 ? (
        <StaticCard>
          아직 감지된 개정이 없습니다. 시드 문서가 적재되면 초기 적재 기록이 나타납니다.
        </StaticCard>
      ) : (
        <ol className="space-y-3">
          {logs.map((log) => {
            const doc = byId.get(log.documentId);
            const statute = statutesById.get(log.documentId);
            const title = doc?.title ?? statute?.title ?? log.documentId;
            const source = doc?.source ?? (statute ? "statute" : undefined);
            return (
              <li key={log.id}>
                <StaticCard className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {source ? <SourceBadge source={source} /> : null}
                      <span className="text-seal text-xs">
                        {feedKindLabel(log.changeKind as ChangeKind, log.summary)}
                      </span>
                    </div>
                    <p className="font-medium">{title}</p>
                    <p className="text-ink/70 mt-1 text-sm leading-6">
                      {humanizeChangeSummary(log.summary)}
                    </p>
                  </div>
                  <time className="text-ink/50 text-xs">
                    {log.createdAt.slice(0, 10)}
                  </time>
                </StaticCard>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
