import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    // Module mocks (supabase-store, getStore) must not leak across files.
    isolate: true,
    maxWorkers: 1,
  },
});
