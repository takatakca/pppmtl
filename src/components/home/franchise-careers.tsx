import { ArrowUpRight } from "lucide-react";
import crew from "@/assets/team-crew.jpg";
import { usePPP } from "@/context/ppp-store";

export function FranchiseCareers() {
  const { t } = usePPP();

  return (
    <section id="franchise" className="mx-auto max-w-[110rem] px-3 py-10 sm:px-6 lg:py-14">
      <div className="grid gap-2 lg:grid-cols-2">
        <div className="relative overflow-hidden border border-border">
          <img src={crew} alt="" loading="lazy" className="h-72 w-full object-cover lg:h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 lg:p-8">
            <h2 className="font-display text-5xl uppercase leading-none lg:text-6xl">
              {t("Join our team", "Rejoignez l'équipe")}
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {t(
                "Kitchen, counter and delivery roles in NDG, Montréal.",
                "Postes en cuisine, au comptoir et en livraison à NDG, Montréal.",
              )}
            </p>
            <a
              href="#franchise"
              className="mt-4 inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t("Apply now", "Postuler")}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="flex flex-col justify-between border border-border bg-card p-6 lg:p-10">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.35em] text-accent">
              {t("Franchise", "Franchise")}
            </p>
            <h2 className="mt-2 font-display text-5xl uppercase leading-[0.9] lg:text-7xl">
              {t("Own a PPP", "Devenez")}
              <br />
              {t("kitchen", "franchisé")}
            </h2>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              {t(
                "Bring Poulet · Pizza · Poutine to your neighbourhood with a proven kitchen model and a brand people already crave.",
                "Apportez Poulet · Pizza · Poutine dans votre quartier avec un modèle de cuisine éprouvé et une marque déjà désirée.",
              )}
            </p>
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <a
              href="#franchise"
              className="bg-primary px-5 py-3.5 text-center font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t("Request info", "Demander l'info")}
            </a>
            <a
              href="#locations"
              className="border border-border px-5 py-3.5 text-center font-display text-lg uppercase leading-none focus-ppp"
            >
              {t("Talk to us", "Nous parler")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}