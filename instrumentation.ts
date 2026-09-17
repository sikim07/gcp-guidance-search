export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { seedIfNeeded } = await import("@/lib/pipeline/seed/dev-bootstrap");
  await seedIfNeeded();
}
