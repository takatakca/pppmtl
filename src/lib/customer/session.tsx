import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authRepository, backendEnabled, customerRepository } from "./repositories";
import type { RestaurantCustomer } from "./types";

/**
 * Customer identity state machine for the /account experience.
 *
 *   loading ──▶ signed_out            (no session)
 *           └─▶ onboarding            (session, preferred name not locked yet)
 *                    └─▶ member       (preferred name confirmed)
 *
 * The machine is driven entirely by the customer repository, so the exact
 * same UI runs once a real backend is connected. While `backendEnabled` is
 * false the repository reports `unavailable` and every customer lands in
 * `signed_out` — nothing is faked, nothing is stored locally.
 */
export type CustomerSessionStatus = "loading" | "signed_out" | "onboarding" | "member";

interface CustomerSession {
  status: CustomerSessionStatus;
  customer: RestaurantCustomer | null;
  /** False while there is no auth backend: sign-in entry points stay honest. */
  accountsAvailable: boolean;
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
  const [customer, setCustomer] = useState<RestaurantCustomer | null>(null);

  const refresh = useCallback(async () => {
    const result = await customerRepository.me();
    const next = result.ok ? result.data : null;
    setCustomer(next);
    setStatus(statusFor(next));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<CustomerSession>(
    () => ({
      status,
      customer,
      accountsAvailable: backendEnabled,
      refresh,
      lockPreferredName: async (name: string) => {
        const result = await customerRepository.lockPreferredName(name);
        if (!result.ok) return { ok: false, message: result.message };
        setCustomer(result.data);
        setStatus(statusFor(result.data));
        return { ok: true };
      },
      signOut: async () => {
        await authRepository.signOut();
        setCustomer(null);
        setStatus("signed_out");
      },
    }),
    [status, customer, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCustomerSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCustomerSession must be used inside CustomerSessionProvider");
  return ctx;
}
