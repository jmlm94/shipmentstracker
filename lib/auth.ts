import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "st_session";

function token(): string {
  const secret = process.env.DASHBOARD_PASSWORD || "dev";
  return createHmac("sha256", secret).update("dashboard-access").digest("hex");
}

export function setSessionCookie() {
  cookies().set(COOKIE_NAME, token(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

// True when no password is configured — the dashboard runs open in that case.
export function authDisabled(): boolean {
  return !process.env.DASHBOARD_PASSWORD;
}

export function isAuthed(): boolean {
  // TEMPORARY: with no DASHBOARD_PASSWORD set, the dashboard is open (no login).
  // Add DASHBOARD_PASSWORD in Vercel to re-enable the password gate instantly.
  if (authDisabled()) return true;

  const c = cookies().get(COOKIE_NAME)?.value;
  if (!c) return false;
  const expected = token();
  try {
    return timingSafeEqual(Buffer.from(c), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function checkPassword(input: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD || "";
  if (!expected) return false;
  try {
    return timingSafeEqual(Buffer.from(input), Buffer.from(expected));
  } catch {
    return false;
  }
}
