import { PartyPopper, Sparkles, UserCheck } from "lucide-react";
import { usePPP } from "@/context/ppp-store";

/**
 * Presentation-only greeting banner for lifecycle moments. Nothing here decides
 * when a moment happens — a caller passes the moment once a real signal exists
 * (signup completed, first order placed, returning member). Never rendered on
 * speculation, so PPP never congratulates a customer for something they
 * haven't done.
 */
export type CustomerMoment = "welcome" | "firstOrder" | "returning";

const ICONS = {
  welcome: PartyPopper,
  firstOrder: Sparkles,
  returning: UserCheck,
} as const;

export function CustomerMomentBanner({ moment, name }: { moment: CustomerMoment; name?: string }) {
  const { tr } = usePPP();
  const Icon = ICONS[moment];
  const headline = tr(`moments.${moment}` as "moments.welcome");

  return (
    <section className="rise-in flex items-center gap-3 border border-border bg-card p-5">
      <Icon className="h-5 w-5 shrink-0 text-primary" />
      <p className="font-display text-2xl uppercase leading-none">
        {name ? `${headline}, ${name}` : headline}
      </p>
    </section>
  );
}
