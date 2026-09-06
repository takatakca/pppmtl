import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { locations, type Lang, type OrderMode } from "@/data/menu";
import { NDG_LOCATION_ID, locationById, restaurantLocations } from "@/config/locations";
import { track } from "@/lib/analytics";
import { newLine, type CartLine, type LineSelections } from "@/lib/cart";
import { menuRepository } from "@/lib/menu-repository";
import { isLang } from "@/i18n/types";
import { translate, type TranslationKey } from "@/i18n";

const KEY = "ppp.session.v1";

export type SupportOrderChannel =
  | "direct"
  | "phone"
  | "uber_eats"
  | "doordash"
  | "skip"
  | "not_yet";

interface Persisted {
  lang: Lang;
  /** Set only once the customer has explicitly picked a language. */
  preferredLanguage?: Lang;
  locationId: string | null;
  /** Selected storefront in the multi-location registry (config/locations). */
  selectedLocationId: string;
  mode: OrderMode;
  recentSearches: string[];
  cart: CartLine[];
  /** Last order channel + location picked in the Support decision tree. */
  lastSupportChannel: SupportOrderChannel | null;
  lastSupportLocationId: string | null;
}

interface Store extends Persisted {
  setLang: (lang: Lang) => void;
  /** Records an explicit customer language choice (used by the welcome experience). */
  setPreferredLanguage: (lang: Lang) => void;
  tr: (key: TranslationKey) => string;
  setLocationId: (id: string | null) => void;
  setSelectedLocationId: (id: string) => void;
  setMode: (mode: OrderMode) => void;
  setSupportContext: (channel: SupportOrderChannel, locationId?: string | null) => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  searchOpen: boolean;
  searchSeed: string;
  openSearch: (seed?: string) => void;
  closeSearch: () => void;
  locationSheetOpen: boolean;
  openLocationSheet: () => void;
  closeLocationSheet: () => void;
  orderSheetOpen: boolean;
  openOrderSheet: () => void;
  closeOrderSheet: () => void;
  addToCart: (
    itemId: string,
    quantity: number,
    instructions: string,
    selections?: LineSelections,
  ) => void;
  setLineQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  t: (en: string, fr: string) => string;
}

const defaults: Persisted = {
  lang: "en",
  locationId: locations[0]?.id ?? null,
  selectedLocationId: NDG_LOCATION_ID,
  mode: "pickup",
  recentSearches: [],
  cart: [],
  lastSupportChannel: null,
  lastSupportLocationId: null,
};

const PPPContext = createContext<Store | null>(null);

export function PPPProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(defaults);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSeed, setSearchSeed] = useState("");
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<Persisted>;
        // Older sessions predate Spanish / preferredLanguage — keep them loadable.
        if (stored.lang && !isLang(stored.lang)) delete stored.lang;
        if (stored.preferredLanguage && !isLang(stored.preferredLanguage)) {
          delete stored.preferredLanguage;
        }
        // Drop stale location ids from earlier location records.
        if (stored.locationId && !locations.some((l) => l.id === stored.locationId)) {
          stored.locationId = defaults.locationId;
        }
        if (
          stored.selectedLocationId &&
          !restaurantLocations.some((l) => l.id === stored.selectedLocationId)
        ) {
          stored.selectedLocationId = defaults.selectedLocationId;
        }
        setState((s) => ({ ...s, ...stored }));
      }
    } catch {
      /* ignore unreadable storage */
    }
  }, []);

  const persist = useCallback((next: Persisted) => {
    setState(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<Store>(() => {
    return {
      ...state,
      setLang: (lang) => persist({ ...state, lang, preferredLanguage: lang }),
      setPreferredLanguage: (lang) => persist({ ...state, lang, preferredLanguage: lang }),
      tr: (key) => translate(state.lang, key),
      setLocationId: (locationId) => {
        track("location_selected", { locationId });
        persist({ ...state, locationId });
      },
      setSelectedLocationId: (selectedLocationId) => {
        track("location_selected", { locationId: selectedLocationId });
        persist({ ...state, selectedLocationId });
      },
      setMode: (mode) => {
        track("order_mode_selected", { mode });
        persist({ ...state, mode });
      },
      setSupportContext: (channel, locId) => {
        persist({
          ...state,
          lastSupportChannel: channel,
          lastSupportLocationId: locId !== undefined ? locId : state.lastSupportLocationId,
        });
      },
      addRecentSearch: (q) => {
        const clean = q.trim();
        if (!clean) return;
        const recentSearches = [clean, ...state.recentSearches.filter((r) => r !== clean)].slice(
          0,
          6,
        );
        persist({ ...state, recentSearches });
      },
      clearRecentSearches: () => persist({ ...state, recentSearches: [] }),
      addToCart: (itemId, quantity, instructions, selections) => {
        const item = menuRepository.getItem(itemId);
        if (!item) return;
        track("cart_item_added", { itemId, quantity });
        persist({
          ...state,
          cart: [...state.cart, newLine(item, quantity, instructions, selections ?? {})],
        });
        setCartOpen(true);
      },
      setLineQuantity: (lineId, quantity) =>
        persist({
          ...state,
          cart:
            quantity <= 0
              ? state.cart.filter((l) => l.lineId !== lineId)
              : state.cart.map((l) => (l.lineId === lineId ? { ...l, quantity } : l)),
        }),
      removeLine: (lineId) =>
        persist({ ...state, cart: state.cart.filter((l) => l.lineId !== lineId) }),
      clearCart: () => persist({ ...state, cart: [] }),
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      searchOpen,
      searchSeed,
      openSearch: (seed = "") => {
        setSearchSeed(seed);
        setSearchOpen(true);
        track("food_search_started", { seed });
      },
      closeSearch: () => setSearchOpen(false),
      locationSheetOpen,
      openLocationSheet: () => setLocationSheetOpen(true),
      closeLocationSheet: () => setLocationSheetOpen(false),
      orderSheetOpen,
      openOrderSheet: () => setOrderSheetOpen(true),
      closeOrderSheet: () => setOrderSheetOpen(false),
      t: (en, fr) => (state.lang === "fr" ? fr : en),
    };
  }, [state, persist, searchOpen, searchSeed, locationSheetOpen, orderSheetOpen, cartOpen]);

  return <PPPContext.Provider value={value}>{children}</PPPContext.Provider>;
}

export function usePPP() {
  const ctx = useContext(PPPContext);
  if (!ctx) throw new Error("usePPP must be used inside PPPProvider");
  return ctx;
}

export function useSelectedLocation() {
  const { locationId } = usePPP();
  return locations.find((l) => l.id === locationId) ?? null;
}

/** The selected storefront from the multi-location registry (config/locations). */
export function useSelectedRestaurantLocation() {
  const { selectedLocationId } = usePPP();
  return locationById(selectedLocationId) ?? restaurantLocations[0]!;
}
