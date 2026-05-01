import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "flour" | "char" | "crust" | "ghost";

const tones: Record<Tone, string> = {
  flour:
    "bg-[var(--color-flour)]/85 backdrop-blur-md border border-[var(--color-line)] shadow-[var(--shadow-flour)]",
  char:
    "bg-[var(--color-char)]/60 backdrop-blur-md border border-[var(--color-line)]",
  crust:
    "bg-gradient-to-br from-[var(--color-crust)]/15 to-[var(--color-butter)]/10 " +
    "border border-[var(--color-crust)]/30",
  ghost: "border border-[var(--color-line-soft)] bg-transparent",
};

type Props = HTMLAttributes<HTMLDivElement> & {
  tone?: Tone;
  inset?: boolean;
};

export const Card = forwardRef<HTMLDivElement, Props>(function Card(
  { className, tone = "flour", inset, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-loaf)] overflow-hidden",
        tones[tone],
        inset && "p-6 md:p-7",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pt-6 pb-3 md:px-7 md:pt-7", className)} {...rest} />;
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-3 md:px-7", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-6 pb-6 pt-3 md:px-7 md:pb-7",
        "border-t border-[var(--color-line-soft)]",
        className,
      )}
      {...rest}
    />
  );
}

export function CardEyebrow({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)]",
        className,
      )}
      {...rest}
    />
  );
}
