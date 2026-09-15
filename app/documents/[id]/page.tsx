import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SourceChip } from "@/components/source-chip";
import { getStore } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await getStore();
  const doc = await store.getDocument(id);
  if (!doc) notFound();
  const versions = await store.listVersions(id);

  return (
    <div className="space-y-6">
      <div>
        <SourceChip source={doc.source} />
        <h1 className="mt-3 font-display text-3xl">{doc.title}</h1>
        <a href={doc.url} className="mt-2 inline-block text-sm text-fda underline" target="_blank" rel="noreferrer">
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
              <p className="mt-1 text-sm text-ink/70">{version.diffSummary}</p>
              <p className="mt-2 text-xs text-ink/40">{version.fileHash}</p>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
