import { seedStatutes, seedStore } from "../lib/pipeline/seed/bootstrap";
import { memoryStore } from "../lib/db/memory-store";

async function main() {
  await seedStore(memoryStore);
  await seedStatutes(memoryStore);
  const docs = await memoryStore.listDocuments();
  const chunks = await memoryStore.currentChunks();
  const statutes = await memoryStore.listStatutes();
  const articles = await memoryStore.currentStatuteArticles();
  console.info(
    `seeded documents=${docs.length} chunks=${chunks.length} statutes=${statutes.length} articles=${articles.length}`,
  );
}

void main();
