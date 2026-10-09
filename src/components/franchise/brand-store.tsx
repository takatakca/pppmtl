import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  Phone,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { brandKitchens, railItems, useBrand } from "@/context/brand";
import {
  KITCHENS,
  defaultKitchen,
  listKitchens,
  brandPhone,
  hoursText,
  formatTime,
  type Brand,
  type KitchenId,
} from "@/config/brands";
import {
  brandItems,
  brandsInKitchen,
  factualAbout,
  itemForClover,
  primaryOrderUrl,
} from "@/lib/brand/facts";
import { brandMarkSvg } from "@/components/brand/brand-mark";
import { MenuItemImage } from "@/components/menu/menu-item-image";
import { ItemSheet } from "@/components/order/item-sheet";
import { cartTotals } from "@/lib/cart";
import { menuRepository } from "@/lib/menu-repository";
import { trackExternalOrder } from "@/lib/analytics";
import type { MenuItem } from "@/data/menu";

const CHANNEL_ID = { ubereats: "uber_eats", doordash: "doordash", skip: "skip" } as const;

/** Square brand mark (the logo) of any brand, not only the site's own. */
export function BrandMark({ brand, className = "" }: { brand: Brand; className?: string }) {
  if (brand.id === "ppp") {
    return (
      <img
        src="/brand/ppp-pizzeria-logo.png"
        alt="PPP Pizzeria"
        className={`bg-black object-contain p-1 ${className}`}
        loading="lazy"
      />
    );
  }
  return (
    <span
      className={`block overflow-hidden [&>svg]:h-full [&>svg]:w-full ${className}`}
      // Built from the brand config only (no user input).
      dangerouslySetInnerHTML={{ __html: brandMarkSvg(brand) }}
    />
  );
}

function bannerItem(brand: Brand): MenuItem | null {
  if (brand.id === "ppp") return menuRepository.getPopularItems(null, 1)[0] ?? null;
  return itemForClover(brand.heroItems[0] ?? "") ?? brandItems(brand)[0] ?? null;
}

/** The 400 px photo (cards and rows); the 1200 px one stays for the banner. */
function thumb(src: string): string {
  return src.replace(/-1200\.webp$/, "-400.webp");
}

function money(n: number | null, lang: string) {
  if (n === null) return "";
  return lang === "fr" ? `${n.toFixed(2).replace(".", ",")} $` : `$${n.toFixed(2)}`;
}

/** One menu row, DoorDash style: words left, photo right, a round "+" on the photo. */
function DishRow({ item, onOpen }: { item: MenuItem; onOpen: (i: MenuItem) => void }) {
  const { lang } = usePPP();
  const name = lang === "fr" ? item.nameFr : item.nameEn;
  const description = lang === "fr" ? item.descriptionFr : item.descriptionEn;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="group flex h-full w-full items-stretch gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary focus-ppp"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="line-clamp-2 font-semibold leading-snug">{name}</span>
          {description && (
            <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</span>
          )}
          <span className="mt-auto pt-2 font-semibold text-accent">{money(item.price, lang)}</span>
        </span>
        <span className="relative shrink-0">
          <MenuItemImage src={thumb(item.image)} alt={name} variant="list" className="rounded-lg" />
          <span
            aria-hidden
            className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-background text-foreground shadow-lg ring-1 ring-border transition-transform group-hover:scale-110"
          >
            <Plus className="h-4 w-4" />
          </span>
        </span>
      </button>
    </li>
  );
}

/** "Commander" buttons: Clover direct first, then the live delivery-app pages, then the phone. */
function OrderButtons({
  brand,
  origin,
  compact = false,
}: {
  brand: Brand;
  origin: string;
  compact?: boolean;
}) {
  const { t, lang } = usePPP();
  const phone = brandPhone(brand);
  const primary = primaryOrderUrl(origin);
  const hasNdg = brand.kitchens.some((k) => k.kitchen === "ndg");
  const apps = useMemo(() => {
    const seen = new Set<string>();
    return brandKitchens(brand, lang)
      .flatMap((k) => k.links)
      .filter((l) => (seen.has(l.link.platform) ? false : (seen.add(l.link.platform), true)));
  }, [brand, lang]);
  const btn = compact ? "px-3.5 py-2 text-sm" : "px-5 py-3 text-base";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(hasNdg || primary.external) && (
        <a
          href={primary.external ? primary.url : "/order"}
          {...(primary.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={`inline-flex items-center gap-2 rounded-full bg-primary font-display uppercase leading-none text-primary-foreground focus-ppp ${btn}`}
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <ShoppingBag className="h-4 w-4" />
          {t("Order online", "Commander en ligne")}
        </a>
      )}
      {apps.map(({ link, name, url }) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackExternalOrder(CHANNEL_ID[link.platform])}
          className={`inline-flex items-center gap-1.5 rounded-full border border-border font-semibold transition-colors hover:border-primary focus-ppp ${btn}`}
        >
          {name}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      ))}
      <a
        href={`tel:${phone.e164}`}
        className={`inline-flex items-center gap-1.5 rounded-full border border-border font-semibold text-muted-foreground transition-colors hover:text-foreground focus-ppp ${btn}`}
      >
        <Phone className="h-3.5 w-3.5" />
        {phone.display}
      </a>
    </div>
  );
}

/**
 * A brand's store page, like a delivery app's: banner, logo, name, one line of facts, order buttons, a sticky row
 * of menu sections, then the dishes. "À propos" and the addresses stay folded until opened.
 */
export function BrandStorePage({ brand, origin }: { brand: Brand; origin: string }) {
  const { t, lang } = usePPP();
  const [active, setActive] = useState<MenuItem | null>(null);
  const l = lang === "fr" ? "fr" : "en";
  const banner = bannerItem(brand);
  const kitchens = brand.kitchens.map((k) => KITCHENS[k.kitchen]);
  const phone = brandPhone(brand);
  const hasNdg = brand.kitchens.some((k) => k.kitchen === "ndg");
  const rails = brand.menu.map((rail, i) => ({
    rail,
    id: `section-${i + 1}`,
    items: railItems(rail),
  }));

  return (
    <div className="pt-14 lg:pt-24">
      <section aria-labelledby="brand-name">
        <div className="relative h-40 overflow-hidden sm:h-60 lg:h-72">
          {banner && (
            <MenuItemImage src={banner.image} alt="" variant="hero" priority className="h-full" />
          )}
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent"
          />
        </div>
        <div className="relative mx-auto -mt-12 max-w-6xl px-4 sm:-mt-14 sm:px-6">
          <BrandMark
            brand={brand}
            className="h-20 w-20 rounded-2xl ring-4 ring-background sm:h-24 sm:w-24"
          />
          <h1
            id="brand-name"
            className="mt-3 font-display text-4xl uppercase leading-none sm:text-6xl"
          >
            {brand.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {brand.cuisine[l].join(" · ")} · $ ·{" "}
            {kitchens.map((k) => (l === "fr" ? k.labelFr : k.labelEn)).join(" · ")}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {kitchens.map((k) => (
              <span key={k.id} className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-accent" />
                <span className="text-muted-foreground">
                  {l === "fr" ? k.labelFr : k.labelEn} ·{" "}
                  {t(
                    `daily ${formatTime(k.hours.opens, "en")}–${formatTime(k.hours.closes, "en")}`,
                    `tous les jours ${formatTime(k.hours.opens, "fr")} – ${formatTime(k.hours.closes, "fr")}`,
                  )}
                </span>
              </span>
            ))}
          </p>
          <div className="mt-4">
            <OrderButtons brand={brand} origin={origin} />
          </div>
        </div>
      </section>

      {rails.length > 0 && (
        <nav
          aria-label={t("Menu sections", "Sections du menu")}
          className="sticky top-14 z-40 mt-6 border-y border-border bg-background/95 backdrop-blur-xl lg:top-24"
        >
          <ul className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
            {rails.map(({ rail, id }) => (
              <li key={id} className="shrink-0">
                <a
                  href={`#${id}`}
                  className="inline-block rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-primary hover:text-primary-foreground focus-ppp"
                >
                  {rail.title[l]}
                </a>
              </li>
            ))}
            <li className="shrink-0">
              <a
                href="#a-propos"
                className="inline-block rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground focus-ppp"
              >
                {t("About & addresses", "À propos et adresses")}
              </a>
            </li>
          </ul>
        </nav>
      )}

      <div id="menu" className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        {rails.map(({ rail, id, items }) => (
          <section
            key={id}
            id={id}
            aria-labelledby={`${id}-title`}
            className="scroll-mt-32 pt-8 lg:scroll-mt-44"
          >
            <h2
              id={`${id}-title`}
              className="flex items-baseline gap-3 font-display text-2xl uppercase leading-none sm:text-3xl"
            >
              {rail.title[l]}
              <span className="font-sans text-xs font-semibold normal-case tracking-normal text-muted-foreground">
                {t(`${items.length} dishes`, `${items.length} plats`)}
              </span>
            </h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <DishRow key={item.id} item={item} onOpen={setActive} />
              ))}
            </ul>
          </section>
        ))}

        <section
          id="a-propos"
          aria-labelledby="a-propos-title"
          className="scroll-mt-32 pt-10 lg:scroll-mt-44"
        >
          <h2 id="a-propos-title" className="sr-only">
            {t("About and addresses", "À propos et adresses")}
          </h2>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            <details className="group p-4 sm:p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold focus-ppp">
                {t(`About ${brand.name}`, `À propos de ${brand.name}`)}
                <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                <p>{factualAbout(brand, l)}</p>
                {brand.about[l].map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </details>
            <details className="group p-4 sm:p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold focus-ppp">
                {t("Addresses, hours and phone", "Adresses, heures et téléphone")}
                <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
              </summary>
              <div className={`mt-3 grid gap-4 ${kitchens.length > 1 ? "sm:grid-cols-2" : ""}`}>
                {brandKitchens(brand, lang).map(({ kitchen, links }) => (
                  <address key={kitchen.id} className="not-italic text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      {brand.name} · {l === "fr" ? kitchen.labelFr : kitchen.labelEn}
                    </p>
                    <p className="mt-1 flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>
                        {kitchen.street}
                        <br />
                        {kitchen.city} (Québec) {kitchen.postalCode}
                      </span>
                    </p>
                    <p className="mt-1 flex items-start gap-2">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {hoursText(kitchen, lang)}
                    </p>
                    <a
                      href={`tel:${phone.e164}`}
                      className="mt-1 flex items-center gap-2 hover:text-foreground focus-ppp"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-accent" />
                      {phone.display}
                    </a>
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                          `${kitchen.street}, ${kitchen.city}, ${kitchen.region} ${kitchen.postalCode}`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-foreground underline-offset-4 hover:underline focus-ppp"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        {t("Directions", "Itinéraire")}
                      </a>
                      {links.map(({ name, url }) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-foreground underline-offset-4 hover:underline focus-ppp"
                        >
                          {name}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      ))}
                    </p>
                  </address>
                ))}
              </div>
            </details>
          </div>
        </section>
      </div>

      <SameKitchen brand={brand} />

      <ItemSheet
        item={active}
        onClose={() => setActive(null)}
        onSelectItem={setActive}
        {...(hasNdg
          ? {}
          : {
              orderAlternative: {
                note: t(
                  "Online ordering for this kitchen is coming soon. Call us to order.",
                  "La commande en ligne arrive bientôt pour cette cuisine. Appelez-nous pour commander.",
                ),
                href: `tel:${phone.e164}`,
                label: phone.display,
              },
            })}
      />
      <CartBar />
    </div>
  );
}

/** Other restaurants cooking in the same kitchen(s): one tap opens them, same cart. */
function SameKitchen({ brand }: { brand: Brand }) {
  const { t } = usePPP();
  const site = useBrand();
  const options = listKitchens(site);
  const kitchen: KitchenId =
    brand.kitchens.map((k) => k.kitchen).find((k) => options.includes(k)) ?? defaultKitchen(site);
  const others = brandsInKitchen(kitchen).filter((b) => b.id !== brand.id);
  if (others.length === 0) return null;
  return (
    <section aria-labelledby="same-kitchen" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex items-end justify-between gap-3">
          <h2
            id="same-kitchen"
            className="font-display text-2xl uppercase leading-none sm:text-3xl"
          >
            {t("Same kitchen, more restaurants", "Même cuisine, d’autres restaurants")}
          </h2>
          <Link
            to="/marques"
            search={{ cuisine: kitchen }}
            className="shrink-0 text-sm font-semibold text-accent focus-ppp"
          >
            {t("See all", "Tout voir")}
          </Link>
        </div>
        <ul className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-2">
          {others.map((b) => (
            <li key={b.id} className="w-40 shrink-0 sm:w-48">
              <BrandLink brand={b} className="group block focus-ppp">
                <span className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 transition-colors group-hover:border-primary">
                  <BrandMark brand={b} className="h-10 w-10 shrink-0 rounded-lg" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{b.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {b.cuisine.fr[0]}
                    </span>
                  </span>
                </span>
              </BrandLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Opens a brand inside this site (same cart): its store page, or PPP's full menu. */
function BrandLink({
  brand,
  className,
  children,
}: {
  brand: Brand;
  className?: string;
  children: React.ReactNode;
}) {
  if (brand.id === "ppp") {
    return (
      <Link to="/menu" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/marques/$brandId" params={{ brandId: brand.id }} className={className}>
      {children}
    </Link>
  );
}

/** Bottom bar once something is in the cart: one cart for every restaurant of the site. */
export function CartBar() {
  const { cart, openCart, t, lang } = usePPP();
  const totals = cartTotals(cart);
  if (totals.itemCount === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[56] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={openCart}
        className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-full bg-primary px-5 py-3.5 text-primary-foreground shadow-2xl focus-ppp"
      >
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-black/25 px-2 text-sm font-bold">
          {totals.itemCount}
        </span>
        <span className="font-display text-lg uppercase leading-none">
          {t("View cart", "Voir le panier")}
        </span>
        <span className="font-semibold">{money(totals.knownSubtotal, lang)}</span>
      </button>
    </div>
  );
}

/**
 * Every restaurant of one kitchen in one list (the delivery-app store list). One tap opens a brand's store page on
 * this same site, so dishes from several brands go into the same cart and one Clover payment.
 */
export function KitchenView({ kitchen, options }: { kitchen: KitchenId; options: KitchenId[] }) {
  const { t, lang } = usePPP();
  const brands = brandsInKitchen(kitchen);
  const k = KITCHENS[kitchen];
  const l = lang === "fr" ? "fr" : "en";

  return (
    <div className="pt-14 lg:pt-24">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
          {t("Our kitchens", "Nos cuisines")}
        </p>
        <h1 className="mt-1 font-display text-4xl uppercase leading-none sm:text-6xl">
          {t("All our restaurants", "Tous nos restaurants")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {kitchen === "ndg"
            ? t(
                "One kitchen, many restaurants: add dishes from several of them to the same cart and pay once.",
                "Une cuisine, plusieurs restaurants : ajoutez des plats de plusieurs d’entre eux au même panier et payez une seule fois.",
              )
            : t(
                "Order from these restaurants on the delivery apps or by phone.",
                "Commandez ces restaurants sur les applications de livraison ou par téléphone.",
              )}
        </p>

        <div
          role="tablist"
          aria-label={t("Kitchen", "Cuisine")}
          className="mt-6 inline-flex rounded-full border border-border bg-card p-1"
        >
          {options.map((id) => {
            const kk = KITCHENS[id];
            const selected = id === kitchen;
            return (
              <Link
                key={id}
                to="/marques"
                search={{ cuisine: id }}
                role="tab"
                aria-selected={selected}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-ppp ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l === "fr" ? kk.labelFr : kk.labelEn}
              </Link>
            );
          })}
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-accent" />
            {k.street}, {k.city} {k.postalCode}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-accent" />
            {hoursText(k, lang)}
          </span>
        </p>
      </div>

      <ul className="mx-auto mt-8 grid max-w-6xl gap-4 px-4 pb-24 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {brands.map((b, index) => {
          const banner = bannerItem(b);
          const dishes = b.id === "ppp" ? null : brandItems(b).length;
          return (
            <li key={b.id}>
              <BrandLink brand={b} className="group block h-full focus-ppp">
                <article className="h-full overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-primary">
                  <div className="relative h-36 sm:h-40">
                    {banner && (
                      <MenuItemImage
                        src={thumb(banner.image)}
                        alt=""
                        variant="hero"
                        priority={index < 6}
                        className="h-full"
                      />
                    )}
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"
                    />
                    <BrandMark
                      brand={b}
                      className="absolute -bottom-6 left-4 h-14 w-14 rounded-xl ring-4 ring-card"
                    />
                  </div>
                  <div className="px-4 pb-4 pt-8">
                    <h2 className="flex items-center justify-between gap-2 font-display text-xl uppercase leading-none">
                      {b.name}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </h2>
                    <p className="mt-1.5 truncate text-sm text-muted-foreground">
                      {b.cuisine[l].join(" · ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {dishes === null
                        ? t("Full menu", "Menu complet")
                        : t(`${dishes} dishes`, `${dishes} plats`)}
                      {" · "}
                      {t(
                        `${formatTime(k.hours.opens, "en")}–${formatTime(k.hours.closes, "en")}`,
                        `${formatTime(k.hours.opens, "fr")} – ${formatTime(k.hours.closes, "fr")}`,
                      )}
                    </p>
                  </div>
                </article>
              </BrandLink>
            </li>
          );
        })}
      </ul>
      <CartBar />
    </div>
  );
}
