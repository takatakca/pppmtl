import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { usePPP } from "@/context/ppp-store";
import { locationSocial, restaurantLocations } from "@/config/locations";
import { CallbackSheet } from "@/components/support/callback-sheet";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | PPP Pizzeria Montréal" },
      {
        name: "description",
        content:
          "Contact a PPP Pizzeria location by phone or directions, or reach the PPP team about franchise, careers or a general question.",
      },
      { property: "og:title", content: "PPP Contact" },
      {
        property: "og:description",
        content: "Per-location contact info plus general brand, franchise and careers contact.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

type Topic = "location" | "general";
type GeneralTopic = "brand" | "franchise" | "careers" | "press";

/** Owner-supplied legacy support inbox — kept as a labeled fallback only. */
const LEGACY_OWNER_EMAIL = "on2go.ca@gmail.com";

function ContactPage() {
  const { t } = usePPP();
  const [topic, setTopic] = useState<Topic>("location");
  const [locSlug, setLocSlug] = useState(restaurantLocations[0]!.slug);
  const [generalTopic, setGeneralTopic] = useState<GeneralTopic>("brand");

  const location = restaurantLocations.find((l) => l.slug === locSlug) ?? restaurantLocations[0]!;
  const social = locationSocial(location);

  const generalLabels: Record<GeneralTopic, { en: string; fr: string }> = {
    brand: { en: "General question", fr: "Question générale" },
    franchise: { en: "Franchise", fr: "Franchise" },
    careers: { en: "Careers", fr: "Carrières" },
    press: { en: "Press", fr: "Presse" },
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <main className="pt-14 lg:pt-24">
        <section className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-[110rem] px-3 py-6 sm:px-6 sm:py-12">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("Contact PPP", "Contactez PPP")}
            </p>
            <h1 className="mt-1 font-display text-4xl uppercase leading-none sm:text-7xl">
              {t("Talk to us", "Parlez-nous")}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {t(
                "Choose a location for phone, directions and social — or reach the PPP team directly for franchise, careers or a general question.",
                "Choisissez un emplacement pour le téléphone, l'itinéraire et les réseaux sociaux — ou joignez directement l'équipe PPP pour la franchise, les carrières ou une question générale.",
              )}
            </p>
            <div className="mt-4">
              <CallbackSheet />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[110rem] px-3 py-6 sm:px-6 lg:py-12">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTopic("location")}
              className={`press-tap border px-4 py-2.5 font-display text-sm uppercase leading-none focus-ppp ${
                topic === "location"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("Location", "Emplacement")}
            </button>
            <button
              type="button"
              onClick={() => setTopic("general")}
              className={`press-tap border px-4 py-2.5 font-display text-sm uppercase leading-none focus-ppp ${
                topic === "general"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("General / corporate", "Général / corporatif")}
            </button>
          </div>

          {topic === "location" ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
              <div className="flex flex-row flex-wrap gap-1.5 lg:flex-col">
                {restaurantLocations.map((l) => (
                  <button
                    key={l.slug}
                    type="button"
                    onClick={() => setLocSlug(l.slug)}
                    className={`press-tap border px-3 py-2.5 text-left font-display text-sm uppercase leading-tight focus-ppp ${
                      locSlug === l.slug
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-foreground hover:border-primary"
                    }`}
                  >
                    {l.neighborhood}
                    {l.lifecycleStatus !== "open" && (
                      <span className="ml-1.5 text-[0.6rem] font-normal normal-case opacity-70">
                        {l.lifecycleStatus === "coming_soon"
                          ? t("(coming soon)", "(bientôt)")
                          : t("(closed)", "(fermé)")}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="border border-border bg-card p-4 sm:p-6">
                <h2 className="font-display text-2xl uppercase leading-none">
                  {location.displayName}
                </h2>
                <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {location.address}, {location.city}, {location.province}
                  {location.postalCode ? ` ${location.postalCode}` : ""}
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {location.phone ? (
                    <a
                      href={`tel:${location.phone.e164}`}
                      className="flex items-center gap-2 border border-border px-3 py-3 text-sm font-bold uppercase tracking-wide transition-colors hover:border-primary focus-ppp"
                    >
                      <Phone className="h-4 w-4 text-primary" />
                      {location.phone.display}
                    </a>
                  ) : (
                    <p className="flex items-center gap-2 border border-border px-3 py-3 text-xs text-muted-foreground">
                      {t("Phone not published yet", "Téléphone non publié")}
                    </p>
                  )}
                  {location.google.directionsUrl ? (
                    <a
                      href={location.google.directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 border border-border px-3 py-3 text-sm font-bold uppercase tracking-wide transition-colors hover:border-primary focus-ppp"
                    >
                      <MapPin className="h-4 w-4 text-primary" />
                      {t("Directions", "Itinéraire")}
                      <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ) : (
                    <p className="flex items-center gap-2 border border-border px-3 py-3 text-xs text-muted-foreground">
                      {t("Directions not available yet", "Itinéraire non disponible")}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  {social.facebook && (
                    <a
                      href={social.facebook}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Facebook"
                      className="border border-border p-2.5 transition-colors hover:border-primary focus-ppp"
                    >
                      <Facebook className="h-4 w-4" />
                    </a>
                  )}
                  {social.instagram && (
                    <a
                      href={social.instagram}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Instagram"
                      className="border border-border p-2.5 transition-colors hover:border-primary focus-ppp"
                    >
                      <Instagram className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {location.support.marketplaceNote && (
                  <p className="mt-4 border border-border bg-background p-3 text-xs text-muted-foreground">
                    {t(
                      "Ordered through Uber Eats, DoorDash or Skip? Use that app's support for refunds and delivery issues — visit /support for the right link.",
                      "Commandé via Uber Eats, DoorDash ou Skip? Utilisez le support de cette application pour les remboursements et les problèmes de livraison — visitez /support pour le bon lien.",
                    )}
                  </p>
                )}

                {location.lifecycleStatus === "closed" && (
                  <p className="mt-4 border border-border bg-background p-3 text-xs text-muted-foreground">
                    {t(
                      "This location is closed. Please contact an open PPP location instead.",
                      "Cet emplacement est fermé. Veuillez contacter un emplacement PPP ouvert.",
                    )}
                  </p>
                )}
                {location.lifecycleStatus === "coming_soon" && (
                  <p className="mt-4 border border-border bg-background p-3 text-xs text-muted-foreground">
                    {t(
                      "This location hasn't opened yet — no phone or hours to share yet.",
                      "Cet emplacement n'a pas encore ouvert — aucun téléphone ni horaire à partager pour l'instant.",
                    )}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
              <div className="flex flex-row flex-wrap gap-1.5 lg:flex-col">
                {(Object.keys(generalLabels) as GeneralTopic[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setGeneralTopic(k)}
                    className={`press-tap border px-3 py-2.5 text-left font-display text-sm uppercase leading-tight focus-ppp ${
                      generalTopic === k
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-foreground hover:border-primary"
                    }`}
                  >
                    {t(generalLabels[k].en, generalLabels[k].fr)}
                  </button>
                ))}
              </div>

              <div className="border border-border bg-card p-4 sm:p-6">
                <h2 className="font-display text-2xl uppercase leading-none">
                  {t(generalLabels[generalTopic].en, generalLabels[generalTopic].fr)}
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  {generalTopic === "franchise" &&
                    t(
                      "Interested in owning a PPP kitchen? Send your request and the PPP team will follow up.",
                      "Intéressé à posséder une cuisine PPP? Envoyez votre demande et l'équipe PPP fera un suivi.",
                    )}
                  {generalTopic === "careers" &&
                    t(
                      "Looking for kitchen, counter or delivery work? Tell us which location and role interests you.",
                      "À la recherche d'un poste en cuisine, au comptoir ou en livraison? Dites-nous quel emplacement et quel poste vous intéresse.",
                    )}
                  {generalTopic === "press" &&
                    t(
                      "Media and press enquiries can be sent to the address below.",
                      "Les demandes des médias peuvent être envoyées à l'adresse ci-dessous.",
                    )}
                  {generalTopic === "brand" &&
                    t(
                      "Anything else about PPP as a brand — send it here.",
                      "Toute autre question sur la marque PPP — envoyez-la ici.",
                    )}
                </p>

                <a
                  href={`mailto:${LEGACY_OWNER_EMAIL}`}
                  className="press-tap mt-4 inline-flex items-center gap-2 bg-primary px-4 py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
                >
                  <Mail className="h-4 w-4" />
                  {LEGACY_OWNER_EMAIL}
                </a>
                <p className="mt-2 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                  {t(
                    "Temporary inbox on file for PPP — a dedicated PPP email will replace it once confirmed.",
                    "Boîte courriel temporaire au dossier pour PPP — un courriel dédié PPP la remplacera une fois confirmé.",
                  )}
                </p>
              </div>
            </div>
          )}
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
