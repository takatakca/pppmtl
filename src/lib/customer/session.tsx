import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authRepository, customerRepository } from "./repositories";
import type { CustomerProfile, RestaurantCustomer } from "./types";

/**
 * Customer identity state machine for the /account experience.
 *
 *   loading ──▶ signed_out            (no session cookie, or Food Hub not configured)
 *           └─▶ onboarding            (verified phone, no name yet)
 *                    └─▶ member       (name set)
 *
 * The machine is driven entirely by the customer repository (Food Hub through server functions). A verified
 * phone IS the account; `accountsAvailable` is a runtime fact from the server (Food Hub configured), so every
 * sign-in entry point stays honest while it is not.
 */
export type CustomerSessionStatus = "loading" | "signed_out" | "onboarding" | "member";

interface CustomerSession {
  status: CustomerSessionStatus;
  customer: RestaurantCustomer | null;
  /** Addresses, favourites, loyalty, gift cards and Food Hub orders of the signed-in customer. */
  profile: CustomerProfile | null;
  /** False while Food Hub is not configured on this server: sign-in entry points stay honest. */
  accountsAvailable: boolean;
  /** Why the last refresh could not load a profile (Food Hub unreachable, customer routes not deployed…). */
  notice: string | null;
  refresh: () => Promise<void>;
  lockPreferredName: (name: string) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<CustomerSession | null>(null);

function statusFor(customer: RestaurantCustomer | null): CustomerSessionStatus {
  if (!customer) return "signed_out";
  return customer.preferredNameLockedAt ? "member" : "onboarding";
}

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CustomerSessionStatus>("loading");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [accountsAvailable, setAccountsAvailable] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await customerRepository.profile();
      setAccountsAvailable(Boolean(result.accountsEnabled));
      const next = result.ok ? result.data : null;
      setProfile(next);
      setStatus(statusFor(next?.customer ?? null));
      setNotice(result.ok || result.code === "signed_out" ? null : result.message);
    } catch {
      // The server function itself failed (network): stay signed out, never invent a session.
      setProfile(null);
      setStatus("signed_out");
      setNotice("We could not check your session. Please try again.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<CustomerSession>(
    () => ({
      status,
      customer: profile?.customer ?? null,
      profile,
      accountsAvailable,
      notice,
      refresh,
      lockPreferredName: async (name: string) => {
        const result = await customerRepository.lockPreferredName(name);
        if (!result.ok) return { ok: false, message: result.message };
        setProfile((current) => (current ? { ...current, customer: result.data } : current));
        setStatus(statusFor(result.data));
        return { ok: true };
      },
      signOut: async () => {
        await authRepository.signOut().catch(() => undefined);
        setProfile(null);
        setStatus("signed_out");
      },
    }),
    [status, profile, accountsAvailable, notice, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCustomerSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCustomerSession must be used inside CustomerSessionProvider");
  return ctx;
}
