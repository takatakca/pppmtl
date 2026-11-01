/**
 * Interac "Request money" through BMO, wired into the Interac flow (interac.server.ts). SERVER ONLY.
 *
 *   order placed → requestInteracViaBmo: claim (row lock, one sender), pain.013 to BMO, status "requested" by BMO.
 *   BMO says settled (push notification or the 60 s poll) → applyBmoStatus → markInteracPaid → Clover + one print.
 *   Refused / cancelled / expired / unreadable → the tablet shows why; staff resend or use the manual buttons.
 * A request whose outcome is uncertain (timeout, crash mid-call) is never resent automatically: the poll asks BMO
 * for its end-to-end id first, so a customer never gets two requests for one order without a person deciding.
 */
import { randomUUID } from "node:crypto";
import { siteBaseUrl } from "@/lib/integration/providers/clover/config.server";
import { logIntegrationEvent } from "@/lib/integration/core/logging";
import { sendSms, smsConfigured } from "@/lib/notifications/sms.server";
import { listRecentOrders } from "@/lib/orders/order-service";
import type { BmoMoneyRequest, InteracPayment, InternalOrder } from "@/lib/orders/types";
import { interacAlertPhone } from "../interac-config.server";
import {
  interacOf,
  markInteracPaid,
  mutateInteracOrder,
  type InteracResult,
} from "../interac.server";
import { getBmoRequestStatus, sendBmoRequestForPayment } from "./client.server";
import { bmoConfigured, bmoSettings } from "./config.server";
import { rfpOutcome, type PaymentStatus } from "./messages";

export const BY_BMO = "BMO";
/** A "sending" older than this is uncertain: the poll asks BMO whether it exists. */
const SENDING_STALE_MS = 2 * 60_000;
const FINAL_FAILED = new Set(["RJCT", "CANC"]);
const money = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} $`;

export const endToEndIdFor = (orderId: string) =>
  orderId
    .replace(/^ord_/, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 35);

const open = (i: InteracPayment) => i.status === "awaiting_request" || i.status === "requested";

async function alertStaff(text: string): Promise<void> {
  const phone = interacAlertPhone();
  if (phone && smsConfigured()) await sendSms(phone, text).catch(() => false);
}

/** Records BMO's latest word on the request (and optionally the Interac step), while the order is still open. */
async function recordBmo(
  orderId: string,
  patch: Partial<BmoMoneyRequest>,
  interacPatch: Partial<InteracPayment> = {},
): Promise<InteracResult> {
  return mutateInteracOrder(orderId, (o) => {
    const i = interacOf(o);
    if (!i?.bmo) return { ok: false, error: "No BMO request on this order." };
    const at = new Date().toISOString();
    return {
      ok: true,
      interac: { ...i, ...interacPatch, bmo: { ...i.bmo, ...patch, updatedAt: at }, updatedAt: at },
    };
  });
}

/**
 * Sends the money request for one order. `resend` (a person tapped "Send BMO request") also replaces a request BMO
 * refused, one that failed, or one whose outcome stayed uncertain; never one BMO accepted.
 */
export async function requestInteracViaBmo(
  orderId: string,
  by = BY_BMO,
  opts: { resend?: boolean; now?: Date } = {},
): Promise<InteracResult> {
  if (!bmoConfigured())
    return { ok: false, error: "BMO is not set up (see docs/integrations/interac.md)." };
  const now = opts.now ?? new Date();
  const s = bmoSettings();
  const messageId =
    `PPPRFP${now.getTime().toString(36)}${randomUUID().replace(/-/g, "").slice(0, 12)}`
      .toUpperCase()
      .slice(0, 35);
  const claimed = await mutateInteracOrder(orderId, (o) => {
    const i = interacOf(o);
    if (!i) return { ok: false, error: "Not an Interac order." };
    if (!open(i)) return { ok: false, error: "This order is already paid or cancelled." };
    const b = i.bmo;
    if (b) {
      const fresh =
        b.status === "sending" && now.getTime() - Date.parse(b.updatedAt) < SENDING_STALE_MS;
      if (fresh) return { ok: false, error: "A BMO request is being sent right now." };
      const replaceable =
        b.status === "error" || FINAL_FAILED.has(b.status) || b.status === "sending";
      if (!replaceable) return { ok: false, error: "BMO already sent the request for this order." };
      if (!opts.resend)
        return {
          ok: false,
          error: "The last BMO request did not go through: send it again from the tablet.",
        };
    }
    const at = now.toISOString();
    const bmo: BmoMoneyRequest = {
      endToEndId: endToEndIdFor(o.id),
      messageId,
      status: "sending",
      sentAt: at,
      updatedAt: at,
    };
    return { ok: true, interac: { ...i, bmo, updatedAt: at } };
  });
  if (!claimed.ok) return claimed;
  const order = claimed.order;
  const i = interacOf(order)!;
  const sent = await sendBmoRequestForPayment({
    messageId,
    endToEndId: i.bmo!.endToEndId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + s.expiryMinutes * 60_000),
    amountCents: i.amount,
    creditor: { name: s.creditorName, accountId: s.creditorAccount, agentId: s.creditorAgentId },
    debtor: {
      name: order.customer.name ?? "Client",
      email: order.customer.email,
      phone: order.customer.phone,
    },
    description: `${s.creditorName} — commande ${order.orderNumber ?? ""}`.trim(),
    returnUrl: `${siteBaseUrl()}/orders/${encodeURIComponent(order.id)}`,
  });
  const at = new Date().toISOString();
  if (sent.ok && rfpOutcome(sent.reply.status) !== "failed") {
    const done = await recordBmo(
      order.id,
      {
        status: sent.reply.status ?? "ACTC",
        reason: sent.reply.reason,
        reference: sent.reply.reference,
        error: null,
      },
      { status: "requested", requestedAt: at, by, error: null },
    );
    logIntegrationEvent({
      provider: "clover",
      eventType: "interac.bmo_requested",
      status: "processed",
      payloadReference: order.id,
      detail: `${order.orderNumber} ${money(i.amount)} ${sent.reply.status ?? ""}`.trim(),
    });
    return done;
  }
  const error = sent.ok
    ? `BMO refused the request (${sent.reply.status}${sent.reply.reason ? `: ${sent.reply.reason}` : ""})`
    : sent.detail;
  // A timeout may still have reached BMO: keep "sending" so the poll asks BMO before anyone resends.
  const uncertain = !sent.ok && sent.retryable;
  await recordBmo(
    order.id,
    { status: uncertain ? "sending" : sent.ok ? (sent.reply.status ?? "RJCT") : "error", error },
    { error: `BMO: ${error}` },
  );
  logIntegrationEvent({
    provider: "clover",
    eventType: "interac.bmo_request_failed",
    status: "error",
    payloadReference: order.id,
    detail: error,
  });
  await alertStaff(
    `PPP — BMO n'a pas envoyé la demande Interac de ${order.orderNumber} (${money(i.amount)}). ` +
      `Tablette : ${siteBaseUrl()}/admin/interac`,
  );
  return { ok: false, error };
}

async function orderForEndToEnd(endToEndId: string): Promise<InternalOrder | null> {
  const recent = await listRecentOrders(200);
  return recent.find((o) => o.interac?.bmo?.endToEndId === endToEndId) ?? null;
}

export type BmoApplied = "paid" | "failed" | "pending" | "unknown" | "held";

/** BMO's status for a request (push or poll). Settled for the exact amount → Paid → kitchen, exactly once. */
export async function applyBmoStatus(status: PaymentStatus): Promise<BmoApplied> {
  if (!status.endToEndId) return "unknown";
  const order = await orderForEndToEnd(status.endToEndId);
  const i = order ? interacOf(order) : null;
  if (!order || !i?.bmo) return "unknown";
  const outcome = rfpOutcome(status.status);
  const code = status.status ?? "";
  const known = {
    status: code || i.bmo.status,
    reason: status.reason ?? i.bmo.reason ?? null,
    ...(status.gatewayUrl ? { gatewayUrl: status.gatewayUrl } : {}),
  };
  if (!open(i)) return outcome === "paid" ? "paid" : "unknown";
  if (outcome === "paid") {
    if (status.amountCents !== null && status.amountCents !== i.amount) {
      const error = `BMO reports ${money(status.amountCents)} received, the order asks ${money(i.amount)}: check the BMO account, then tap Paid.`;
      await recordBmo(order.id, { ...known, error }, { error });
      await alertStaff(
        `PPP — ${order.orderNumber} : montant Interac différent (${money(status.amountCents)}). Vérifiez BMO.`,
      );
      return "held";
    }
    await recordBmo(order.id, { ...known, error: null });
    const paid = await markInteracPaid(order.id, BY_BMO);
    return paid.ok || /already/i.test(paid.error) ? "paid" : "pending";
  }
  if (outcome === "failed") {
    if (FINAL_FAILED.has(i.bmo.status)) return "failed";
    const error = `The Interac request was ${code === "CANC" ? "cancelled or expired" : "refused"}${known.reason ? ` (${known.reason})` : ""}: send it again or cancel the order.`;
    await recordBmo(order.id, { ...known, error }, { error });
    await alertStaff(
      `PPP — ${order.orderNumber} : demande Interac ${code === "CANC" ? "annulée/expirée" : "refusée"}. Tablette : ${siteBaseUrl()}/admin/interac`,
    );
    return "failed";
  }
  if (
    known.status !== i.bmo.status ||
    (status.gatewayUrl && status.gatewayUrl !== i.bmo.gatewayUrl)
  ) {
    // A request BMO knows about was sent, whatever our record said ("sending" after a timeout).
    await recordBmo(
      order.id,
      { ...known, error: null },
      i.status === "awaiting_request"
        ? { status: "requested", requestedAt: new Date().toISOString(), by: BY_BMO, error: null }
        : {},
    );
  }
  return "pending";
}

/** One pass over open BMO requests (the 60 s loop, and tests). */
export async function pollBmoRequests(
  now = Date.now(),
): Promise<{ checked: number; paid: number }> {
  const out = { checked: 0, paid: 0 };
  if (!bmoConfigured()) return out;
  const orders = (await listRecentOrders(200)).filter((o) => {
    const i = interacOf(o);
    return i && open(i) && now - Date.parse(o.createdAt) < 3 * 86_400_000;
  });
  for (const o of orders) {
    const b = interacOf(o)!.bmo;
    try {
      if (!b) {
        // Placed while BMO was not set up or not connected: send once, while the order is fresh.
        if (now - Date.parse(o.createdAt) < 30 * 60_000) await requestInteracViaBmo(o.id);
        continue;
      }
      if (b.status === "error" || FINAL_FAILED.has(b.status)) continue;
      if (b.status === "sending" && now - Date.parse(b.updatedAt) < SENDING_STALE_MS) continue;
      out.checked += 1;
      const r = await getBmoRequestStatus(b.endToEndId);
      if (!r.ok) continue;
      for (const st of r.statuses.filter((x) => !x.endToEndId || x.endToEndId === b.endToEndId)) {
        if ((await applyBmoStatus({ ...st, endToEndId: b.endToEndId })) === "paid") out.paid += 1;
      }
    } catch (error) {
      console.error("[bmo] poll", o.orderNumber, error instanceof Error ? error.message : error);
    }
  }
  return out;
}

let loop: ReturnType<typeof setInterval> | null = null;

/** Started by src/server.ts with the database: every 60 s, one pass at a time. */
export function startBmoPolling(intervalMs = 60_000): void {
  if (loop) return;
  let running = false;
  loop = setInterval(() => {
    if (running || !bmoConfigured()) return;
    running = true;
    void pollBmoRequests()
      .catch((e: unknown) =>
        console.error("[bmo] poll failed:", e instanceof Error ? e.message : e),
      )
      .finally(() => {
        running = false;
      });
  }, intervalMs);
  loop.unref?.();
}
