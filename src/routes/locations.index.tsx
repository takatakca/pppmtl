import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { usePPP } from "@/context/ppp-store";
import { canOrder, comingSoonLocations, openLocations, pastLocations } from "@/config/locations";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/locations/")({
  head: () => ({
    meta: [
      { title: "PPP Pizzeria Locations | Montréal & Area" },
      {
        name: "description",
        content:
          "Every PPP Pizzeria location: open restaurants in Notre-Dame-de-Grâce and Sainte-Catherine E, stores coming soon, and our original Montréal-Nord kitchen.",
      },
      { property: "og:title", content: "PPP Pizzeria Locations" },
      {
        property: "og:description",
        content: "Find an open PPP, see what's coming soon, and read our location history.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/locations") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/locations") }],
  }),
  component: LocationsPage,
});

function LocationsPage() {
  const { t } = usePPP();

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <PPPHeader />
      <main className="mx-auto max-w-[110rem] px-3 pt-24 sm:px-6 lg:pt-28">
        <h1 className="font-display text-5xl uppercase leading-[0.85] sm:text-7xl">
          {t("Our locations", "Nos emplacements")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          {t(
            `${openLocations.length} open, ${comingSoonLocations.length} coming soon, ${pastLocations.length} part of our story.`,
            `${openLocations.length} ouverts, ${comingSoonLocations.length} bientôt ouverts, ${pastLocations.length} dans notre histoire.`,
          )}
        </p>

        <Section
          title={t("Open now", "Ouverts")}
          locations={openLocations}
          badgeClass="border-primary text-primary"
        />
        <Section
          title={t("Coming soon", "Bientôt ouvert")}
          locations={comingSoonLocations}
          badgeClass="border-accent text-accent"
        />
        <Section
          title={t("Past locations", "Anciens emplacements")}
          locations={pastLocations}
          badgeClass="border-border text-muted-foreground"
        />
      </main>
      <PPPFooter />
      <MobileOrderBar />
      <SearchOverlay />
      <LocationSheet />
      <OrderSheet />
    </div>
  );
}

function Section({
  title,
  locations,
  badgeClass,
}: {
  title: string;
  locations: typeof openLocations;
  badgeClass: string;
}) {
  const { t } = usePPP();
  if (locations.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl uppercase leading-none">{title}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((l) => (
          <li key={l.id} className="border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-xl uppercase leading-tight">{l.neighborhood}</p>
              <span
                className={`shrink-0 border px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-widest ${badgeClass}`}
              >
                {l.lifecycleStatus === "open"
                  ? t("Open", "Ouvert")
                  : l.lifecycleStatus === "coming_soon"
                    ? t("Coming soon", "Bientôt")
                    : t("Closed", "Fermé")}
              </span>
            </div>
            <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                {l.address}, {l.city} ({l.province})
              </span>
            </p>
            <Link
              to="/locations/$slug"
              params={{ slug: l.slug }}
              className="mt-3 inline-block border border-border px-4 py-2 text-xs font-bold uppercase tracking-widest focus-ppp hover:border-primary"
            >
              {canOrder(l)
                ? t("Order / details", "Commander / détails")
                : t("View details", "Voir les détails")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
