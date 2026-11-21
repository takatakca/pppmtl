// Shapes of the MontrealHub API (src/lib/mobile/mobile-api.server.ts on the website). Keep in step with it.
export type Lang = 'fr' | 'en';
export interface Text { en: string; fr: string }

export interface ModifierChoice { id: string; labelEn: string; labelFr: string; priceDelta: number | null; available?: boolean }
export interface ModifierGroup { id: string; labelEn: string; labelFr: string; required: boolean; min?: number; max?: number; choices: ModifierChoice[] }

export interface Item {
  id: string;
  categoryId: string;
  name: Text;
  description: Text;
  price: number | null;
  compareAtPrice: number | null;
  image: string;
  thumb: string;
  badges: Array<'popular' | 'new' | 'deal'>;
  orderable: boolean;
  modifierGroups: ModifierGroup[];
  search: string;
}

export interface Category { id: string; slug: string; name: Text; description: Text; image: string; sortOrder: number; count: number }

export interface Brand {
  id: string;
  name: string;
  domain: string;
  url: string;
  icon: string;
  logo: string | null;
  markSvg: string | null;
  colors: { primary: string; accent: string; accent2: string };
  cuisine: { en: string[]; fr: string[] };
  hook: { en: [string, string]; fr: [string, string] };
  description: Text;
  phone: { display: string; e164: string };
  heroItemIds: string[];
  rails: Array<{ title: Text; itemIds: string[]; extras: Array<{ id: string; name: Text; sizes: Array<{ label: Text; price: number }> }> }>;
  kitchens: Array<{ kitchen: string; links: Array<{ platform: string; name: string; url: Text }>; mapsUrl: string | null }>;
}

export interface Location {
  id: string;
  slug: string;
  kitchen: string;
  name: string;
  address: string;
  phone: string | null;
  delivery: boolean;
  coords: { lat: number; lng: number } | null;
  mapsUrl: string | null;
  rating: number | null;
  marketplaces: Array<{ id: string; name: string; url: string }>;
}

export interface Kitchen { id: string; label: Text; area: string; address: string; hours: { opens: string; closes: string } | null }

export interface TaxRate { name: string; rate: number }

export interface Catalog {
  version: number;
  generatedAt: string;
  site: string;
  phone: { display: string; e164: string };
  categories: Category[];
  items: Item[];
  popularItemIds: string[];
  offers: Array<{ id: string; title: Text; description: Text; image: string; price: number | null; compareAtPrice: number | null }>;
  locations: Location[];
  kitchens: Kitchen[];
  brands: Brand[];
  checkout: {
    onlineOrdering: boolean;
    card: boolean;
    interac: boolean;
    deliveryFeeCents: number;
    deliveryLocationSlugs: string[];
    deliveryAreas: string[];
    taxRates: TaxRate[];
    tipPercents: number[];
    defaultTipPercent: number;
    maxTipCents: number;
  };
  legal: { privacy: string; dataDeletion: string; help: string };
}

export type Selections = Record<string, string>;

export interface CartLine { lineId: string; itemId: string; quantity: number; notes: string; selections: Selections }

export type OrderStatus = 'CREATED' | 'SUBMITTED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface OrderView {
  id: string;
  orderNumber: string | null;
  locationId: string;
  status: OrderStatus;
  orderType: 'PICKUP' | 'DELIVERY' | 'DINE_IN' | 'KIOSK';
  createdAt: string;
  subtotal: number;
  tax: number | null;
  tip: number;
  deliveryFee: number;
  total: number | null;
  customerName: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  paymentStatus: 'UNPAID' | 'AUTHORIZED' | 'PAID' | 'REFUNDED' | 'FAILED' | 'PAY_AT_RESTAURANT';
  paymentUrl: string | null;
  paymentMethod: 'CARD' | 'INTERAC';
  interac: { status: string; amount: number; payUrl: string | null; viaBmo: boolean } | null;
  items: Array<{ productId: string; name: string; quantity: number; options: string[]; selections: Selections; notes: string }>;
}

export interface OrderError { code: string; messageEn: string; messageFr: string; messageEs: string }

export interface PlaceResult { ok: boolean; order: OrderView | null; token: string | null; error: OrderError | null }

export interface Receipt { id: string; token: string; placedAt: string; order: OrderView | null }

export interface PlaceOrderInput {
  locationId: string;
  orderType: 'PICKUP' | 'DELIVERY';
  lines: Array<{ itemId: string; quantity: number; notes: string; selections: Selections }>;
  customer: { customerId: null; takatakCustomerId: null; name: string | null; phone: string | null; email: string | null; isGuest: true };
  deliveryAddress: string | null;
  notes: string;
  tip: number;
  paymentMethod: 'card' | 'interac';
}
