import { describe, expect, it } from "vitest";
import { unverifiedCheckoutCustomer } from "../guest-identity";

describe("guest checkout identity boundary", () => {
  it("strips unverified account identifiers while keeping fulfilment contact details", () => {
    const guest = unverifiedCheckoutCustomer({
      customerId: "other-customer-id",
      takatakCustomerId: "forged-master-id",
      name: "Sample Customer",
      phone: "5145550100",
      email: "customer@example.com",
      isGuest: false,
    });

    expect(guest).toEqual({
      customerId: null,
      takatakCustomerId: null,
      name: "Sample Customer",
      phone: "5145550100",
      email: "customer@example.com",
      isGuest: true,
    });
  });
});
