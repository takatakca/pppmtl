/**
 * The customer session cookie. SERVER ONLY.
 *
 * `ppp_customer` holds the Food Hub-signed customer token and nothing else: HttpOnly (no script can read it),
 * Secure in production, SameSite=Lax, 30 days (the token's own lifetime). The site keeps no customer database;
 * the token is the whole session, and Food Hub can void it at any time (logout = tokenVersion++).
 */
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { customerTokenExpired, isCustomerToken } from "./token";

export const CUSTOMER_COOKIE = "ppp_customer";
export const CUSTOMER_COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60;

export interface CustomerCookies {
  read(): string | null;
  write(token: string): void;
  clear(): void;
}

/** The token from the request cookie, or null when absent, malformed or already expired. */
export function readCustomerToken(): string | null {
  const value = getCookie(CUSTOMER_COOKIE);
  if (!isCustomerToken(value) || customerTokenExpired(value)) return null;
  return value;
}

export function writeCustomerToken(token: string): void {
  if (!isCustomerToken(token)) throw new Error("Refusing to store a malformed customer token");
  setCookie(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_COOKIE_MAX_AGE_S,
  });
}

export function clearCustomerToken(): void {
  deleteCookie(CUSTOMER_COOKIE, { path: "/" });
}

/** The real cookie jar for server functions; tests pass an in-memory one. */
export const requestCustomerCookies: CustomerCookies = {
  read: readCustomerToken,
  write: writeCustomerToken,
  clear: clearCustomerToken,
};
