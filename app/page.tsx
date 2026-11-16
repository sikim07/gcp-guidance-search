import { SearchPanel } from "@/components/search-panel";
import { PresetIndex } from "@/components/preset-index";
import {
  listCachedDocuments,
  listCachedStatutes,
  listPublicCurrentChunks,
  listPublicCurrentStatuteArticles,
} from "@/lib/cache/public-catalog";
import { clausePoolFromCatalog, pickPresetSummaries } from "@/lib/seo";
import { PRESET_QUERIES } from "@/lib/search/presets";

/** Keep in sync with `PAGE_REVALIDATE_SECONDS` — Next requires a literal. */
export const revalidate = 86_400;

export default async function HomePage() {
  const [documents, statutes, chunks, articles] = await Promise.all([
    listCachedDocuments(),
    listCachedStatutes(),
    listPublicCurrentChunks(),
    listPublicCurrentStatuteArticles(),
  ]);
  const summaries = pickPresetSummaries(
    PRESET_QUERIES,
    await clausePoolFromCatalog({ documents, statutes, chunks, articles }),
  );
  return (
    <>
      <SearchPanel />
      <PresetIndex summaries={summaries} />
    </>
  );
}
