import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * There is nothing to create: a verified mobile number IS the PPP account (Food Hub creates the customer on
 * the first verified code). No password exists anywhere, so this address goes straight to phone sign-in.
 */
export const Route = createFileRoute("/account_/sign-up")({
  beforeLoad: () => {
    throw redirect({ to: "/account/sign-in", search: { returnTo: "/account" } });
  },
  component: () => null,
});
