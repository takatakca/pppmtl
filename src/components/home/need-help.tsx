import { Link } from "@tanstack/react-router";
import { LifeBuoy, MessageCircleQuestion, Phone } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { restaurantLocations } from "@/config/locations";

/**
 * Compact "Need help?" band for the homepage — 3 quick routes into support.
 * Exported for use near the footer; NOT wired into src/routes/index.tsx here.
 */
export function NeedHelp() {
  const { t } = usePPP();
  const openLocation = restaurantLocations.find((l) => l.lifecycleStatus === "open");

  return (
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto flex max-w-[80rem] flex-col gap-3 px-3 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="flex items-center gap-1.5 font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            <LifeBuoy className="h-3.5 w-3.5" />
            {t("Need help?", "Besoin d'aide?")}
          </p>
          <p className="mt-1 font-display text-lg uppercase leading-tight">
            {t("We'll route you to the right place", "Nous vous dirigerons au bon endroit")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/support"
            className="press-tap inline-flex items-center gap-2 border border-border px-4 py-2.5 font-display text-xs uppercase tracking-widest hover:border-primary focus-ppp"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            {t("Order support", "Support commande")}
          </Link>
          <Link
            to="/faq"
            className="press-tap inline-flex items-center gap-2 border border-border px-4 py-2.5 font-display text-xs uppercase tracking-widest hover:border-primary focus-ppp"
          >
            <MessageCircleQuestion className="h-3.5 w-3.5" />
            {t("FAQ", "FAQ")}
          </Link>
          {openLocation?.phone && (
            <a
              href={`tel:${openLocation.phone.e164}`}
              className="press-tap inline-flex items-center gap-2 bg-primary px-4 py-2.5 font-display text-xs uppercase tracking-widest text-primary-foreground focus-ppp"
            >
              <Phone className="h-3.5 w-3.5" />
              {t("Call PPP", "Appeler PPP")}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
