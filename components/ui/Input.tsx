import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const baseField =
  "w-full bg-[var(--color-crumb)]/60 text-[var(--color-ink)] " +
  "placeholder:text-[var(--color-ink-faint)] " +
  "border border-[var(--color-line)] rounded-xl " +
  "px-4 py-2.5 text-sm " +
  "focus:outline-none focus:border-[var(--color-crust)] " +
  "focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-crust)_20%,transparent)] " +
  "transition-[border-color,box-shadow] duration-300 " +
  "disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(baseField, className)} {...rest} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(baseField, "min-h-24 resize-y leading-relaxed", className)}
      {...rest}
    />
  );
});

export function Label({
  children,
  htmlFor,
  hint,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="block text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)] mb-2">
        {children}
      </span>
      {hint && (
        <span className="block text-xs text-[var(--color-ink-muted)] mb-2 -mt-1">
          {hint}
        </span>
      )}
    </label>
  );
}

export function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}
