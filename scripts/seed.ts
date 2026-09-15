import { seedStore } from "../lib/pipeline/seed/bootstrap";
import { memoryStore } from "../lib/db/memory-store";

async function main() {
  await seedStore(memoryStore);
  const docs = await memoryStore.listDocuments();
  const chunks = await memoryStore.currentChunks();
  console.info(`seeded documents=${docs.length} chunks=${chunks.length}`);
}

void main();
