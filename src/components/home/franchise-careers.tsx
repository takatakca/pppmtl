import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import crew from "@/assets/team-crew.jpg";
import storefront from "@/assets/storefront-night.jpg";
import { usePPP } from "@/context/ppp-store";
import { Reveal } from "@/components/motion/reveal";

/**
 * Two strong homepage bands: franchise positioning and careers, each linking
 * out to its dedicated page rather than trying to hold the full pitch here.
 */
export function FranchiseCareers() {
  const { t } = usePPP();

  return (
    <>
      <section id="franchise" className="relative isolate overflow-hidden border-y border-border">
        <img
          src={storefront}
          alt=""
          loading="lazy"
          className="ken-burns absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/40" />
        <Reveal className="relative mx-auto flex max-w-[110rem] flex-col items-start gap-4 px-3 py-12 sm:px-6 lg:py-16">
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t("Franchise", "Franchise")}
          </p>
          <h2 className="font-display text-4xl uppercase leading-[0.86] sm:text-6xl lg:text-7xl">
            {t("Bring PPP to", "Amenez PPP dans")}
            <br />
            <span className="text-flame">{t("your city", "votre ville")}</span>
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {t(
              "A proven kitchen system, a brand people already crave, and a digital ordering ecosystem built to scale — multi-location today, growing tomorrow.",
              "Un système de cuisine éprouvé, une marque déjà désirée et un écosystème de commande numérique bâti pour croître — multi-emplacements aujourd'hui, en expansion demain.",
            )}
          </p>
          <Link
            to="/franchise"
            className="cta-motion press-tap mt-1 inline-flex items-center gap-2 bg-primary px-6 py-3.5 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
          >
            {t("Explore franchising", "Explorer la franchise")}
            <ArrowUpRight className="cta-arrow h-4 w-4" />
          </Link>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[110rem] px-3 py-10 sm:px-6 lg:py-14">
        <Reveal clip className="relative overflow-hidden border border-border">
          <img
            src={crew}
            alt=""
            loading="lazy"
            className="ken-burns h-64 w-full object-cover sm:h-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 lg:p-8">
            <div>
              <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
                {t("Careers", "Carrières")}
              </p>
              <h2 className="mt-1 font-display text-4xl uppercase leading-none sm:text-6xl">
                {t("Work with PPP", "Travaillez chez PPP")}
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {t(
                  "Kitchen, counter and delivery roles across our Montréal locations.",
                  "Postes en cuisine, au comptoir et en livraison dans nos emplacements montréalais.",
                )}
              </p>
            </div>
            <Link
              to="/careers"
              className="cta-motion press-tap inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t("See open roles", "Voir les postes")}
              <ArrowUpRight className="cta-arrow h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
