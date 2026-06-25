// Carbinox "X" brand mark, rendered as inline SVG so it scales crisply and
// needs no hosted asset. Swap for the exact logo file later if desired.
export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Carbinox">
      <rect width="100" height="100" rx="24" fill="#0B0D11" />
      <g stroke="#ffffff" strokeWidth="13" strokeLinecap="round">
        <line x1="33" y1="33" x2="67" y2="67" />
        <line x1="67" y1="33" x2="33" y2="67" />
      </g>
    </svg>
  );
}
