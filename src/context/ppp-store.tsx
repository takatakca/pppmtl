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
import {
  canAddCartLine,
  newLine,
  unitPriceFor,
  type CartLine,
  type LineSelections,
} from "@/lib/cart";
import { useBrand } from "@/context/brand";
import { keepKnownSelections } from "@/lib/modifiers";
import { menuRepository } from "@/lib/menu-repository";
import { isLang } from "@/i18n/types";
import { translate, type TranslationKey } from "@/i18n";

const KEY = "ppp.session.v1";

export type SupportOrderChannel =
  "direct" | "phone" | "uber_eats" | "doordash" | "skip" | "not_yet";

export interface SavedAddress {
  id: string;
  label?: string;
  street: string;
  unit?: string;
  city: string;
  province: string;
  postalCode: string;
  instructions?: string;
}

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
  /** Item ids the customer has favourited. Stored locally until TAKATAK identity is ready. */
  favourites: string[];
  /** Delivery addresses saved from checkout. Stored locally until TAKATAK identity is ready. */
  savedAddresses: SavedAddress[];
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
  /**
   * Inline three-language helper. Spanish is optional: when a screen has no
   * Spanish copy yet the customer sees English, never an empty string.
   */
  t: (en: string, fr: string, es?: string) => string;
  addFavourite: (itemId: string) => void;
  removeFavourite: (itemId: string) => void;
  isFavourite: (itemId: string) => boolean;
  addSavedAddress: (address: Omit<SavedAddress, "id">) => void;
  removeSavedAddress: (id: string) => void;
  /** Adds every reorderable line to the cart. Lines with unknown items are skipped. */
  reorderToCart: (
    lines: Array<{
      itemId: string;
      quantity: number;
      notes: string;
      selections: Record<string, string>;
    }>,
  ) => void;
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
  favourites: [],
  savedAddresses: [],
};

const PPPContext = createContext<Store | null>(null);

export function PPPProvider({ children }: { children: ReactNode }) {
  // Franchise domains start in French (Québec); PPP keeps English. A saved choice still wins.
  const brand = useBrand();
  const [state, setState] = useState<Persisted>(() =>
    brand.id === "ppp" ? defaults : { ...defaults, lang: "fr" },
  );
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
        // A saved cart is priced again from today's menu (Clover prices and options); gone items are dropped.
        if (Array.isArray(stored.cart)) {
          stored.cart = stored.cart.flatMap((line) => {
            if (!line || typeof line.itemId !== "string") return [];
            const item = menuRepository.getItem(line.itemId);
            if (!item) return [];
            const selections = keepKnownSelections(
              item.modifierGroups ?? [],
              line.selections ?? {},
            );
            if (!canAddCartLine(item, line.quantity, selections, stored.locationId)) return [];
            return [{ ...line, selections, unitPrice: unitPriceFor(item, selections) }];
          });
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
        if (!item || !canAddCartLine(item, quantity, selections ?? {}, state.locationId)) return;
        track("cart_item_added", { itemId, quantity });
        persist({
          ...state,
          cart: [...state.cart, newLine(item, quantity, instructions, selections ?? {})],
        });
        setCartOpen(true);
      },
      setLineQuantity: (lineId, quantity) => {
        if (!Number.isSafeInteger(quantity) || quantity > 50) return;
        persist({
          ...state,
          cart:
            quantity <= 0
              ? state.cart.filter((l) => l.lineId !== lineId)
              : state.cart.map((l) => (l.lineId === lineId ? { ...l, quantity } : l)),
        });
      },
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
      t: (en, fr, es) => {
        if (state.lang === "fr") return fr;
        if (state.lang === "es") return es && es.length > 0 ? es : en;
        return en;
      },
      addFavourite: (itemId) => {
        if (state.favourites.includes(itemId)) return;
        track("favourite_added", { itemId });
        persist({ ...state, favourites: [...state.favourites, itemId] });
      },
      removeFavourite: (itemId) => {
        track("favourite_removed", { itemId });
        persist({ ...state, favourites: state.favourites.filter((id) => id !== itemId) });
      },
      isFavourite: (itemId) => state.favourites.includes(itemId),
      addSavedAddress: (address) => {
        const id = `addr_${Date.now().toString(36)}`;
        track("saved_address_added", { id });
        persist({ ...state, savedAddresses: [...state.savedAddresses, { ...address, id }] });
      },
      removeSavedAddress: (id) => {
        track("saved_address_removed", { id });
        persist({
          ...state,
          savedAddresses: state.savedAddresses.filter((a) => a.id !== id),
        });
      },
      reorderToCart: (lines) => {
        const added: string[] = [];
        const cart = [...state.cart];
        for (const line of lines) {
          const item = menuRepository.getItem(line.itemId);
          if (!item) continue;
          const selections = keepKnownSelections(item.modifierGroups ?? [], line.selections ?? {});
          if (!canAddCartLine(item, line.quantity, selections, state.locationId)) continue;
          cart.push(newLine(item, line.quantity, line.notes, selections));
          added.push(item.id);
        }
        if (added.length > 0) {
          track("reorder_added", { itemIds: added });
          persist({ ...state, cart });
          setCartOpen(true);
        }
      },
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
