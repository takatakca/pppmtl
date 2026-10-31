/** Shared test data for courier dispatch tests (not a test file itself). */
import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import type { InternalOrder } from "@/lib/orders/types";

export const DD_ENV = {
  DOORDASH_DEVELOPER_ID: "11111111-2222-3333-4444-555555555555",
  DOORDASH_KEY_ID: "66666666-7777-8888-9999-000000000000",
  // base64 of "dd-signing-secret-for-tests-only"
  DOORDASH_SIGNING_SECRET: Buffer.from("dd-signing-secret-for-tests-only").toString("base64url"),
};

export const UBER_ENV = {
  UBER_DIRECT_CLIENT_ID: "uber-client-id",
  UBER_DIRECT_CLIENT_SECRET: "uber-client-secret",
  UBER_DIRECT_CUSTOMER_ID: "cus_test_customer",
};

export const DD_WEBHOOK_SECRET = "dd-webhook-secret-0123456789abcdef";
export const UBER_WEBHOOK_SECRET = "uber-webhook-signing-key-0123456789";

export const ALL_COURIER_ENV_KEYS = [
  ...Object.keys(DD_ENV),
  ...Object.keys(UBER_ENV),
  "DOORDASH_ENV",
  "UBER_DIRECT_ENV",
  "DOORDASH_WEBHOOK_SECRET",
  "UBER_DIRECT_WEBHOOK_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "PPP_OWN_DRIVERS",
  "SKIP_PORTAL_URL",
  "DATABASE_URL",
];

/** Every courier credential off (a clean slate for each test). */
export function clearCourierEnv(): void {
  for (const key of ALL_COURIER_ENV_KEYS) vi.stubEnv(key, "");
}

export function stubEnv(values: Record<string, string>): void {
  for (const [k, v] of Object.entries(values)) vi.stubEnv(k, v);
}

export function newOrderId(): string {
  return `ord_${randomUUID().replace(/-/g, "")}`;
}

export function paidDeliveryOrder(overrides: Partial<InternalOrder> = {}): InternalOrder {
  const now = new Date().toISOString();
  const id = overrides.id ?? newOrderId();
  return {
    id,
    orderNumber: "PPP-AB12C",
    customerId: null,
    locationId: "loc-ndg-somerled",
    providerLocationId: null,
    provider: "clover",
    orderType: "DELIVERY",
    items: [
      {
        lineId: "l1",
        productId: "pizza-pepperoni",
        providerProductId: null,
        name: "Pizza pepperoni (large)",
        quantity: 2,
        unitPrice: 1599,
        modifiers: [],
        notes: "",
      },
      {
        lineId: "l2",
        productId: "pepsi",
        providerProductId: null,
        name: "Pepsi",
        quantity: 1,
        unitPrice: 250,
        modifiers: [],
        notes: "",
      },
    ],
    subtotal: 3448,
    tax: 517,
    total: 3965,
    paymentStatus: "PAID",
    status: "SUBMITTED",
    providerStatus: "paid",
    providerOrderId: null,
    idempotencyKey: `test:${id}`,
    customer: {
      customerId: null,
      takatakCustomerId: null,
      name: "Marie Tremblay",
      phone: "(514) 555-0199",
      email: null,
      isGuest: true,
    },
    deliveryAddress: "5555 Av. de Monkland, App. 4, Montréal, QC H4A 1C9 — Sonnez au 4",
    notes: "",
    failureCode: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export interface FetchCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

type Responder = (call: FetchCall) => { status: number; body?: unknown } | null;

/** Replace global fetch: the first responder that answers wins; anything else is a 599 test failure. */
export function mockFetch(...responders: Responder[]): FetchCall[] {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const headers: Record<string, string> = {};
      new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
      const call: FetchCall = {
        url: String(input),
        method: init?.method ?? "GET",
        headers,
        body: typeof init?.body === "string" ? init.body : null,
      };
      calls.push(call);
      for (const responder of responders) {
        const answer = responder(call);
        if (answer) {
          return new Response(answer.body === undefined ? "" : JSON.stringify(answer.body), {
            status: answer.status,
            headers: { "content-type": "application/json" },
          });
        }
      }
      return new Response(JSON.stringify({ message: `unmocked ${call.method} ${call.url}` }), {
        status: 599,
      });
    }),
  );
  return calls;
}

export function json<T = Record<string, unknown>>(call: FetchCall | undefined): T {
  return JSON.parse(call?.body ?? "null") as T;
}

/** DoorDash quote answer as documented (fee in cents, CAD in Canada). */
export function doorDashQuoteResponder(fee = 975, pickupInMin = 12): Responder {
  return (call) => {
    if (!(call.method === "POST" && call.url === "https://openapi.doordash.com/drive/v2/quotes")) {
      return null;
    }
    const body = json<{ external_delivery_id: string }>(call);
    const now = Date.now();
    return {
      status: 200,
      body: {
        external_delivery_id: body.external_delivery_id,
        delivery_status: "quote",
        fee,
        currency: "CAD",
        pickup_time_estimated: new Date(now + pickupInMin * 60_000).toISOString(),
        dropoff_time_estimated: new Date(now + (pickupInMin + 20) * 60_000).toISOString(),
      },
    };
  };
}

export function uberTokenResponder(): Responder {
  return (call) =>
    call.url === "https://auth.uber.com/oauth/v2/token"
      ? {
          status: 200,
          body: {
            access_token: "uber-access-token",
            expires_in: 2592000,
            token_type: "Bearer",
            scope: "eats.deliveries",
          },
        }
      : null;
}

export function uberQuoteResponder(fee = 850, pickupDuration = 8, duration = 30): Responder {
  return (call) => {
    if (!call.url.endsWith("/delivery_quotes")) return null;
    const now = Date.now();
    return {
      status: 200,
      body: {
        kind: "delivery_quote",
        id: "dqt_test_quote",
        created: new Date(now).toISOString(),
        expires: new Date(now + 15 * 60_000).toISOString(),
        fee,
        currency: "cad",
        currency_type: "CAD",
        dropoff_eta: new Date(now + duration * 60_000).toISOString(),
        duration,
        pickup_duration: pickupDuration,
        dropoff_deadline: new Date(now + 60 * 60_000).toISOString(),
      },
    };
  };
}
