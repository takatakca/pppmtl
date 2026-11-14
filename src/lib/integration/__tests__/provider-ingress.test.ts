import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_WEBHOOK_BYTES } from "../core/webhook-body.server";
import { Route } from "@/routes/api/public/webhooks/provider";

const endpoint = "https://pppmtl.com/api/public/webhooks/provider?provider=urbanpiper";

/** Exercise the actual public route without sending a network request. */
const route = Route as unknown as {
  options: {
    server: {
      handlers: {
        POST: (context: { request: Request }) => Promise<Response>;
      };
    };
  };
};
const post = route.options.server.handlers.POST;

afterEach(() => vi.unstubAllEnvs());

describe("UrbanPiper public webhook ingress safety", () => {
  it("rejects unsigned oversized bodies before HMAC or JSON parsing", async () => {
    vi.stubEnv("URBANPIPER_WEBHOOK_SECRET", "unit-test-only-urbanpiper-secret");
    const response = await post({
      request: new Request(endpoint, {
        method: "POST",
        body: "x".repeat(MAX_WEBHOOK_BYTES + 1),
      }),
    });
    expect(response.status).toBe(413);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects a false Content-Length larger than the limit before reading", async () => {
    vi.stubEnv("URBANPIPER_WEBHOOK_SECRET", "unit-test-only-urbanpiper-secret");
    const response = await post({
      request: new Request(endpoint, {
        method: "POST",
        headers: { "content-length": String(MAX_WEBHOOK_BYTES + 1) },
        body: "small",
      }),
    });
    expect(response.status).toBe(413);
  });

  it("still rejects a small payload with no verified HMAC", async () => {
    vi.stubEnv("URBANPIPER_WEBHOOK_SECRET", "unit-test-only-urbanpiper-secret");
    const response = await post({
      request: new Request(endpoint, {
        method: "POST",
        body: JSON.stringify({ event: "ORDER_ACCEPTED", order_id: "O1" }),
      }),
    });
    expect(response.status).toBe(401);
  });
});
