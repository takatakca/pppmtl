/**
 * UrbanPiper connection health. SERVER ONLY.
 *
 * Runs the real checks when credentials exist and reports the honest result.
 * With no credentials it reports "not configured" — never a fake success.
 */

import {
  urbanPiperApiUrl,
  optionalCredential,
} from "@/lib/integration/core/credentials.server";
import { mappingForLocation } from "@/config/integration-locations";
import {
  urbanPiperConfigured,
  urbanPiperEnvironmentLabel,
  urbanPiperReadiness,
  urbanPiperStoreRef,
} from "./config.server";

export type HealthState = "ok" | "failed" | "not_configured";

export interface HealthCheck {
  id: "api_reachable" | "authentication" | "store_mapped" | "menu_available" | "orders_available";
  label: string;
  state: HealthState;
  detail: string;
}

export interface ProviderHealthReport {
  provider: "urbanpiper";
  locationId: string;
  locationName: string;
  environment: "sandbox" | "production" | "not set";
  connected: boolean;
  checkedAt: string;
  checks: HealthCheck[];
}

const TIMEOUT_MS = 8000;

async function ping(url: string, apiKey: string): Promise<{ status: number } | { error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `apikey ${apiKey}`, Accept: "application/json" },
      signal: controller.signal,
    });
    return { status: response.status };
  } catch {
    return { error: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

export async function urbanPiperHealth(locationId: string): Promise<ProviderHealthReport> {
  const readiness = urbanPiperReadiness(locationId);
  const mapping = mappingForLocation(locationId);
  const apiUrl = urbanPiperApiUrl();
  const apiKey = optionalCredential("URBANPIPER_API_KEY");
  const storeRef = urbanPiperStoreRef(locationId);

  const checks: HealthCheck[] = [];

  if (!apiUrl || !apiKey) {
    checks.push(
      {
        id: "api_reachable",
        label: "API reachable",
        state: "not_configured",
        detail: "API url or API key not set.",
      },
      {
        id: "authentication",
        label: "Authentication valid",
        state: "not_configured",
        detail: "No credentials to authenticate with.",
      },
    );
  } else {
    const base = apiUrl.replace(/\/$/, "");
    const probe = storeRef
      ? `${base}/hub/api/v1/stores/${storeRef}/`
      : `${base}/hub/api/v1/stores/`;
    const result = await ping(probe, apiKey);
    if ("error" in result) {
      checks.push(
        {
          id: "api_reachable",
          label: "API reachable",
          state: "failed",
          detail: "No response from the provider API.",
        },
        {
          id: "authentication",
          label: "Authentication valid",
          state: "failed",
          detail: "Could not be verified — API unreachable.",
        },
      );
    } else {
      const authOk = result.status !== 401 && result.status !== 403;
      checks.push(
        {
          id: "api_reachable",
          label: "API reachable",
          state: "ok",
          detail: `HTTP ${result.status}`,
        },
        {
          id: "authentication",
          label: "Authentication valid",
          state: authOk ? "ok" : "failed",
          detail: authOk ? "Credentials accepted." : `Rejected (HTTP ${result.status}).`,
        },
      );
    }
  }

  checks.push({
    id: "store_mapped",
    label: "Store mapped",
    state: storeRef ? "ok" : "not_configured",
    detail: storeRef
      ? `Store id ${storeRef}`
      : `Waiting for: ${readiness.missingProviderFields.join(", ") || "provider store id"}`,
  });

  const connected = urbanPiperConfigured(locationId);
  checks.push(
    {
      id: "menu_available",
      label: "Menu available",
      state: connected ? "ok" : "not_configured",
      detail: connected
        ? "Menu sync can run for this store."
        : "Menu sync stays on the verified in-house catalog.",
    },
    {
      id: "orders_available",
      label: "Orders available",
      state: connected ? "ok" : "not_configured",
      detail: connected
        ? "Orders can be submitted for this store."
        : "Orders cannot be submitted for this store.",
    },
  );

  return {
    provider: "urbanpiper",
    locationId,
    locationName: mapping?.name ?? locationId,
    environment: urbanPiperEnvironmentLabel(),
    connected,
    checkedAt: new Date().toISOString(),
    checks,
  };
}

export interface ConnectionTestResult {
  ok: boolean;
  /** Internal wording only — never shown to customers. */
  message: string;
  report: ProviderHealthReport;
}

export async function testUrbanPiperConnection(
  locationId: string,
): Promise<ConnectionTestResult> {
  const report = await urbanPiperHealth(locationId);
  const failed = report.checks.filter((c) => c.state === "failed");
  const missing = report.checks.filter((c) => c.state === "not_configured");
  if (failed.length > 0) {
    return { ok: false, message: `Connection failed: ${failed[0]!.detail}`, report };
  }
  if (missing.length > 0) {
    return { ok: false, message: `Not connected: ${missing[0]!.detail}`, report };
  }
  return { ok: true, message: "Connected.", report };
}
