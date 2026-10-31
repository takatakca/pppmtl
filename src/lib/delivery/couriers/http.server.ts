/**
 * Courier HTTP calls. SERVER ONLY. Every call has a timeout and never throws to the caller (same rule as
 * src/lib/integration/providers/clover/api.server.ts).
 */

const TIMEOUT_MS = 12_000;
export const COURIER_USER_AGENT = "PPPMTL/1.0 (+https://pppmtl.com)";

export type JsonObject = Record<string, unknown>;

export interface CourierHttpResult {
  /** 0 = network error or timeout: nothing is known about the provider's side. */
  status: number;
  json: JsonObject | null;
}

export async function courierFetch(
  url: string,
  init: {
    method: "GET" | "POST" | "PUT";
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  },
): Promise<CourierHttpResult> {
  try {
    const res = await fetch(url, {
      method: init.method,
      headers: { Accept: "application/json", "User-Agent": COURIER_USER_AGENT, ...init.headers },
      ...(init.body !== undefined ? { body: init.body } : {}),
      signal: AbortSignal.timeout(init.timeoutMs ?? TIMEOUT_MS),
    });
    const text = await res.text().catch(() => "");
    let json: JsonObject | null = null;
    try {
      const parsed: unknown = text ? JSON.parse(text) : null;
      json =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as JsonObject)
          : null;
    } catch {
      json = null;
    }
    return { status: res.status, json };
  } catch {
    return { status: 0, json: null };
  }
}

export function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function int(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^-?\d{1,12}$/.test(value)) return Number(value);
  return null;
}

export function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function obj(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : null;
}

export function isoOrNull(value: unknown): string | null {
  const s = str(value);
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/**
 * Why a provider refused, for staff and logs, without personal data: the provider's error code + message
 * (+ DoorDash's field errors), with e-mails, long numbers and ids masked.
 */
export function refusalDetail(status: number, json: JsonObject | null): string {
  if (status < 0) return "Not connected";
  if (status === 0) return "No answer (network error or timeout)";
  const parts: string[] = [];
  const code = str(json?.["code"]);
  const message = str(json?.["message"]);
  if (code) parts.push(code);
  if (message) parts.push(message);
  const rawFieldErrors: unknown = json?.["field_errors"];
  const fieldErrors: unknown[] = Array.isArray(rawFieldErrors) ? rawFieldErrors : [];
  for (const fe of fieldErrors.slice(0, 3)) {
    const f = obj(fe);
    const field = str(f?.["field"]);
    const error = str(f?.["error"]);
    if (field || error) parts.push(`${field ?? "body"}: ${error ?? "invalid"}`);
  }
  const masked = parts
    .join(" · ")
    .replace(/[^\s@]+@[^\s@]+/g, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[number]")
    .replace(/\s+/g, " ")
    .trim();
  return `HTTP ${status}${masked ? ` · ${masked.slice(0, 240)}` : ""}`;
}
