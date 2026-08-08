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
  const { lang, t, openOrderSheet } = usePPP();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-[110rem] px-3 pt-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t(
                "Poulet · Pizza · Poutine. Rotisserie, grill and late-night comfort food in Montréal-Nord.",
                "Poulet · Pizza · Poutine. Rôtisserie, grillades et réconfort tard le soir à Montréal-Nord.",
              )}
            </p>
            <button
              onClick={openOrderSheet}
              className="mt-4 bg-primary px-6 py-3 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t("Order now", "Commander")}
            </button>
            <form
              className="mt-6 flex max-w-sm border border-border"
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

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
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

        <p className="mt-10 select-none font-display text-[18vw] uppercase leading-[0.75] text-foreground/8 lg:text-[13vw]">
          PPP MTL-NORD
        </p>
        <p className="border-t border-border py-5 text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
          © {new Date().getFullYear()} PPP Montréal-Nord
        </p>
      </div>
    </footer>
  );
}