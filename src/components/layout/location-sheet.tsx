import { ArrowUpRight, Bell, MapPin, Phone, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePPP, useSelectedRestaurantLocation } from "@/context/ppp-store";
import {
  canOrder,
  comingSoonLocations,
  openLocations,
  pastLocations,
  type RestaurantLocation,
} from "@/config/locations";

/**
 * Grouped store selector: OPEN, COMING SOON and PAST LOCATIONS never share a
 * visual treatment. Only OPEN + PPP Direct stores expose an order path.
 */
export function LocationSheet() {
  const { locationSheetOpen, closeLocationSheet, mode, setMode, t } = usePPP();
  const selected = useSelectedRestaurantLocation();
  if (!locationSheetOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-label={t("Choose a location", "Choisir un emplacement")}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto surface-panel p-6 rise-in"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl uppercase">{t("Your PPP", "Votre PPP")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "Pick a restaurant and how you want your order.",
                "Choisissez un restaurant et votre mode de commande.",
              )}
            </p>
          </div>
          <button
            onClick={closeLocationSheet}
            aria-label={t("Close", "Fermer")}
            className="rounded-lg border border-border p-2 focus-ppp"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 inline-flex rounded-xl border border-border bg-secondary p-1">
          {(["pickup", "delivery"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-5 py-2 text-xs font-bold uppercase tracking-widest transition-colors focus-ppp ${
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {m === "pickup" ? t("Pickup", "Cueillette") : t("Delivery", "Livraison")}
            </button>
          ))}
        </div>

        <LocationGroup
          label={t("Open locations", "Emplacements ouverts")}
          badgeClass="border-primary text-primary"
          locations={openLocations}
          selectedId={selected.id}
        />
        <LocationGroup
          label={t("Coming soon", "Bientôt ouvert")}
          badgeClass="border-accent text-accent"
          locations={comingSoonLocations}
          selectedId={selected.id}
        />
        <LocationGroup
          label={t("Past locations", "Anciens emplacements")}
          badgeClass="border-border text-muted-foreground"
          locations={pastLocations}
          selectedId={selected.id}
        />
      </div>
    </div>
  );
}

function LocationGroup({
  label,
  badgeClass,
  locations,
  selectedId,
}: {
  label: string;
  badgeClass: string;
  locations: RestaurantLocation[];
  selectedId: string;
}) {
  const { t } = usePPP();
  if (locations.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </p>
      <ul className="mt-2 space-y-3">
        {locations.map((l) => (
          <li key={l.id}>
            <LocationRow loc={l} badgeClass={badgeClass} selected={l.id === selectedId} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LocationRow({
  loc,
  badgeClass,
  selected,
}: {
  loc: RestaurantLocation;
  badgeClass: string;
  selected: boolean;
}) {
  const { t, setSelectedLocationId, closeLocationSheet } = usePPP();
  const orderable = canOrder(loc);
  const isClosed = loc.lifecycleStatus === "closed" || loc.lifecycleStatus === "temporarily_closed";
  const isComingSoon = loc.lifecycleStatus === "coming_soon";

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        selected ? "border-primary bg-card" : "border-border bg-card"
      }`}
    >
      <button onClick={() => setSelectedLocationId(loc.id)} className="w-full text-left focus-ppp">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-xl uppercase">{loc.neighborhood}</p>
          <span
            className={`border px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-widest ${badgeClass}`}
          >
            {isClosed
              ? t("Closed", "Fermé")
              : isComingSoon
                ? t("Coming soon", "Bientôt")
                : t("Open", "Ouvert")}
          </span>
        </div>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" /> {loc.address}, {loc.city} ({loc.province})
        </p>
        {loc.phone && (
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 text-primary" /> {loc.phone.display}
          </p>
        )}
      </button>

      <div className="mt-3 flex gap-2">
        {orderable ? (
          <>
            <Link
              to="/locations/$slug"
              params={{ slug: loc.slug }}
              onClick={closeLocationSheet}
              className="flex-1 bg-primary px-3 py-2 text-center text-xs font-bold uppercase tracking-widest text-primary-foreground focus-ppp"
            >
              {t("Order", "Commander")}
            </Link>
            {loc.google.directionsUrl && (
              <a
                href={loc.google.directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 border border-border px-3 py-2 text-center text-xs font-bold uppercase tracking-widest focus-ppp hover:border-primary"
              >
                {t("Directions", "Itinéraire")}
              </a>
            )}
          </>
        ) : isComingSoon ? (
          <Link
            to="/locations/$slug"
            params={{ slug: loc.slug }}
            onClick={closeLocationSheet}
            className="flex flex-1 items-center justify-center gap-1.5 border border-border px-3 py-2 text-center text-xs font-bold uppercase tracking-widest focus-ppp hover:border-primary"
          >
            <Bell className="h-3.5 w-3.5 text-accent" />
            {t("Get updates", "Recevoir les nouvelles")}
          </Link>
        ) : (
          <>
            <span className="flex-1 border border-dashed border-border px-3 py-2 text-center text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
              {t("This location is closed", "Cet emplacement est fermé")}
            </span>
            <Link
              to="/locations"
              onClick={closeLocationSheet}
              className="flex flex-1 items-center justify-center gap-1.5 border border-border px-3 py-2 text-center text-xs font-bold uppercase tracking-widest focus-ppp hover:border-primary"
            >
              {t("Find another", "Trouver un autre")}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
