import type { CatalogEntry, ChangeKind, DocumentRecord } from "@/lib/types";
import { compareIsoDates } from "@/lib/utils";

export type Detection = {
  kind: ChangeKind;
  previous?: DocumentRecord;
  catalog: CatalogEntry;
  incomingHash?: string;
};

export function detectCatalogChanges(
  catalog: CatalogEntry[],
  existing: DocumentRecord[],
): Detection[] {
  const byKey = new Map<string, DocumentRecord>();
  for (const doc of existing) {
    byKey.set(doc.externalId, doc);
    byKey.set(doc.url, doc);
  }

  const seen = new Set<string>();
  const detections: Detection[] = [];

  for (const entry of catalog) {
    const prev = byKey.get(entry.externalId) ?? byKey.get(entry.url);
    if (prev) seen.add(prev.id);
    if (!prev) {
      detections.push({ kind: "new", catalog: entry });
      continue;
    }
    detections.push({ kind: "unchanged", previous: prev, catalog: entry });
  }

  for (const doc of existing) {
    if (doc.status === "withdrawn") continue;
    if (!seen.has(doc.id)) {
      detections.push({
        kind: "vanished",
        previous: doc,
        catalog: {
          source: doc.source,
          title: doc.title,
          url: doc.url,
          issuedDate: doc.issuedDate,
          category: doc.category,
          externalId: doc.externalId,
        },
      });
    }
  }

  return detections;
}

/**
 * Revision rules (stage 5):
 *  1st: site date (FDA Date Issued / MFDS 고시일) newer than stored → revised_date
 *  2nd: SHA-256 of bytes differs even if the date is unchanged → revised_hash
 *  both → revised_both
 */
export function detectContentRevision(options: {
  previous: DocumentRecord;
  incomingDate: string | null;
  incomingHash: string;
}): ChangeKind {
  const dateNewer = compareIsoDates(options.incomingDate, options.previous.issuedDate) > 0;
  const hashChanged =
    Boolean(options.previous.fileHash) && options.previous.fileHash !== options.incomingHash;
  const hashNew = !options.previous.fileHash && Boolean(options.incomingHash);

  if (dateNewer && hashChanged) return "revised_both";
  if (dateNewer) return "revised_date";
  if (hashChanged || hashNew) return "revised_hash";
  return "unchanged";
}
