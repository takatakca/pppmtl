import { ArrowRight } from "lucide-react";
import teamCrew from "@/assets/team-crew.jpg";
import { usePPP } from "@/context/ppp-store";

export function FranchiseCareers() {
  const { t } = usePPP();

  const perks = [
    t("Clover POS + payments", "Clover POS + paiements"),
    t("Kitchen display screens", "Écrans de cuisine"),
    t("Self-service kiosks", "Bornes libre-service"),
    t("Uber / Skip / DoorDash", "Uber / Skip / DoorDash"),
    t("Centralized menu control", "Menus centralisés"),
    t("Marketing & loyalty", "Marketing & fidélité"),
  ];

  return (
    <section id="franchise" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-panel p-8">
          <h2 className="font-display text-4xl uppercase sm:text-5xl">
            {t("Own a", "Devenez")} <span className="text-flame">PPP</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t(
              "A complete restaurant system, not just a brand: POS, kitchen screens, kiosks, centralized menus, marketplace integrations and support.",
              "Un système de restaurant complet, pas juste une marque : POS, écrans de cuisine, bornes, menus centralisés, intégrations et soutien.",
            )}
          </p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {perks.map((p) => (
              <li key={p} className="rounded-xl border border-border bg-background p-4 text-sm font-semibold">
                {p}
              </li>
            ))}
          </ul>
          <a
            href="#franchise"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-display text-lg uppercase text-primary-foreground focus-ppp"
          >
            {t("Start an application", "Déposer une demande")} <ArrowRight className="h-5 w-5" />
          </a>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border">
          <img
            src={teamCrew}
            alt={t("PPP crew member", "Membre de l'équipe PPP")}
            loading="lazy"
            className="h-full min-h-[24rem] w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent p-8">
            <h2 className="font-display text-3xl uppercase">{t("Join our team", "Rejoignez l'équipe")}</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {t(
                "Kitchen, counter and delivery roles across Montréal-Nord.",
                "Postes en cuisine, au comptoir et en livraison à Montréal-Nord.",
              )}
            </p>
            <a
              href="#franchise"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-xs font-bold uppercase tracking-widest focus-ppp"
            >
              {t("See openings", "Voir les postes")} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}