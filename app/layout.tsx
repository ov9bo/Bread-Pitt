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

const SITE_URL = process.env.PUBLIC_BASE_URL ?? "https://breadpitt.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Bread Pitt — sourdough journal, starter tracker & discard recipes",
    template: "%s · Bread Pitt",
  },
  description:
    "A hand-bound sourdough journal: track your starter day by day, schedule bakes backwards from when bread should be ready, and turn discard into pancakes, crackers, and pizza.",
  applicationName: "Bread Pitt",
  authors: [{ name: "Bread Pitt" }],
  keywords: [
    "sourdough",
    "sourdough starter",
    "sourdough journal",
    "bread baking",
    "fermentation",
    "discard recipes",
    "sourdough discard",
    "bake schedule",
    "levain",
    "bread troubleshooting",
    "starter maintenance",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Bread Pitt",
    title: "Bread Pitt — sourdough journal, starter tracker & discard recipes",
    description:
      "A hand-bound sourdough journal: track your starter, schedule bakes backwards, and turn discard into recipes.",
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bread Pitt — sourdough journal",
    description:
      "Track your starter, schedule your bakes, and turn discard into pancakes, crackers, and pizza.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
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
