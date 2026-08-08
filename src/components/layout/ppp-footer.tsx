import { usePPP } from "@/context/ppp-store";

const columns = [
  {
    titleEn: "Order",
    titleFr: "Commander",
    items: [
      { en: "Order online", fr: "Commander en ligne" },
      { en: "Pickup", fr: "Cueillette" },
      { en: "Delivery", fr: "Livraison" },
      { en: "Too Good To Go", fr: "Too Good To Go" },
    ],
  },
  {
    titleEn: "PPP",
    titleFr: "PPP",
    items: [
      { en: "About us", fr: "À propos" },
      { en: "Careers", fr: "Carrières" },
      { en: "Franchise", fr: "Franchise" },
      { en: "Contact us", fr: "Nous joindre" },
    ],
  },
  {
    titleEn: "Rewards",
    titleFr: "Récompenses",
    items: [
      { en: "PPP Rewards", fr: "PPP Récompenses" },
      { en: "Gift cards", fr: "Cartes-cadeaux" },
      { en: "Offers", fr: "Offres" },
      { en: "Download the app", fr: "Télécharger l'app" },
    ],
  },
  {
    titleEn: "Support",
    titleFr: "Soutien",
    items: [
      { en: "FAQs", fr: "FAQ" },
      { en: "Privacy policy", fr: "Confidentialité" },
      { en: "Terms of service", fr: "Conditions" },
      { en: "Accessibility", fr: "Accessibilité" },
    ],
  },
];

export function PPPFooter() {
  const { lang, t } = usePPP();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 md:grid-cols-[1.1fr_2fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary px-2 py-1 font-display text-xl leading-none text-primary-foreground">
                PPP
              </span>
              <span className="font-display text-xl tracking-wide">MTL-NORD</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              {t(
                "Poulet · Pizza · Poutine. Rotisserie, grill and late-night comfort food in Montréal-Nord.",
                "Poulet · Pizza · Poutine. Rôtisserie, grillades et réconfort tard le soir à Montréal-Nord.",
              )}
            </p>
            <form
              className="mt-6 flex max-w-sm overflow-hidden rounded-xl border border-border"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                required
                placeholder={t("Get our offers", "Recevez nos offres")}
                aria-label={t("Email address", "Adresse courriel")}
                className="w-full bg-secondary px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button className="bg-primary px-5 text-xs font-bold uppercase tracking-widest text-primary-foreground focus-ppp">
                {t("Subscribe", "S'abonner")}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((c) => (
              <div key={c.titleEn}>
                <h3 className="font-display text-sm uppercase tracking-widest text-accent">
                  {lang === "fr" ? c.titleFr : c.titleEn}
                </h3>
                <ul className="mt-3 space-y-2">
                  {c.items.map((i) => (
                    <li key={i.en}>
                      <a
                        href="#top"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-ppp"
                      >
                        {lang === "fr" ? i.fr : i.en}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-14 border-t border-border pt-6 text-xs uppercase tracking-widest text-muted-foreground">
          © {new Date().getFullYear()} PPP Montréal-Nord
        </p>
      </div>
    </footer>
  );
}