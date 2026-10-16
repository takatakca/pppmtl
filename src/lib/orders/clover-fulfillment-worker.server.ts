/**
 * One opt-in invocation of the PPPMTL Clover kitchen outbox.
 *
 * SERVER ONLY; this is not an auto-running scheduler or a deployed worker.
 * Call only from a trusted server job after TAKATAK has resolved the tenant
 * and PostgreSQL migrations 0001-0003 have passed real integration tests.
 *
 * Uncertain physical prints are NEVER retried automatically.
 */
import type { InternalOrder } from "./types";
import {
  claimFulfillmentWork,
  finishFulfillmentWork,
  quarantineExpiredPrintWork,
  withPppTenantTransaction,
  type ClaimedFulfillmentWork,
  type PppSqlPool,
} from "./postgres-transactions.server";
import {
  orderForPayment,
  printCloverOrder,
  titleCloverOrder,
} from "@/lib/integration/providers/clover/api.server";
import {
  isWebsiteTitled,
  websiteOrderNote,
  websiteOrderTitle,
} from "@/lib/integration/providers/clover/checkout";
import {
  printWebOrders,
  siteBaseUrl,
} from "@/lib/integration/providers/clover/config.server";

interface StoredOrderRow {
  order_document: InternalOrder;
}

async function readPaidOrder(
  pool: PppSqlPool,
  tenantId: string,
  work: ClaimedFulfillmentWork,
): Promise<InternalOrder | null> {
  const response = await withPppTenantTransaction(pool, tenantId, (client) =>
    client.query<StoredOrderRow>(
      `SELECT order_document FROM ppp.orders
       WHERE id = $1
         AND tenant_id = current_setting('ppp.tenant_id', true)
         AND payment_status = 'PAID' AND provider = 'clover'`,
      [work.order_id],
    ),
  );
  const order = response.rows[0]?.order_document;
  const paymentId = work.payload?.["paymentId"];
  // This must be the actual verified signed checkout, not just an arbitrary
  // merchant payment that the provider happened to report.
  if (
    !order ||
    order.id !== work.order_id ||
    order.provider !== "clover" ||
    order.paymentStatus !== "PAID" ||
    order.providerOrderId !== work.dedup_key ||
    typeof paymentId !== "string" ||
    !paymentId ||
    order.providerPaymentId !== paymentId
  ) {
    return null;
  }
  return order;
}

interface WorkResult {
  success: boolean;
  retryable: boolean;
  enablePrint: boolean;
  reason: string | null;
}

async function reconcileWork(
  work: ClaimedFulfillmentWork,
  order: InternalOrder | null,
): Promise<WorkResult> {
  if (!order) {
    return {
      success: false,
      retryable: false,
      enablePrint: false,
      reason: "Durable paid checkout association missing",
    };
  }
  const paymentId = order.providerPaymentId;
  if (!paymentId) {
    return {
      success: false,
      retryable: false,
      enablePrint: false,
      reason: "Durable payment reference missing",
    };
  }
  const provider = await orderForPayment(paymentId);
  if (!provider) {
    return {
      success: false,
      retryable: work.effect === "CLOVER_TITLE",
      enablePrint: false,
      reason: "Clover payment/order lookup unavailable",
    };
  }

  if (work.effect === "CLOVER_TITLE") {
    if (!isWebsiteTitled(provider.title)) {
      const name = order.customer.name?.trim().split(/\s+/)[0] ?? provider.customerFirstName;
      const title = websiteOrderTitle(order.orderNumber, name ?? null);
      const note = websiteOrderNote({
        site: new URL(siteBaseUrl()).host,
        customerName: order.customer.name ?? provider.customerFirstName,
        phone: order.customer.phone ?? provider.customerPhone,
        notes: order.notes?.trim() || null,
      });
      if (!(await titleCloverOrder(provider.orderId, title, note))) {
        // Recheck Clover on the next claim; it may have titled before timeout.
        return {
          success: false,
          retryable: true,
          enablePrint: false,
          reason: "Clover title not confirmed",
        };
      }
    }
    return {
      success: true,
      retryable: false,
      enablePrint: printWebOrders() && !provider.printed,
      reason: null,
    };
  }

  if (work.effect === "CLOVER_PRINT") {
    if (!printWebOrders() || provider.printed) {
      return { success: true, retryable: false, enablePrint: false, reason: null };
    }
    if (!isWebsiteTitled(provider.title)) {
      return {
        success: false,
        retryable: false,
        enablePrint: false,
        reason: "Refusing to print Clover order before site title is confirmed",
      };
    }
    const printed = await printCloverOrder(provider.orderId);
    return {
      success: printed,
      retryable: false,
      enablePrint: false,
      reason: printed ? null : "Print result uncertain; manual review required",
    };
  }

  return {
    success: false,
    retryable: false,
    enablePrint: false,
    reason: "Unsupported kitchen outbox effect",
  };
}

export interface CloverFulfillmentBatchResult {
  claimed: number;
  done: number;
  retry: number;
  manualReview: number;
  quarantinedPrints: number;
}

/**
 * Process one short batch, suitable for an external authorized scheduler.
 * No automatic timer or endpoint is registered by this source module.
 */
export async function processPppCloverFulfillmentBatch(
  pool: PppSqlPool,
  verifiedServerTenantId: string,
  maxTasks = 10,
): Promise<CloverFulfillmentBatchResult> {
  const quarantinedPrints = await quarantineExpiredPrintWork(pool, verifiedServerTenantId);
  const claims = await claimFulfillmentWork(pool, verifiedServerTenantId, maxTasks);
  const summary: CloverFulfillmentBatchResult = {
    claimed: claims.length,
    done: 0,
    retry: 0,
    manualReview: 0,
    quarantinedPrints,
  };

  for (const work of claims) {
    let outcome: WorkResult;
    try {
      const order = await readPaidOrder(pool, verifiedServerTenantId, work);
      outcome = await reconcileWork(work, order);
    } catch {
      // Remote exceptions may be ambiguous for physical printing; SQL's
      // finish_fulfillment marks any failed print as manual review.
      outcome = {
        success: false,
        retryable: work.effect === "CLOVER_TITLE",
        enablePrint: false,
        reason: "Provider operation failed or result uncertain",
      };
    }

    const state = await finishFulfillmentWork(pool, verifiedServerTenantId, {
      id: work.id,
      leaseToken: work.lease_token,
      success: outcome.success,
      retryable: outcome.retryable,
      enablePrint: outcome.enablePrint,
      ...(outcome.reason ? { error: outcome.reason } : {}),
    });
    if (state === "DONE") summary.done++;
    else if (state === "RETRY") summary.retry++;
    else summary.manualReview++;
  }

  return summary;
}
