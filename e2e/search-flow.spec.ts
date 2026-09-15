import { test, expect } from "@playwright/test";

test("question → answer → feedback", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "규정 조항을 자연어로 묻습니다" }),
  ).toBeVisible();
  await page.getByTestId("preset-audit-trail").click();
  const answer = page.getByTestId("answer-card");
  await expect(answer).toBeVisible({ timeout: 60_000 });
  await expect(answer).toContainText(
    /감사추적|audit trail|확인되지 않습니다|Part 11|5\.5/i,
  );
  await page.getByTestId("tab-original").click();
  await expect(answer).toContainText(
    /Part 11|감사추적|audit trail|전자|5\.5|확인되지 않습니다/i,
  );
  await page.getByTestId("tab-answer").click();
  await page.getByTestId("feedback-up").click();
});

test("updates feed renders seeded corpus", async ({ page }) => {
  await page.goto("/updates");
  await expect(page.getByRole("heading", { name: "개정 피드" })).toBeVisible();
  await expect(
    page.getByText(/초기 적재|E6\(R2\)|별표 4|ICH GCP|약사법/).first(),
  ).toBeVisible({
    timeout: 60_000,
  });
});
