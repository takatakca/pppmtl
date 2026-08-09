import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin, Phone, Star } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { OrderSheet } from "@/components/layout/order-sheet";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { StayInTheLoop } from "@/components/marketing/stay-in-the-loop";
import { pppSocials } from "@/components/home/follow-ppp";
import { GoogleGlyph } from "@/components/brand/social-icons";
import { usePPP } from "@/context/ppp-store";
import { pppBusiness } from "@/config/business";
import { externalPresence, orderingChannels } from "@/config/external-presence";
import { trackExternalOrder, trackSocialLink } from "@/lib/analytics";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Find PPP Pizzeria Online | NDG Montréal" },
      {
        name: "description",
        content:
          "Order PPP Pizzeria in NDG direct, or on Uber Eats, DoorDash and Skip. Follow PPP on Instagram, TikTok, Facebook and X, and find us on Google.",
      },
      { property: "og:title", content: "Find PPP Pizzeria Online" },
      {
        property: "og:description",
        content: "Every way to order, follow and reach PPP Pizzeria at 6280 Av. Somerled, NDG.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pppmtl.lovable.app/connect" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://pppmtl.lovable.app/connect" }],
  }),
  component: ConnectPage,
});

function ConnectPage() {
  const { t } = usePPP();
  const { googleProfile, address, phone } = pppBusiness;

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <PPPHeader />
      <main className="mx-auto max-w-[110rem] px-3 pt-24 sm:px-6 lg:pt-28">
        <h1 className="font-display text-5xl uppercase leading-[0.85] sm:text-7xl">
          {t("Find PPP", "Trouver PPP")}{" "}
          <span className="text-flame">{t("online", "en ligne")}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          {t(
            "Order PPP Pizzeria in Notre-Dame-de-Grâce for pickup or delivery — direct with PPP, or on Uber Eats, DoorDash and Skip.",
            "Commandez PPP Pizzeria à Notre-Dame-de-Grâce pour cueillette ou livraison — direct avec PPP, ou sur Uber Eats, DoorDash et Skip.",
          )}
        </p>

        <section className="mt-8">
          <h2 className="font-display text-3xl uppercase leading-none">
            {t("Order online", "Commander en ligne")}
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <Link
              to="/order"
              className="press-tap cta-glow flex items-center justify-between gap-3 bg-primary p-5 font-display text-2xl uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t("PPP Direct", "PPP Direct")}
              <ArrowUpRight className="h-5 w-5" />
            </Link>
            {orderingChannels.map((c) => (
              <a
                key={c.id}
                href={c.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackExternalOrder(c.id)}
                aria-label={c.labelEn}
                className="press-tap group flex flex-col justify-between gap-4 border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary focus-ppp"
              >
                <img
                  src={c.logo ?? ""}
                  alt={c.name}
                  className="h-9 w-auto self-start transition-transform group-hover:-translate-y-1"
                />
                <span className="flex items-center gap-1 font-display text-xl uppercase leading-none">
                  {c.name}
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-3xl uppercase leading-none">{t("Social", "Réseaux")}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {pppSocials.map((s) => (
              <li key={s.id}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialLink(s.id)}
                  aria-label={`Visit PPP Pizzeria on ${s.name}`}
                  className="group inline-flex items-center gap-2 border border-border px-5 py-3 transition-transform duration-200 hover:scale-[1.08] hover:border-primary focus-ppp"
                >
                  <s.Icon className="h-5 w-5 text-primary" />
                  <span className="font-display text-lg uppercase leading-none">{s.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 grid gap-2 lg:grid-cols-2">
          <div className="border border-border bg-card p-5">
            <h2 className="font-display text-3xl uppercase leading-none">
              {t("Reviews & discovery", "Avis et répertoires")}
            </h2>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-accent text-accent" />
              {googleProfile.rating?.toFixed(1)} ·{" "}
              {t(
                `${googleProfile.reviewCount} Google reviews`,
                `${googleProfile.reviewCount} avis Google`,
              )}
              <span className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                {t("synced", "màj")} {googleProfile.lastSyncedAt}
              </span>
            </p>
            <ul className="mt-4 grid gap-2">
              {[
                { name: "Google", href: externalPresence.discovery.google },
                { name: "Birdeye", href: externalPresence.discovery.birdeye },
                { name: "Restoenligne", href: externalPresence.discovery.restoEnLigne },
              ].map((d) => (
                <li key={d.name}>
                  <a
                    href={d.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between border border-border px-4 py-3 text-sm uppercase tracking-widest transition-colors hover:border-primary focus-ppp"
                  >
                    {d.name}
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-border bg-card p-5">
            <h2 className="font-display text-3xl uppercase leading-none">
              {t("Contact & Google", "Contact et Google")}
            </h2>
            <address className="mt-3 space-y-2 not-italic text-sm">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  {address.line1}
                  <br />
                  {address.city}, {address.province} {address.postalCode}
                </span>
              </p>
              <a href={phone.href} className="flex items-center gap-2 hover:text-accent focus-ppp">
                <Phone className="h-4 w-4 text-primary" />
                {phone.display}
              </a>
            </address>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <a
                href={externalPresence.discovery.google}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialLink("google")}
                className="flex items-center justify-center gap-2 border border-border px-4 py-3 font-display text-lg uppercase leading-none hover:border-primary focus-ppp"
              >
                <GoogleGlyph className="h-4 w-4 text-primary" />
                {t("View on Google", "Voir sur Google")}
              </a>
              <a
                href={pppBusiness.google.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border border-border px-4 py-3 font-display text-lg uppercase leading-none hover:border-primary focus-ppp"
              >
                {t("Get directions", "Itinéraire")}
              </a>
              <a
                href={pppBusiness.google.reviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border border-border px-4 py-3 font-display text-lg uppercase leading-none hover:border-primary focus-ppp sm:col-span-2"
              >
                {t("Read reviews", "Lire les avis")}
              </a>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <StayInTheLoop />
        </section>
      </main>
      <PPPFooter />
      <MobileOrderBar />
      <SearchOverlay />
      <LocationSheet />
      <OrderSheet />
    </div>
  );
}
