import { test, expect } from "./fixtures";

const PAGES = [
  ["home", "/"],
  ["search", "/scouts"],
  ["search filtered", "/scouts?destination=Lisbon&specialty=step-free"],
  ["search no results", "/scouts?destination=Kyoto&specialty=deaf-hoh&language=BSL"],
  ["scout profile", "/scouts/ines-carvalho"],
  ["profile after cancelled checkout", "/scouts/ines-carvalho?checkout=cancelled"],
  ["messages", "/scouts/lucia-ferrer/messages"],
  ["my bookings", "/bookings"],
  ["earnings", "/earnings"],
  ["become a scout", "/become-a-scout"],
  ["accessibility statement", "/accessibility"],
  ["not found", "/no-such-page"],
  ["offline fallback", "/offline.html"],
] as const;

test.describe("axe: every page, standard theme", () => {
  for (const [name, path] of PAGES) {
    test(name, async ({ page, axe, consoleErrors }) => {
      if (name === "not found") test.info().annotations.push({ type: "allow-console", description: "404 resource log" });
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      await axe(name);
      void consoleErrors;
    });
  }
});

test.describe("axe: every page, high contrast", () => {
  for (const [name, path] of PAGES) {
    test(`${name} (high contrast)`, async ({ page, axe, context, baseURL }) => {
      await context.addCookies([{ name: "contrast", value: "high", url: baseURL! }]);
      if (path === "/offline.html") await page.emulateMedia({ contrast: "more" });
      await page.goto(path);
      await axe(`${name} (high contrast)`);
    });
  }
});

test.describe("axe: key interactive states", () => {
  test("filters open + filter applied", async ({ page, axe }) => {
    await page.goto("/scouts");
    const details = page.locator("details.filters");
    if (!(await details.evaluate((d: HTMLDetailsElement) => d.open))) await page.locator("summary").click();
    await page.getByLabel("Wheelchair access").check();
    await expect(page.getByRole("status").first()).toContainText("Wheelchair access");
    await axe("filters open");
  });

  test("map and list view", async ({ page, axe }) => {
    await page.goto("/scouts?destination=Lisbon");
    await page.getByRole("button", { name: "Map and list" }).click();
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await expect(page.locator(".pin").first()).toBeVisible();
    await page.waitForTimeout(1500);
    await axe("map view");
    await page.getByRole("button", { name: /Show on map: Inês/ }).click();
    await axe("map view, scout selected");
  });

  test("booking dialog open, then with errors", async ({ page, axe }) => {
    await page.goto("/scouts/ines-carvalho");
    await page.getByRole("button", { name: /Book 30-minute planning call/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await axe("booking dialog open");
    await dialog.getByRole("button", { name: /Continue to payment/ }).click();
    await expect(dialog.locator(".error-summary")).toBeFocused();
    await axe("booking dialog errors");
  });

  test("chat with messages and error", async ({ page, axe }) => {
    await page.goto("/scouts/haruto-mori/messages");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.locator("#message-error")).toBeVisible();
    await axe("chat error");
    await page.getByLabel(/Your message to Haruto/).fill("Do temples near Gion have audio guides?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.locator(".msg-scout")).toHaveCount(1, { timeout: 15_000 });
    await axe("chat with reply");
  });

  test("become a scout errors", async ({ page, axe }) => {
    await page.goto("/become-a-scout");
    await page.getByRole("button", { name: /Continue to Stripe onboarding/ }).click();
    await expect(page.locator(".error-summary")).toBeFocused();
    await axe("onboarding errors");
  });

  test("forced colours and reduced motion render", async ({ page, axe }) => {
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.goto("/scouts");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
    await axe("forced colors");
  });

  test("prefers-contrast: more switches to high-contrast tokens", async ({ page, axe }) => {
    await page.emulateMedia({ contrast: "more" });
    await page.goto("/");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(0, 0, 0)");
    await axe("prefers-contrast more");
  });
});
