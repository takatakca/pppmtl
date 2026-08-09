import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Clock,
  ExternalLink,
  Gift,
  HelpCircle,
  MapPin,
  Package,
  Phone,
  PhoneCall,
  Receipt,
  ShieldAlert,
  Store,
  User,
} from "lucide-react";
import { usePPP, type SupportOrderChannel } from "@/context/ppp-store";
import { NDG_LOCATION_ID, locationById, restaurantLocations } from "@/config/locations";
import { orderingChannels } from "@/config/external-presence";
import { trackSupportRouted } from "@/lib/analytics";

type Channel = SupportOrderChannel;

const CHANNELS: { id: Channel; labelEn: string; labelFr: string; icon: typeof Store }[] = [
  { id: "direct", labelEn: "PPP Direct (this site)", labelFr: "PPP Direct (ce site)", icon: Store },
  { id: "phone", labelEn: "Called it in", labelFr: "Commandé par téléphone", icon: Phone },
  { id: "uber_eats", labelEn: "Uber Eats", labelFr: "Uber Eats", icon: Package },
  { id: "doordash", labelEn: "DoorDash", labelFr: "DoorDash", icon: Package },
  { id: "skip", labelEn: "SkipTheDishes", labelFr: "SkipTheDishes", icon: Package },
  { id: "not_yet", labelEn: "Haven't ordered yet", labelFr: "Je n'ai pas encore commandé", icon: HelpCircle },
];

const marketplaceById: Record<string, (typeof orderingChannels)[number] | undefined> = {
  uber_eats: orderingChannels.find((c) => c.id === "uber_eats"),
  doordash: orderingChannels.find((c) => c.id === "doordash"),
  skip: orderingChannels.find((c) => c.id === "skip"),
};

type Issue =
  | "missing_item"
  | "wrong_order"
  | "late_delivery"
  | "refund"
  | "allergy"
  | "hours"
  | "menu_question"
  | "account_rewards";

const FIRST_PARTY_ISSUES: { id: Issue; labelEn: string; labelFr: string; icon: typeof Package }[] = [
  { id: "missing_item", labelEn: "Missing item", labelFr: "Article manquant", icon: Package },
  { id: "wrong_order", labelEn: "Wrong order", labelFr: "Mauvaise commande", icon: ShieldAlert },
  { id: "late_delivery", labelEn: "Late delivery / pickup", labelFr: "Livraison ou cueillette en retard", icon: Clock },
  { id: "refund", labelEn: "Refund / payment", labelFr: "Remboursement / paiement", icon: Receipt },
  { id: "allergy", labelEn: "Allergy / food safety", labelFr: "Allergie / sécurité alimentaire", icon: AlertTriangle },
  { id: "hours", labelEn: "Hours / location", labelFr: "Heures / emplacement", icon: MapPin },
  { id: "menu_question", labelEn: "Menu question", labelFr: "Question sur le menu", icon: HelpCircle },
  { id: "account_rewards", labelEn: "Account / rewards", labelFr: "Compte / récompenses", icon: User },
];

const THIRD_PARTY_ISSUES: { id: "food" | "delivery"; labelEn: string; labelFr: string; icon: typeof Package }[] = [
  { id: "food", labelEn: "Food quality / wrong item", labelFr: "Qualité de la nourriture / article erroné", icon: ShieldAlert },
  { id: "delivery", labelEn: "Courier, tracking or payment", labelFr: "Livreur, suivi ou paiement", icon: Package },
];

/**
 * Full "Where did you order?" → issue-type decision tree.
 * Marketplace orders are always deep-linked to that marketplace's own
 * support/help destination — PPP never claims it can refund, cancel or
 * track a marketplace order. First-party issues route to PPP phone/contact.
 */
export function SupportRouter() {
  const { t, setSupportContext, lastSupportChannel, lastSupportLocationId } = usePPP();
  const [channel, setChannel] = useState<Channel | null>(lastSupportChannel ?? null);
  const [issue, setIssue] = useState<Issue | "food" | "delivery" | null>(null);
  const [locSlug, setLocSlug] = useState<string>(
    (locationById(lastSupportLocationId ?? "")?.slug as string | undefined) ?? "ndg",
  );

  const activeLocation =
    restaurantLocations.find((l) => l.slug === locSlug) ??
    locationById(NDG_LOCATION_ID) ??
    restaurantLocations[0]!;

  const isThirdParty = channel === "uber_eats" || channel === "doordash" || channel === "skip";
  const isFirstParty = channel === "direct" || channel === "phone";

  const marketplace = channel ? marketplaceById[channel] : undefined;

  const issueOptions = useMemo(
    () => (isThirdParty ? THIRD_PARTY_ISSUES : FIRST_PARTY_ISSUES),
    [isThirdParty],
  );

  function pickChannel(c: Channel) {
    setChannel(c);
    setIssue(null);
    setSupportContext(c, activeLocation.id);
    trackSupportRouted(
      c === "not_yet" ? "general" : c === "phone" ? "phone_order" : "location",
    );
  }

  function reset() {
    setChannel(null);
    setIssue(null);
  }

  return (
    <div className="border border-border bg-card p-4 sm:p-6">
      {channel && (
        <button
          type="button"
          onClick={reset}
          className="press-tap mb-3 inline-flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground focus-ppp"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("Start over", "Recommencer")}
        </button>
      )}

      <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
        {t("Support router", "Aiguillage support")}
      </p>
      <h3 className="mt-1 font-display text-2xl uppercase leading-none sm:text-3xl">
        {channel === null
          ? t("Where did you order?", "Où avez-vous commandé?")
          : t("What happened?", "Que s'est-il passé?")}
      </h3>

      {/* Step 1 — order channel */}
      {channel === null && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => pickChannel(c.id)}
                className="press-tap flex flex-col items-start gap-2 border border-border p-3 text-left transition-colors hover:border-primary focus-ppp"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-display text-sm uppercase leading-tight">
                  {t(c.labelEn, c.labelFr)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Step 2 — issue type */}
      {channel !== null && channel !== "not_yet" && issue === null && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {issueOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setIssue(opt.id)}
                className="press-tap flex flex-col items-start gap-2 border border-border p-3 text-left transition-colors hover:border-primary focus-ppp"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-display text-xs uppercase leading-tight">
                  {t(opt.labelEn, opt.labelFr)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Haven't ordered yet → general contact */}
      {channel === "not_yet" && (
        <div className="mt-4 border border-border bg-background p-3 sm:p-4">
          <p className="text-sm text-muted-foreground">
            {t(
              "For gift cards, account, careers, franchise or a general question, use Contact.",
              "Pour les cartes-cadeaux, un compte, les carrières, la franchise ou une question générale, utilisez Contact.",
            )}
          </p>
          <Link
            to="/contact"
            className="press-tap mt-3 inline-flex items-center gap-2 bg-primary px-4 py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
          >
            <Store className="h-4 w-4" />
            {t("Go to Contact", "Aller à Contact")}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Third-party: courier/tracking/payment → provider owns it, no exceptions */}
      {isThirdParty && issue === "delivery" && marketplace && (
        <div className="mt-4 border border-border bg-background p-3 sm:p-4">
          <p className="text-sm text-muted-foreground">
            {t(
              `This order was placed through ${marketplace.name}. Order tracking, courier issues, cancellations and marketplace refunds are handled through ${marketplace.name} — PPP cannot refund, cancel or track an order placed on another platform.`,
              `Cette commande a été passée via ${marketplace.name}. Le suivi de commande, les problèmes de livreur, les annulations et les remboursements sont gérés par ${marketplace.name} — PPP ne peut pas rembourser, annuler ni suivre une commande passée sur une autre plateforme.`,
            )}
          </p>
          {marketplace.supportUrl ? (
            <a
              href={marketplace.supportUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackSupportRouted("location")}
              className="press-tap mt-3 inline-flex items-center gap-2 bg-primary px-4 py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t(`Open ${marketplace.name} support`, `Ouvrir le support ${marketplace.name}`)}
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              {t(
                "Open your order in the app you ordered from and choose Help.",
                "Ouvrez votre commande dans l'application utilisée et choisissez Aide.",
              )}
            </p>
          )}
        </div>
      )}

      {/* Third-party: food quality → PPP can take feedback, but not refund the marketplace order */}
      {isThirdParty && issue === "food" && marketplace && (
        <div className="mt-4 border border-border bg-background p-3 sm:p-4">
          <p className="text-sm text-muted-foreground">
            {t(
              `Because this order was placed through ${marketplace.name}, delivery, payment and refunds stay with ${marketplace.name}. PPP can still hear about a food quality issue so the kitchen can fix it going forward.`,
              `Comme cette commande a été passée via ${marketplace.name}, la livraison, le paiement et les remboursements restent gérés par ${marketplace.name}. PPP peut tout de même recevoir vos commentaires sur la qualité de la nourriture pour que la cuisine s'améliore.`,
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {marketplace.supportUrl && (
              <a
                href={marketplace.supportUrl}
                target="_blank"
                rel="noreferrer"
                className="press-tap inline-flex items-center gap-2 bg-primary px-4 py-3 font-display text-sm uppercase leading-none text-primary-foreground focus-ppp"
              >
                {t(`Open ${marketplace.name} support`, `Ouvrir le support ${marketplace.name}`)}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <Link
              to="/contact"
              className="press-tap inline-flex items-center gap-2 border border-border px-4 py-3 font-display text-sm uppercase leading-none text-foreground hover:border-primary focus-ppp"
            >
              {t("Tell PPP about the food", "Parler de la nourriture à PPP")}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* First-party (direct/phone) resolved issue → PPP phone/contact/callback */}
      {isFirstParty && issue !== null && (
        <div className="mt-4 border border-border bg-background p-3 sm:p-4">
          <label className="block">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              {t("Which location?", "Quel emplacement?")}
            </span>
            <select
              value={locSlug}
              onChange={(e) => {
                setLocSlug(e.target.value);
                const loc = restaurantLocations.find((l) => l.slug === e.target.value);
                if (loc) setSupportContext(channel!, loc.id);
              }}
              className="mt-1.5 w-full border border-border bg-card px-3 py-2 text-sm focus-ppp"
            >
              {restaurantLocations.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.displayName}
                </option>
              ))}
            </select>
          </label>

          <p className="mt-3 text-sm text-muted-foreground">
            {issue === "allergy"
              ? t(
                  "For an allergy or food-safety concern, call the location right away so the team can help.",
                  "Pour une allergie ou une préoccupation de sécurité alimentaire, appelez l'emplacement immédiatement pour que l'équipe puisse vous aider.",
                )
              : issue === "account_rewards"
                ? t(
                    "Account and rewards questions are best handled through Contact so PPP can look into your account.",
                    "Les questions de compte et de récompenses sont mieux traitées via Contact afin que PPP puisse consulter votre compte.",
                  )
                : t(
                    "This order was placed directly with PPP. Call the restaurant with your order details, or send it through Contact.",
                    "Cette commande a été passée directement chez PPP. Appelez le restaurant avec les détails de votre commande, ou envoyez-les via Contact.",
                  )}
          </p>

          {activeLocation.phone ? (
            <a
              href={`tel:${activeLocation.phone.e164}`}
              onClick={() => trackSupportRouted("phone_order")}
              className="press-tap mt-3 inline-flex items-center gap-2 bg-primary px-4 py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            >
              <PhoneCall className="h-4 w-4" />
              {activeLocation.phone.display}
            </a>
          ) : (
            <p className="mt-3 border border-border bg-card p-3 text-xs text-muted-foreground">
              {t(
                "A phone number for this location isn't published yet.",
                "Le numéro de téléphone de cet emplacement n'est pas encore publié.",
              )}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              to="/contact"
              onClick={() => trackSupportRouted("general")}
              className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-accent underline focus-ppp"
            >
              <MapPin className="h-3.5 w-3.5" />
              {t("Full location contact info", "Coordonnées complètes de l'emplacement")}
            </Link>
            {issue === "account_rewards" && (
              <Link
                to="/faq"
                className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-accent underline focus-ppp"
              >
                <Gift className="h-3.5 w-3.5" />
                {t("Rewards FAQ", "FAQ récompenses")}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
