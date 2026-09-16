import { describe, expect, it, vi, afterEach } from "vitest";
import { appendFeedbackToSheet, sheetsWebhookUrl } from "@/lib/feedback/sheets";

const originalWebhook = process.env.FEEDBACK_SHEETS_WEBHOOK_URL;

afterEach(() => {
  if (originalWebhook === undefined) {
    delete process.env.FEEDBACK_SHEETS_WEBHOOK_URL;
  } else {
    process.env.FEEDBACK_SHEETS_WEBHOOK_URL = originalWebhook;
  }
  vi.unstubAllGlobals();
});

describe("feedback sheets", () => {
  it("reads the webhook from env", () => {
    delete process.env.FEEDBACK_SHEETS_WEBHOOK_URL;
    expect(sheetsWebhookUrl()).toBeUndefined();
    process.env.FEEDBACK_SHEETS_WEBHOOK_URL = " https://script.google.com/macros/s/abc/exec ";
    expect(sheetsWebhookUrl()).toBe("https://script.google.com/macros/s/abc/exec");
  });

  it("posts JSON as text/plain so Apps Script keeps the body", async () => {
    process.env.FEEDBACK_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/abc/exec";
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await appendFeedbackToSheet({
      id: "1",
      createdAt: "2026-09-16T00:00:00.000Z",
      rating: "down",
      query: "감사추적",
      comment: "조항이 다름",
      answer: "…",
      searchLogId: null,
    });
    expect(fetchMock).toHaveBeenCalled();
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toMatch(/text\/plain/);
    expect(String(init.body)).toMatch(/감사추적/);
  });
});
