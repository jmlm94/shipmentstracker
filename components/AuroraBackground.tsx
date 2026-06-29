// Decorative animated gradient blobs behind the dashboard. Pure CSS animation,
// non-interactive, sits below content. Disabled under reduced-motion.
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-300/30 blur-3xl animate-aurora motion-reduce:animate-none" />
      <div className="absolute right-[-10%] top-1/4 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl animate-aurora-slow motion-reduce:animate-none" />
      <div className="absolute bottom-[-15%] left-1/3 h-80 w-80 rounded-full bg-sky-200/25 blur-3xl animate-aurora motion-reduce:animate-none" />
    </div>
  );
}
