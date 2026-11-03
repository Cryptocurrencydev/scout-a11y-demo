"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** After returning from Checkout, refresh until the webhook has marked the booking paid. */
export function PaymentWatcher({ active }: { active: boolean }) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const t = setInterval(() => {
      if (Date.now() - started > 60_000) {
        setTimedOut(true);
        clearInterval(t);
        return;
      }
      router.refresh();
    }, 1500);
    return () => clearInterval(t);
  }, [active, router]);

  return (
    <div className="notice">
      {!active ? (
        <p>This booking is waiting for payment.</p>
      ) : timedOut ? (
        <p>Stripe hasn&apos;t confirmed the payment yet. This page will show it once it arrives; try reloading in a minute.</p>
      ) : (
        <p>Payment received by Stripe. Waiting for confirmation…</p>
      )}
    </div>
  );
}
