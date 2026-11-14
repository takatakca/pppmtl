import { describe, expect, it } from "vitest";
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

// UrbanPiper is retired from PPP (PR #23): the route rejects every UrbanPiper
// call with 410 before the body is read, so the ingress-safety expectations
// below are stronger than the former HMAC-era ones — nothing is parsed,
// authenticated or allocated for this provider at all.
describe("UrbanPiper public webhook ingress safety (provider retired)", () => {
  it("rejects unsigned oversized bodies before any body read or parsing", async () => {
    const response = await post({
      request: new Request(endpoint, {
        method: "POST",
        body: "x".repeat(MAX_WEBHOOK_BYTES + 1),
      }),
    });
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects a false Content-Length larger than the limit before reading", async () => {
    const response = await post({
      request: new Request(endpoint, {
        method: "POST",
        headers: { "content-length": String(MAX_WEBHOOK_BYTES + 1) },
        body: "small",
      }),
    });
    expect(response.status).toBe(410);
  });

  it("rejects a small payload outright — no HMAC path exists for a retired provider", async () => {
    const response = await post({
      request: new Request(endpoint, {
        method: "POST",
        body: JSON.stringify({ event: "ORDER_ACCEPTED", order_id: "O1" }),
      }),
    });
    expect(response.status).toBe(410);
  });
});
