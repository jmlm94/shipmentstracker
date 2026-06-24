import { randomBytes } from "crypto";

// Human-friendly, unambiguous batch code, e.g. "SHP-7K3Q9P". Avoids easily
// confused characters (0/O, 1/I).
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateShipmentCode(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `SHP-${out}`;
}

// Per-box identifier printed on the sticker, e.g. "SHP-7K3Q9P-001".
export function boxCodeFor(shipmentCode: string, boxNumber: number): string {
  return `${shipmentCode}-${String(boxNumber).padStart(3, "0")}`;
}
