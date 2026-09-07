/**
 * Adapter interfaces every provider implements.
 *
 * Adapters run server-side only. The UI never imports a provider module: it
 * talks to server functions, which resolve an adapter through the registry.
 */

import type {
  CapabilityStatus,
  IntegrationProviderId,
  IntegrationResult,
  UniversalCustomerRef,
  UniversalMenu,
  UniversalOrder,
  UniversalOrderDraft,
  UniversalOrderStatus,
} from "./contracts";

export interface MenuAdapter {
  readonly provider: IntegrationProviderId;
  status(locationId: string): CapabilityStatus;
  fetchMenu(locationId: string): Promise<IntegrationResult<UniversalMenu>>;
  fetchAvailability(locationId: string): Promise<IntegrationResult<Record<string, boolean>>>;
}

export interface OrderQuote {
  subtotal: number;
  taxes: number;
  fees: number;
  total: number;
}

export interface OrderAdapter {
  readonly provider: IntegrationProviderId;
  status(locationId: string): CapabilityStatus;
  /** Server-side pricing. The UI never computes taxes or fees. */
  quoteOrder(draft: UniversalOrderDraft): Promise<IntegrationResult<OrderQuote>>;
  createOrder(draft: UniversalOrderDraft): Promise<IntegrationResult<UniversalOrder>>;
  submitOrder(orderId: string): Promise<IntegrationResult<UniversalOrder>>;
  getOrder(orderId: string): Promise<IntegrationResult<UniversalOrder>>;
  listOrders(customerRef: UniversalCustomerRef): Promise<IntegrationResult<UniversalOrder[]>>;
  cancelOrder(orderId: string, reason: string): Promise<IntegrationResult<UniversalOrder>>;
}

export interface CustomerAdapter {
  readonly provider: IntegrationProviderId;
  status(locationId: string): CapabilityStatus;
  /**
   * Push the TAKATAK-owned projection to the provider. PPP never creates a
   * competing customer record; it only mirrors what TAKATAK authorises.
   */
  upsertCustomer(customer: UniversalCustomerRef): Promise<IntegrationResult<UniversalCustomerRef>>;
}

export interface ProviderLocationRef {
  internalId: string;
  providerLocationId: string | null;
  name: string;
}

export interface LocationAdapter {
  readonly provider: IntegrationProviderId;
  status(locationId: string): CapabilityStatus;
  listLocations(): Promise<IntegrationResult<ProviderLocationRef[]>>;
}

export interface PaymentAdapter {
  readonly provider: IntegrationProviderId;
  status(locationId: string): CapabilityStatus;
  createPaymentIntent(
    orderId: string,
    amount: number,
    currency: "CAD",
  ): Promise<IntegrationResult<{ intentId: string; clientSecret: string }>>;
}

export interface WebhookEvent {
  provider: IntegrationProviderId;
  eventType: string;
  externalOrderId: string | null;
  status: UniversalOrderStatus | null;
  receivedAt: string;
  /** Reference only — raw payloads are never persisted by PPP. */
  payloadReference: string;
}

export interface WebhookAdapter {
  readonly provider: IntegrationProviderId;
  /** Timing-safe signature verification against the provider secret. */
  verifySignature(rawBody: string, signature: string | null, secret: string): boolean;
  parseEvent(rawBody: string): IntegrationResult<WebhookEvent>;
}

export interface ProviderAdapterSet {
  readonly provider: IntegrationProviderId;
  menu?: MenuAdapter;
  orders?: OrderAdapter;
  customers?: CustomerAdapter;
  locations?: LocationAdapter;
  payments?: PaymentAdapter;
  webhooks?: WebhookAdapter;
}
