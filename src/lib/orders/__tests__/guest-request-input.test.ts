import { describe, expect, it } from "vitest";
import {
  isGuestOrderCancelInput,
  isGuestOrderId,
  isGuestOrderListInput,
  isGuestOrderReadInput,
} from "../guest-request-input";

const orderId = "ord_checkout123";

describe("public guest order JSON boundary", () => {
  it("accepts only well-formed receipt IDs, without treating their format as authorization", () => {
    expect(isGuestOrderId(orderId)).toBe(true);
    for (const input of [null, 27, "", "ord_", "checkout123", "ord_../other", "ord_" + "x".repeat(81)]) {
      expect(isGuestOrderId(input), String(input)).toBe(false);
    }
  });

  it("rejects malformed read requests before a signed cookie lookup", () => {
    expect(isGuestOrderReadInput({ orderId })).toBe(true);
    for (const input of [null, undefined, [], 4, {}, { orderId: null }, { orderId: [] }]) {
      expect(isGuestOrderReadInput(input)).toBe(false);
    }
  });

  it("refuses missing, non-string or excessive cancellation reasons", () => {
    expect(isGuestOrderCancelInput({ orderId, reason: "" })).toBe(true);
    expect(isGuestOrderCancelInput({ orderId, reason: "Cancelled by guest" })).toBe(true);
    expect(isGuestOrderCancelInput({ orderId, reason: "x".repeat(240) })).toBe(true);
    for (const input of [
      null,
      { orderId },
      { orderId, reason: null },
      { orderId, reason: { note: "invalid" } },
      { orderId, reason: 10 },
      { orderId, reason: "x".repeat(241) },
      { orderId: "invalid", reason: "test" },
    ]) {
      expect(isGuestOrderCancelInput(input)).toBe(false);
    }
  });

  it("validates list filters but never treats them as a receipt permission", () => {
    expect(isGuestOrderListInput({ customerId: null, phone: null })).toBe(true);
    expect(isGuestOrderListInput({ customerId: "guest-1", phone: "(514) 555-0000" })).toBe(true);
    for (const input of [
      null,
      [],
      {},
      { customerId: null, phone: 123 },
      { customerId: null, phone: [] },
      { customerId: null, phone: "9".repeat(41) },
      { customerId: "x".repeat(129), phone: null },
      { customerId: {}, phone: null },
    ]) {
      expect(isGuestOrderListInput(input)).toBe(false);
    }
  });
});
