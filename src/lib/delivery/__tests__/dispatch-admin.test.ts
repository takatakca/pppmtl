/**
 * Every dispatch entry point requires the signed administrator session BEFORE reading input, the order store or
 * calling a courier.
 */
import { createHmac, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookie = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("@tanstack/react-start/server", () => ({
  getCookie: () => cookie.value,
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}));

import { resetOrderStoreForTests, saveOrder } from "@/lib/orders/order-store.server";
import * as handlers from "../dispatch-handlers.server";
import { clearCourierEnv, DD_ENV, mockFetch, paidDeliveryOrder, stubEnv } from "./fixtures";

const ACCESS = "access-token-is-long-enough-for-local-tests";
const SIGNING = "session-token-is-long-enough-for-local-tests";

function signedSession(): string {
  const until = Math.floor(Date.now() / 1000) + 600;
  const payload = `${until}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${createHmac("sha256", SIGNING).update(payload).digest("hex")}`;
}

beforeEach(() => {
  clearCourierEnv();
  resetOrderStoreForTests();
  stubEnv({ PPP_ADMIN_ACCESS_TOKEN: ACCESS, PPP_ADMIN_SESSION_SECRET: SIGNING, ...DD_ENV });
  cookie.value = undefined;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("dispatch requires an administrator", () => {
  const calls: Array<[string, () => Promise<unknown>]> = [
    ["board", () => handlers.adminDispatchBoard()],
    ["find", () => handlers.adminFindDrivers({ orderId: "ord_abcdef12345" })],
    [
      "book",
      () =>
        handlers.adminBookCourier({
          orderId: "ord_abcdef12345",
          provider: "doordash",
          quoteId: "q",
          tipCents: 0,
        }),
    ],
    [
      "own",
      () =>
        handlers.adminAssignOwnDriver({
          orderId: "ord_abcdef12345",
          name: "Ali",
          phone: null,
          sendText: false,
        }),
    ],
    ["skip", () => handlers.adminRecordSkip({ orderId: "ord_abcdef12345", reference: "" })],
    ["cancel", () => handlers.adminCancelDispatch({ orderId: "ord_abcdef12345", reason: "" })],
    ["refresh", () => handlers.adminRefreshDispatch({ orderId: "ord_abcdef12345" })],
    ["mark", () => handlers.adminMarkDispatch({ orderId: "ord_abcdef12345", status: "delivered" })],
  ];

  it.each(calls)("%s refuses without a session and never calls a courier", async (_name, call) => {
    const fetchCalls = mockFetch();
    await expect(call()).rejects.toMatchObject({ statusCode: 401 });
    expect(fetchCalls).toHaveLength(0);
  });

  it("refuses a forged or expired session cookie", async () => {
    cookie.value = `${Math.floor(Date.now() / 1000) + 600}.${"a".repeat(32)}.${"b".repeat(64)}`;
    await expect(handlers.adminDispatchBoard()).rejects.toMatchObject({ statusCode: 401 });
  });

  it("works with a valid session and still validates the untrusted input", async () => {
    cookie.value = signedSession();
    const order = saveOrder(paidDeliveryOrder());
    mockFetch(() => ({ status: 422, body: { code: "x", message: "outside coverage" } }));
    expect(await handlers.adminFindDrivers({ orderId: "../etc" })).toEqual({
      ok: false,
      error: "Invalid request.",
    });
    expect(
      await handlers.adminBookCourier({
        orderId: order.id,
        provider: "fedex",
        quoteId: "q",
        tipCents: 0,
      }),
    ).toEqual({ ok: false, error: "Invalid request." });
    expect(
      await handlers.adminBookCourier({
        orderId: order.id,
        provider: "doordash",
        quoteId: "q",
        tipCents: 1.5,
      }),
    ).toEqual({ ok: false, error: "Invalid request." });
    expect(
      await handlers.adminBookCourier({
        orderId: order.id,
        provider: "doordash",
        quoteId: "q",
        tipCents: 999_999,
      }),
    ).toEqual({ ok: false, error: "Invalid request." });
    const found = await handlers.adminFindDrivers({ orderId: order.id, staffName: "  Sam  " });
    expect(found).toMatchObject({ ok: true });
    const board = await handlers.adminDispatchBoard();
    expect(board.orders.map((o) => o.id)).toEqual([order.id]);
    expect(board.providers).toEqual([
      { id: "doordash", label: "DoorDash", configured: true, sandbox: false },
      { id: "uber", label: "Uber", configured: false, sandbox: false },
    ]);
  });
});
