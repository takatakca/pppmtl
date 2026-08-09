import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ExternalLink, MapPin, Phone, Store } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { NDG_LOCATION_ID, locationById, restaurantLocations } from "@/config/locations";
import { orderingChannels } from "@/config/external-presence";

type OrderChannel = "direct" | "uber_eats" | "doordash" | "skip" | "in_store" | "not_order";

const CHANNELS: { id: OrderChannel; labelEn: string; labelFr: string }[] = [
  { id: "direct", labelEn: "PPP Direct (this site)", labelFr: "PPP Direct (ce site)" },
  { id: "uber_eats", labelEn: "Uber Eats", labelFr: "Uber Eats" },
  { id: "doordash", labelEn: "DoorDash", labelFr: "DoorDash" },
  { id: "skip", labelEn: "SkipTheDishes", labelFr: "SkipTheDishes" },
  { id: "in_store", labelEn: "In-store visit", labelFr: "Visite en restaurant" },
  { id: "not_order", labelEn: "Not an order", labelFr: "Ce n'est pas une commande" },
];

const marketplaceById: Record<string, (typeof orderingChannels)[number] | undefined> = {
  uber_eats: orderingChannels.find((c) => c.id === "uber_eats"),
  doordash: orderingChannels.find((c) => c.id === "doordash"),
  skip: orderingChannels.find((c) => c.id === "skip"),
};

/**
 * "Where did you order?" support router.
 * Marketplace orders are always deep-linked to that marketplace's own
 * support/help destination — PPP cannot modify or refund those orders.
 */
export function SupportRouter() {
  const { t, locationId } = usePPP();
  const [channel, setChannel] = useState<OrderChannel | null>(null);
  const [locSlug, setLocSlug] = useState<string>(
    (locationById(locationId ?? "")?.slug as string | undefined) ?? "ndg",
  );

  const activeLocation =
    restaurantLocations.find((l) => l.slug === locSlug) ??
    locationById(NDG_LOCATION_ID) ??
    restaurantLocations[0]!;

  return (
    <div className="border border-border bg-card p-4 sm:p-6">
      <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
        {t("Support router", "Aiguillage support")}
      </p>
      <h3 className="mt-1 font-display text-2xl uppercase leading-none">
        {t("Where did you order?", "Où avez-vous commandé?")}
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChannel(c.id)}
            className={`press-tap border px-3 py-3 text-left font-display text-sm uppercase leading-tight transition-colors focus-ppp ${
              channel === c.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-foreground hover:border-primary"
            }`}
          >
            {t(c.labelEn, c.labelFr)}
          </button>
        ))}
      </div>

      {channel && (channel === "direct" || channel === "in_store") && (
        <div className="mt-4 border border-border bg-background p-3 sm:p-4">
          <label className="block">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              {t("Which location?", "Quel emplacement?")}
            </span>
            <select
              value={locSlug}
              onChange={(e) => setLocSlug(e.target.value)}
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
            {channel === "direct"
              ? t(
                  "This order was placed directly with PPP. Call the restaurant with your order details.",
                  "Cette commande a été passée directement chez PPP. Appelez le restaurant avec les détails de votre commande.",
                )
              : t(
                  "For anything about visiting the restaurant, contact the location directly.",
                  "Pour toute question sur une visite au restaurant, contactez l'emplacement directement.",
                )}
          </p>

          {activeLocation.phone ? (
            <a
              href={`tel:${activeLocation.phone.e164}`}
              className="press-tap mt-3 inline-flex items-center gap-2 bg-primary px-4 py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            >
              <Phone className="h-4 w-4" />
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
          <div className="mt-2">
            <Link
              to="/contact"
              className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-accent underline focus-ppp"
            >
              <MapPin className="h-3.5 w-3.5" />
              {t("Full location contact info", "Coordonnées complètes de l'emplacement")}
            </Link>
          </div>
        </div>
      )}

      {channel && marketplaceById[channel] && (
        <div className="mt-4 border border-border bg-background p-3 sm:p-4">
          <p className="text-sm text-muted-foreground">
            {t(
              `This order was placed with ${marketplaceById[channel]!.name}. For order status, refunds or courier support, continue to ${marketplaceById[channel]!.name} support — PPP cannot change or refund an order placed on another platform.`,
              `Cette commande a été passée sur ${marketplaceById[channel]!.name}. Pour le statut, un remboursement ou le support du livreur, continuez vers le support de ${marketplaceById[channel]!.name} — PPP ne peut pas modifier ni rembourser une commande passée sur une autre plateforme.`,
            )}
          </p>
          {marketplaceById[channel]!.url ? (
            <a
              href={marketplaceById[channel]!.url!}
              target="_blank"
              rel="noreferrer"
              className="press-tap mt-3 inline-flex items-center gap-2 bg-primary px-4 py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t(`Open ${marketplaceById[channel]!.name} support`, `Ouvrir le support ${marketplaceById[channel]!.name}`)}
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

      {channel === "not_order" && (
        <div className="mt-4 border border-border bg-background p-3 sm:p-4">
          <p className="text-sm text-muted-foreground">
            {t(
              "For gift cards, account, careers, franchise or a general question, use the contact options below.",
              "Pour les cartes-cadeaux, un compte, les carrières, la franchise ou une question générale, utilisez les options de contact ci-dessous.",
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
    </div>
  );
}
