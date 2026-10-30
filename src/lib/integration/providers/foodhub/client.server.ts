/**
 * HTTP client for the owner's Food Hub. SERVER ONLY.
 *
 * Every call carries `Authorization: Bearer <FOODHUB_WEBSITE_ORDER_SECRET>`; a signed-in customer's token travels
 * as `X-Customer-Token`. Failures are classified, never thrown, so callers can tell the customer the truth:
 * "not available yet" (404: the route is not deployed), "unavailable" (503), "unreachable" (network), …
 * The secret and the customer token are never logged.
 */
import { foodhubBaseUrl, foodhubSecret } from "./config.server";

export type FoodhubFailureKind =
  | "not_configured"
  | "not_available"
  | "unavailable"
  | "unreachable"
  | "rate_limited"
  | "unauthorized"
  | "forbidden"
  | "invalid"
  | "error";

export interface FoodhubFailure {
  ok: false;
  kind: FoodhubFailureKind;
  status: number | null;
  /** Food Hub's own `error` text (customer-safe wording is chosen by the caller). */
  error: string | null;
  retryAfterS?: number;
  body: unknown;
}

export interface FoodhubSuccess<T> {
  ok: true;
  status: number;
  body: T;
}

export type FoodhubResponse<T> = FoodhubSuccess<T> | FoodhubFailure;

export interface FoodhubRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
  customerToken?: string | null;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function errorText(body: unknown): string | null {
  if (!isRecord(body)) return null;
  const error = body["error"];
  return typeof error === "string" && error.trim() ? error.trim().slice(0, 240) : null;
}

function retryAfter(body: unknown, headers: Headers): number | undefined {
  if (isRecord(body) && Number.isFinite(Number(body["retryAfterS"]))) {
    return Math.max(0, Math.round(Number(body["retryAfterS"])));
  }
  const header = Number(headers.get("retry-after"));
  return Number.isFinite(header) && header > 0 ? Math.round(header) : undefined;
}

/** Classify an HTTP status the way the customer-facing code reads it. */
export function classifyStatus(status: number): FoodhubFailureKind {
  if (status === 404) return "not_available";
  if (status === 503) return "unavailable";
  if (status === 429) return "rate_limited";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 400 || status === 422) return "invalid";
  return "error";
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** One Food Hub call. `path` starts with "/api/…". */
export async function foodhubRequest<T = unknown>(
  path: string,
  options: FoodhubRequestOptions = {},
): Promise<FoodhubResponse<T>> {
  const base = foodhubBaseUrl();
  const secret = foodhubSecret();
  if (!base || !secret) {
    return { ok: false, kind: "not_configured", status: null, error: null, body: null };
  }
  const headers: Record<string, string> = {
    authorization: `Bearer ${secret}`,
    accept: "application/json",
  };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.customerToken) headers["x-customer-token"] = options.customerToken;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: controller.signal,
      redirect: "manual",
    });
  } catch {
    clearTimeout(timer);
    return { ok: false, kind: "unreachable", status: null, error: null, body: null };
  }
  clearTimeout(timer);
  const body = await readJson(response);
  if (response.ok) return { ok: true, status: response.status, body: body as T };
  const kind = classifyStatus(response.status);
  return {
    ok: false,
    kind,
    status: response.status,
    error: errorText(body),
    ...(kind === "rate_limited" ? { retryAfterS: retryAfter(body, response.headers) ?? 60 } : {}),
    body,
  };
}

export interface FoodhubHealth {
  reachable: boolean;
  /** Food Hub's own overall status word ("ok", "degraded", "down"…), when it answered. */
  status: string | null;
  httpStatus: number | null;
}

/** GET /api/health is public on Food Hub (status words only, no merchant detail). No customer route is used. */
export async function foodhubHealth(timeoutMs = 5_000): Promise<FoodhubHealth> {
  const base = foodhubBaseUrl();
  if (!base) return { reachable: false, status: null, httpStatus: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${base}/api/health`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
      redirect: "manual",
    });
    const body = await readJson(response);
    const status = isRecord(body) && typeof body["status"] === "string" ? body["status"] : null;
    return { reachable: true, status, httpStatus: response.status };
  } catch {
    return { reachable: false, status: null, httpStatus: null };
  } finally {
    clearTimeout(timer);
  }
}
