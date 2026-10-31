/**
 * The restaurant's own driver: no fee, no API. SERVER ONLY.
 *
 * Staff pick a saved driver (PPP_OWN_DRIVERS, plus drivers used on recent orders) or type a name + phone.
 * When Twilio is configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER) the driver gets one
 * text with the pickup and drop-off; otherwise nothing is sent and the screen says so.
 * Twilio Messages API: POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json, HTTP Basic
 * (Account SID : Auth Token), form fields To, From, Body; 201 = queued
 * (https://www.twilio.com/docs/messaging/api/message-resource#create-a-message-resource).
 */
import { addressOneLine, dropoffNote, toE164, truncate } from "./address";
import { courierFetch, refusalDetail } from "./http.server";
import type { CourierRequest } from "./types";

export interface SavedDriver {
  name: string;
  phone: string;
}

/** "Ali:+15145550100;Marc:514-555-0101" → saved drivers with E.164 phones. Invalid entries are skipped. */
export function parseSavedDrivers(raw: string | undefined): SavedDriver[] {
  if (!raw) return [];
  const out: SavedDriver[] = [];
  for (const entry of raw.split(/[;\n]/)) {
    const at = entry.lastIndexOf(":");
    if (at <= 0) continue;
    const name = entry.slice(0, at).trim().slice(0, 60);
    const phone = toE164(entry.slice(at + 1));
    if (name && phone && !out.some((d) => d.phone === phone)) out.push({ name, phone });
    if (out.length >= 20) break;
  }
  return out;
}

export function configuredDrivers(): SavedDriver[] {
  return parseSavedDrivers(process.env["PPP_OWN_DRIVERS"]);
}

function twilioKeys(): { sid: string; token: string; from: string } | null {
  const sid = process.env["TWILIO_ACCOUNT_SID"]?.trim() ?? "";
  const token = process.env["TWILIO_AUTH_TOKEN"]?.trim() ?? "";
  const from = process.env["TWILIO_FROM_NUMBER"]?.trim() ?? "";
  if (!sid || !token || !from) return null;
  return { sid, token, from };
}

export function driverSmsConfigured(): boolean {
  return twilioKeys() !== null;
}

/** The one text a driver gets. Customer name + phone are what a driver needs to deliver. */
export function driverMessage(request: CourierRequest): string {
  const note = dropoffNote(request.dropoff.address);
  return truncate(
    [
      `PPP ${request.orderNumber} — livraison / delivery`,
      `Ramassage / Pickup: ${addressOneLine(request.pickup.address)}`,
      `Client: ${request.dropoff.contactName} ${request.dropoff.phoneE164}`,
      `Adresse / Drop-off: ${addressOneLine(request.dropoff.address)}`,
      note ? `Note: ${note}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    1200,
  );
}

export type DriverSmsResult = { sent: true } | { sent: false; reason: string };

export async function textDriver(toPhone: string, body: string): Promise<DriverSmsResult> {
  const k = twilioKeys();
  if (!k) return { sent: false, reason: "Texting is not set up (Twilio)." };
  const res = await courierFetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(k.sid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${k.sid}:${k.token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toPhone, From: k.from, Body: body }).toString(),
    },
  );
  if (res.status === 201 || res.status === 200) return { sent: true };
  return {
    sent: false,
    reason: `Text not sent (${refusalDetail(res.status, res.json)})`,
  };
}
