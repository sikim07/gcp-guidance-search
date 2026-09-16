export const TOP_K = 6;
export const ANSWER_K = 3;
export const ANSWER_MAX_TOKENS = 400;
export const CACHE_GEN = "v5:";

export function chunksForAnswer<T>(retrieved: T[], answerK = ANSWER_K): T[] {
  return retrieved.slice(0, answerK);
}
