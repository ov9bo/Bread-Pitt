import { AmbientGradient } from "@/components/brand/AmbientGradient";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AmbientGradient />
      <main className="relative grid min-h-screen place-items-center px-6">{children}</main>
    </>
  );
}
