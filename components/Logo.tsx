// Carbinox "X" brand mark — bold, hard-edged, with forked tips, rendered as
// inline SVG (no hosted asset needed). Uses currentColor so it inherits the
// text color (white on the black sidebar, black on light surfaces).
// Swap for the official logo file when available for a pixel-exact mark.
const BAR = "0,-10 48,-10 48,-3.5 34,-3.5 34,3.5 48,3.5 48,10 0,10";

export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Carbinox"
      fill="currentColor"
    >
      <g transform="translate(50 50)">
        <polygon points={BAR} transform="rotate(45)" />
        <polygon points={BAR} transform="rotate(135)" />
        <polygon points={BAR} transform="rotate(225)" />
        <polygon points={BAR} transform="rotate(315)" />
      </g>
    </svg>
  );
}
