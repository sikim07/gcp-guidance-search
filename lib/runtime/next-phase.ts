/** True while `next build` is collecting/prerendering pages. */
export function isNextProductionBuild(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.NEXT_PHASE === "phase-production-build";
}
