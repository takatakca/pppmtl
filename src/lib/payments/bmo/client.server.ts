/**
 * BMO Instant Payments calls. SERVER ONLY. Never throws; every call has a timeout.
 * Headers from BMO's spec (Instant Payments - CA 4.3.1): Authorization (OAuth), x-api-key, x-client-id,
 * x-request-id, x-fapi-interaction-id, x-fapi-financial-id "001", x-crypto-key (encrypted payloads),
 * true-client-ip (BMO_TRUE_CLIENT_IP, only if BMO asks for it: their edge normally fills it).
 */
import { randomUUID } from "node:crypto";
import { bmoApiBaseUrl, bmoSettings } from "./config.server";
import { decryptFromBmo, encryptForBmo } from "./crypto";
import {
  buildRequestForPayment,
  buildRequestStatusQuery,
  readPaymentStatus,
  readRequestReply,
  type PaymentStatus,
  type RequestForPaymentInput,
  type RequestReply,
} from "./messages";
import { bmoAccessToken } from "./oauth.server";

const TIMEOUT_MS = 15_000;
const PATHS = {
  requestMoney: "/tpp/interac-etransfer/payment-initiation/creditor-payment-activation-request",
  requestStatus: "/tpp/interac-etransfer/payment-initiation/get-request-for-payment-transaction",
} as const;

export type BmoFailure = { ok: false; detail: string; needsConnect?: boolean; retryable: boolean };

/** BMO's error body without personal data: Problem title / detail, numbers and e-mails masked. */
function problemDetail(status: number, json: unknown, text: string): string {
  const p = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  const raw =
    [p["title"], p["detail"], p["code"], p["message"], p["error"]]
      .filter((v): v is string => typeof v === "string" && v.trim() !== "")
      .join(" · ") || text.replace(/<[^>]*>/g, " ").trim();
  const masked = raw
    .replace(/[^\s@]+@[^\s@]+/g, "[email]")
    .replace(/\d{5,}/g, "[number]")
    .replace(/\s+/g, " ");
  return `HTTP ${status}${masked ? ` · ${masked.slice(0, 200)}` : ""}`;
}

async function post(
  path: string,
  message: unknown,
): Promise<{ ok: true; message: unknown } | BmoFailure> {
  const s = bmoSettings();
  const token = await bmoAccessToken();
  if (!token)
    return {
      ok: false,
      detail: "BMO is not connected (tap Connect BMO)",
      needsConnect: true,
      retryable: false,
    };
  let body: unknown;
  let cryptoKey: string | null = null;
  try {
    if (s.encrypt) {
      const sealed = encryptForBmo(message, {
        publicKeyPem: s.bmoPublicKey!,
        keyId: s.bmoKeyId!,
        oaepHash: s.oaepHash,
      });
      body = sealed.body;
      cryptoKey = sealed.cryptoKey;
    } else {
      body = { SECURE: { encrypted: false, data: message } };
    }
  } catch (error) {
    return {
      ok: false,
      detail: `payload not encrypted (${(error as Error).name}): check BMO_ENCRYPTION_PUBLIC_KEY`,
      retryable: false,
    };
  }
  const requestId = randomUUID();
  const clientIp = process.env["BMO_TRUE_CLIENT_IP"]?.trim();
  try {
    const res = await fetch(`${bmoApiBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-api-key": s.apiKey,
        "x-client-id": s.clientId,
        "x-request-id": requestId,
        "x-fapi-interaction-id": requestId,
        "x-fapi-financial-id": "001",
        ...(cryptoKey ? { "x-crypto-key": cryptoKey } : {}),
        ...(clientIp ? { "true-client-ip": clientIp } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text().catch(() => "");
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    if (!res.ok) {
      return {
        ok: false,
        detail: problemDetail(res.status, json, text),
        needsConnect: res.status === 401,
        retryable: res.status === 429 || res.status >= 500,
      };
    }
    const opened = decryptFromBmo(json, res.headers.get("x-crypto-key"), s.privateKey, s.oaepHash);
    // An answer we cannot open is still an answer: the request may have gone out. Never resend blindly.
    if (!opened.ok)
      return { ok: false, detail: `BMO answer not readable (${opened.error})`, retryable: false };
    return { ok: true, message: opened.message };
  } catch (error) {
    const name = error instanceof Error ? error.name : "error";
    return { ok: false, detail: `no answer from BMO (${name})`, retryable: true };
  }
}

/** Request money (pain.013 → pain.014). */
export async function sendBmoRequestForPayment(
  input: RequestForPaymentInput,
): Promise<{ ok: true; reply: RequestReply } | BmoFailure> {
  let message: ReturnType<typeof buildRequestForPayment>;
  try {
    message = buildRequestForPayment(input);
  } catch (error) {
    return { ok: false, detail: (error as Error).message, retryable: false };
  }
  const r = await post(PATHS.requestMoney, message);
  if (!r.ok) return r;
  const reply = readRequestReply(r.message);
  return reply
    ? { ok: true, reply }
    : { ok: false, detail: "BMO answer has no request status", retryable: false };
}

/** Status of one request (camt.005 → pain.002). */
export async function getBmoRequestStatus(
  endToEndId: string,
  now = new Date(),
): Promise<{ ok: true; statuses: PaymentStatus[] } | BmoFailure> {
  const messageId =
    `PPPQ${now.getTime().toString(36)}${randomUUID().replace(/-/g, "").slice(0, 8)}`.toUpperCase();
  const r = await post(
    PATHS.requestStatus,
    buildRequestStatusQuery({ messageId, endToEndId, now }),
  );
  return r.ok ? { ok: true, statuses: readPaymentStatus(r.message) } : r;
}
