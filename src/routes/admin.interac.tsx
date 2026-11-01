import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Landmark, Send, XCircle } from "lucide-react";
import { signOutAdmin } from "@/lib/security/admin.functions";
import {
  getInteracBoard,
  updateInteracOrder,
  type BmoBoardStatus,
  type InteracBoardRow,
} from "@/lib/payments/interac.functions";

/**
 * Kitchen tablet: Interac e-Transfer orders (manual). Staff send "Request money" from the restaurant's bank app for
 * the amount shown, tap "Request sent", and tap "Paid" when the money arrives: the order then goes to Clover and
 * prints in the kitchen (src/lib/payments/interac.server.ts).
 */
export const Route = createFileRoute("/admin/interac")({
  head: () => ({
    meta: [
      { title: "Interac orders | PPP internal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InteracScreen,
});

const POLL_MS = 15_000;
const STAFF_KEY = "ppp.dispatch.staffName";
const BTN =
  "inline-flex min-h-14 items-center justify-center gap-2 px-5 py-3 text-base font-semibold uppercase tracking-wide focus-ppp disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARY = `${BTN} bg-primary text-primary-foreground`;
const BTN_OUTLINE = `${BTN} border border-border bg-background`;

const money = (cents: number) =>
  (cents / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
const clock = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" }) : "—";

const STATUS: Record<InteracBoardRow["interac"]["status"], { label: string; tone: string }> = {
  awaiting_request: { label: "Send the request", tone: "border-primary text-primary" },
  requested: { label: "Request sent — waiting for the money", tone: "border-accent text-accent" },
  paid: { label: "Paid — sending to kitchen", tone: "border-border" },
  sent_to_kitchen: { label: "Paid · in the kitchen", tone: "border-emerald-500 text-emerald-400" },
  kitchen_failed: {
    label: "Paid · NOT in the kitchen",
    tone: "border-destructive text-destructive",
  },
  cancelled: { label: "Cancelled", tone: "border-border text-muted-foreground" },
};

/** BMO's ISO status in words for the tablet. */
const BMO_STATUS: Record<string, string> = {
  sending: "sending…",
  ACTC: "request sent to the customer",
  ACSP: "payment in progress",
  ACSC: "money received",
  ACCC: "money received",
  RJCT: "refused",
  CANC: "cancelled or expired",
  error: "not sent",
};

const CONNECT_MESSAGES: Record<string, string> = {
  connected: "BMO connected: Interac requests now go out automatically.",
  cancelled: "BMO connection cancelled.",
  failed: "BMO connection failed. Try again, or check the BMO settings.",
  not_configured: "BMO settings are missing in Coolify (see the list above).",
};

function staffName(): string {
  try {
    return window.localStorage.getItem(STAFF_KEY) ?? "";
  } catch {
    return "";
  }
}

function InteracScreen() {
  const [orders, setOrders] = useState<InteracBoardRow[] | null>(null);
  const [bmo, setBmo] = useState<BmoBoardStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const board = await getInteracBoard();
      setOrders(board.orders);
      setBmo(board.bmo);
      setDenied(false);
    } catch {
      setDenied(true);
    }
  }, []);

  useEffect(() => {
    const outcome = new URLSearchParams(window.location.search).get("bmo");
    if (outcome && CONNECT_MESSAGES[outcome]) setNotice(CONNECT_MESSAGES[outcome]);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const act = async (
    order: InteracBoardRow,
    action: "requested" | "paid" | "retry" | "cancel" | "bmo",
  ) => {
    if (
      action === "paid" &&
      !window.confirm(`Confirm ${money(order.interac.amount)} received for ${order.orderNumber}?`)
    ) {
      return;
    }
    if (action === "cancel" && !window.confirm(`Cancel ${order.orderNumber}? (Not paid.)`)) return;
    if (
      action === "bmo" &&
      order.interac.bmo?.status === "sending" &&
      !window.confirm("BMO may already have sent this request. Check BMO first. Send another one?")
    ) {
      return;
    }
    setBusy(order.id);
    setMessage(null);
    try {
      const r = await updateInteracOrder({ data: { orderId: order.id, action, by: staffName() } });
      if (!r.ok) setMessage(r.error);
    } catch {
      setMessage("Not saved. Check the connection and sign-in, then try again.");
    } finally {
      setBusy(null);
      await load();
    }
  };

  return (
    <main className="min-h-dvh bg-background px-3 py-4 text-foreground sm:px-6">
      <header className="flex flex-wrap items-center gap-3 border border-border bg-card p-4">
        <div className="mr-auto">
          <p className="font-display text-xs uppercase tracking-[0.35em] text-accent">
            PPP internal
          </p>
          <h1 className="font-display text-3xl uppercase leading-none sm:text-4xl">
            Interac orders
          </h1>
        </div>
        <Link to="/admin/dispatch" className={`${BTN_OUTLINE} min-h-12 text-sm`}>
          Couriers
        </Link>
        <Link to="/admin/orders" className={`${BTN_OUTLINE} min-h-12 text-sm`}>
          Orders
        </Link>
        <button
          type="button"
          className={`${BTN_OUTLINE} min-h-12 text-sm`}
          onClick={async () => {
            await signOutAdmin();
            window.location.assign("/admin/sign-in");
          }}
        >
          Sign out
        </button>
      </header>

      {bmo && (
        <section className="mt-3 flex flex-wrap items-center gap-3 border border-border bg-card p-4">
          <p className="mr-auto text-lg">
            <span className="font-semibold">BMO automatic requests: </span>
            {!bmo.configured
              ? `off — missing ${bmo.missing.join(", ")}`
              : bmo.connected
                ? "on (requests go out by themselves; Paid is automatic)"
                : "not connected"}
          </p>
          {bmo.configured && (
            <a href="/auth/bmo/connect" className={`${BTN_OUTLINE} min-h-12 text-sm`}>
              {bmo.connected ? "Reconnect BMO" : "Connect BMO"}
            </a>
          )}
        </section>
      )}

      {notice && (
        <p role="status" className="mt-3 border-2 border-primary bg-card p-4 text-lg">
          {notice}
        </p>
      )}

      {denied && (
        <p className="mt-3 flex items-center gap-2 border border-border bg-card p-4 text-lg">
          <AlertTriangle className="h-5 w-5" /> Access denied or unavailable.{" "}
          <a href="/admin/sign-in?next=/admin/interac" className="underline">
            Sign in
          </a>
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 border-2 border-destructive bg-card p-4 text-lg">
          {message}
        </p>
      )}
      {orders && orders.length === 0 && (
        <p className="mt-3 border border-dashed border-border bg-card p-8 text-center text-lg text-muted-foreground">
          No Interac orders in the last 3 days.
        </p>
      )}

      <ul className="mt-3 grid gap-3 xl:grid-cols-2">
        {orders?.map((o) => {
          const s = STATUS[o.interac.status];
          const open = o.interac.status === "awaiting_request" || o.interac.status === "requested";
          return (
            <li key={o.id} className="border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl uppercase leading-none">
                    {o.orderNumber} · {o.orderType === "DELIVERY" ? "Delivery" : "Pickup"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Placed {clock(o.createdAt)}</p>
                </div>
                <p className="font-display text-4xl leading-none">{money(o.interac.amount)}</p>
              </div>
              <p
                className={`mt-3 inline-block border px-3 py-1 text-sm font-semibold uppercase ${s.tone}`}
              >
                {s.label}
              </p>
              <dl className="mt-3 grid gap-1 text-lg">
                <div>
                  <dt className="sr-only">Customer</dt>
                  <dd className="font-semibold">{o.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="inline text-muted-foreground">Request to: </dt>
                  <dd className="inline select-all font-mono">{o.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="inline text-muted-foreground">Phone: </dt>
                  <dd className="inline select-all font-mono">{o.phone ?? "—"}</dd>
                </div>
                {o.deliveryAddress && (
                  <div>
                    <dt className="inline text-muted-foreground">Address: </dt>
                    <dd className="inline">{o.deliveryAddress}</dd>
                  </div>
                )}
              </dl>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-muted-foreground">Ticket lines</summary>
                <ul className="mt-2 space-y-1">
                  {o.interac.lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>
                        {l.name}
                        {l.note && (
                          <span className="block text-xs text-muted-foreground">{l.note}</span>
                        )}
                      </span>
                      <span>{money(l.price)}</span>
                    </li>
                  ))}
                </ul>
              </details>
              {o.interac.bmo && (
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">BMO: </span>
                  {BMO_STATUS[o.interac.bmo.status] ?? o.interac.bmo.status}
                  {o.interac.bmo.reason ? ` (${o.interac.bmo.reason})` : ""}
                </p>
              )}
              {o.interac.error && (
                <p className="mt-2 text-sm text-destructive">{o.interac.error}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {o.interac.requestedAt && `Request sent ${clock(o.interac.requestedAt)} · `}
                {o.interac.paidAt && `Paid ${clock(o.interac.paidAt)} · `}
                {o.interac.by && `by ${o.interac.by}`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {open &&
                  bmo?.configured &&
                  bmo.connected &&
                  (!o.interac.bmo ||
                    ["error", "RJCT", "CANC", "sending"].includes(o.interac.bmo.status)) && (
                    <button
                      type="button"
                      disabled={busy === o.id}
                      onClick={() => void act(o, "bmo")}
                      className={BTN_PRIMARY}
                    >
                      <Send className="h-5 w-5" />{" "}
                      {o.interac.bmo ? "Send BMO request again" : "Send BMO request"}
                    </button>
                  )}
                {o.interac.status === "awaiting_request" && (
                  <button
                    type="button"
                    disabled={busy === o.id}
                    onClick={() => void act(o, "requested")}
                    className={BTN_OUTLINE}
                  >
                    <Send className="h-5 w-5" /> Request sent
                  </button>
                )}
                {open && (
                  <button
                    type="button"
                    disabled={busy === o.id}
                    onClick={() => void act(o, "paid")}
                    className={BTN_PRIMARY}
                  >
                    <CheckCircle2 className="h-5 w-5" /> Paid — send to kitchen
                  </button>
                )}
                {o.canRetry && (
                  <button
                    type="button"
                    disabled={busy === o.id}
                    onClick={() => void act(o, "retry")}
                    className={BTN_PRIMARY}
                  >
                    <Landmark className="h-5 w-5" /> Send to kitchen again
                  </button>
                )}
                {open && (
                  <button
                    type="button"
                    disabled={busy === o.id}
                    onClick={() => void act(o, "cancel")}
                    className={BTN_OUTLINE}
                  >
                    <XCircle className="h-5 w-5" /> Cancel
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
