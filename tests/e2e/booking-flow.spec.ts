import { test, expect, tabTo } from "./fixtures";

/**
 * The whole traveler journey with the keyboard only: search -> filter -> open a scout from
 * the list -> message -> book -> pay on Stripe Checkout with a test card -> complete -> review.
 * Needs a deployment whose Stripe webhook is registered, so it runs against BASE_URL.
 */
test.skip(!process.env.BASE_URL, "runs against the deployed site (needs the Stripe webhook)");

test("keyboard-only: search to review", async ({ page, axe }) => {
  test.setTimeout(240_000);
  const log = (s: string) => test.info().annotations.push({ type: "step", description: s });

  // 1. Search from the home page.
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await tabTo(page, page.getByLabel("Where are you going?"));
  await page.keyboard.type("Lisbon");
  await tabTo(page, page.getByLabel("What should they specialise in?"));
  await page.keyboard.type("Wheel");
  await tabTo(page, page.getByRole("button", { name: "Find scouts" }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/destination=Lisbon/);
  await expect(page.locator(".result-count")).toHaveText("1 scout found in Lisbon, Wheelchair access");
  log("searched");

  // 2. Refine with a filter.
  if (!(await page.locator("details.filters").evaluate((d: HTMLDetailsElement) => d.open))) {
    await tabTo(page, page.locator("summary"));
    await page.keyboard.press("Enter");
  }
  await tabTo(page, page.getByLabel("Step-free routes"));
  await page.keyboard.press("Space");
  await expect(page.locator(".result-count")).toHaveText("1 scout found in Lisbon, Wheelchair access and Step-free routes");
  await axe("flow: filtered results");

  // 3. Open the scout from the list view.
  await tabTo(page, page.locator("#scout-link-ines-carvalho"), { max: 120 });
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toHaveText("Inês Carvalho");
  await expect(page.locator("h1")).toBeFocused();
  log("opened profile");

  // 4. Message the scout.
  await tabTo(page, page.getByRole("link", { name: "Message Inês" }));
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toBeFocused();
  await tabTo(page, page.getByLabel("Your message to Inês"));
  await page.keyboard.type("Is the Alfama route step-free for a power wheelchair 70 cm wide?");
  await tabTo(page, page.getByRole("button", { name: "Send" }));
  await page.keyboard.press("Enter");
  await expect(page.locator('[role="status"][aria-live="polite"]')).toContainText("New message from Inês:", { timeout: 20_000 });
  await axe("flow: chat with reply");
  log("messaged");

  // 5. Book a package.
  await tabTo(page, page.getByRole("link", { name: /See Inês's packages and book/ }));
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toHaveText("Inês Carvalho");
  const book = page.getByRole("button", { name: /Book 30-minute planning call for \$25.00/ });
  await tabTo(page, book, { max: 120 });
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await tabTo(page, dialog.getByLabel("Trip date"));
  await page.keyboard.type("06152027");
  await tabTo(page, dialog.getByLabel("Your access needs"));
  await page.keyboard.type("Power wheelchair, 70 cm wide. I can't manage any steps.");
  await axe("flow: booking dialog filled");
  await tabTo(page, dialog.getByRole("button", { name: /Continue to payment/ }));
  await page.keyboard.press("Enter");
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
  log("checkout opened");

  // 6. Pay on Stripe Checkout with a test card, keyboard only.
  const email = page.locator("#email");
  await email.waitFor({ timeout: 30_000 });
  await tabTo(page, email, { max: 40 });
  await page.keyboard.type("traveler.e2e@example.com");
  const card = page.locator("#cardNumber");
  if (!(await card.isVisible())) {
    const cardChoice = page.locator('[data-testid="card-accordion-item-button"], #card-tab, [value="card"]').first();
    await tabTo(page, cardChoice, { max: 40 });
    await page.keyboard.press("Space");
  }
  await tabTo(page, card, { max: 40 });
  await page.keyboard.type("4242424242424242");
  await tabTo(page, page.locator("#cardExpiry"), { max: 5 });
  await page.keyboard.type("1234");
  await tabTo(page, page.locator("#cardCvc"), { max: 5 });
  await page.keyboard.type("123");
  await tabTo(page, page.locator("#billingName"), { max: 10 });
  await page.keyboard.type("Test Traveler");
  const zip = page.locator("#billingPostalCode");
  if (await zip.isVisible()) {
    await tabTo(page, zip, { max: 10 });
    await page.keyboard.type("94103");
  }
  const pay = page.locator('[data-testid="hosted-payment-submit-button"], button.SubmitButton').first();
  await tabTo(page, pay, { max: 30 });
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/bookings\/[0-9a-f-]+\?checkout=success/, { timeout: 60_000 });
  log("paid");

  // 7. Webhook confirms the payment.
  await expect(page.getByText("Payment confirmed.")).toBeVisible({ timeout: 45_000 });
  await expect(page.locator(".split")).toContainText("$25.00");
  await expect(page.locator(".split")).toContainText("$3.75");
  await expect(page.locator(".split")).toContainText("$21.25");
  await axe("flow: booking paid");

  // 8. Complete and review.
  await tabTo(page, page.getByRole("button", { name: "Mark booking as completed" }), { max: 60 });
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Review Inês" })).toBeVisible();
  const publish = page.getByRole("button", { name: "Publish review" });
  await tabTo(page, publish, { max: 60 });
  await page.keyboard.press("Enter");
  await expect(page.locator(".error-summary")).toBeFocused();
  await axe("flow: review errors");
  await tabTo(page, page.getByLabel("5 stars, excellent"), { max: 30 });
  await page.keyboard.press("Space");
  await tabTo(page, page.getByLabel("Name shown on your review"));
  await page.keyboard.type("Keyboard K.");
  await tabTo(page, page.getByLabel("Your review"));
  await page.keyboard.type("Inês answered every access question in detail and the route was fully step-free.");
  await tabTo(page, publish);
  await page.keyboard.press("Enter");
  const thanks = page.getByText(/Your review of Inês is published/);
  await expect(thanks).toBeFocused();
  await axe("flow: review published");
  log("reviewed");

  // The review shows on the profile, and the split shows in the scout's earnings.
  await page.goto("/scouts/ines-carvalho");
  await expect(page.getByRole("heading", { name: "Keyboard K." }).first()).toBeVisible();
  await page.goto("/earnings?scout=ines-carvalho");
  await expect(page.locator("table")).toContainText("$21.25");
  await axe("flow: earnings with booking");
});
