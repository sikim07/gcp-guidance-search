import { SearchPanel } from "@/components/search-panel";
import { PresetIndex } from "@/components/preset-index";
import { getStore } from "@/lib/db/store";
import { clausePoolFromStore, pickPresetSummaries } from "@/lib/seo";
import { PRESET_QUERIES } from "@/lib/search/presets";

export const revalidate = 3600;

export default async function HomePage() {
  const store = await getStore();
  const summaries = pickPresetSummaries(PRESET_QUERIES, await clausePoolFromStore(store));
  return (
    <>
      <SearchPanel />
      <PresetIndex summaries={summaries} />
    </>
  );
}
