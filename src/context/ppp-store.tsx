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
import { track } from "@/lib/analytics";

const KEY = "ppp.session.v1";

interface Persisted {
  lang: Lang;
  locationId: string | null;
  mode: OrderMode;
  recentSearches: string[];
}

interface Store extends Persisted {
  setLang: (lang: Lang) => void;
  setLocationId: (id: string | null) => void;
  setMode: (mode: OrderMode) => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  searchOpen: boolean;
  searchSeed: string;
  openSearch: (seed?: string) => void;
  closeSearch: () => void;
  locationSheetOpen: boolean;
  openLocationSheet: () => void;
  closeLocationSheet: () => void;
  t: (en: string, fr: string) => string;
}

const defaults: Persisted = {
  lang: "en",
  locationId: locations[0]?.id ?? null,
  mode: "pickup",
  recentSearches: [],
};

const PPPContext = createContext<Store | null>(null);

export function PPPProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(defaults);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSeed, setSearchSeed] = useState("");
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setState((s) => ({ ...s, ...(JSON.parse(raw) as Partial<Persisted>) }));
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
      setLang: (lang) => persist({ ...state, lang }),
      setLocationId: (locationId) => {
        track("location_selected", { locationId });
        persist({ ...state, locationId });
      },
      setMode: (mode) => {
        track("order_mode_selected", { mode });
        persist({ ...state, mode });
      },
      addRecentSearch: (q) => {
        const clean = q.trim();
        if (!clean) return;
        const recentSearches = [clean, ...state.recentSearches.filter((r) => r !== clean)].slice(0, 6);
        persist({ ...state, recentSearches });
      },
      clearRecentSearches: () => persist({ ...state, recentSearches: [] }),
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
      t: (en, fr) => (state.lang === "fr" ? fr : en),
    };
  }, [state, persist, searchOpen, searchSeed, locationSheetOpen]);

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