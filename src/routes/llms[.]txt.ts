import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { currentBrand } from "@/lib/brand/current";
import { hubLlmsTxt, llmsTxt } from "@/lib/brand/facts";

/** https://llmstxt.org: plain facts for AI assistants (name, addresses, hours, phone, order links, dishes). */
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const brand = currentBrand();
        const body = brand.id === "ppp" ? hubLlmsTxt() : llmsTxt(brand);
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
