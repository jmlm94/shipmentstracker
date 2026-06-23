"use client";

export function PrintButton({ label = "Print label" }: { label?: string }) {
  return (
    <button className="btn print:hidden" onClick={() => window.print()}>
      {label}
    </button>
  );
}
