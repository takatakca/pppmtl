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
 * With DATABASE_URL (always, for real cards) steps 2–3 are durable instead: the payment is recorded in
 * PostgreSQL with its title task in one transaction, and the kitchen outbox titles then prints once, retrying
 * across Clover outages and restarts (handleDurablePayment). Without it, a sandbox uses this process's memory.
 */
import { createHash } from "node:crypto";
import type { WebhookAdapter, WebhookEvent } from "@/lib/integration/core/adapter";
import type { IntegrationResult } from "@/lib/integration/core/contracts";
import { logIntegrationEvent } from "@/lib/integration/core/logging";
import {
  readBoundedWebhookBody,
  WebhookBodyTooLargeError,
} from "@/lib/integration/core/webhook-body.server";
import {
  claimWebhookDelivery,
  releaseWebhookDelivery,
} from "@/lib/integration/core/webhook-security";
import { durableOrderStoreConfigured } from "@/lib/orders/database.server";
import type { InternalOrder } from "@/lib/orders/types";
import {
  isWebsiteTitled,
  parseHostedCheckoutEvent,
  type HostedCheckoutEvent,
  verifyCloverSignature,
  websiteOrderNote,
  websiteOrderTitle,
} from "./checkout";
import {
  cloverEnvironment,
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
  let rawBody: string;
  try {
    rawBody = await readBoundedWebhookBody(request);
  } catch (error) {
    return new Response("Invalid webhook body", {
      status: error instanceof WebhookBodyTooLargeError ? 413 : 400,
    });
  }
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
  if (!event || event.type !== "PAYMENT" || !event.paymentId || !event.checkoutSessionId) {
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

  if (durableOrderStoreConfigured()) {
    const { paymentId, checkoutSessionId } = event;
    return handleDurablePayment({ ...event, paymentId, checkoutSessionId }, rawBody);
  }

  // The non-durable in-process order ring cannot prove this is our checkout
  // after a restart, nor can it safely record payment/print replay state.
  // NEVER title or print live merchant payments without a durable session.
  // Respond retryably instead of accidentally acknowledging untracked money.
  if (cloverEnvironment() === "production") {
    logIntegrationEvent({
      provider: "clover",
      eventType: "payment.durable_store_required",
      status: "error",
      payloadReference: event.paymentId,
    });
    return new Response("Durable payment reconciliation unavailable", {
      status: 503,
      headers: { "Retry-After": "60" },
    });
  }

  const key = `clover:${event.paymentId}:${event.checkoutSessionId}:${event.status}`;
  if (!claimWebhookDelivery(key)) return Response.json({ received: true, duplicate: true });

  const approved = event.status === "APPROVED";
  let order: InternalOrder | null;
  let confirmation: CloverConfirmation | null;
  try {
    const { applyCloverPayment } = await import("@/lib/orders/order-service");
    order = applyCloverPayment(event.checkoutSessionId, event.paymentId, approved);
    confirmation = approved ? await confirmInClover(event.paymentId, order) : null;
  } catch {
    // A transient exception after claiming a delivery is not a completed
    // payment event. Return 503 so the signed event remains retryable.
    releaseWebhookDelivery(key);
    logIntegrationEvent({
      provider: "clover",
      eventType: "payment.reconciliation_exception",
      status: "error",
      payloadReference: event.paymentId,
    });
    return new Response("Payment reconciliation temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "30" },
    });
  }

  // An unavailable Clover REST lookup or failed title must not be acknowledged
  // as completed: the original delivery can safely be retried without printing.
  if (confirmation?.reason === "order_not_readable" || confirmation?.reason === "title_failed") {
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

const retryLater = (seconds: number) =>
  new Response("Payment reconciliation temporarily unavailable", {
    status: 503,
    headers: { "Retry-After": String(seconds) },
  });

/**
 * A signed, merchant-checked payment event, recorded in PostgreSQL. Acknowledged (200) once the payment is
 * durably stored: the title and the single print are then the kitchen outbox's job, not Clover's retries.
 */
async function handleDurablePayment(
  event: HostedCheckoutEvent & { paymentId: string; checkoutSessionId: string },
  rawBody: string,
): Promise<Response> {
  const approved = event.status === "APPROVED";
  const durable = await import("@/lib/orders/durable-orders.server");
  let newlyProcessed: boolean;
  try {
    const checkout = await durable.findStoredCheckout(event.checkoutSessionId);
    // Every payment page this site opens is linked to a stored order first, so this one is not the site's.
    if (!checkout) {
      logIntegrationEvent({
        provider: "clover",
        eventType: "payment.unknown_checkout",
        status: "received",
        payloadReference: event.paymentId,
      });
      return Response.json({ received: true, ignored: true });
    }
    if (!approved && checkout.paymentStatus === "PAID") {
      return Response.json({ received: true, ignored: true });
    }
    if (approved && checkout.providerPaymentId && checkout.providerPaymentId !== event.paymentId) {
      logIntegrationEvent({
        provider: "clover",
        eventType: "payment.conflicting_payment",
        status: "error",
        payloadReference: event.paymentId,
        detail: `order ${checkout.orderId} already paid by another payment; check Clover`,
      });
      return Response.json({ received: true, applied: false, manualReviewRequired: true });
    }
    const digest = createHash("sha256").update(rawBody).digest("hex");
    const recorded = await durable.recordVerifiedPayment({
      checkoutSessionId: event.checkoutSessionId,
      paymentId: event.paymentId,
      // A different body for the same payment is a new delivery; recording it again is harmless.
      deliveryKey: `clover:${event.paymentId}:${event.checkoutSessionId}:${event.status}:${digest}`,
      payloadDigest: digest,
      result: approved ? "APPROVED" : "DECLINED",
    });
    newlyProcessed = recorded.newly_processed;
  } catch {
    logIntegrationEvent({
      provider: "clover",
      eventType: "payment.durable_store_unavailable",
      status: "error",
      payloadReference: event.paymentId,
    });
    return retryLater(30);
  }

  // Keep this process's copy in step (it may not hold the order after a restart).
  const { applyCloverPayment } = await import("@/lib/orders/order-service");
  const order = applyCloverPayment(event.checkoutSessionId, event.paymentId, approved);

  let kitchen = null;
  if (approved) {
    try {
      kitchen = await durable.runCloverFulfillment();
    } catch {
      // The payment is stored and its title task queued: the background loop retries.
      logIntegrationEvent({
        provider: "clover",
        eventType: "kitchen.outbox_deferred",
        status: "error",
        payloadReference: event.paymentId,
      });
    }
  }

  logIntegrationEvent({
    provider: "clover",
    eventType: `payment.${event.status.toLowerCase()}`,
    status: approved ? "processed" : "received",
    payloadReference: event.paymentId,
    detail: [
      newlyProcessed ? "stored" : "already stored",
      order ? `order ${order.id}` : "",
      kitchen
        ? `kitchen done ${kitchen.done}, retry ${kitchen.retry}, review ${kitchen.manualReview}`
        : "",
    ]
      .filter(Boolean)
      .join(" · "),
  });
  return Response.json({
    received: true,
    applied: true,
    duplicate: !newlyProcessed,
    kitchen,
    manualReviewRequired: Boolean(kitchen && kitchen.manualReview + kitchen.quarantinedPrints > 0),
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
