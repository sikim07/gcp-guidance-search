import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SourceChip } from "@/components/source-chip";
import { getStore } from "@/lib/db/store";
import { humanizeChangeSummary } from "@/lib/text/change-copy";

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await getStore();
  const doc = await store.getDocument(id);
  const statute = doc ? undefined : await store.getStatute(id);
  if (!doc && !statute) notFound();

  if (statute) {
    const revisions = await store.listStatuteRevisions(statute.id);
    return (
      <div className="space-y-6">
        <div>
          <SourceChip source="statute" />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {statute.title}
          </h1>
          <a
            href={statute.url}
            className="text-fda mt-2 inline-block text-sm underline"
            target="_blank"
            rel="noreferrer"
          >
            공식 원문
          </a>
          <p className="text-ink/50 mt-2 text-xs">
            공포 {statute.promulgatedDate ?? "미상"} · 시행{" "}
            {statute.effectiveDate ?? "미상"} · MST {statute.currentMst}
            {statute.amendmentType ? ` · ${statute.amendmentType}` : ""}
          </p>
        </div>
        <ol className="space-y-3">
          {revisions.map((version) => (
            <li key={version.id}>
              <Card>
                <p className="text-sm font-medium">
                  {version.id === statute.currentRevisionId ? "현행" : "이전 본"}
                  {version.promulgatedDate ? ` · 공포 ${version.promulgatedDate}` : ""}
                </p>
                <p className="text-ink/70 mt-1 text-sm leading-6">
                  {humanizeChangeSummary(version.diffSummary ?? "")}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (!doc) notFound();
  const versions = await store.listVersions(id);

  return (
    <div className="space-y-6">
      <div>
        <SourceChip source={doc.source} />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          {doc.title}
        </h1>
        <a
          href={doc.url}
          className="text-fda mt-2 inline-block text-sm underline"
          target="_blank"
          rel="noreferrer"
        >
          공식 원문
        </a>
      </div>
      <ol className="space-y-3">
        {versions.map((version) => (
          <li key={version.id}>
            <Card>
              <p className="text-sm font-medium">
                {version.versionLabel}
                {version.id === doc.currentVersionId ? " · 현행" : ""}
              </p>
              <p className="text-ink/70 mt-1 text-sm leading-6">
                {humanizeChangeSummary(version.diffSummary ?? "")}
              </p>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
