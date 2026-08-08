import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, MapPin, Menu, Mic, Search, User, X } from "lucide-react";
import { usePPP, useSelectedLocation } from "@/context/ppp-store";
import { marketplaceChannels } from "@/lib/channels";

const navItems = [
  { en: "Deals", fr: "Offres", href: "#deals" },
  { en: "Rewards", fr: "Récompenses", href: "#rewards" },
  { en: "Locations", fr: "Emplacements", href: "#locations" },
  { en: "Franchise", fr: "Franchise", href: "#franchise" },
];

const mobileLinks = [
  { en: "Deals", fr: "Offres", href: "#deals" },
  { en: "Rewards", fr: "Récompenses", href: "#rewards" },
  { en: "Gift cards", fr: "Cartes-cadeaux", href: "#rewards" },
  { en: "Locations", fr: "Emplacements", href: "#locations" },
  { en: "Careers", fr: "Carrières", href: "#franchise" },
  { en: "Franchise", fr: "Franchise", href: "#franchise" },
  { en: "Contact", fr: "Contact", href: "#locations" },
];

export function PPPHeader() {
  const { lang, setLang, mode, openSearch, openLocationSheet, openOrderSheet, t } = usePPP();
  const location = useSelectedLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const marketplaces = marketplaceChannels(location, mode);

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
            {location?.name ?? t("Choose a location", "Choisir un emplacement")}
            <ChevronDown className="h-3 w-3" />
          </button>
          <span className="text-border">/</span>
          <button onClick={openOrderSheet} className="hover:text-foreground focus-ppp">
            {mode === "pickup" ? t("Pickup", "Cueillette") : t("Delivery", "Livraison")}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-muted-foreground/60">{t("Also on", "Aussi sur")}</span>
            {marketplaces.map((c) => (
              <button
                key={c.id}
                onClick={openOrderSheet}
                className="hover:text-foreground focus-ppp"
              >
                {c.label}
              </button>
            ))}
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
          <Link to="/" className="flex shrink-0 items-center gap-1.5 focus-ppp">
            <span className="bg-primary px-1.5 py-1 font-display text-lg leading-none text-primary-foreground">
              PPP
            </span>
            <span className="hidden font-display text-lg leading-none tracking-wide sm:inline">
              NDG MTL
            </span>
          </Link>

          <nav className="hidden min-w-0 items-center gap-5 lg:flex">
            <Link
              to="/order"
              className="font-display text-sm uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-ppp"
            >
              {lang === "fr" ? "Menu" : "Menu"}
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
              {location?.name ?? t("Location", "Emplacement")}
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
            <a
              href="#account"
              aria-label={t("Sign in", "Connexion")}
              className="hidden h-10 items-center gap-2 border border-border px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp lg:inline-flex"
            >
              <User className="h-4 w-4" />
              {t("Sign in", "Connexion")}
            </a>
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
