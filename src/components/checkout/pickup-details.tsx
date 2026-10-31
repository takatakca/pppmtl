import { useState } from "react";
import { Clock, Crosshair, Loader2, Navigation } from "lucide-react";
import { RESTAURANT_COORDS, distanceKm } from "@/config/delivery";
import { usePPP } from "@/context/ppp-store";
import type { Location } from "@/data/menu";
import { currentPosition } from "./address-search";
import { CheckoutMap } from "./checkout-map";

/** City driving, door to door: a rough guide for "about N min away". */
const CITY_KMH = 25;

export function PickupDetails({
  location,
  onChangeLocation,
}: {
  location: Location | null;
  onChangeLocation: () => void;
}) {
  const { t } = usePPP();
  const [away, setAway] = useState<{ km: number } | "unavailable" | null>(null);
  const [locating, setLocating] = useState(false);

  if (!location) {
    return (
      <button
        type="button"
        onClick={onChangeLocation}
        className="w-full border border-dashed border-border px-4 py-4 text-left text-sm focus-ppp hover:border-primary"
      >
        {t("Choose a restaurant", "Choisir un restaurant", "Elegir un restaurante")}
      </button>
    );
  }

  const fullAddress = `${location.address}, ${location.city}, ${location.province}${location.postalCode ? ` ${location.postalCode}` : ""}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;

  const locate = async () => {
    setLocating(true);
    const here = await currentPosition();
    setLocating(false);
    setAway(here ? { km: distanceKm(here, RESTAURANT_COORDS) } : "unavailable");
  };

  return (
    <div className="grid gap-4">
      <CheckoutMap
        query={`${location.name}, ${fullAddress}`}
        title={t("Map of the restaurant", "Carte du restaurant", "Mapa del restaurante")}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl uppercase leading-none">{location.name}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{fullAddress}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            {t(
              "Ready in about 20–30 min",
              "Prête dans environ 20 à 30 min",
              "Listo en unos 20–30 min",
            )}
          </p>
          {away && (
            <p className="mt-1 text-sm text-muted-foreground">
              {away === "unavailable"
                ? t(
                    "Location is off or blocked in your browser.",
                    "La localisation est désactivée ou bloquée.",
                    "La ubicación está desactivada o bloqueada.",
                  )
                : t(
                    `You're ${away.km.toFixed(1)} km away · about ${Math.max(2, Math.round((away.km / CITY_KMH) * 60))} min by car`,
                    `Vous êtes à ${away.km.toFixed(1).replace(".", ",")} km · environ ${Math.max(2, Math.round((away.km / CITY_KMH) * 60))} min en voiture`,
                    `Estás a ${away.km.toFixed(1)} km · unos ${Math.max(2, Math.round((away.km / CITY_KMH) * 60))} min en coche`,
                  )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void locate()}
            disabled={locating}
            className="flex h-11 items-center gap-2 border border-border px-3 text-xs font-bold uppercase tracking-widest focus-ppp hover:border-primary disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crosshair className="h-4 w-4 text-primary" />
            )}
            {t("Locate me", "Me localiser", "Ubicarme")}
          </button>
          <a
            href={directions}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center gap-2 border border-border px-3 text-xs font-bold uppercase tracking-widest focus-ppp hover:border-primary"
          >
            <Navigation className="h-4 w-4 text-primary" />
            {t("Directions", "Itinéraire", "Cómo llegar")}
          </a>
        </div>
      </div>
      <button
        type="button"
        onClick={onChangeLocation}
        className="justify-self-start text-xs uppercase tracking-widest text-muted-foreground underline-offset-4 hover:underline focus-ppp"
      >
        {t("Change restaurant", "Changer de restaurant", "Cambiar de restaurante")}
      </button>
    </div>
  );
}
