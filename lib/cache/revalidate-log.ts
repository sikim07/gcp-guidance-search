import { randomUUID } from "node:crypto";
import { getStore } from "@/lib/db/store";
import type { RevalidationLogRecord } from "@/lib/types";

export type RevalidationLog = RevalidationLogRecord;

export async function listRevalidationLogs(): Promise<RevalidationLog[]> {
  return getStore().listRevalidationLogs();
}

export async function recordRevalidation(input: {
  reason: string;
  paths: string[];
  documentIds: string[];
  statuteIds: string[];
}): Promise<RevalidationLog> {
  const row: RevalidationLog = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    reason: input.reason,
    paths: input.paths,
    documentIds: input.documentIds,
    statuteIds: input.statuteIds,
  };
  await getStore().addRevalidationLog(row);
  return row;
}
