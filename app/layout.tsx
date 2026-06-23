import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shipments Tracker",
  description: "Supplier shipment intake and warehouse tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
