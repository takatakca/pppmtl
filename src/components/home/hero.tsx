import { ArrowRight, Bike, MapPin, Mic, Search, ShoppingBag } from "lucide-react";
import heroImg from "@/assets/hero-montreal.jpg";
import { usePPP, useSelectedLocation } from "@/context/ppp-store";
import { track } from "@/lib/analytics";

const cravings = [
  { en: "Poutine", fr: "Poutine" },
  { en: "Chicken", fr: "Poulet" },
  { en: "Pizza", fr: "Pizza" },
  { en: "Shawarma", fr: "Shawarma" },
  { en: "Combos", fr: "Combos" },
];

export function Hero() {
  const { lang, mode, setMode, openSearch, openLocationSheet, t } = usePPP();
  const location = useSelectedLocation();

  return (
    <section className="relative isolate overflow-hidden pt-16">
      <img
        src={heroImg}
        alt=""
        width={1920}
        height={1080}
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 lg:pb-32 lg:pt-24">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-accent">
          {t("Montréal-Nord · Poulet · Pizza · Poutine", "Montréal-Nord · Poulet · Pizza · Poutine")}
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl uppercase leading-[0.92] sm:text-7xl lg:text-8xl">
          {t("Order what you're", "Commandez ce dont vous avez")}{" "}
          <span className="text-flame">{t("craving", "envie")}</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          {t(
            "Say it or type it. We'll find it on the menu, then you order ahead and skip the line.",
            "Dites-le ou écrivez-le. On le trouve au menu, vous commandez à l'avance et évitez la file.",
          )}
        </p>

        {/* Command bar */}
        <div className="mt-9 max-w-2xl surface-panel p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-xl bg-secondary p-1">
              {(["pickup", "delivery"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors focus-ppp ${
                    mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {m === "pickup" ? <ShoppingBag className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
                  {m === "pickup" ? t("Pickup", "Cueillette") : t("Delivery", "Livraison")}
                </button>
              ))}
            </div>
            <button
              onClick={openLocationSheet}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left focus-ppp"
            >
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate text-sm font-semibold">
                {location?.name ?? t("Choose a location", "Choisir un emplacement")}
              </span>
            </button>
          </div>

          <button
            onClick={() => openSearch()}
            className="mt-3 flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-4 text-left transition-colors hover:border-primary focus-ppp"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 text-base text-muted-foreground">
              {t("Search “poutine”, “taouk”, “pizza”…", "Cherchez « poutine », « taouk », « pizza »…")}
            </span>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mic className="h-4 w-4" />
            </span>
          </button>

          <div className="mt-3 flex flex-wrap gap-2">
            {cravings.map((c) => (
              <button
                key={c.en}
                onClick={() => {
                  track("quick_craving_selected", { craving: c.en });
                  openSearch(lang === "fr" ? c.fr : c.en);
                }}
                className="rounded-full border border-border px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-ppp"
              >
                {lang === "fr" ? c.fr : c.en}
              </button>
            ))}
          </div>
        </div>

        <a
          href="#deals"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-4 font-display text-lg uppercase tracking-wide text-primary-foreground focus-ppp"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          {mode === "pickup" ? t("Start pickup order", "Commander en cueillette") : t("Start delivery order", "Commander en livraison")}
          <ArrowRight className="h-5 w-5" />
        </a>
      </div>
    </section>
  );
}