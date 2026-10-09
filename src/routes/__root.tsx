import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { PPPProvider, usePPP } from "../context/ppp-store";
import { CustomerSessionProvider } from "../lib/customer/session";
import { AcquisitionPopup } from "../components/acquisition/acquisition-popup";
import { htmlLangFor } from "../i18n/types";
import { BrandProvider } from "../context/brand";
import { currentBrand, currentBrandId, currentIsPreview } from "../lib/brand/current";
import { brandMarkDataUrl } from "../components/brand/brand-mark";
import type { Brand, BrandId } from "../config/brands";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

/** Brand colours over the PPP theme (styles.css): buttons, focus ring, gradient words. */
function brandCss(brand: Brand): string {
  return (
    `:root{--primary:${brand.primary};--ring:${brand.primary};--accent:${brand.accent};` +
    `--gradient-flame:linear-gradient(100deg,${brand.accent},${brand.accent2});` +
    `--shadow-glow:0 0 0 1px ${brand.primary}59,0 18px 50px -18px ${brand.primary}99}`
  );
}

/** Head of a franchise brand (PPP keeps its own head, pppHead below). */
function franchiseHead(brand: Brand, preview: boolean) {
  const title = `${brand.name} | ${brand.cuisine.fr.join(", ")} · Montréal`;
  return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title },
      { name: "description", content: brand.description.fr },
      { name: "author", content: brand.name },
      { property: "og:site_name", content: brand.name },
      { property: "og:title", content: title },
      { property: "og:description", content: brand.description.fr },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fr_CA" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: brand.name },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      ...(preview ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;500;600;700;800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: brandMarkDataUrl(brand) },
    ],
    styles: [{ children: brandCss(brand) }],
  };
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient; brandId?: BrandId }>()({
  // The domain picks the brand (src/config/brands.ts); every page reads it from the router context.
  beforeLoad: () => ({ brandId: currentBrandId() }),
  // Preview addresses (sslip.io, preview.<domain>, localhost) are never indexed.
  headers: () => (currentIsPreview() ? { "X-Robots-Tag": "noindex, nofollow" } : undefined),
  head: () => {
    const brand = currentBrand();
    if (brand.id !== "ppp") return franchiseHead(brand, currentIsPreview());
    return pppHead();
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function pppHead() {
  return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PPP Pizzeria Montreal NDG | Poulet, Pizza & Poutine" },
      {
        name: "description",
        content:
          "Order PPP Pizzeria Montreal (Notre-Dame-de-Grâce) for pickup or delivery. Rotisserie chicken, pizza, poutine, shawarma combos, PPP Rewards and gift cards.",
      },
      { name: "author", content: "PPP Pizzeria Montreal" },
      { property: "og:title", content: "PPP Pizzeria Montreal NDG | Poulet, Pizza & Poutine" },
      {
        property: "og:description",
        content:
          "Order pickup or delivery from 6280 Av. Somerled, Notre-Dame-de-Grâce, and earn PPP Rewards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "PPP NDG" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icons/ppp-512.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  };
}

function RootShell({ children }: { children: ReactNode }) {
  // French first on the franchise domains (Québec); PPP's site keeps English first.
  const { brandId } = Route.useRouteContext();
  return (
    <html lang={brandId && brandId !== "ppp" ? "fr-CA" : "en"} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient, brandId } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider brandId={brandId ?? "ppp"}>
        <PPPProvider>
          <CustomerSessionProvider>
            <HtmlLangSync />
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            {/* PPP's own sign-up offer: only on PPP's domain. */}
            {(brandId ?? "ppp") === "ppp" && <AcquisitionPopup />}
          </CustomerSessionProvider>
        </PPPProvider>
      </BrandProvider>
    </QueryClientProvider>
  );
}

/**
 * Keeps <html lang> in sync with the active app language. Runs client-side only
 * (after hydration) so SSR output stays deterministic ("en") and hydration-safe.
 */
function HtmlLangSync() {
  const { lang } = usePPP();

  useEffect(() => {
    document.documentElement.lang = htmlLangFor(lang);
    // Short cross-fade so switching language reads as one smooth change of copy
    // rather than a flicker. State (cart, location, account) is never touched.
    const root = document.documentElement;
    root.classList.add("lang-swap");
    const timer = window.setTimeout(() => root.classList.remove("lang-swap"), 260);
    return () => {
      window.clearTimeout(timer);
      root.classList.remove("lang-swap");
    };
  }, [lang]);

  return null;
}
