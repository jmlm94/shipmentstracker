import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Verifies the EasyPost connection: checks the env vars and makes a lightweight
// authenticated call to confirm the API key is valid.
export async function POST() {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = (process.env.TRACKING_PROVIDER || "").toLowerCase();
  const key = process.env.EASYPOST_API_KEY;

  if (!key) {
    return NextResponse.json({
      ok: false,
      error: "EASYPOST_API_KEY is not set in this deployment.",
    });
  }
  if (provider !== "easypost") {
    return NextResponse.json({
      ok: false,
      error: 'Key found, but TRACKING_PROVIDER is not "easypost" — set it to enable tracking.',
    });
  }

  const auth = "Basic " + Buffer.from(`${key}:`).toString("base64");
  try {
    const res = await fetch("https://api.easypost.com/v2/api_keys", {
      headers: { Authorization: auth },
    });
    if (res.status === 401) {
      return NextResponse.json({ ok: false, error: "EasyPost rejected the key (401) — double-check it." });
    }
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `EasyPost returned ${res.status}.` });
    }
    const mode = key.startsWith("EZTK") ? "test" : "production";
    return NextResponse.json({ ok: true, mode });
  } catch {
    return NextResponse.json({ ok: false, error: "Couldn't reach EasyPost." });
  }
}
