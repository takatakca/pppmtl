import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { restaurantLocations } from "@/config/locations";
import { SITE_URL } from "@/config/site";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/order", changefreq: "daily", priority: "0.9" },
          { path: "/menu", changefreq: "daily", priority: "0.9" },
          { path: "/offers", changefreq: "daily", priority: "0.8" },
          { path: "/gift-cards", changefreq: "monthly", priority: "0.6" },
          { path: "/track", changefreq: "weekly", priority: "0.6" },
          { path: "/phone-order", changefreq: "monthly", priority: "0.5" },
          { path: "/connect", changefreq: "monthly", priority: "0.5" },
          { path: "/around-the-web", changefreq: "monthly", priority: "0.5" },
          { path: "/locations", changefreq: "weekly", priority: "0.8" },
          ...restaurantLocations.map<SitemapEntry>((l) => ({
            path: `/locations/${l.slug}`,
            changefreq: "monthly",
            priority: l.lifecycleStatus === "open" ? "0.8" : "0.4",
          })),
          { path: "/about", changefreq: "monthly", priority: "0.6" },
          { path: "/franchise", changefreq: "monthly", priority: "0.6" },
          { path: "/careers", changefreq: "monthly", priority: "0.5" },
          { path: "/support", changefreq: "monthly", priority: "0.5" },
          { path: "/faq", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${SITE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
