import type { RevalidationLogRecord } from "@/lib/types";

export type StoreError = {
  code?: string;
  message?: string;
};

export function isMissingRelation(
  error: StoreError | null | undefined,
): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = error.message ?? "";
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    /schema cache/i.test(message) ||
    /could not find the table/i.test(message) ||
    /relation .* does not exist/i.test(message)
  );
}

export function asStoreError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = String(
      (error as { message?: unknown }).message ?? "Supabase error",
    );
    return Object.assign(new Error(message), error);
  }
  return new Error(String(error));
}

/** Quota, pause, network, or auth failures that make the store unusable for search. */
export function isStoreUnavailableError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : String(error ?? "");
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  return (
    /egress|bandwidth|quota|over[_ ]?limit|overage|project (is )?paused|payment required|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed|Failed to fetch|JWT|PGRST301|PGRST303|statement timeout|57014|53300|522|521|1020/i.test(
      `${code} ${message}`,
    )
  );
}

export function throwUnlessMissingRelation(
  error: StoreError | null | undefined,
): void {
  if (!error) return;
  if (isMissingRelation(error)) return;
  throw asStoreError(error);
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return [];
}

export function mapRevalidationLogRows(
  data: unknown[] | null | undefined,
  error: StoreError | null | undefined,
): RevalidationLogRecord[] {
  if (error) {
    if (isMissingRelation(error)) return [];
    throw asStoreError(error);
  }
  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      reason: String(record.reason ?? ""),
      paths: asStringArray(record.paths),
      documentIds: asStringArray(record.document_ids),
      statuteIds: asStringArray(record.statute_ids),
      createdAt: String(record.created_at ?? ""),
    };
  });
}
