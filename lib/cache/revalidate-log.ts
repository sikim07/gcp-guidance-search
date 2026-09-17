import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type RevalidationLog = {
  id: string;
  createdAt: string;
  reason: string;
  paths: string[];
  documentIds: string[];
  statuteIds: string[];
};

const LOG_PATH = path.join(process.cwd(), ".data", "revalidate-log.json");

type GlobalLogs = { __gcpRevalidateLogs?: RevalidationLog[] };
const g = globalThis as GlobalLogs;

export async function listRevalidationLogs(): Promise<RevalidationLog[]> {
  return (await loadLogs()).slice();
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
  const current = g.__gcpRevalidateLogs ?? (await loadLogs());
  current.unshift(row);
  g.__gcpRevalidateLogs = current.slice(0, 50);
  await persistLogs(g.__gcpRevalidateLogs);
  return row;
}

async function loadLogs(): Promise<RevalidationLog[]> {
  if (g.__gcpRevalidateLogs) return g.__gcpRevalidateLogs;
  try {
    const raw = await readFile(LOG_PATH, "utf8");
    g.__gcpRevalidateLogs = JSON.parse(raw) as RevalidationLog[];
  } catch {
    g.__gcpRevalidateLogs = [];
  }
  return g.__gcpRevalidateLogs;
}

async function persistLogs(rows: RevalidationLog[]): Promise<void> {
  try {
    await mkdir(path.dirname(LOG_PATH), { recursive: true });
    await writeFile(LOG_PATH, JSON.stringify(rows, null, 2));
  } catch {
    // read-only FS: keep memory only
  }
}
