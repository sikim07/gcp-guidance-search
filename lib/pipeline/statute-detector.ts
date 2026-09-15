import type { ChangeKind, StatuteRecord } from "@/lib/types";

/**
 * Statute revisions are identified by MST (법령일련번호), then 공포일/시행일.
 * Do not use PDF/file hashes — 현행법령 JSON has no file payload.
 */
export function detectStatuteRevision(options: {
  previous?: StatuteRecord;
  incoming: {
    mst: string;
    promulgatedDate: string | null;
    effectiveDate: string | null;
    amendmentType?: string;
    fileHash?: string;
  };
}): ChangeKind {
  void options.incoming.fileHash;
  void options.incoming.amendmentType;
  if (!options.previous) return "new";
  if (options.previous.currentMst === options.incoming.mst) return "unchanged";
  return "revised_mst";
}
