/**
 * Bounded raw webhook payload reader. SERVER ONLY.
 *
 * A public webhook must reject an oversized request before computing HMAC or
 * JSON parsing. Content-Length is advisory; the byte counter enforces the
 * limit even for chunked traffic with a missing/false Content-Length header.
 */
export const MAX_WEBHOOK_BYTES = 128 * 1024;

export class WebhookBodyTooLargeError extends Error {
  constructor() {
    super("Webhook body exceeds the maximum size");
    this.name = "WebhookBodyTooLargeError";
  }
}

export async function readBoundedWebhookBody(
  request: Request,
  maxBytes = MAX_WEBHOOK_BYTES,
): Promise<string> {
  const length = request.headers.get("content-length");
  if (length && /^\d+$/.test(length) && Number(length) > maxBytes) {
    throw new WebhookBodyTooLargeError();
  }

  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const part = await reader.read();
    if (part.done) break;
    received += part.value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new WebhookBodyTooLargeError();
    }
    chunks.push(part.value);
  }

  return Buffer.concat(chunks).toString("utf8");
}
