import { Facebook, Instagram, MapPin, Phone } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { pppBusiness } from "@/config/business";
import { PPPLogo } from "@/components/brand/ppp-logo";

const socials = [
  { id: "instagram", label: "Instagram", href: pppBusiness.social.instagram, Icon: Instagram },
  { id: "facebook", label: "Facebook", href: pppBusiness.social.facebook, Icon: Facebook },
  { id: "x", label: "X", href: pppBusiness.social.x, Icon: null },
  { id: "pinterest", label: "Pinterest", href: pppBusiness.social.pinterest, Icon: null },
] as const;

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
                "Poulet · Pizza · Poutine. Rotisserie, grill and comfort food on Somerled in Notre-Dame-de-Grâce.",
                "Poulet · Pizza · Poutine. Rôtisserie, grillades et réconfort sur Somerled, à Notre-Dame-de-Grâce.",
              )}
            </p>
            <address className="mt-4 space-y-1 not-italic text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  {pppBusiness.address.line1}
                  <br />
                  {pppBusiness.address.city}, {pppBusiness.address.province}{" "}
                  {pppBusiness.address.postalCode}
                </span>
              </p>
              <a
                href={pppBusiness.phone.href}
                className="flex items-center gap-2 hover:text-foreground focus-ppp"
              >
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                {pppBusiness.phone.display}
              </a>
            </address>
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
            <ul className="mt-6 flex flex-wrap gap-2">
              {socials.map((s) => (
                <li key={s.id}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`PPP ${s.label}`}
                    className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp"
                  >
                    {s.Icon ? <s.Icon className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
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
          PPP Pizzeria
        </p>
        <p className="border-t border-border py-5 text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
          © {new Date().getFullYear()} {pppBusiness.displayName}
        </p>
      </div>
    </footer>
  );
}
