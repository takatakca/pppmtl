// App state: language, the menu (kept on the phone for offline use), the cart, the customer's details and the
// receipts of orders placed from this phone. One provider, small and explicit.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getLocales } from 'expo-localization';
import { api } from './api';
import { strings, type StringKey } from './i18n';
import { keepKnownSelections, subtotalCents } from './logic';
import { readJson, readSecret, writeJson, writeSecret, clearAll } from './storage';
import type { Brand, CartLine, Catalog, Category, Item, Lang, OrderView, Receipt, Selections } from './types';

export type Mode = 'pickup' | 'delivery';
export interface Details { name: string; phone: string; email: string; street: string; unit: string; city: string; postalCode: string; instructions: string }
const EMPTY_DETAILS: Details = { name: '', phone: '', email: '', street: '', unit: '', city: 'Montréal', postalCode: '', instructions: '' };

const K = { catalog: 'mh.catalog.v1', cart: 'mh.cart.v1', prefs: 'mh.prefs.v1', details: 'mh.details.v1', receipts: 'mh.receipts.v1' };

interface Store {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey) => string;
  tx: (text: { en: string; fr: string }) => string;
  catalog: Catalog | null;
  catalogState: 'loading' | 'ready' | 'error';
  offline: boolean;
  reloadCatalog: () => Promise<void>;
  item: (id: string) => Item | undefined;
  category: (id: string) => Category | undefined;
  brand: (id: string) => Brand | undefined;
  mode: Mode;
  setMode: (m: Mode) => void;
  cart: CartLine[];
  cartCount: number;
  cartSubtotal: number;
  addLine: (itemId: string, quantity: number, selections: Selections, notes: string) => void;
  updateLine: (lineId: string, patch: Partial<Omit<CartLine, 'lineId'>>) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
  details: Details;
  saveDetails: (d: Partial<Details>) => void;
  receipts: Receipt[];
  addReceipt: (r: Receipt) => void;
  refreshReceipts: (ids?: string[]) => Promise<void>;
  setReceiptOrder: (order: OrderView) => void;
  wipe: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

function deviceLang(): Lang {
  try {
    return getLocales()[0]?.languageCode === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(deviceLang());
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogState, setCatalogState] = useState<Store['catalogState']>('loading');
  const [offline, setOffline] = useState(false);
  const [mode, setModeState] = useState<Mode>('pickup');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const loaded = useRef(false);

  // Saved state first (instant start, works offline), then a fresh menu.
  useEffect(() => {
    (async () => {
      const [savedCatalog, savedCart, prefs, savedDetails, savedReceipts] = await Promise.all([
        readJson<Catalog>(K.catalog),
        readJson<CartLine[]>(K.cart),
        readJson<{ lang?: Lang; mode?: Mode }>(K.prefs),
        readJson<Details>(K.details),
        readSecret(K.receipts),
      ]);
      if (savedCatalog?.items) {
        setCatalog(savedCatalog);
        setCatalogState('ready');
      }
      if (Array.isArray(savedCart)) setCart(savedCart);
      if (prefs?.lang) setLangState(prefs.lang);
      if (prefs?.mode) setModeState(prefs.mode);
      if (savedDetails) setDetails({ ...EMPTY_DETAILS, ...savedDetails });
      try {
        const list = savedReceipts ? (JSON.parse(savedReceipts) as Receipt[]) : [];
        if (Array.isArray(list)) setReceipts(list);
      } catch {
        /* unreadable: start empty */
      }
      loaded.current = true;
      await fetchCatalog(Boolean(savedCatalog?.items));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCatalog = useCallback(async (haveCopy: boolean) => {
    try {
      const fresh = await api.catalog();
      if (!fresh?.items?.length) throw new Error('empty');
      setCatalog(fresh);
      setCatalogState('ready');
      setOffline(false);
      await writeJson(K.catalog, fresh);
    } catch {
      setOffline(haveCopy);
      if (!haveCopy) setCatalogState('error');
    }
  }, []);

  const reloadCatalog = useCallback(async () => {
    if (!catalog) setCatalogState('loading');
    await fetchCatalog(Boolean(catalog));
  }, [catalog, fetchCatalog]);

  const index = useMemo(() => {
    const items = new Map((catalog?.items ?? []).map((i) => [i.id, i]));
    const categories = new Map((catalog?.categories ?? []).map((c) => [c.id, c]));
    const brands = new Map((catalog?.brands ?? []).map((b) => [b.id, b]));
    return { items, categories, brands };
  }, [catalog]);

  // When the menu changes, drop cart lines for dishes no longer sold and options no longer offered.
  useEffect(() => {
    if (!catalog) return;
    setCart((lines) => {
      const next = lines
        .filter((l) => index.items.get(l.itemId)?.orderable)
        .map((l) => ({ ...l, selections: keepKnownSelections(index.items.get(l.itemId)?.modifierGroups ?? [], l.selections) }));
      return next.length === lines.length && next.every((l, i) => JSON.stringify(l) === JSON.stringify(lines[i])) ? lines : next;
    });
  }, [catalog, index]);

  useEffect(() => { if (loaded.current) void writeJson(K.cart, cart); }, [cart]);
  useEffect(() => { if (loaded.current) void writeJson(K.prefs, { lang, mode }); }, [lang, mode]);
  useEffect(() => { if (loaded.current) void writeJson(K.details, details); }, [details]);
  useEffect(() => { if (loaded.current) void writeSecret(K.receipts, JSON.stringify(receipts.slice(0, 50))); }, [receipts]);

  const t = useCallback((key: StringKey) => strings[lang][key] ?? strings.fr[key] ?? key, [lang]);
  const tx = useCallback((text: { en: string; fr: string }) => (lang === 'en' ? text.en || text.fr : text.fr || text.en), [lang]);

  const addLine = useCallback((itemId: string, quantity: number, selections: Selections, notes: string) => {
    setCart((lines) => {
      const same = lines.find((l) => l.itemId === itemId && l.notes === notes && JSON.stringify(l.selections) === JSON.stringify(selections));
      if (same) return lines.map((l) => (l === same ? { ...l, quantity: Math.min(50, l.quantity + quantity) } : l));
      const lineId = `${itemId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`;
      return [...lines, { lineId, itemId, quantity, selections, notes }];
    });
  }, []);
  const updateLine = useCallback((lineId: string, patch: Partial<Omit<CartLine, 'lineId'>>) => {
    setCart((lines) => lines.map((l) => (l.lineId === lineId ? { ...l, ...patch, quantity: Math.max(1, Math.min(50, patch.quantity ?? l.quantity)) } : l)));
  }, []);
  const removeLine = useCallback((lineId: string) => setCart((lines) => lines.filter((l) => l.lineId !== lineId)), []);
  const clearCart = useCallback(() => setCart([]), []);

  const addReceipt = useCallback((r: Receipt) => setReceipts((list) => [r, ...list.filter((x) => x.id !== r.id)]), []);
  const setReceiptOrder = useCallback((order: OrderView) => setReceipts((list) => list.map((r) => (r.id === order.id ? { ...r, order } : r))), []);
  const receiptsRef = useRef(receipts);
  receiptsRef.current = receipts;
  const refreshReceipts = useCallback(async (ids?: string[]) => {
    const wanted = receiptsRef.current.filter((r) => !ids || ids.includes(r.id)).slice(0, 30);
    if (!wanted.length) return;
    const { orders } = await api.status(wanted.map((r) => ({ id: r.id, token: r.token })));
    if (!orders?.length) return;
    const byId = new Map(orders.map((o) => [o.id, o]));
    setReceipts((list) => list.map((r) => (byId.has(r.id) ? { ...r, order: byId.get(r.id) ?? r.order } : r)));
  }, []);

  const wipe = useCallback(async () => {
    await clearAll();
    await writeSecret(K.receipts, null);
    setCart([]);
    setDetails(EMPTY_DETAILS);
    setReceipts([]);
    if (catalog) await writeJson(K.catalog, catalog);
  }, [catalog]);

  const value: Store = {
    lang,
    setLang: setLangState,
    t,
    tx,
    catalog,
    catalogState,
    offline,
    reloadCatalog,
    item: (id) => index.items.get(id),
    category: (id) => index.categories.get(id),
    brand: (id) => index.brands.get(id),
    mode,
    setMode: setModeState,
    cart,
    cartCount: cart.reduce((n, l) => n + l.quantity, 0),
    cartSubtotal: subtotalCents(cart, (id) => index.items.get(id)),
    addLine,
    updateLine,
    removeLine,
    clearCart,
    details,
    saveDetails: (d) => setDetails((cur) => ({ ...cur, ...d })),
    receipts,
    addReceipt,
    refreshReceipts,
    setReceiptOrder,
    wipe,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
