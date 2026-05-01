import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bread Pitt — your sourdough companion",
  description:
    "A hand-bound journal for living, breathing bread. Track your starter, your folds, your bakes.",
  applicationName: "Bread Pitt",
  authors: [{ name: "Bread Pitt" }],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#171311" },
    { media: "(prefers-color-scheme: light)", color: "#faf4e7" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = (cookieStore.get("bread_pitt_theme")?.value as "light" | "dark") ?? "dark";

  return (
    <html
      lang="en"
      data-theme={theme}
      suppressHydrationWarning
      className={`${fraunces.variable} ${geist.variable} ${jetbrains.variable}`}
    >
      <head>
        <script
          // Mark theme as ready *after* first paint so transitions don't fire on initial mount.
          dangerouslySetInnerHTML={{
            __html: `requestAnimationFrame(()=>document.documentElement.classList.add("theme-ready"));`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
