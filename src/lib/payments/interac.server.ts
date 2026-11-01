/**
 * Interac e-Transfer, manual (owner decision 2026-10-31). SERVER ONLY.
 *
 *   1. The customer chooses Interac at checkout; the order is priced from Clover and stored, unpaid
 *      (order-service.ts submitInteracOrder). The restaurant gets a text with who and how much.
 *   2. Staff send "Request money" from the restaurant's bank app, then tap "Request sent" on the tablet.
 *   3. When the money arrives they tap "Paid": the order becomes PAID and is sent to Clover (an open order with the
 *      ticket lines) and printed once. A failure keeps the order paid and offers "Send to kitchen again".
 * Every step is a locked state change, so two tablets never send two tickets. A provider (VoPay, Zūm Rails) can
 * later replace steps 2–3 without changing the rest.
 */
import {
  addCloverLineItems,
  createCloverOrder,
  printCloverOrder,
} from "@/lib/integration/providers/clover/api.server";
import { websiteOrderNote, websiteOrderTitle } from "@/lib/integration/providers/clover/checkout";
import { printWebOrders, siteBaseUrl } from "@/lib/integration/providers/clover/config.server";
import { logIntegrationEvent } from "@/lib/integration/core/logging";
import { sendSms, smsConfigured } from "@/lib/notifications/sms.server";
import { durableOrderStoreConfigured } from "@/lib/orders/database.server";
import type { InteracChange, InteracMutation } from "@/lib/orders/durable-orders.server";
import { listRecentOrders } from "@/lib/orders/order-service";
import { getOrder, updateOrder } from "@/lib/orders/order-store.server";
import type { InteracPayment, InternalOrder } from "@/lib/orders/types";
import { interacAlertPhone } from "./interac-config.server";

const money = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} $`;
/** A "Paid" whose kitchen step never finished (crash, timeout) may be retried after this. */
const STUCK_MS = 2 * 60_000;

/**
 * Step 1: with BMO connected, the money request goes out at once (bmo/requests.server.ts); then the restaurant and
 * the customer are texted. Best effort; never blocks the order.
 */
export async function announceInteracOrder(order: InternalOrder): Promise<void> {
  const amount = order.interac?.amount ?? order.total ?? 0;
  let viaBmo: { ok: boolean; error?: string } | null = null;
  const { bmoConfigured } = await import("./bmo/config.server");
  if (bmoConfigured()) {
    const { requestInteracViaBmo } = await import("./bmo/requests.server");
    const r = await requestInteracViaBmo(order.id).catch((e: unknown) => ({
      ok: false as const,
      error: e instanceof Error ? e.message : "BMO error",
    }));
    viaBmo = r.ok ? { ok: true } : { ok: false, error: r.error };
  }
  const who = [order.customer.name, order.customer.email, order.customer.phone]
    .filter(Boolean)
    .join(" · ");
  logIntegrationEvent({
    provider: "clover",
    eventType: "interac.awaiting_request",
    status: "received",
    payloadReference: order.id,
    detail: `${order.orderNumber} ${money(amount)}`,
  });
  if (!smsConfigured()) return;
  const alert = interacAlertPhone();
  const site = siteBaseUrl();
  await Promise.all([
    alert
      ? sendSms(
          alert,
          (viaBmo?.ok
            ? `PPP — Demande Interac envoyée par BMO : ${order.orderNumber} · ${money(amount)} · ${who}. `
            : `PPP — Virement Interac à demander${viaBmo ? " (BMO n'a pas pu l'envoyer)" : ""} : ` +
              `${order.orderNumber} · ${money(amount)} · ${who}. `) +
            `${order.orderType === "DELIVERY" ? "LIVRAISON. " : ""}Tablette : ${site}/admin/interac`,
        )
      : Promise.resolve(false),
    order.customer.phone
      ? sendSms(
          order.customer.phone,
          `PPP Pizzeria : commande ${order.orderNumber} reçue. Vous recevrez une demande de virement Interac de ` +
            `${money(amount)}${order.customer.email ? ` à ${order.customer.email}` : ""}. Acceptez-la dans votre ` +
            `application bancaire : nous préparons la commande dès le paiement reçu. / You will get an Interac ` +
            `e-Transfer request for ${money(amount)}; we start your order once it is paid.`,
        )
      : Promise.resolve(false),
  ]);
}

/** One locked change of an order's Interac block (row lock in PostgreSQL, synchronous in memory). */
export async function mutateInteracOrder(
  orderId: string,
  change: (o: InternalOrder) => InteracChange,
): Promise<InteracMutation> {
  if (durableOrderStoreConfigured()) {
    const { mutateStoredInterac } = await import("@/lib/orders/durable-orders.server");
    const result = await mutateStoredInterac(orderId, change);
    if (result.ok && getOrder(orderId)) updateOrder(orderId, result.order);
    return result;
  }
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: "Order not found.", notFound: true };
  const next = change(order);
  if (!next.ok) return next;
  const updated = updateOrder(orderId, {
    interac: next.interac,
    ...(next.outcome === "paid"
      ? {
          paymentStatus: "PAID" as const,
          status: "ACCEPTED" as const,
          providerStatus: "interac_paid",
        }
      : next.outcome === "cancelled"
        ? { status: "CANCELLED" as const, providerStatus: "interac_cancelled" }
        : {}),
  });
  return updated
    ? { ok: true, order: updated }
    : { ok: false, error: "Order not found.", notFound: true };
}

const mutate = mutateInteracOrder;

export function interacOf(order: InternalOrder): InteracPayment | null {
  return order.paymentMethod === "INTERAC" && order.interac ? order.interac : null;
}

const step = (i: InteracPayment, patch: Partial<InteracPayment>, by: string): InteracPayment => ({
  ...i,
  ...patch,
  by,
  updatedAt: new Date().toISOString(),
});

export type InteracResult = { ok: true; order: InternalOrder } | { ok: false; error: string };

/** Step 2: the money request was sent from the bank app. */
export async function markInteracRequested(orderId: string, by: string): Promise<InteracResult> {
  return mutate(orderId, (o) => {
    const i = interacOf(o);
    if (!i) return { ok: false, error: "Not an Interac order." };
    if (i.status !== "awaiting_request" && i.status !== "requested") {
      return { ok: false, error: "This order is already paid or cancelled." };
    }
    return {
      ok: true,
      interac: step(i, { status: "requested", requestedAt: new Date().toISOString() }, by),
    };
  });
}

/** Step 3: the money arrived. Exactly one tap wins; it sends the order to Clover and the kitchen. */
export async function markInteracPaid(orderId: string, by: string): Promise<InteracResult> {
  const paid = await mutate(orderId, (o) => {
    const i = interacOf(o);
    if (!i) return { ok: false, error: "Not an Interac order." };
    if (i.status !== "awaiting_request" && i.status !== "requested") {
      return { ok: false, error: "Already marked paid or cancelled." };
    }
    return {
      ok: true,
      interac: step(i, { status: "paid", paidAt: new Date().toISOString(), error: null }, by),
      outcome: "paid",
    };
  });
  return paid.ok ? sendToKitchen(paid.order, by) : paid;
}

/** "Send to kitchen again" after a Clover or printer failure (or a step that never finished). */
export async function retryInteracKitchen(orderId: string, by: string): Promise<InteracResult> {
  const claimed = await mutate(orderId, (o) => {
    const i = interacOf(o);
    if (!i) return { ok: false, error: "Not an Interac order." };
    const stuck = i.status === "paid" && Date.now() - Date.parse(i.updatedAt) > STUCK_MS;
    if (i.status !== "kitchen_failed" && !stuck) return { ok: false, error: "Nothing to resend." };
    return { ok: true, interac: step(i, { status: "paid", error: null }, by) };
  });
  return claimed.ok ? sendToKitchen(claimed.order, by) : claimed;
}

export async function cancelInterac(orderId: string, by: string): Promise<InteracResult> {
  return mutate(orderId, (o) => {
    const i = interacOf(o);
    if (!i) return { ok: false, error: "Not an Interac order." };
    if (i.status !== "awaiting_request" && i.status !== "requested") {
      return {
        ok: false,
        error: "A paid order is refunded from the bank, then cancelled in Clover.",
      };
    }
    return { ok: true, interac: step(i, { status: "cancelled" }, by), outcome: "cancelled" };
  });
}

/** Clover order (title, note, ticket lines), then one print. Each finished part is recorded before the next. */
async function sendToKitchen(order: InternalOrder, by: string): Promise<InteracResult> {
  const record = (patch: Partial<InteracPayment>) =>
    mutate(order.id, (o) => {
      const i = interacOf(o);
      return i
        ? { ok: true, interac: step(i, patch, by) }
        : { ok: false, error: "Not an Interac order." };
    });
  const failed = async (error: string) => {
    logIntegrationEvent({
      provider: "clover",
      eventType: "interac.kitchen_failed",
      status: "error",
      payloadReference: order.id,
      detail: error,
    });
    const r = await record({ status: "kitchen_failed", error });
    return r.ok ? { ok: false as const, error } : r;
  };

  let current = interacOf(order);
  if (!current) return { ok: false, error: "Not an Interac order." };
  const delivery = order.orderType === "DELIVERY";
  const firstName = order.customer.name?.trim().split(/\s+/)[0] ?? null;

  let cloverOrderId = current.cloverOrderId ?? null;
  if (!cloverOrderId) {
    const created = await createCloverOrder({
      title: `${websiteOrderTitle(order.orderNumber, firstName, delivery)} · INTERAC`,
      note: websiteOrderNote({
        site: new URL(siteBaseUrl()).host,
        customerName: order.customer.name,
        phone: order.customer.phone,
        notes: order.notes?.trim() || null,
        deliveryAddress: delivery ? order.deliveryAddress : null,
        paidWith: `Interac ${money(current.amount)}`,
      }),
    });
    if (!created.ok) return failed(`Clover order not created (${created.detail})`);
    cloverOrderId = created.orderId;
    const saved = await record({ cloverOrderId });
    if (!saved.ok) return saved;
    current = interacOf(saved.order) ?? current;
  }
  if (!current.linesAdded) {
    const added = await addCloverLineItems(cloverOrderId, current.lines);
    if (!added.ok) return failed(`Ticket lines not added (${added.detail})`);
    const saved = await record({ linesAdded: true });
    if (!saved.ok) return saved;
  }
  // An uncertain print is never repeated automatically: the register can reprint the open Clover order.
  const printed = printWebOrders() ? await printCloverOrder(cloverOrderId) : true;
  if (!printed)
    return failed("In Clover, but the ticket did not print: print it from the register.");
  const done = await record({ status: "sent_to_kitchen", printed: printWebOrders(), error: null });
  if (done.ok) {
    logIntegrationEvent({
      provider: "clover",
      eventType: "interac.sent_to_kitchen",
      status: "processed",
      payloadReference: order.id,
      detail: `${order.orderNumber} ${money(current.amount)}`,
    });
  }
  return done;
}

export interface InteracBoardRow {
  id: string;
  orderNumber: string | null;
  createdAt: string;
  orderType: InternalOrder["orderType"];
  name: string | null;
  phone: string | null;
  email: string | null;
  deliveryAddress: string | null;
  interac: InteracPayment;
  /** "Send to kitchen again" is allowed now. */
  canRetry: boolean;
}

/** The tablet's list: Interac orders of the last 3 days, waiting ones first. */
export async function interacBoard(now = Date.now()): Promise<InteracBoardRow[]> {
  const rank: Record<InteracPayment["status"], number> = {
    kitchen_failed: 0,
    awaiting_request: 1,
    requested: 2,
    paid: 3,
    sent_to_kitchen: 4,
    cancelled: 5,
  };
  return (await listRecentOrders(200))
    .filter((o) => interacOf(o) && now - Date.parse(o.createdAt) < 3 * 24 * 3_600_000)
    .map((o) => {
      const i = interacOf(o)!;
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        orderType: o.orderType,
        name: o.customer.name,
        phone: o.customer.phone,
        email: o.customer.email,
        deliveryAddress: o.deliveryAddress,
        interac: i,
        canRetry:
          i.status === "kitchen_failed" ||
          (i.status === "paid" && now - Date.parse(i.updatedAt) > STUCK_MS),
      };
    })
    .sort(
      (a, b) =>
        rank[a.interac.status] - rank[b.interac.status] || b.createdAt.localeCompare(a.createdAt),
    );
}
