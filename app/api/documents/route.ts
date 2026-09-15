import { getStore } from "@/lib/db/store";

export async function GET() {
  const store = await getStore();
  const documents = await store.listDocuments();
  return Response.json({ documents });
}
