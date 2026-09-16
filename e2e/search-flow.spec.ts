import { test, expect } from "@playwright/test";

test("question → answer → feedback", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "임상시험 규정을 검색" })).toBeVisible();
  await expect(
    page.getByText(/가이드라인과 법령에서 근거 조항을 찾습니다/),
  ).toBeVisible();
  await page.getByTestId("preset-audit-trail").click();
  await expect(page.getByTestId("search-progress")).toBeVisible();
  const answer = page.getByTestId("answer-card");
  await expect(answer).toBeVisible({ timeout: 60_000 });
  await expect(answer).not.toContainText("지금은 번역을 할 수 없습니다");
  await expect(answer).toContainText(
    /감사추적|시험대상자|의뢰자|원본자료|전자|확인되지 않습니다/i,
  );
  const toggle = page.getByTestId("toggle-translation");
  if (await toggle.isVisible()) {
    await expect(toggle).toContainText("원문 보기");
    const before = await toggle.boundingBox();
    await toggle.click();
    const after = await toggle.boundingBox();
    expect(before).toBeTruthy();
    expect(after).toBeTruthy();
    expect(Math.abs(after!.width - before!.width)).toBeLessThan(1);
    await expect(answer).toContainText(/audit trail|Part 11|BACKGROUND|electronic/i);
    await page.getByTestId("tab-original").click();
    await expect(answer).toContainText(/Part 11|audit trail|electronic|5\.5/i);
    await page.getByTestId("tab-answer").click();
  }
  await page.getByTestId("feedback-down").click();
  await expect(page.getByTestId("feedback-comment")).toBeVisible();
  await page.getByTestId("feedback-up").click();
  await expect(page.getByTestId("feedback-thanks")).toBeVisible();
});

test("mobile uses a fixed-height floating tab bar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const title = page.getByRole("link", { name: "GCP 가이드라인 검색기" });
  await expect(title).toBeVisible();
  await expect(page.locator("header nav")).toBeHidden();
  const bottom = page.getByTestId("bottom-nav");
  await expect(bottom).toBeVisible();
  await expect(bottom).toHaveClass(/liquid-tabbar/);
  await expect(bottom.getByRole("link", { name: "검색" })).toBeVisible();
  const titleBox = await title.boundingBox();
  const bottomBox = await bottom.boundingBox();
  expect(titleBox).toBeTruthy();
  expect(bottomBox).toBeTruthy();
  expect(bottomBox!.y).toBeGreaterThan(titleBox!.y + titleBox!.height);
  expect(bottomBox!.width).toBeLessThan(390 - 16);
  const heightAtNarrow = bottomBox!.height;

  const paddingBottom = await page
    .locator("main")
    .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
  expect(paddingBottom).toBeGreaterThanOrEqual(heightAtNarrow + 12);

  await page.setViewportSize({ width: 500, height: 844 });
  const wider = await bottom.boundingBox();
  expect(wider).toBeTruthy();
  expect(Math.abs(wider!.height - heightAtNarrow)).toBeLessThan(1);
});

test("desktop overlay scrollbar does not consume layout width", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 420 });
  await page.goto("/");
  const metrics = await page.evaluate(() => {
    const frame = document.querySelector(".app-frame") as HTMLElement | null;
    return {
      inner: window.innerWidth,
      htmlClient: document.documentElement.clientWidth,
      gutter: frame ? frame.offsetWidth - frame.clientWidth : -1,
    };
  });
  expect(metrics.htmlClient).toBe(metrics.inner);
  expect(metrics.gutter).toBe(0);
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
