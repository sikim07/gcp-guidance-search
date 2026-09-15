export async function notifyAdmin(payload: {
  title: string;
  kind: string;
  summary: string;
}): Promise<void> {
  const text = `[GCP 가이드라인 검색기] ${payload.kind}\n${payload.title}\n${payload.summary}`;
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return;
  }
  if (process.env.ALERT_EMAIL) {
    console.info(`alert email to ${process.env.ALERT_EMAIL}: ${text}`);
    return;
  }
  console.info(text);
}
