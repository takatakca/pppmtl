import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, MapPin, Menu, Mic, Search, User, X } from "lucide-react";
import { usePPP, useSelectedRestaurantLocation } from "@/context/ppp-store";
import { orderingChannels } from "@/config/external-presence";
import { trackExternalOrder, trackSocialLink } from "@/lib/analytics";
import { pppSocials } from "@/components/home/follow-ppp";
import { PPPLogo } from "@/components/brand/ppp-logo";

const navItems = [
  { en: "Deals", fr: "Offres", href: "#deals" },
  { en: "Rewards", fr: "Récompenses", href: "#rewards" },
  { en: "Locations", fr: "Emplacements", href: "/locations" },
  { en: "Franchise", fr: "Franchise", href: "#franchise" },
];


const mobileRoutes = [
  { en: "Full menu", fr: "Menu complet", to: "/menu" },
  { en: "Gift cards", fr: "Cartes-cadeaux", to: "/gift-cards" },
  { en: "Offers", fr: "Offres", to: "/offers" },
  { en: "Find us online", fr: "Nous trouver en ligne", to: "/connect" },
] as const;

const mobileLinks = [
  { en: "Deals", fr: "Offres", href: "#deals" },
  { en: "Rewards", fr: "Récompenses", href: "#rewards" },
  { en: "Locations", fr: "Emplacements", href: "/locations" },
  { en: "Careers", fr: "Carrières", href: "#franchise" },
  { en: "Franchise", fr: "Franchise", href: "#franchise" },
  { en: "Contact", fr: "Contact", href: "#locations" },
];

export function PPPHeader() {
  const { lang, setLang, mode, openSearch, openLocationSheet, openOrderSheet, t } = usePPP();
  const location = useSelectedRestaurantLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-[60]">
      {/* Utility strip — location + mode always visible, marketplaces secondary */}
      <div className="hidden border-b border-border bg-background lg:block">
        <div className="mx-auto flex h-8 max-w-[110rem] items-center gap-4 px-4 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-muted-foreground sm:px-6">
          <button
            onClick={openLocationSheet}
            className="flex items-center gap-1.5 hover:text-foreground focus-ppp"
          >
            <MapPin className="h-3 w-3 text-primary" />
            {location?.neighborhood ?? t("Choose a location", "Choisir un emplacement")}
            <ChevronDown className="h-3 w-3" />
          </button>
          <span className="text-border">/</span>
          <button onClick={openOrderSheet} className="hover:text-foreground focus-ppp">
            {mode === "pickup" ? t("Pickup", "Cueillette") : t("Delivery", "Livraison")}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={openOrderSheet} className="hover:text-foreground focus-ppp">
              {t("Other ways to order", "Autres façons de commander")}
            </button>
            <button
              onClick={() => setLang(lang === "en" ? "fr" : "en")}
              className="border border-border px-2 py-0.5 hover:text-foreground focus-ppp"
            >
              {lang === "en" ? "FR" : "EN"}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`transition-colors duration-200 ${
          scrolled
            ? "border-b border-border bg-background/95 backdrop-blur-xl"
            : "bg-background/70 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto grid h-14 max-w-[110rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:px-6 lg:h-16 lg:gap-4">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 focus-ppp"
            aria-label="PPP Pizzeria"
          >
            <PPPLogo variant="header" />
            <span className="hidden font-display text-lg uppercase leading-none tracking-wide sm:inline">
              PPP Pizzeria
              <span className="block text-[0.55rem] tracking-[0.3em] text-muted-foreground">
                NDG
              </span>
            </span>
          </Link>

          <nav className="hidden min-w-0 items-center gap-5 lg:flex">
            <Link
              to="/menu"
              className="font-display text-sm uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-ppp"
            >
              {lang === "fr" ? "Menu" : "Menu"}
            </Link>
            <Link
              to="/gift-cards"
              className="font-display text-sm uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-ppp"
            >
              {lang === "fr" ? "Cartes-cadeaux" : "Gift cards"}
            </Link>
            {navItems.map((item) => (
              <a
                key={item.en}
                href={item.href}
                className="font-display text-sm uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-ppp"
              >
                {lang === "fr" ? item.fr : item.en}
              </a>
            ))}
          </nav>

          {/* Mobile: location chip lives in the bar so it is never lost */}
          <button
            onClick={openLocationSheet}
            className="flex min-w-0 items-center gap-1.5 border border-border px-2 py-1.5 text-left lg:hidden focus-ppp"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate text-[0.65rem] font-bold uppercase tracking-widest">
              {location?.neighborhood ?? t("Location", "Emplacement")}
            </span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => openSearch()}
              aria-label={t("Search the menu", "Rechercher au menu")}
              className="inline-flex h-9 items-center gap-2 border border-border px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-ppp lg:h-10 lg:px-3"
            >
              <Search className="h-4 w-4" />
              <span className="hidden lg:inline">{t("Search food", "Chercher")}</span>
              <Mic className="hidden h-4 w-4 text-primary lg:inline" />
            </button>
            <Link
              to="/account/sign-in"
              search={{ returnTo: "/account" }}
              aria-label={t("Sign in", "Connexion")}
              className="hidden h-10 items-center gap-2 border border-border px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp lg:inline-flex"
            >
              <User className="h-4 w-4" />
              {t("Sign in", "Connexion")}
            </Link>
            <button
              onClick={openOrderSheet}
              className="hidden h-10 items-center bg-primary px-5 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp lg:inline-flex"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              {t("Order now", "Commander")}
            </button>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={t("Open menu", "Ouvrir le menu")}
              aria-expanded={open}
              className="inline-flex h-9 w-9 items-center justify-center border border-border focus-ppp lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <nav className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-border bg-background px-4 pb-8 pt-4 lg:hidden">
          <button
            onClick={() => {
              setOpen(false);
              openOrderSheet();
            }}
            className="w-full bg-primary py-3.5 font-display text-2xl uppercase leading-none text-primary-foreground focus-ppp"
          >
            {t("Order now", "Commander")}
          </button>
          <div className="mt-4 divide-y divide-border border-y border-border">
            <Link
              to="/order"
              onClick={() => setOpen(false)}
              className="block py-3 font-display text-2xl uppercase leading-none focus-ppp"
            >
              {t("Order online", "Commander en ligne")}
            </Link>
            {mobileRoutes.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="block py-3 font-display text-2xl uppercase leading-none focus-ppp"
              >
                {lang === "fr" ? item.fr : item.en}
              </Link>
            ))}
            {mobileLinks.map((item) => (
              <a
                key={item.en}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block py-3 font-display text-2xl uppercase leading-none focus-ppp"
              >
                {lang === "fr" ? item.fr : item.en}
              </a>
            ))}
          </div>
          <p className="mt-5 text-[0.6rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            {t("Order online", "Commander en ligne")}
          </p>
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {orderingChannels.map((c) => (
              <li key={c.id}>
                <a
                  href={c.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackExternalOrder(c.id)}
                  aria-label={c.labelEn}
                  className="flex h-full items-center justify-center border border-border p-2 focus-ppp"
                >
                  <img src={c.logo ?? ""} alt={c.name} className="h-6 w-auto" />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[0.6rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            {t("Follow", "Suivre")}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pppSocials.map((s) => (
              <li key={s.id}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialLink(s.id)}
                  aria-label={`Visit PPP Pizzeria on ${s.name}`}
                  className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground focus-ppp"
                >
                  <s.Icon className="h-3.5 w-3.5 text-primary" />
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setLang(lang === "en" ? "fr" : "en")}
            className="mt-4 w-full border border-border py-3 text-xs font-bold uppercase tracking-widest focus-ppp"
          >
            {lang === "en" ? "Français" : "English"}
          </button>
        </nav>
      )}
    </header>
  );
}
