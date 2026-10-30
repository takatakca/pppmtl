import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * No password exists in a PPP account (a verified mobile number is the account), so there is nothing to
 * reset: this address goes straight to phone sign-in.
 */
export const Route = createFileRoute("/account_/forgot-password")({
  beforeLoad: () => {
    throw redirect({ to: "/account/sign-in", search: { returnTo: "/account" } });
  },
  component: () => null,
});
