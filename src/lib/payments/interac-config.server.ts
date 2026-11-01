/**
 * Interac e-Transfer (manual) switch. SERVER ONLY.
 *
 *   INTERAC_REQUESTS_ENABLED=true   offer "Interac e-Transfer" at checkout
 *   INTERAC_ALERT_PHONE             the phone that gets a text for each Interac order (needs Twilio)
 *
 * Orders wait for the money for minutes or hours, so outside a Clover sandbox the PostgreSQL order store is
 * required: a restart must never lose an order the customer is about to pay.
 */
import { cloverEnvironment } from "@/lib/integration/providers/clover/config.server";
import { durableOrderStoreConfigured } from "@/lib/orders/database.server";

export function interacRequestsEnabled(): boolean {
  const on = /^(true|on|yes|1)$/i.test(process.env["INTERAC_REQUESTS_ENABLED"]?.trim() ?? "");
  return on && (durableOrderStoreConfigured() || cloverEnvironment() === "sandbox");
}

export function interacAlertPhone(): string | null {
  return process.env["INTERAC_ALERT_PHONE"]?.trim() || null;
}
