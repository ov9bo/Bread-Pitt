import { cn } from "@/lib/utils/cn";

/**
 * A breathing, hand-warmed wash that lives behind the app. Two stacked
 * radial gradients animate at different speeds with a barely-visible drift —
 * enough motion to feel alive, never enough to distract from reading.
 */
export function AmbientGradient({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      {/* Crust glow — top-left, slow breathe */}
      <div
        className="absolute -top-[20%] -left-[10%] h-[80vh] w-[80vh] rounded-full blur-3xl will-change-transform"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-crust) 22%, transparent) 0%, transparent 60%)",
          animation: "ambient-breathe 14s var(--ease-bread) infinite",
        }}
      />
      {/* Levain wash — bottom-right, opposite phase */}
      <div
        className="absolute -bottom-[25%] -right-[10%] h-[70vh] w-[70vh] rounded-full blur-3xl will-change-transform"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-levain) 18%, transparent) 0%, transparent 60%)",
          animation: "ambient-breathe 18s var(--ease-bread) infinite",
          animationDelay: "-7s",
        }}
      />
      {/* Hooch tint — drifts side to side */}
      <div
        className="absolute top-[40%] left-[20%] h-[40vh] w-[60vh] rounded-full blur-3xl will-change-transform"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-butter) 10%, transparent) 0%, transparent 60%)",
          animation: "hooch-drift 26s ease-in-out infinite alternate",
        }}
      />
      {/* Subtle film grain — keeps gradients from feeling plastic */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.85  0 0 0 0 0.65  0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          backgroundSize: "240px 240px",
        }}
      />
    </div>
  );
}
