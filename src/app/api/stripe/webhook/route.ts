import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { applyStripeEvent } from "@/lib/webhook";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  // Platform events and Connect (connected-account) events come from two endpoints with different secrets.
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean) as string[];
  if (!signature || secrets.length === 0) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }
  // Verify against the raw body: any re-serialisation breaks the HMAC.
  const payload = await req.text();
  let event;
  for (const secret of secrets) {
    try {
      event = stripe().webhooks.constructEvent(payload, signature, secret);
      break;
    } catch {
      /* try the next secret */
    }
  }
  if (!event) return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  try {
    const result = await applyStripeEvent(event);
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    console.error("webhook processing failed", event.id, err);
    // 500 makes Stripe retry; the event id was not recorded because the transaction rolled back.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
