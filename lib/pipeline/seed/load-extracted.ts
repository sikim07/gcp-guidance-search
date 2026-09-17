import { readFileSync } from "node:fs";
import path from "node:path";

const EXTRACTED_DIR = path.join(process.cwd(), "lib/pipeline/seed/extracted");

export function loadExtractedText(filename: string): string {
  return readFileSync(path.join(EXTRACTED_DIR, filename), "utf8").trim();
}

export function loadExtractedJson<T>(filename: string): T {
  return JSON.parse(loadExtractedText(filename)) as T;
}
