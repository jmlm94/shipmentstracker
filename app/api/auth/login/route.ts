import { NextResponse } from "next/server";
import { checkPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") || "");
  const next = String(form.get("next") || "/dashboard");

  if (!checkPassword(password)) {
    return NextResponse.redirect(
      new URL(`/login?error=1&next=${encodeURIComponent(next)}`, req.url),
      { status: 303 }
    );
  }

  setSessionCookie();
  return NextResponse.redirect(new URL(next, req.url), { status: 303 });
}
