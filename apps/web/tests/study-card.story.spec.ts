import { expect, test } from "@playwright/test";

// Story-level smoke for the StudyCard (the swipeable deck card). Confirms each
// recall card type renders its content in the phone-height story stage.

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`;

test.describe("StudyCard — story smoke", () => {
  test("Quiz card renders question + options", async ({ page }) => {
    await page.goto(story("app-studycard--quiz"));
    await expect(page.getByTestId("study-card")).toBeVisible();
    await expect(page.getByText(/Which keyword lets you reassign/)).toBeVisible();
    await expect(page.getByRole("button", { name: "mut" })).toBeVisible();
  });

  test("Quiz-with-code card renders its snippet", async ({ page }) => {
    await page.goto(story("app-studycard--quiz-with-code"));
    await expect(page.getByTestId("study-card")).toBeVisible();
    await expect(page.getByText("What does this program print?")).toBeVisible();
  });

  test("Write-code card renders the editor + check action", async ({ page }) => {
    await page.goto(story("app-studycard--write-code"));
    await expect(page.getByTestId("study-card")).toBeVisible();
    await expect(page.getByRole("button", { name: "Check" })).toBeVisible();
  });
});
