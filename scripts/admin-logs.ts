import { memoryStore } from "../lib/db/memory-store";

async function main() {
  const logs = await memoryStore.listSearchLogs();
  const feedback = await memoryStore.listFeedback();
  console.info("=== search logs ===");
  for (const log of logs.slice(0, 20)) {
    console.info(`${log.createdAt} cache=${log.cacheHit} ${log.latencyMs}ms :: ${log.query}`);
  }
  console.info("=== feedback ===");
  for (const row of feedback.slice(0, 20)) {
    console.info(`${row.createdAt} ${row.rating} :: ${row.query}`);
  }
}

void main();
