import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { currentIsPreview, currentOrigin } from "@/lib/brand/current";

/** robots.txt of the domain being visited (each brand points to its own sitemap; previews are never crawled). */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = currentIsPreview()
          ? "User-agent: *\nDisallow: /\n"
          : [
              "User-agent: *",
              "Allow: /",
              "Disallow: /dev/",
              "Disallow: /account",
              "Disallow: /admin",
              "",
              `Sitemap: ${currentOrigin()}/sitemap.xml`,
              "",
            ].join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
