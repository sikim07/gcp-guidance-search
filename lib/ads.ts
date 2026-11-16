export type AdPlacement = "search-result" | "documents";

export function adsenseClientId(): string | undefined {
  const value = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  return value || undefined;
}

export function adsenseSlotId(placement: AdPlacement): string | undefined {
  const key =
    placement === "search-result"
      ? "NEXT_PUBLIC_ADSENSE_SLOT_SEARCH"
      : "NEXT_PUBLIC_ADSENSE_SLOT_DOCUMENTS";
  const value = process.env[key]?.trim();
  return value || undefined;
}

export function adsEnabled(placement: AdPlacement): boolean {
  return Boolean(adsenseClientId() && adsenseSlotId(placement));
}
