/**
 * Clover network calls. SERVER ONLY. Every call has a timeout; nothing here throws to the caller.
 *
 *   - live inventory (REST, cached 5 min) so a checkout is priced with today's Clover prices and 86s;
 *   - the merchant's default tax rates (REST, cached);
 *   - create a Hosted Checkout session (Ecommerce private key);
 *   - after payment: payment -> Clover order, give it the website title + note, print it once.
 */
import {
  normalizeCloverInventory,
  type CloverInventory,
} from "@/lib/integration/providers/clover/catalog";
import type { CloverTaxRate, HostedCheckoutRequest } from "./checkout";
import {
  cloverCheckoutBaseUrl,
  cloverCheckoutKey,
  cloverMerchantId,
  cloverRestBaseUrl,
  cloverRestToken,
} from "./config.server";

const TIMEOUT_MS = 12_000;
const CACHE_MS = 5 * 60_000;
/** Clover's Hosted Checkout reference lists User-Agent as a required header. */
const USER_AGENT = "PPPMTL/1.0 (+https://pppmtl.com)";

type Json = Record<string, unknown>;

async function rest(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; query?: Record<string, string> } = {},
): Promise<{ status: number; json: Json | null }> {
  const token = cloverRestToken();
  const mid = cloverMerchantId();
  if (!token || !mid) return { status: 0, json: null };
  const qs = init.query ? `?${new URLSearchParams(init.query)}` : "";
  try {
    const res = await fetch(
      `${cloverRestBaseUrl()}/v3/merchants/${encodeURIComponent(mid)}/${path}${qs}`,
      {
        method: init.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": USER_AGENT,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
        ...(init.body ? { body: JSON.stringify(init.body) } : {}),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    const json = (await res.json().catch(() => null)) as Json | null;
    return { status: res.status, json };
  } catch {
    return { status: 0, json: null };
  }
}

async function restAll(path: string, expand: string): Promise<unknown[] | null> {
  const out: unknown[] = [];
  for (let offset = 0; offset < 10_000; offset += 1000) {
    const r = await rest(path, {
      query: { limit: "1000", offset: String(offset), ...(expand ? { expand } : {}) },
    });
    if (r.status !== 200 || !r.json) return null;
    const rows = Array.isArray(r.json["elements"]) ? (r.json["elements"] as unknown[]) : [];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

let inventoryCache: { at: number; value: CloverInventory } | null = null;

/** Today's Clover menu (same rules as the snapshot), or null without a REST token or when Clover does not answer. */
export async function fetchLiveInventory(now = Date.now()): Promise<CloverInventory | null> {
  if (inventoryCache && now - inventoryCache.at < CACHE_MS) return inventoryCache.value;
  if (!cloverRestToken() || !cloverMerchantId()) return null;
  const [items, modifierGroups, categories] = await Promise.all([
    restAll("items", "categories,modifierGroups"),
    restAll("modifier_groups", "modifiers"),
    restAll("categories", ""),
  ]);
  if (!items || !modifierGroups || !categories) return null;
  const value = normalizeCloverInventory(
    { items, modifierGroups, categories },
    { source: "clover-api", now: new Date(now).toISOString() },
  );
  inventoryCache = { at: now, value };
  return value;
}

let taxCache: { at: number; value: CloverTaxRate[] } | null = null;

/** The merchant's default tax rates ("isDefault"), or null when they cannot be read. */
export async function fetchDefaultTaxRates(now = Date.now()): Promise<CloverTaxRate[] | null> {
  if (taxCache && now - taxCache.at < CACHE_MS) return taxCache.value;
  const rows = await restAll("tax_rates", "");
  if (!rows) return null;
  const value = rows.flatMap((row) => {
    const r = (row ?? {}) as Json;
    const rate = Number(r["rate"]);
    if (r["isDefault"] !== true || !Number.isFinite(rate) || rate <= 0) return [];
    return [
      { name: String(r["name"] ?? "Tax"), rate, ...(r["id"] ? { id: String(r["id"]) } : {}) },
    ];
  });
  if (!value.length) return null;
  taxCache = { at: now, value };
  return value;
}

export type CreateCheckoutResult =
  | { ok: true; href: string; checkoutSessionId: string; expiresAt: number | null }
  | { ok: false; status: number; reason: string; detail: string };

/**
 * Why Clover refused, without personal data: Clover's error type / code / field / message, with e-mails, numbers
 * and Clover ids masked. Clover answers `{ error: { type, code, message, param } }` or a bare `{ message }`.
 */
export function cloverRefusalDetail(status: number, text: string): string {
  let json: Json | null = null;
  try {
    json = JSON.parse(text) as Json;
  } catch {
    json = null;
  }
  const error = json && typeof json["error"] === "object" ? (json["error"] as Json) : (json ?? {});
  const fields = ["type", "code", "param", "message"]
    .map((k) => error[k] ?? (k === "message" ? json?.["message"] : undefined))
    .filter((v): v is string => typeof v === "string" && v.trim() !== "");
  const raw = fields.length ? fields.join(" · ") : text.replace(/<[^>]*>/g, " ").trim();
  const masked = raw
    .replace(/[^\s@]+@[^\s@]+/g, "[email]")
    .replace(/\d{4,}/g, "[number]")
    .replace(/\b(?=[A-Z0-9]*\d)[A-Z0-9]{10,}\b/g, "[id]")
    .replace(/\s+/g, " ");
  return `HTTP ${status}${masked ? ` · ${masked.slice(0, 300)}` : ""}`;
}

let lastRefusal: { at: string; detail: string } | null = null;

/** The last Hosted Checkout refusal seen by this server (no personal data), for diagnosis. */
export function lastCheckoutRefusal(): { at: string; detail: string } | null {
  return lastRefusal;
}

/** POST /invoicingcheckoutservice/v1/checkouts. The response's `href` is Clover's payment page. */
export async function createHostedCheckout(
  body: HostedCheckoutRequest,
): Promise<CreateCheckoutResult> {
  const key = cloverCheckoutKey();
  const mid = cloverMerchantId();
  if (!key || !mid) {
    return { ok: false, status: 0, reason: "not_configured", detail: "keys not set" };
  }
  const refused = (status: number, reason: string, detail: string): CreateCheckoutResult => {
    lastRefusal = { at: new Date().toISOString(), detail };
    return { ok: false, status, reason, detail };
  };
  try {
    const res = await fetch(`${cloverCheckoutBaseUrl()}/invoicingcheckoutservice/v1/checkouts`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        "X-Clover-Merchant-Id": mid,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text().catch(() => "");
    let json: Json | null = null;
    try {
      json = JSON.parse(text) as Json;
    } catch {
      json = null;
    }
    const href = typeof json?.["href"] === "string" ? json["href"] : "";
    const id = typeof json?.["checkoutSessionId"] === "string" ? json["checkoutSessionId"] : "";
    if (!res.ok || !href || !id) {
      return refused(res.status, "provider_error", cloverRefusalDetail(res.status, text));
    }
    const exp = Number(json?.["expirationTime"]);
    return { ok: true, href, checkoutSessionId: id, expiresAt: Number.isFinite(exp) ? exp : null };
  } catch (error) {
    const timeout = error instanceof Error && /timeout|abort/i.test(error.name + error.message);
    const name = error instanceof Error ? error.name : "error";
    return refused(0, timeout ? "timeout" : "provider_error", `no answer from Clover (${name})`);
  }
}

export interface CloverOrderFacts {
  orderId: string;
  title: string;
  printed: boolean;
  customerFirstName: string | null;
  customerPhone: string | null;
}

/** The Clover order a payment belongs to (needs the REST token), with what the post-payment step needs. */
export async function orderForPayment(paymentId: string): Promise<CloverOrderFacts | null> {
  const p = await rest(`payments/${encodeURIComponent(paymentId)}`, { query: { expand: "order" } });
  const orderId = (p.json?.["order"] as Json | undefined)?.["id"];
  if (p.status !== 200 || typeof orderId !== "string") return null;
  const o = await rest(`orders/${encodeURIComponent(orderId)}`, {
    query: { expand: "lineItems,customers,customers.phoneNumbers" },
  });
  if (o.status !== 200 || !o.json) return null;
  const lineItems =
    ((o.json["lineItems"] as Json | undefined)?.["elements"] as Json[] | undefined) ?? [];
  const customer = (((o.json["customers"] as Json | undefined)?.["elements"] as
    Json[] | undefined) ?? [])[0];
  const phone = (((customer?.["phoneNumbers"] as Json | undefined)?.["elements"] as
    Json[] | undefined) ?? [])[0]?.["phoneNumber"];
  return {
    orderId,
    title: typeof o.json["title"] === "string" ? o.json["title"] : "",
    printed: lineItems.some((li) => li["printed"] === true),
    customerFirstName: typeof customer?.["firstName"] === "string" ? customer["firstName"] : null,
    customerPhone: typeof phone === "string" ? phone : null,
  };
}

/** Clover "update an order": POST /v3/merchants/{mId}/orders/{orderId}. */
export async function titleCloverOrder(
  orderId: string,
  title: string,
  note: string,
): Promise<boolean> {
  const r = await rest(`orders/${encodeURIComponent(orderId)}`, {
    method: "POST",
    body: { title, note },
  });
  return r.status === 200;
}

/** Prints the order on the merchant's order printer (and its KDS when the KDS is set as order printer). */
export async function printCloverOrder(orderId: string): Promise<boolean> {
  const r = await rest("print_event", { method: "POST", body: { orderRef: { id: orderId } } });
  return r.status === 200 && r.json?.["state"] !== "FAILED";
}

export function resetCloverCachesForTests(): void {
  inventoryCache = null;
  taxCache = null;
}
