import { cookies } from "next/headers";
import { AmbientGradient } from "@/components/brand/AmbientGradient";
import { Nav } from "@/components/layout/Nav";
import { LenisProvider } from "@/components/motion/LenisProvider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const theme = (jar.get("bread_pitt_theme")?.value as "light" | "dark") ?? "dark";

  return (
    <>
      <AmbientGradient />
      <LenisProvider />
      <Nav theme={theme} />
      <main className="relative mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8 md:pt-10">
        {children}
      </main>
      <footer className="mx-auto max-w-6xl px-6 pb-10 text-center">
        <p className="font-display italic text-xs text-[var(--color-ink-faint)]">
          Patience is the one ingredient you can't substitute.
        </p>
      </footer>
    </>
  );
}
