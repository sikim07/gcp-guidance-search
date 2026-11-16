import { readPublicStore } from "@/lib/cache/public-catalog";
import {
  humanizeChangeSummary,
  publicDocumentVersions,
} from "@/lib/text/change-copy";
import type {
  ChunkRecord,
  DocumentRecord,
  DocumentVersion,
  StatuteArticle,
  StatuteRecord,
} from "@/lib/types";

export type PublicGuidelineDetail = {
  kind: "guideline";
  doc: DocumentRecord;
  versions: DocumentVersion[];
  chunks: ChunkRecord[];
};

export type PublicStatuteDetail = {
  kind: "statute";
  statute: StatuteRecord;
  revisions: Array<{
    id: string;
    promulgatedDate: string | null;
    diffSummary: string | null;
    current: boolean;
    summaryLabel: string;
  }>;
  articles: StatuteArticle[];
};

export type PublicDocumentDetail =
  | PublicGuidelineDetail
  | PublicStatuteDetail
  | null;

/** Load document or statute detail through the public store (seed on build / DB lock). */
export async function loadPublicDocumentDetail(
  id: string,
): Promise<PublicDocumentDetail> {
  return readPublicStore(async (store) => {
    const doc = await store.getDocument(id);
    if (doc) {
      const versions = publicDocumentVersions(
        await store.listVersions(id),
        doc.currentVersionId,
      );
      const chunks = await store.listCurrentChunksByDocument(doc.id);
      return { kind: "guideline" as const, doc, versions, chunks };
    }
    const statute = await store.getStatute(id);
    if (!statute) return null;
    const revisions = (await store.listStatuteRevisions(statute.id)).map(
      (version) => ({
        id: version.id,
        promulgatedDate: version.promulgatedDate,
        diffSummary: version.diffSummary,
        current: version.id === statute.currentRevisionId,
        summaryLabel: humanizeChangeSummary(version.diffSummary ?? ""),
      }),
    );
    const articles = await store.listCurrentArticlesByStatute(statute.id);
    return { kind: "statute" as const, statute, revisions, articles };
  });
}
