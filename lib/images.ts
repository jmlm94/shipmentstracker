// Helpers for image fields that may hold either a hosted URL (Vercel Blob,
// Shopify CDN) or a base64 data URI (the zero-setup fallback).

// Data URIs beyond this length are dropped from PUBLIC endpoint payloads —
// they balloon the JSON response (a 1.5 MB image ≈ 2 MB of base64) and the
// supplier form loads the whole catalog at once. Hosted URLs always pass.
const PUBLIC_DATA_URI_MAX = 200_000;

export function publicImage(img: string | null | undefined): string {
  if (!img) return "";
  if (img.startsWith("data:") && img.length > PUBLIC_DATA_URI_MAX) return "";
  return img;
}

export function isDataUri(v: string | null | undefined): v is string {
  return !!v && v.startsWith("data:");
}

// Decode a data URI into its mime type and bytes (for re-uploading to Blob).
export function decodeDataUri(uri: string): { mime: string; bytes: Buffer } | null {
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(uri);
  if (!m) return null;
  try {
    return { mime: m[1], bytes: Buffer.from(m[2], "base64") };
  } catch {
    return null;
  }
}

export function extensionFor(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  return map[mime] || "bin";
}
