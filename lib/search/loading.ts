export type LoadingPhase = "retrieve" | "answer";

export function loadingPhase(elapsedMs: number): LoadingPhase {
  return elapsedMs < 900 ? "retrieve" : "answer";
}

export function loadingCopy(phase: LoadingPhase): string {
  return phase === "retrieve" ? "조항 고르는 중" : "답변 쓰는 중";
}
