/**
 * Clover Hosted Checkout webhook. SERVER ONLY.
 * URL to set in Clover (Settings → Ecommerce → Hosted Checkout → Webhook):
 *   https://pppmtl.com/api/public/webhooks/clover  (or /api/public/webhooks/provider?provider=clover)
 *
 * 1. `Clover-Signature: t=…,v1=…` is checked with CLOVER_WEBHOOK_SECRET (5-minute window, replays ignored).
 * 2. APPROVED: the PPP order (when this server holds it) becomes paid + confirmed.
 * 3. With a REST token: the payment's Clover order gets the title "🌐 Site web · PPP-… · <first name>" and a
 *    pickup / paid note, then ONE print on the order printer (and the KDS set as order printer). An order that
 *    already carries the title is left alone, so a repeated webhook never prints a second ticket. The Food Hub
 *    kitchen tablet recognises website orders by that title.
 * It does not depend on the in-memory order store: on Cloudflare Workers another instance may hold the order.
 */
import type { WebhookAdapter, WebhookEvent } from "@/lib/integration/core/adapter";
import type { IntegrationResult } from "@/lib/integration/core/contracts";
import { logIntegrationEvent } from "@/lib/integration/core/logging";
import {
  claimWebhookDelivery,
  releaseWebhookDelivery,
} from "@/lib/integration/core/webhook-security";
import type { InternalOrder } from "@/lib/orders/types";
import {
  isWebsiteTitled,
  parseHostedCheckoutEvent,
  verifyCloverSignature,
  websiteOrderNote,
  websiteOrderTitle,
} from "./checkout";
import {
  cloverMerchantId,
  cloverWebhookSecret,
  printWebOrders,
  siteBaseUrl,
} from "./config.server";
import { orderForPayment, printCloverOrder, titleCloverOrder } from "./api.server";

export interface CloverConfirmation {
  cloverOrderId: string | null;
  titled: boolean;
  printed: boolean;
  reason: string | null;
}

/** Title + note + one print for a paid website order in Clover. Never prints an order it could not title. */
export async function confirmInClover(
  paymentId: string,
  order: InternalOrder | null,
): Promise<CloverConfirmation> {
  const facts = await orderForPayment(paymentId);
  if (!facts)
    return { cloverOrderId: null, titled: false, printed: false, reason: "order_not_readable" };
  if (isWebsiteTitled(facts.title)) {
    return { cloverOrderId: facts.orderId, titled: false, printed: false, reason: "already_done" };
  }
  const firstName = order?.customer.name?.trim().split(/\s+/)[0] ?? facts.customerFirstName;
  const titled = await titleCloverOrder(
    facts.orderId,
    websiteOrderTitle(order?.orderNumber ?? null, firstName ?? null),
    websiteOrderNote({
      site: new URL(siteBaseUrl()).host,
      customerName: order?.customer.name ?? facts.customerFirstName,
      phone: order?.customer.phone ?? facts.customerPhone,
      notes: order?.notes?.trim() || null,
    }),
  );
  if (!titled)
    return { cloverOrderId: facts.orderId, titled, printed: false, reason: "title_failed" };
  if (!printWebOrders() || facts.printed) {
    return { cloverOrderId: facts.orderId, titled, printed: false, reason: "print_skipped" };
  }
  const printed = await printCloverOrder(facts.orderId);
  return { cloverOrderId: facts.orderId, titled, printed, reason: printed ? null : "print_failed" };
}

export async function handleCloverHostedCheckoutWebhook(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const check = verifyCloverSignature(
    rawBody,
    request.headers.get("clover-signature"),
    cloverWebhookSecret(),
  );
  if (check !== "ok") {
    logIntegrationEvent({
      provider: "clover",
      eventType: `webhook.${check}`,
      status: "rejected",
      payloadReference: "signature",
    });
    if (check === "missing_secret") return new Response("Webhook not configured", { status: 503 });
    return new Response("Rejected", { status: check === "stale_timestamp" ? 400 : 401 });
  }

  const event = parseHostedCheckoutEvent(rawBody);
  if (
    !event ||
    event.type !== "PAYMENT" ||
    !event.paymentId ||
    !event.checkoutSessionId
  ) {
    return new Response("Invalid payment event", { status: 400 });
  }

  // The HMAC proves the sender knows the configured secret; verify that the
  // payment is also for this merchant before mutating any local order.
  const merchantId = cloverMerchantId();
  if (!merchantId) return new Response("Merchant not configured", { status: 503 });
  if (event.merchantId !== merchantId) {
    logIntegrationEvent({
      provider: "clover",
      eventType: "webhook.merchant_mismatch",
      status: "rejected",
      payloadReference: "merchant",
    });
    return new Response("Rejected merchant", { status: 401 });
  }
  if (event.status !== "APPROVED" && event.status !== "DECLINED") {
    return Response.json({ received: true, ignored: true });
  }

  const key = `clover:${event.paymentId}:${event.checkoutSessionId}:${event.status}`;
  if (!claimWebhookDelivery(key)) return Response.json({ received: true, duplicate: true });

  const approved = event.status === "APPROVED";
  const { applyCloverPayment } = await import("@/lib/orders/order-service");
  const order = event.checkoutSessionId
    ? applyCloverPayment(event.checkoutSessionId, event.paymentId, approved)
    : null;
  const confirmation = approved ? await confirmInClover(event.paymentId, order) : null;

  // An unavailable Clover REST lookup or failed title must not be acknowledged
  // as completed: the original delivery can safely be retried without printing.
  if (
    confirmation?.reason === "order_not_readable" ||
    confirmation?.reason === "title_failed"
  ) {
    releaseWebhookDelivery(key);
    logIntegrationEvent({
      provider: "clover",
      eventType: "payment.reconciliation_pending",
      status: "error",
      payloadReference: event.paymentId,
      detail: confirmation.reason,
    });
    return new Response("Payment reconciliation temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "30" },
    });
  }

  logIntegrationEvent({
    provider: "clover",
    eventType: `payment.${event.status.toLowerCase()}`,
    status: approved ? "processed" : "received",
    payloadReference: event.paymentId ?? event.checkoutSessionId ?? "unknown",
    detail: [
      order ? `order ${order.id}` : "order not on this server",
      confirmation
        ? `clover title ${confirmation.titled ? "ok" : "no"}, print ${confirmation.printed ? "ok" : "no"}${confirmation.reason ? ` (${confirmation.reason})` : ""}`
        : "",
    ]
      .filter(Boolean)
      .join(" · "),
  });
  return Response.json({
    received: true,
    applied: Boolean(order),
    titled: confirmation?.titled ?? false,
    printed: confirmation?.printed ?? false,
    manualReviewRequired: confirmation?.reason === "print_failed",
  });
}

/** Registry adapter (signature check + event mapping) for the integrations screen and tests. */
export const cloverWebhookAdapter: WebhookAdapter = {
  provider: "clover",
  verifySignature: (rawBody, signature, secret) =>
    verifyCloverSignature(rawBody, signature, secret) === "ok",
  parseEvent(rawBody): IntegrationResult<WebhookEvent> {
    const event = parseHostedCheckoutEvent(rawBody);
    if (!event)
      return { ok: false, code: "invalid_request", message: "Not a Hosted Checkout event" };
    return {
      ok: true,
      data: {
        provider: "clover",
        eventType: `payment.${event.status.toLowerCase()}`,
        externalOrderId: event.checkoutSessionId,
        status: event.status === "APPROVED" ? "CONFIRMED" : null,
        receivedAt: new Date().toISOString(),
        payloadReference: event.paymentId ?? "unknown",
      },
    };
  },
};
