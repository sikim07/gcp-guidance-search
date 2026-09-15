import { test, expect } from "@playwright/test";

test("question → answer → feedback", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "임상시험 규정을 검색합니다" }),
  ).toBeVisible();
  await expect(
    page.getByText(/가이드라인과 법령에서 근거 조항을 찾습니다/),
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

test("mobile header stacks title above nav", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const title = page.getByRole("link", { name: "GCP 가이드라인 검색기" });
  const navSearch = page.locator("header nav").getByRole("link", { name: "검색" });
  const titleBox = await title.boundingBox();
  const navBox = await navSearch.boundingBox();
  expect(titleBox).toBeTruthy();
  expect(navBox).toBeTruthy();
  expect(navBox!.y).toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height - 1);
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
