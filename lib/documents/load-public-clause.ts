import { readPublicStore } from "@/lib/cache/public-catalog";
import {
  humanizeChangeSummary,
  publicDocumentVersions,
} from "@/lib/text/change-copy";
import { decodeClauseSection } from "@/lib/seo";
import { sourceLabel } from "@/lib/utils";

export type PublicClauseDetail = {
  kind: "guideline" | "statute";
  title: string;
  section: string;
  text: string;
  url: string;
  sourceLabel: string;
  issuedDate: string | null;
  currentMst: string | null;
  effectiveDate: string | null;
  promulgatedDate: string | null;
  versions: Array<{
    id: string;
    label: string;
    current: boolean;
    summary: string | null;
  }>;
};

export async function loadPublicClause(
  id: string,
  rawSection: string,
): Promise<PublicClauseDetail | null> {
  const section = decodeClauseSection(rawSection);
  return readPublicStore(async (store) => {
    const doc = await store.getDocument(id);
    if (doc) {
      const chunk = (await store.listCurrentChunksByDocument(id)).find(
        (row) => row.section === section,
      );
      if (!chunk) return null;
      const versions = publicDocumentVersions(
        await store.listVersions(id),
        doc.currentVersionId,
      );
      return {
        kind: "guideline" as const,
        title: doc.title,
        section: chunk.section,
        text: chunk.text,
        url: doc.url,
        sourceLabel: sourceLabel(doc.source),
        issuedDate: doc.issuedDate,
        currentMst: null,
        effectiveDate: null,
        promulgatedDate: null,
        versions: versions.map((version) => ({
          id: version.id,
          label: version.versionLabel,
          current: version.id === doc.currentVersionId,
          summary: version.diffSummary,
        })),
      };
    }
    const statute = await store.getStatute(id);
    if (!statute) return null;
    const article = (await store.listCurrentArticlesByStatute(id)).find(
      (row) => row.section === section,
    );
    if (!article) return null;
    const revisions = await store.listStatuteRevisions(statute.id);
    return {
      kind: "statute" as const,
      title: statute.title,
      section: article.section,
      text: article.text,
      url: statute.url,
      sourceLabel: sourceLabel("statute"),
      issuedDate: null,
      currentMst: statute.currentMst,
      effectiveDate: statute.effectiveDate,
      promulgatedDate: statute.promulgatedDate,
      versions: revisions.map((version) => ({
        id: version.id,
        label: version.promulgatedDate ?? version.mst,
        current: version.id === statute.currentRevisionId,
        summary: version.diffSummary,
      })),
    };
  });
}

export { humanizeChangeSummary };
