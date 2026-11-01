/**
 * One text message through Twilio. SERVER ONLY.
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER (the same keys the driver texts use)
 * Twilio Messages API: POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json, HTTP Basic
 * (https://www.twilio.com/docs/messaging/api/message-resource#create-a-message-resource). Never throws.
 */
export function smsConfigured(): boolean {
  return Boolean(
    process.env["TWILIO_ACCOUNT_SID"]?.trim() &&
    process.env["TWILIO_AUTH_TOKEN"]?.trim() &&
    process.env["TWILIO_FROM_NUMBER"]?.trim(),
  );
}

/** "(514) 555-0100" → "+15145550100"; already international numbers are kept. */
export function e164(phone: string): string | null {
  const t = phone.trim();
  if (/^\+[1-9]\d{6,14}$/.test(t.replace(/[\s().-]/g, ""))) return t.replace(/[\s().-]/g, "");
  const d = t.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `+1${d}` : null;
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env["TWILIO_ACCOUNT_SID"]?.trim();
  const token = process.env["TWILIO_AUTH_TOKEN"]?.trim();
  const from = process.env["TWILIO_FROM_NUMBER"]?.trim();
  const number = e164(to);
  if (!sid || !token || !from || !number) return false;
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: number, From: from, Body: body.slice(0, 1200) }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    return res.status === 201 || res.status === 200;
  } catch {
    return false;
  }
}
