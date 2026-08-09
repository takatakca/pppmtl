import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ExternalLink, MapPin, Phone } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { usePPP } from "@/context/ppp-store";
import {
  canOrder,
  locationBySlug,
  locationSocial,
  restaurantLocations,
} from "@/config/locations";
import { orderingChannels } from "@/config/external-presence";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/locations/$slug")({
  loader: ({ params }) => {
    const loc = locationBySlug(params.slug);
    if (!loc) throw notFound();
    return loc;
  },
  head: ({ loaderData }) => {
    const loc = loaderData ?? restaurantLocations[0]!;
    return {
      meta: [
        { title: loc.seo.titleEn },
        { name: "description", content: loc.seo.descriptionEn },
        { property: "og:title", content: loc.seo.titleEn },
        { property: "og:description", content: loc.seo.descriptionEn },
        { property: "og:type", content: "restaurant.restaurant" },
        { property: "og:url", content: canonicalUrl(`/locations/${loc.slug}`) },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: canonicalUrl(`/locations/${loc.slug}`) }],
      scripts:
        loc.lifecycleStatus === "open"
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Restaurant",
                  name: loc.displayName,
                  telephone: loc.phone?.e164 ?? undefined,
                  address: {
                    "@type": "PostalAddress",
                    streetAddress: loc.address,
                    addressLocality: loc.city,
                    addressRegion: loc.province,
                    postalCode: loc.postalCode ?? undefined,
                    addressCountry: "CA",
                  },
                  hasMap: loc.google.listingUrl ?? loc.google.directionsUrl ?? undefined,
                }),
              },
            ]
          : [],
    };
  },
  component: LocationDetailPage,
});

function LocationDetailPage() {
  const loc = Route.useLoaderData();
  const { t, openOrderSheet } = usePPP();
  const social = locationSocial(loc);
  const orderable = canOrder(loc);
  const isClosed = loc.lifecycleStatus === "closed" || loc.lifecycleStatus === "temporarily_closed";
  const isComingSoon = loc.lifecycleStatus === "coming_soon";
  const marketplaces = [
    { id: "uber_eats", url: loc.ordering.uberEats },
    { id: "doordash", url: loc.ordering.doorDash },
    { id: "skip", url: loc.ordering.skip },
  ]
    .map((m) => ({ ...m, meta: orderingChannels.find((c) => c.id === m.id) }))
    .filter((m) => m.url);

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <PPPHeader />
      <main className="mx-auto max-w-[110rem] px-3 pt-24 sm:px-6 lg:pt-28">
        <Link
          to="/locations"
          className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp"
        >
          ← {t("All locations", "Tous les emplacements")}
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-5xl uppercase leading-[0.85] sm:text-7xl">
              {loc.neighborhood}
            </h1>
            <p className="mt-1 font-display text-lg uppercase tracking-[0.2em] text-accent">
              {loc.displayName}
            </p>
          </div>
          <span
            className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${
              isClosed
                ? "border-border text-muted-foreground"
                : isComingSoon
                  ? "border-accent text-accent"
                  : "border-primary text-primary"
            }`}
          >
            {isClosed ? t("Closed", "Fermé") : isComingSoon ? t("Coming soon", "Bientôt ouvert") : t("Open", "Ouvert")}
          </span>
        </div>

        {loc.storyEn && (
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            {t(loc.storyEn, loc.storyFr ?? loc.storyEn)}
          </p>
        )}

        {isClosed && (
          <div className="mt-6 border border-dashed border-border p-5">
            <p className="font-display text-xl uppercase leading-none">
              {t("Part of our story", "Un chapitre de notre histoire")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "This location is no longer operating. Its address and phone number are historical and cannot be used to place an order.",
                "Cet emplacement n'est plus en activité. Son adresse et son numéro sont historiques et ne peuvent pas servir à commander.",
              )}
            </p>
            <Link
              to="/locations"
              className="mt-4 inline-block bg-primary px-5 py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t("Find another PPP location", "Trouver un autre emplacement PPP")}
            </Link>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <address className="not-italic">
              <p className="flex items-start gap-2 text-base">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <span>
                  {loc.address}
                  <br />
                  {loc.city}, {loc.province} {loc.postalCode ?? ""}
                </span>
              </p>
              {loc.phone ? (
                <a
                  href={`tel:${loc.phone.e164}`}
                  className="mt-2 flex items-center gap-2 text-base hover:text-accent focus-ppp"
                >
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  {loc.phone.display}
                </a>
              ) : (
                <p className="mt-2 flex items-center gap-2 text-base text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  {t("Phone not confirmed", "Téléphone non confirmé")}
                </p>
              )}
            </address>

            <p className="mt-4 text-sm text-muted-foreground">
              {loc.statusNote ??
                t("Hours not confirmed for this location yet.", "Heures non confirmées pour cet emplacement.")}
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {orderable ? (
                <button
                  onClick={openOrderSheet}
                  className="bg-primary px-5 py-3.5 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
                >
                  {t("Order", "Commander")}
                </button>
              ) : isComingSoon ? (
                <button
                  disabled
                  className="border border-dashed border-border px-5 py-3.5 text-center font-display text-lg uppercase leading-none text-muted-foreground"
                >
                  {t("Ordering coming soon", "Commande bientôt disponible")}
                </button>
              ) : null}
              {(loc.google.directionsUrl ?? undefined) && (
                <a
                  href={loc.google.directionsUrl!}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 border border-border px-5 py-3.5 font-display text-lg uppercase leading-none focus-ppp hover:border-primary"
                >
                  {t("Directions", "Itinéraire")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {!isClosed && marketplaces.length === 0 && (
              <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
                {t("PPP Direct only", "PPP Direct seulement")}
              </p>
            )}

            {marketplaces.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {marketplaces.map((m) => (
                  <li key={m.id}>
                    <a
                      href={m.url!}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest focus-ppp hover:border-primary"
                    >
                      {m.meta?.name ?? m.id}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {(social.facebook || social.instagram || social.tiktok || social.x) && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {social.instagram && (
                  <li>
                    <a href={social.instagram} target="_blank" rel="noreferrer" className="border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest focus-ppp hover:border-primary">
                      Instagram
                    </a>
                  </li>
                )}
                {social.facebook && (
                  <li>
                    <a href={social.facebook} target="_blank" rel="noreferrer" className="border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest focus-ppp hover:border-primary">
                      Facebook
                    </a>
                  </li>
                )}
                {social.tiktok && (
                  <li>
                    <a href={social.tiktok} target="_blank" rel="noreferrer" className="border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest focus-ppp hover:border-primary">
                      TikTok
                    </a>
                  </li>
                )}
                {social.x && (
                  <li>
                    <a href={social.x} target="_blank" rel="noreferrer" className="border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest focus-ppp hover:border-primary">
                      X
                    </a>
                  </li>
                )}
              </ul>
            )}
          </div>

          <div className="border border-border">
            {loc.google.embedUrl ? (
              <iframe
                title={t(`Map to ${loc.neighborhood}`, `Carte vers ${loc.neighborhood}`)}
                src={loc.google.embedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-72 w-full grayscale-[0.35] contrast-[1.1] lg:h-full"
              />
            ) : (
              <div className="flex h-72 items-center justify-center p-6 text-center text-sm text-muted-foreground lg:h-full">
                {t("Map not available for this location yet.", "Carte non disponible pour cet emplacement.")}
              </div>
            )}
          </div>
        </div>
      </main>
      <PPPFooter />
      <MobileOrderBar />
      <SearchOverlay />
      <LocationSheet />
      <OrderSheet />
    </div>
  );
}
