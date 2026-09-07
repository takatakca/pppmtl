/**
 * Client-safe planning data for the internal integrations screen.
 * Pure documentation of INTENT — it never reports a connection state.
 * Live truth (credentials, mappings, capabilities) comes from the server
 * snapshot in `src/lib/integration/integrations.functions.ts`.
 */

export interface ProviderPlan {
  id: string;
  label: string;
  role: string;
  ppmOwns: string;
  providerOwns: string;
  requiredCredentials: string[];
}

export const providerPlans: ProviderPlan[] = [
  {
    id: "urbanpiper",
    label: "UrbanPiper",
    role: "Restaurant operating engine: menu sync, order routing, marketplace aggregation.",
    ppmOwns: "Design, wording, images, account, favourites, loyalty, marketing, SEO.",
    providerOwns: "Catalog structure, prices, modifiers, availability, order routing to POS/KDS.",
    requiredCredentials: [
      "URBANPIPER_API_KEY",
      "URBANPIPER_BASE_URL",
      "URBANPIPER_LOCATION_ID",
      "URBANPIPER_WEBHOOK_SECRET",
    ],
  },
  {
    id: "clover",
    label: "Clover",
    role: "In-store POS and card payments where UrbanPiper does not process.",
    ppmOwns: "Checkout experience and order summary.",
    providerOwns: "Payment capture and in-store ticket.",
    requiredCredentials: ["CLOVER_API_KEY", "CLOVER_MERCHANT_ID", "CLOVER_WEBHOOK_SECRET"],
  },
  {
    id: "marketplaces",
    label: "Uber Eats / DoorDash / Skip",
    role: "External storefront links today; aggregated through UrbanPiper later.",
    ppmOwns: "Which channels are shown and how they are presented.",
    providerOwns: "Their own checkout, delivery and customer data.",
    requiredCredentials: [],
  },
];

export interface ChecklistItem {
  label: string;
  detail: string;
}

/** What must be obtained from UrbanPiper before any code connects. */
export const urbanPiperAccessChecklist: ChecklistItem[] = [
  { label: "API documentation", detail: "Atlas (catalog) and Hub (orders)." },
  { label: "Credentials", detail: "API key + base URL, sandbox and production." },
  { label: "Sandbox environment", detail: "Test store with orders enabled." },
  { label: "Merchant / organization id", detail: "Account-level identifiers." },
  { label: "Store ids", detail: "One provider store id per PPP location." },
  { label: "Webhook docs + secret", detail: "Signature scheme and signing secret." },
  { label: "Menu API access", detail: "Categories, items, prices, modifiers, availability." },
  { label: "Order APIs", detail: "Create, submit, cancel, status." },
  { label: "Customer API scope", detail: "Confirm what they store and return." },
  { label: "Image CDN", detail: "Access and licensing, if images are used." },
  { label: "Limits and SLA", detail: "Rate limits, retries, support path." },
];

/** Ordered technical steps after access is granted. */
export const integrationRoadmap: ChecklistItem[] = [
  { label: "1. Menu sync", detail: "Real prices, modifiers and availability, all locations." },
  { label: "2. Order creation", detail: "Kitchen receives PPP Direct orders." },
  { label: "3. Order status", detail: "/orders and /track become real." },
  { label: "4. Payments", detail: "Depends on the chosen checkout model." },
  { label: "5. Loyalty / identity", detail: "TAKATAK owns the customer relationship." },
];
