import { Link } from "@tanstack/react-router";
import { usePPP } from "@/context/ppp-store";
import { useBrand } from "@/context/brand";
import { KITCHENS, brandPhone, hoursText } from "@/config/brands";
import { PPPLogo } from "@/components/brand/ppp-logo";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

/** Footer of a franchise brand: its name, every kitchen (NAP + hours, same as on Google), the shared links. */
export function BrandFooter() {
  const { t, lang } = usePPP();
  const brand = useBrand();
  const phone = brandPhone(brand);

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-[110rem] gap-8 px-3 py-12 sm:px-6 lg:grid-cols-[1fr_2fr]">
        <div>
          <PPPLogo variant="footer" withWordmark />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            {lang === "fr" ? brand.description.fr : brand.description.en}
          </p>
          <a
            href={`tel:${phone.e164}`}
            className="mt-4 inline-block font-display text-2xl leading-none hover:text-accent focus-ppp"
          >
            {phone.display}
          </a>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {brand.kitchens.map(({ kitchen: id }) => {
            const k = KITCHENS[id];
            return (
              <address key={id} className="not-italic text-sm text-muted-foreground">
                <p className="font-display text-xl uppercase leading-none text-foreground">
                  {brand.name} · {lang === "fr" ? k.labelFr : k.labelEn}
                </p>
                <p className="mt-2">
                  {k.street}
                  <br />
                  {k.city} (Québec) {k.postalCode}
                </p>
                <p className="mt-1">{hoursText(k, lang)}</p>
              </address>
            );
          })}
          <nav
            aria-label={t("Site", "Site")}
            className="flex flex-wrap gap-x-5 gap-y-2 sm:col-span-2"
          >
            <a
              href="/#nos-plats"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp"
            >
              {t("Our dishes", "Nos plats")}
            </a>
            <Link
              to="/menu"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp"
            >
              {t("Full menu", "Menu complet")}
            </Link>
            <Link
              to="/order"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp"
            >
              {t("Order online", "Commander en ligne")}
            </Link>
            <Link
              to="/gift-cards"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp"
            >
              {t("Gift cards", "Cartes-cadeaux")}
            </Link>
            <a
              href="/#commander"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp"
            >
              {t("Addresses", "Adresses")}
            </a>
          </nav>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[110rem] flex-wrap items-center justify-between gap-3 px-3 py-4 text-[0.65rem] uppercase tracking-widest text-muted-foreground sm:px-6">
          <span>
            © {new Date().getFullYear()} {brand.name} · Montréal
          </span>
          <LanguageSwitcher variant="compact" />
        </div>
      </div>
    </footer>
  );
}
