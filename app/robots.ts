import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.PUBLIC_BASE_URL ?? "https://breadpitt.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/settings", "/login", "/setup", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
