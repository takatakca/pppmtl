import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock, MapPin, Navigation, Phone, ShoppingBag } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { brandKitchens, itemForClover, useBrand } from "@/context/brand";
import { KITCHENS, brandPhone, hoursText, type Kitchen } from "@/config/brands";
import { MenuItemImage } from "@/components/menu/menu-item-image";
import { localizedName } from "@/lib/search";
import { trackExternalOrder } from "@/lib/analytics";
import type { MenuItem } from "@/data/menu";

const CHANNEL_ID = { ubereats: "uber_eats", doordash: "doordash", skip: "skip" } as const;

function addressLines(k: Kitchen) {
  return [k.street, `${k.city} (Québec) ${k.postalCode}`];
}

function directionsUrl(k: Kitchen) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${k.street}, ${k.city}, ${k.region} ${k.postalCode}`,
  )}`;
}

/** "Notre cuisine": the brand's own words, with two of its dishes. */
export function BrandAbout() {
  const { t, lang } = usePPP();
  const brand = useBrand();
  const l = lang === "fr" ? "fr" : "en";
  const pictures = brand.heroItems
    .slice(1, 3)
    .map(itemForClover)
    .filter((i): i is MenuItem => i !== null);
  const labels = brand.kitchens.map((k) => KITCHENS[k.kitchen].labelFr);
  const areas = t(labels.join(" and "), labels.join(" et à "));

  return (
    <section id="notre-cuisine" className="scroll-mt-28 border-t border-border">
      <div className="mx-auto grid max-w-[110rem] gap-8 px-3 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-16">
        <div className="min-w-0">
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t("Our kitchen", "Notre cuisine")}
          </p>
          <h2 className="mt-1 font-display text-3xl uppercase leading-none sm:text-5xl">
            {t(`Made in ${areas}`, `Préparé à ${areas}`)}
          </h2>
          <div className="mt-5 max-w-2xl space-y-4 text-sm text-muted-foreground sm:text-base">
            {brand.about[l].map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <p className="mt-5 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {t(
              "A real restaurant kitchen in Montréal · pickup and delivery",
              "Une vraie cuisine de restaurant à Montréal · cueillette et livraison",
            )}
          </p>
        </div>
        {pictures.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {pictures.map((item, i) => (
              <figure key={item.id} className={`border border-border bg-card ${i === 1 ? "mt-8" : ""}`}>
                <MenuItemImage src={item.image} alt={localizedName(item, lang)} variant="featured" />
                <figcaption className="px-2.5 py-2 font-display text-sm uppercase leading-tight">
                  {localizedName(item, lang)}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** "Commander": every kitchen of the brand with address, hours, phone, live delivery-app links, directions. */
export function BrandLocations() {
  const { t, lang } = usePPP();
  const brand = useBrand();
  const phone = brandPhone(brand);
  const kitchens = brandKitchens(brand, lang);

  return (
    <section id="commander" className="scroll-mt-28 border-t border-border bg-card/40">
      <div className="mx-auto max-w-[110rem] px-3 py-12 sm:px-6 lg:py-16">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
          {t("Order · Our addresses", "Commander · Nos adresses")}
        </p>
        <h2 className="mt-1 font-display text-3xl uppercase leading-none sm:text-5xl">
          {kitchens.length > 1
            ? t("Two kitchens in Montréal", "Deux cuisines à Montréal")
            : t("Our kitchen in Montréal", "Notre cuisine à Montréal")}
        </h2>
        <div className={`mt-6 grid gap-4 ${kitchens.length > 1 ? "lg:grid-cols-2" : "max-w-2xl"}`}>
          {kitchens.map(({ kitchen, links }) => (
            <article key={kitchen.id} id={kitchen.id} className="surface-panel flex flex-col p-5 sm:p-6">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                {kitchen.area}
              </p>
              <h3 className="mt-1 font-display text-2xl uppercase leading-none sm:text-3xl">
                {brand.name} · {lang === "fr" ? kitchen.labelFr : kitchen.labelEn}
              </h3>
              <address className="mt-4 space-y-2 not-italic text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {addressLines(kitchen)[0]}
                    <br />
                    {addressLines(kitchen)[1]}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{hoursText(kitchen, lang)}</span>
                </p>
                <a href={`tel:${phone.e164}`} className="flex items-center gap-2 hover:text-foreground focus-ppp">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  {phone.display}
                </a>
              </address>

              <div className="mt-5 flex flex-wrap gap-2">
                {kitchen.id === "ndg" && (
                  <Link
                    to="/order"
                    className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 font-display text-base uppercase leading-none text-primary-foreground focus-ppp"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {t("Order online", "Commander en ligne")}
                  </Link>
                )}
                {links.map(({ link, name, url }) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackExternalOrder(CHANNEL_ID[link.platform])}
                    className="inline-flex items-center gap-1.5 border border-border px-4 py-2.5 font-display text-base uppercase leading-none transition-colors hover:border-primary focus-ppp"
                  >
                    {t(`Order on ${name}`, `Commander sur ${name}`)}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                ))}
                <a
                  href={directionsUrl(kitchen)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground focus-ppp"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  {t("Directions", "Itinéraire")}
                </a>
              </div>
              {links.length === 0 && kitchen.id !== "ndg" && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t(
                    "Delivery apps coming back soon at this address. Call us to order.",
                    "Les applications de livraison reviennent bientôt à cette adresse. Appelez-nous pour commander.",
                  )}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
