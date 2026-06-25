import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { CARRIER_LABEL } from "@/lib/status";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const W = 288; // 4in
const H = 432; // 6in
const BRAND = process.env.NEXT_PUBLIC_COMPANY_NAME || "Carbinox";
const ORANGE = rgb(0.96, 0.45, 0.13);
const INK = rgb(0.1, 0.12, 0.16);
const GRAY = rgb(0.45, 0.5, 0.55);

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = INK) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (W - w) / 2, y, size, font, color });
}

// Wrap text to fit width, returning lines.
function wrap(text: string, font: PDFFont, size: number, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const tryLine = cur ? `${cur} ${word}` : word;
    if (font.widthOfTextAtSize(tryLine, size) > maxW && cur) {
      lines.push(cur);
      cur = word;
      if (lines.length === maxLines - 1) break;
    } else {
      cur = tryLine;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines.slice(0, maxLines);
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: params.id },
    include: { boxes: { orderBy: { boxNumber: "asc" } } },
  });
  if (!shipment) return new Response("Not found", { status: 404 });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const total = shipment.boxes.length;

  for (const box of shipment.boxes) {
    const page = pdf.addPage([W, H]);

    // Brand bar with the Carbinox "X" mark
    page.drawRectangle({ x: 0, y: H - 36, width: W, height: 36, color: ORANGE });
    const xc = 22;
    const yc = H - 18;
    const s = 7;
    const white = rgb(1, 1, 1);
    page.drawLine({ start: { x: xc - s, y: yc - s }, end: { x: xc + s, y: yc + s }, thickness: 3, color: white });
    page.drawLine({ start: { x: xc - s, y: yc + s }, end: { x: xc + s, y: yc - s }, thickness: 3, color: white });
    centered(page, BRAND.toUpperCase(), H - 25, bold, 16, white);

    // Product
    let y = H - 60;
    const titleLines = wrap(box.productName || box.productId, bold, 13, W - 28, 2);
    for (const line of titleLines) {
      centered(page, line, y, bold, 13);
      y -= 16;
    }
    if (box.productId) {
      centered(page, box.productId, y, font, 9, GRAY);
      y -= 14;
    }

    // QR
    const qrPng = await QRCode.toDataURL(box.boxCode, { margin: 1, width: 320 });
    const img = await pdf.embedPng(qrPng);
    const qrSize = 150;
    page.drawImage(img, { x: (W - qrSize) / 2, y: y - qrSize - 4, width: qrSize, height: qrSize });
    y = y - qrSize - 22;

    // Box code (big)
    centered(page, box.boxCode, y, bold, 17, INK);
    y -= 18;
    centered(page, `Box ${box.boxNumber} of ${total}`, y, font, 11, GRAY);
    y -= 22;

    // Details box
    const lines = [
      `Units in this box: ${box.unitsPerBox}`,
      `Shipment: ${shipment.code}`,
      `Supplier: ${shipment.supplierName}`,
      `${CARRIER_LABEL[box.carrier]} · ${box.shippingMethod === "AIR" ? "Air" : "Sea"}`,
      `Tracking: ${box.trackingNumber}`,
    ];
    for (const line of lines) {
      const wrapped = wrap(line, font, 10, W - 28, 2);
      for (const wl of wrapped) {
        centered(page, wl, y, font, 10, INK);
        y -= 13;
      }
    }

    // Footer
    centered(page, "Stick one label on the outside of this box.", 16, font, 8, GRAY);
  }

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${shipment.code}-box-labels.pdf"`,
    },
  });
}
