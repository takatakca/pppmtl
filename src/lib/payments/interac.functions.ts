/**
 * Interac e-Transfer server functions: the checkout's option, and the kitchen tablet (/admin/interac).
 * Every tablet function checks the administrator session first.
 */
import { createServerFn } from "@tanstack/react-start";
import type { InteracBoardRow, InteracResult } from "./interac.server";

export type { InteracBoardRow } from "./interac.server";

/** Offered at checkout only when switched on (INTERAC_REQUESTS_ENABLED). */
export const getInteracOption = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ available: boolean }> => {
    const { interacRequestsEnabled } = await import("./interac-config.server");
    return { available: interacRequestsEnabled() };
  },
);

const ORDER_ID = /^ord_[A-Za-z0-9_-]{5,80}$/;
type Action = "requested" | "paid" | "retry" | "cancel";

function parse(input: unknown): { orderId: string; action: Action; by: string } | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  const by = typeof o["by"] === "string" ? o["by"].replace(/\s+/g, " ").trim().slice(0, 40) : "";
  return typeof o["orderId"] === "string" &&
    ORDER_ID.test(o["orderId"]) &&
    (o["action"] === "requested" ||
      o["action"] === "paid" ||
      o["action"] === "retry" ||
      o["action"] === "cancel")
    ? { orderId: o["orderId"], action: o["action"], by: by || "staff" }
    : null;
}

export const getInteracBoard = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ generatedAt: string; orders: InteracBoardRow[] }> => {
    const { requireAdmin } = await import("@/lib/security/admin.server");
    requireAdmin();
    const { interacBoard } = await import("./interac.server");
    return { generatedAt: new Date().toISOString(), orders: await interacBoard() };
  },
);

export const updateInteracOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; action: Action; by?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean; error: string | null }> => {
    const { requireAdmin } = await import("@/lib/security/admin.server");
    requireAdmin();
    const request = parse(data);
    if (!request) return { ok: false, error: "Invalid request." };
    const s = await import("./interac.server");
    const run: Record<Action, (id: string, by: string) => Promise<InteracResult>> = {
      requested: s.markInteracRequested,
      paid: s.markInteracPaid,
      retry: s.retryInteracKitchen,
      cancel: s.cancelInterac,
    };
    const result = await run[request.action](request.orderId, request.by);
    return result.ok ? { ok: true, error: null } : { ok: false, error: result.error };
  });
