export type AdPlacement =
  | "search-result"
  | "documents"
  | "updates"
  | "about";

/** Site publisher ID (also in `google-adsense-account` meta). Public by design. */
export const ADSENSE_PUBLISHER_ID = "ca-pub-9321980978046322";

export function adsenseClientId(): string | undefined {
  const value = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  return value || ADSENSE_PUBLISHER_ID;
}

export function adsenseSlotId(placement: AdPlacement): string | undefined {
  const primary =
    placement === "search-result"
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_SEARCH
      : placement === "documents"
        ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_DOCUMENTS
        : placement === "updates"
          ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_UPDATES
          : process.env.NEXT_PUBLIC_ADSENSE_SLOT_ABOUT;
  const value = primary?.trim();
  if (value) return value;
  // One display unit can cover catalog-style pages until separate units exist.
  if (placement === "updates" || placement === "about") {
    return process.env.NEXT_PUBLIC_ADSENSE_SLOT_DOCUMENTS?.trim() || undefined;
  }
  return undefined;
}

export function adsEnabled(placement: AdPlacement): boolean {
  return Boolean(adsenseClientId() && adsenseSlotId(placement));
}
