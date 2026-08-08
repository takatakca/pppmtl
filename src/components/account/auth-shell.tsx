import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { usePPP } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { localizedName } from "@/lib/search";
import { MenuItemImage } from "@/components/menu/menu-item-image";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { pppBusiness } from "@/config/business";

/**
 * Split auth experience: food/lifestyle panel on desktop, compact focused
 * form on mobile (no half-screen image eating the keyboard space).
 */
export function AuthShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: string;
  children: ReactNode;
}) {
  const { lang, locationId, t } = usePPP();
  const showcase = menuRepository.getPopularItems(locationId, 3);

  const benefits = [
    t("Order faster", "Commandez plus vite"),
    t("Save your favourites", "Enregistrez vos favoris"),
    t("Reorder past meals", "Recommandez vos repas"),
    t("Keep your rewards", "Conservez vos points"),
    t("Save delivery addresses", "Enregistrez vos adresses"),
    t("Get member offers", "Recevez les offres membres"),
  ];

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <PPPHeader />
      <main className="mx-auto grid max-w-[110rem] gap-0 px-0 pt-14 lg:grid-cols-[1fr_1fr] lg:pt-24">
        {/* Desktop brand panel */}
        <aside className="relative hidden overflow-hidden bg-primary p-10 lg:block">
          <p className="font-display text-[0.65rem] uppercase tracking-[0.35em] text-primary-foreground/80">
            PPP {pppBusiness.shortLocationName}
          </p>
          <h2 className="mt-2 font-display text-6xl uppercase leading-[0.85] text-primary-foreground">
            {t("Your PPP.", "Votre PPP.")}
            <br />
            {t("Ready when you are.", "Prêt quand vous l'êtes.")}
          </h2>
          <ul className="mt-6 grid gap-1.5 text-sm text-primary-foreground/90">
            {benefits.map((b) => (
              <li key={b}>· {b}</li>
            ))}
          </ul>
          <div className="mt-8 flex gap-3">
            {showcase.map((item, i) => (
              <div
                key={item.id}
                className="zoom-reveal overflow-hidden rounded-full border-4 border-primary-foreground/20"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <MenuItemImage
                  src={item.image}
                  alt={localizedName(item, lang)}
                  size="hero"
                  className="h-28 w-28"
                />
              </div>
            ))}
          </div>
        </aside>

        <section className="px-3 py-6 sm:px-6 lg:px-12 lg:py-14">
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-1 font-display text-4xl uppercase leading-[0.88] sm:text-5xl">
            {title}
          </h1>
          {intro && <p className="mt-2 max-w-md text-sm text-muted-foreground">{intro}</p>}
          <div className="mt-5 max-w-md">{children}</div>
          <p className="mt-6 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            <Link to="/" className="focus-ppp underline">
              {t("Back to PPP", "Retour à PPP")}
            </Link>
          </p>
        </section>
      </main>
      <PPPFooter />
    </div>
  );
}
