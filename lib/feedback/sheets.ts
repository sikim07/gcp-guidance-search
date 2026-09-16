import type { FeedbackRecord } from "@/lib/types";

export type SheetPayload = {
  id: string;
  createdAt: string;
  rating: FeedbackRecord["rating"];
  query: string;
  comment?: string;
  answer: string;
  searchLogId: string | null;
};

export function sheetsWebhookUrl(): string | undefined {
  const url = process.env.FEEDBACK_SHEETS_WEBHOOK_URL?.trim();
  return url || undefined;
}

export async function appendFeedbackToSheet(row: SheetPayload): Promise<void> {
  const url = sheetsWebhookUrl();
  if (!url) {
    throw new Error("sheets-webhook-missing");
  }
  const body = JSON.stringify(row);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`sheets-webhook-${response.status}`);
  }
}
