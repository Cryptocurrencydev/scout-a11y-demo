import { NextResponse, type NextRequest } from "next/server";

// Every visitor gets an anonymous traveler id so messages and bookings stay private to
// their browser without a sign-up step. A full MVP replaces this with real accounts.
export function proxy(request: NextRequest) {
  const existing = request.cookies.get("tid")?.value;
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return NextResponse.next();
  const id = crypto.randomUUID();
  request.cookies.set("tid", id);
  const res = NextResponse.next({ request: { headers: request.headers } });
  res.cookies.set("tid", id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return res;
}

export const config = {
  matcher: ["/((?!api/stripe/webhook|_next/static|_next/image|icons/|sw.js|maplibre-gl-worker.mjs|manifest.webmanifest|offline.html|favicon.ico).*)"],
};
