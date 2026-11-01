/** The customer's TAKATAK sign-in, as the checkout and account pages see it (no token ever reaches the browser). */
import { createServerFn } from "@tanstack/react-start";

export interface CustomerSessionView {
  /** "Continue with Google" via takatak.ca can be offered (the TAKATAK OAuth client is configured). */
  available: boolean;
  customer: { name: string | null; email: string | null; phone: string | null } | null;
}

export const getCustomerSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<CustomerSessionView> => {
    const { currentTakatakCustomer, takatakAuthConfigured } = await import("./takatak-auth.server");
    const customer = currentTakatakCustomer();
    return {
      available: takatakAuthConfigured(),
      customer: customer
        ? { name: customer.name, email: customer.email, phone: customer.phone }
        : null,
    };
  },
);
