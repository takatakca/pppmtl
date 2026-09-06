import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin } from "lucide-react";
import storefront from "@/assets/storefront-night.jpg";
import { usePPP } from "@/context/ppp-store";
import { Reveal } from "@/components/motion/reveal";

type StoneStatus = "past" | "present" | "next";

interface Stone {
  status: StoneStatus;
  place: { en: string; fr: string };
  note: { en: string; fr: string };
}

const timeline: Stone[] = [
  {
    status: "past",
    place: { en: "Montréal-Nord", fr: "Montréal-Nord" },
    note: { en: "Where PPP started", fr: "Là où PPP a commencé" },
  },
  {
    status: "present",
    place: { en: "NDG", fr: "NDG" },
    note: { en: "Flagship kitchen, open now", fr: "Cuisine phare, ouverte" },
  },
  {
    status: "present",
    place: { en: "Sainte-Catherine E", fr: "Sainte-Catherine E" },
    note: { en: "Second kitchen, open now", fr: "Deuxième cuisine, ouverte" },
  },
  {
    status: "next",
    place: { en: "Saint-Léonard", fr: "Saint-Léonard" },
    note: { en: "Coming soon", fr: "Bientôt" },
  },
  {
    status: "next",
    place: { en: "Chambly", fr: "Chambly" },
    note: { en: "Coming soon", fr: "Bientôt" },
  },
  {
    status: "next",
    place: { en: "Brossard", fr: "Brossard" },
    note: { en: "Coming soon", fr: "Bientôt" },
  },
];

const dotClass: Record<StoneStatus, string> = {
  past: "bg-muted-foreground/50",
  present: "bg-primary",
  next: "border border-border bg-transparent",
};

/**
 * "From Montréal-Nord to the next chapter" — homepage brand story with an
 * honest, non-operational expansion timeline. No fabricated dates.
 */
export function StoryBand() {
  const { t } = usePPP();

  return (
    <section className="relative isolate overflow-hidden border-y border-border">
      <img
        src={storefront}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover opacity-[0.14]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="relative mx-auto max-w-[80rem] px-3 py-12 sm:px-6 lg:py-16">
        <Reveal className="max-w-2xl">
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t("The PPP story", "L'histoire de PPP")}
          </p>
          <h2 className="mt-2 font-display text-4xl uppercase leading-[0.88] sm:text-6xl">
            {t("Montréal-Nord to", "De Montréal-Nord")}
            <br />
            <span className="text-flame">{t("the next chapter", "au prochain chapitre")}</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            {t(
              "PPP started as one kitchen in Montréal-Nord. That original store is closed today, but the recipes moved with us — first to NDG, then Sainte-Catherine E, and now toward a handful of new neighbourhoods.",
              "PPP est né d'une seule cuisine à Montréal-Nord. Ce premier commerce est fermé aujourd'hui, mais les recettes nous ont suivis — d'abord à NDG, puis Sainte-Catherine E, et maintenant vers de nouveaux quartiers.",
            )}
          </p>
          <Link
            to="/about"
            className="cta-motion mt-4 inline-flex items-center gap-2 border border-border px-5 py-3 font-display text-sm uppercase tracking-widest transition-colors hover:border-primary focus-ppp"
          >
            {t("Read our story", "Lire notre histoire")}
            <ArrowUpRight className="cta-arrow h-4 w-4" />
          </Link>
        </Reveal>

        <Reveal delay={100} className="mt-10 overflow-x-auto">
          <ol className="flex min-w-max items-start gap-0">
            {timeline.map((s, i) => (
              <li key={`${s.place.en}-${i}`} className="flex items-start">
                <div className="flex w-36 flex-col items-start gap-2 sm:w-44">
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${dotClass[s.status]}`}
                    aria-hidden
                  />
                  <span className="flex items-center gap-1 font-display text-base uppercase leading-tight sm:text-lg">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {t(s.place.en, s.place.fr)}
                  </span>
                  <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                    {t(s.note.en, s.note.fr)}
                  </span>
                </div>
                {i < timeline.length - 1 && (
                  <span aria-hidden className="mt-1.5 h-px w-8 shrink-0 bg-border sm:w-14" />
                )}
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
