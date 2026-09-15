import { getStore } from "@/lib/db/store";

export async function GET() {
  const store = await getStore();
  const documents = await store.listDocuments();
  const statutes = await store.listStatutes();
  return Response.json({ documents, statutes });
}
