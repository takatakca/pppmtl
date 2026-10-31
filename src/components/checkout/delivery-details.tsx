import { useEffect, useId, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin } from "lucide-react";
import {
  DELIVERY_FEE_CENTS,
  RESTAURANT_COORDS,
  deliversTo,
  distanceKm,
  postalCodeOf,
} from "@/config/delivery";
import { usePPP, type SavedAddress } from "@/context/ppp-store";
import type { Location } from "@/data/menu";
import { cn } from "@/lib/utils";
import {
  addressAt,
  currentPosition,
  searchAddresses,
  type AddressSuggestion,
} from "./address-search";
import { CheckoutMap } from "./checkout-map";
import { deliveryAreaStatus, type DeliveryAddressValue } from "./checkout-values";
import { fieldClass, hintClass, labelClass, missingClass } from "./styles";

export function DeliveryDetails({
  value,
  onChange,
  location,
  highlight,
}: {
  value: DeliveryAddressValue;
  onChange: (next: DeliveryAddressValue) => void;
  location: Location | null;
  /** After "Place order" with an incomplete address. */
  highlight: boolean;
}) {
  const { t, savedAddresses } = usePPP();
  const listId = useId();
  const [query, setQuery] = useState(value.street);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const typed = useRef(false);

  useEffect(() => setQuery(value.street), [value.street]);

  // Suggestions follow the typing, a little after the last key (fair use of the free service).
  useEffect(() => {
    if (!typed.current || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void searchAddresses(query, controller.signal).then((found) => {
        setSuggestions(found);
        setActive(-1);
        setOpen(found.length > 0);
      });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const choose = (s: AddressSuggestion) => {
    typed.current = false;
    setOpen(false);
    onChange({
      ...value,
      street: s.street,
      city: s.city,
      postalCode: s.postalCode || value.postalCode,
      lat: s.lat,
      lng: s.lng,
    });
  };

  const pickSaved = (a: SavedAddress) => {
    typed.current = false;
    onChange({
      street: a.street,
      unit: a.unit ?? "",
      city: a.city,
      postalCode: a.postalCode,
      instructions: a.instructions ?? "",
      lat: null,
      lng: null,
    });
  };

  const locate = async () => {
    setLocating(true);
    setLocateError(null);
    const here = await currentPosition();
    const found = here ? await addressAt(here.lat, here.lng) : null;
    setLocating(false);
    if (found) choose(found);
    else
      setLocateError(
        here
          ? t(
              "We found your position but not a street address. Type it below.",
              "Nous avons votre position, mais pas d'adresse. Tapez-la ci-dessous.",
              "Encontramos tu posición pero no una dirección. Escríbela abajo.",
            )
          : t(
              "Location is off or blocked. Allow it in your browser, or type the address.",
              "La localisation est désactivée ou bloquée. Autorisez-la, ou tapez l'adresse.",
              "La ubicación está desactivada o bloqueada. Permítela o escribe la dirección.",
            ),
      );
  };

  const status = deliveryAreaStatus(value);
  const streetMissing = highlight && !value.street.trim();
  const postalMissing = highlight && !postalCodeOf(value.postalCode);
  const km =
    value.lat !== null && value.lng !== null
      ? distanceKm(RESTAURANT_COORDS, { lat: value.lat, lng: value.lng })
      : null;
  const mapQuery =
    status === "incomplete"
      ? null
      : `${value.street}, ${value.city || "Montréal"}, QC ${postalCodeOf(value.postalCode)}`;
  const alternatives = [
    { label: "Uber Eats", href: location?.links.uberEatsUrl },
    { label: "DoorDash", href: location?.links.doorDashUrl },
    { label: "SkipTheDishes", href: location?.links.skipUrl },
  ].filter((a): a is { label: string; href: string } => Boolean(a.href));

  return (
    <div className="grid gap-4">
      {savedAddresses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {savedAddresses.slice(-3).map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => pickSaved(a)}
              className="flex items-center gap-1.5 border border-border px-3 py-2 text-xs focus-ppp hover:border-primary"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {a.label || a.street}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <label htmlFor={`${listId}-street`} className={labelClass}>
          {t("Delivery address", "Adresse de livraison", "Dirección de entrega")}
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id={`${listId}-street`}
            role="combobox"
            aria-expanded={open}
            aria-controls={`${listId}-list`}
            aria-autocomplete="list"
            aria-invalid={streetMissing || undefined}
            autoComplete="street-address"
            placeholder={t(
              "Start typing: 5800 Monkland…",
              "Commencez à taper : 5800 Monkland…",
              "Empieza a escribir: 5800 Monkland…",
            )}
            value={query}
            onChange={(e) => {
              typed.current = true;
              setQuery(e.target.value);
              onChange({ ...value, street: e.target.value, lat: null, lng: null });
            }}
            onKeyDown={(e) => {
              if (!open || !suggestions.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && active >= 0) {
                e.preventDefault();
                choose(suggestions[active]!);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className={cn(fieldClass, "mt-0 flex-1", streetMissing && missingClass)}
          />
          <button
            type="button"
            onClick={() => void locate()}
            disabled={locating}
            aria-label={t("Use my location", "Utiliser ma position", "Usar mi ubicación")}
            className="flex h-12 shrink-0 items-center gap-2 border border-border px-3 text-xs font-bold uppercase tracking-widest focus-ppp hover:border-primary disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crosshair className="h-4 w-4 text-primary" />
            )}
            <span className="hidden sm:inline">{t("Locate me", "Me localiser", "Ubicarme")}</span>
          </button>
        </div>
        {open && (
          <ul
            id={`${listId}-list`}
            role="listbox"
            className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-auto border border-border bg-background shadow-xl"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.label}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(s);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-3 text-sm",
                  i === active ? "bg-muted" : "hover:bg-muted",
                )}
              >
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                {s.label}
              </li>
            ))}
          </ul>
        )}
        {streetMissing && (
          <span className={hintClass}>
            {t("Address required", "Adresse obligatoire", "Dirección obligatoria")}
          </span>
        )}
        {locateError && (
          <span className="mt-1 block text-xs text-muted-foreground">{locateError}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={labelClass}>{t("Apt / unit", "App. / unité", "Depto. / unidad")}</span>
          <input
            value={value.unit}
            onChange={(e) => onChange({ ...value, unit: e.target.value })}
            autoComplete="address-line2"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>{t("Postal code", "Code postal", "Código postal")}</span>
          <input
            value={value.postalCode}
            onChange={(e) => onChange({ ...value, postalCode: e.target.value.toUpperCase() })}
            autoComplete="postal-code"
            placeholder="H4A 1G1"
            maxLength={7}
            aria-invalid={postalMissing || undefined}
            className={cn(fieldClass, postalMissing && missingClass)}
          />
          {postalMissing && (
            <span className={hintClass}>
              {t("Postal code required", "Code postal obligatoire", "Código postal obligatorio")}
            </span>
          )}
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>
          {t(
            "Instructions for the driver (optional)",
            "Instructions pour le livreur (facultatif)",
            "Instrucciones para el repartidor (opcional)",
          )}
        </span>
        <input
          value={value.instructions}
          onChange={(e) => onChange({ ...value, instructions: e.target.value })}
          maxLength={120}
          placeholder={t(
            "Buzz 302, side door…",
            "Sonnez au 302, porte de côté…",
            "Timbre 302, puerta lateral…",
          )}
          className={fieldClass}
        />
      </label>

      {status === "served" && (
        <p className="border border-border px-4 py-3 text-sm">
          <span className="font-semibold text-emerald-400">
            {t("We deliver here", "Nous livrons ici", "Entregamos aquí")}
          </span>
          {" · "}
          {t("Delivery fee", "Frais de livraison", "Envío")} $
          {(DELIVERY_FEE_CENTS / 100).toFixed(2)}
          {km !== null && ` · ${km.toFixed(1)} km`}
        </p>
      )}
      {status === "outside" && (
        <div className="border-2 border-destructive px-4 py-3 text-sm">
          <p className="font-semibold">
            {t(
              "We don't deliver to this postal code yet.",
              "Nous ne livrons pas encore à ce code postal.",
              "Aún no entregamos en este código postal.",
            )}
          </p>
          <p className="mt-1 text-muted-foreground">
            {t(
              "Choose pickup, or order delivery on:",
              "Choisissez la cueillette, ou commandez la livraison sur :",
              "Elige recoger, o pide entrega en:",
            )}{" "}
            {alternatives.length
              ? alternatives.map((a, i) => (
                  <span key={a.label}>
                    {i > 0 && " · "}
                    <a href={a.href} target="_blank" rel="noreferrer" className="underline">
                      {a.label}
                    </a>
                  </span>
                ))
              : "Uber Eats · DoorDash · SkipTheDishes"}
          </p>
        </div>
      )}

      {mapQuery && (
        <CheckoutMap
          query={mapQuery}
          title={t(
            "Delivery address map",
            "Carte de l'adresse de livraison",
            "Mapa de la dirección",
          )}
        />
      )}

      <p className="text-[0.65rem] text-muted-foreground">
        {t(
          "Delivered by a DoorDash or Uber courier, or our own driver. Address search © OpenStreetMap.",
          "Livré par un livreur DoorDash ou Uber, ou par notre livreur. Recherche d'adresse © OpenStreetMap.",
          "Entregado por un repartidor de DoorDash o Uber, o nuestro repartidor. Búsqueda © OpenStreetMap.",
        )}
      </p>
    </div>
  );
}
