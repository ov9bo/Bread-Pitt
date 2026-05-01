import { ScrollReveal } from "@/components/motion/ScrollReveal";

export function PageHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <ScrollReveal>
      <header className="border-b border-[var(--color-line-soft)] pb-8 mb-10">
        {eyebrow && (
          <div className="text-[10px] font-mono uppercase tracking-[0.32em] text-[var(--color-crust)] mb-3">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-5xl md:text-6xl text-balance text-[var(--color-ink)] leading-[0.96] tracking-tight">
          {title}
        </h1>
        {lede && (
          <p className="mt-5 max-w-prose font-display italic text-lg text-[var(--color-ink-muted)] text-pretty">
            {lede}
          </p>
        )}
      </header>
      <div className="text-sm text-[var(--color-ink-faint)] font-mono uppercase tracking-[0.18em]">
        Coming together — wired up in the next chapter of this build.
      </div>
      {children}
    </ScrollReveal>
  );
}
