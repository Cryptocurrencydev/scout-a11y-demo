/** Platform commission taken as the Stripe application fee on every destination charge. */
export const PLATFORM_FEE_BPS = 1500; // 15.00%

export const MIN_PACKAGE_CENTS = 500;
export const MAX_PACKAGE_CENTS = 6000;

export type Split = {
  amountCents: number;
  applicationFeeCents: number;
  transferCents: number;
};

/**
 * Split a package price into the platform's application fee and the amount Stripe
 * transfers to the scout's connected account. Integer cents only; the fee rounds
 * half-up so fee + transfer always equals the amount charged.
 */
export function splitPayment(amountCents: number, feeBps = PLATFORM_FEE_BPS): Split {
  if (!Number.isInteger(amountCents)) throw new Error("amount must be integer cents");
  if (amountCents < MIN_PACKAGE_CENTS || amountCents > MAX_PACKAGE_CENTS) {
    throw new Error(`amount must be between ${MIN_PACKAGE_CENTS} and ${MAX_PACKAGE_CENTS} cents`);
  }
  const applicationFeeCents = Math.floor((amountCents * feeBps + 5000) / 10000);
  return { amountCents, applicationFeeCents, transferCents: amountCents - applicationFeeCents };
}

export function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export const feePercentLabel = `${PLATFORM_FEE_BPS / 100}%`;
