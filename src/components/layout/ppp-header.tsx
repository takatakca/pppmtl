import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, MapPin, Menu, Search, User, X } from "lucide-react";
import { usePPP, useSelectedLocation } from "@/context/ppp-store";

const navItems = [
  { en: "Menu", fr: "Menu", href: "#menu" },
  { en: "Deals", fr: "Offres", href: "#deals" },
  { en: "Rewards", fr: "Récompenses", href: "#rewards" },
  { en: "Locations", fr: "Emplacements", href: "#locations" },
  { en: "Franchise", fr: "Franchise", href: "#franchise" },
];

export function PPPHeader() {
  const { lang, setLang, mode, openSearch, openLocationSheet, t } = usePPP();
  const location = useSelectedLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[60] transition-colors duration-300 ${
        scrolled ? "border-b border-border bg-background/90 backdrop-blur-xl" : "bg-gradient-to-b from-background/90 to-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 focus-ppp">
          <span className="rounded-md bg-primary px-2 py-1 font-display text-lg leading-none text-primary-foreground">
            PPP
          </span>
          <span className="hidden font-display text-lg tracking-wide sm:inline">MTL-NORD</span>
        </Link>

        <button
          onClick={openLocationSheet}
          className="hidden max-w-[15rem] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left focus-ppp md:flex"
        >
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0">
            <span className="block text-[0.6rem] uppercase tracking-widest text-muted-foreground">
              {mode === "pickup" ? t("Pickup from", "Cueillette à") : t("Delivery from", "Livraison de")}
            </span>
            <span className="block truncate text-xs font-semibold">
              {location?.name ?? t("Choose a location", "Choisir un emplacement")}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        <nav className="ml-2 hidden items-center gap-6 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.en}
              href={item.href}
              className="text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-ppp"
            >
              {lang === "fr" ? item.fr : item.en}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => openSearch()}
            aria-label={t("Search the menu", "Rechercher au menu")}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-ppp"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{t("Search food", "Chercher")}</span>
          </button>
          <button
            onClick={() => setLang(lang === "en" ? "fr" : "en")}
            className="hidden h-10 items-center rounded-lg border border-border px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground focus-ppp sm:inline-flex"
          >
            {lang === "en" ? "FR" : "EN"}
          </button>
          <a
            href="#account"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground focus-ppp"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t("Sign in", "Connexion")}</span>
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={t("Open menu", "Ouvrir le menu")}
            aria-expanded={open}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border focus-ppp lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-background px-4 pb-6 pt-4 lg:hidden">
          <button
            onClick={() => {
              setOpen(false);
              openLocationSheet();
            }}
            className="mb-3 flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-left focus-ppp"
          >
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              {location?.name ?? t("Choose a location", "Choisir un emplacement")}
            </span>
          </button>
          {navItems.map((item) => (
            <a
              key={item.en}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 font-display text-2xl uppercase tracking-wide focus-ppp"
            >
              {lang === "fr" ? item.fr : item.en}
            </a>
          ))}
          <button
            onClick={() => setLang(lang === "en" ? "fr" : "en")}
            className="mt-4 w-full rounded-lg border border-border py-3 text-xs font-bold uppercase tracking-widest focus-ppp"
          >
            {lang === "en" ? "Français" : "English"}
          </button>
        </nav>
      )}
    </header>
  );
}