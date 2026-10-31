/**
 * Owner-approved planning information for TAKATAK Food Hub and Clover.
 * This is NOT a connection status or a license to send merchant orders.
 * This file ships in the browser bundle: the variables each plan needs live server-side
 * (PROVIDER_REQUIRED_CREDENTIALS in src/lib/integration/core/credentials.server.ts).
 */
export interface ProviderPlan {
  id: string;
  label: string;
  role: string;
  ppmOwns: string;
  providerOwns: string;
}

export const providerPlans: ProviderPlan[] = [
  {
    id: "foodhub",
    label: "TAKATAK Food Hub",
    role: "Our first-party kitchen, order routing, marketplace connections and operations console.",
    ppmOwns: "Brand, catalog, customer experience, store/tenant identity, verified checkout data.",
    providerOwns:
      "Customer identity (phone verification), kitchen state, Interac e-Transfer holds, dispatch, integrations and operator controls.",
  },
  {
    id: "clover",
    label: "Clover",
    role: "Restaurant POS, real pricing and modifiers, hosted card checkout, kitchen ticket.",
    ppmOwns: "PPP layout, product mappings, branded photos, order validation.",
    providerOwns: "POS inventory, payment authorization, merchant reconciliation and printing.",
  },
  {
    id: "marketplaces",
    label: "Uber Eats / DoorDash / Skip",
    role: "Direct marketplace storefront links today; Food Hub manages authorized direct integrations.",
    ppmOwns: "Which trusted storefront links appear and the customer-facing presentation.",
    providerOwns: "Each marketplace's own checkout, fulfillment and authorized API operations.",
  },
];

export interface ChecklistItem {
  label: string;
  detail: string;
}

export const integrationRoadmap: ChecklistItem[] = [
  {
    label: "1. Store + tenant mapping",
    detail:
      "Resolve exact PPP branch, TAKATAK tenant, Food Hub location code and brand; never guess.",
  },
  {
    label: "2. Own menu & images",
    detail:
      "Keep real Clover product facts and official PPP Canva images; publish only verified versions.",
  },
  {
    label: "3. Durable signed order handoff",
    detail:
      "Approve a server-to-server Food Hub contract, authentication, replay protection and persistent transactions before sending an order.",
  },
  {
    label: "4. Kitchen & delivery statuses",
    detail: "Only signed, merchant-matched, durable events may update orders and rider tracking.",
  },
  {
    label: "5. Controlled release",
    detail:
      "Run automated and staging failure tests, validate Coolify release SHA; keep real checkout disabled until #5/#6/#13 close.",
  },
];
