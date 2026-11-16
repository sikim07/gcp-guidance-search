export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  try {
    const { seedIfNeeded } = await import("@/lib/pipeline/seed/dev-bootstrap");
    await seedIfNeeded();
  } catch (error) {
    // Never take down API routes if local seed bootstrap fails.
    console.error("[instrumentation] seed bootstrap failed", error);
  }
}
