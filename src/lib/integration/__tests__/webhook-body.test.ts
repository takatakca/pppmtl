import { describe, expect, it } from "vitest";
import {
  MAX_WEBHOOK_BYTES,
  readBoundedWebhookBody,
  WebhookBodyTooLargeError,
} from "../core/webhook-body.server";
import { handleCloverHostedCheckoutWebhook } from "../providers/clover/webhook";

const endpoint = "https://pppmtl.com/api/public/webhooks/clover";

describe("public webhook body limits", () => {
  it("accepts a small raw payload without changing its signature bytes", async () => {
    const raw = '{"status":"APPROVED","note":"é"}';
    const request = new Request(endpoint, { method: "POST", body: raw });
    expect(await readBoundedWebhookBody(request)).toBe(raw);
  });

  it("rejects an oversized streamed payload without trusting Content-Length", async () => {
    const request = new Request(endpoint, {
      method: "POST",
      body: "x".repeat(MAX_WEBHOOK_BYTES + 1),
    });
    await expect(readBoundedWebhookBody(request)).rejects.toBeInstanceOf(WebhookBodyTooLargeError);
  });

  it("rejects an oversized declared Content-Length immediately", async () => {
    const request = new Request(endpoint, {
      method: "POST",
      headers: { "content-length": String(MAX_WEBHOOK_BYTES + 1) },
      body: "short",
    });
    await expect(readBoundedWebhookBody(request)).rejects.toBeInstanceOf(WebhookBodyTooLargeError);
  });

  it("rejects giant unsigned Clover webhook requests with HTTP 413", async () => {
    const response = await handleCloverHostedCheckoutWebhook(
      new Request(endpoint, {
        method: "POST",
        body: "x".repeat(MAX_WEBHOOK_BYTES + 1),
      }),
    );
    expect(response.status).toBe(413);
  });
});
