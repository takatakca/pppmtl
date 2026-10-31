import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";
import { signOutAdmin } from "@/lib/security/admin.functions";
import {
  assignOwnDriverToOrder,
  bookCourierQuote,
  cancelCourierDispatch,
  findCourierOptions,
  getDispatchBoard,
  markCourierProgress,
  recordSkipCourier,
  refreshCourierDispatch,
  type DispatchBoard,
  type DispatchBoardRow,
  type DispatchResult,
  type DispatchView,
} from "@/lib/delivery/dispatch.functions";
import {
  COURIER_LABELS,
  DISPATCH_STATUS_LABELS,
  isTerminalDispatchStatus,
  type CourierBadge,
  type CourierOption,
} from "@/lib/delivery/couriers/types";
import { MAX_COURIER_TIP_CENTS } from "@/config/delivery-dispatch";

/**
 * Kitchen tablet: book a courier for a paid website delivery order.
 * DoorDash and Uber are quoted live, side by side with Skip (booked in Skip's portal) and the restaurant's own
 * driver. Nothing is simulated: a provider without credentials shows "Not connected" and no price.
 */
export const Route = createFileRoute("/admin/dispatch")({
  head: () => ({
    meta: [
      { title: "Courier dispatch | PPP internal" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Internal courier dispatch for PPP Pizzeria delivery orders.",
      },
    ],
  }),
  component: DispatchScreen,
});

const POLL_MS = 15_000;
const STAFF_KEY = "ppp.dispatch.staffName";
const BTN =
  "inline-flex min-h-14 items-center justify-center gap-2 px-5 py-3 text-base font-semibold uppercase tracking-wide focus-ppp disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARY = `${BTN} bg-primary text-primary-foreground`;
const BTN_OUTLINE = `${BTN} border border-border bg-background`;
const INPUT = "min-h-14 w-full border border-border bg-background px-4 text-lg focus-ppp";

function money(cents: number | null, currency: string | null = "CAD"): string {
  if (cents === null) return "—";
  return (cents / 100).toLocaleString("en-CA", { style: "currency", currency: currency || "CAD" });
}

function clock(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
}

function minutesFromNow(iso: string | null, now: number): string {
  if (!iso) return "";
  const min = Math.round((Date.parse(iso) - now) / 60_000);
  if (min <= 0) return "now";
  return `in ${min} min`;
}

function km(meters: number | null): string | null {
  if (meters === null) return null;
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

function readStaffName(): string {
  try {
    return window.localStorage.getItem(STAFF_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveStaffName(name: string): void {
  try {
    window.localStorage.setItem(STAFF_KEY, name);
  } catch {
    // Private mode: the name is simply not remembered.
  }
}

const BADGE_TEXT: Record<CourierBadge, string> = {
  cheapest: "Cheapest",
  fastest: "Fastest",
  closest: "Closest",
};

function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function DispatchScreen() {
  const [board, setBoard] = useState<DispatchBoard | null>(null);
  const [denied, setDenied] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");

  useEffect(() => setStaffName(readStaffName()), []);

  const load = useCallback(async () => {
    try {
      const next = await getDispatchBoard();
      setBoard(next);
      setDenied(false);
      setSelectedId((current) => {
        if (current && next.orders.some((o) => o.id === current)) return current;
        const waiting = next.orders.find(
          (o) =>
            o.eligible &&
            (!o.dispatch.active || isTerminalDispatchStatus(o.dispatch.active.status)),
        );
        return waiting?.id ?? next.orders[0]?.id ?? null;
      });
    } catch {
      setDenied(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const selected = board?.orders.find((o) => o.id === selectedId) ?? null;

  return (
    <main className="min-h-dvh bg-background px-3 py-4 text-foreground sm:px-6">
      <header className="flex flex-wrap items-center gap-3 border border-border bg-card p-4">
        <div className="mr-auto">
          <p className="font-display text-xs uppercase tracking-[0.35em] text-accent">
            PPP internal
          </p>
          <h1 className="font-display text-3xl uppercase leading-none sm:text-4xl">
            Courier dispatch
          </h1>
        </div>
        {board && <ProviderChips board={board} />}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Your name</span>
          <input
            value={staffName}
            maxLength={40}
            onChange={(e) => {
              setStaffName(e.target.value);
              saveStaffName(e.target.value);
            }}
            placeholder="Staff"
            className="min-h-12 w-36 border border-border bg-background px-3 text-base focus-ppp"
          />
        </label>
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

      {denied && (
        <p className="mt-3 flex items-center gap-2 border border-border bg-card p-4 text-lg">
          <AlertTriangle className="h-5 w-5" /> Access denied or unavailable.{" "}
          <a href="/admin/sign-in?next=/admin/dispatch" className="underline">
            Sign in
          </a>
        </p>
      )}

      {board && board.orders.length === 0 && (
        <p className="mt-3 border border-dashed border-border bg-card p-8 text-center text-lg text-muted-foreground">
          No delivery orders yet. Paid website delivery orders appear here.
        </p>
      )}

      {board && board.orders.length > 0 && (
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(17rem,24rem)_1fr]">
          <OrderList orders={board.orders} selectedId={selectedId} onSelect={setSelectedId} />
          {selected ? (
            <OrderPanel
              key={selected.id}
              order={selected}
              board={board}
              staffName={staffName}
              onChanged={load}
            />
          ) : (
            <p className="border border-border bg-card p-8 text-lg">Choose an order.</p>
          )}
        </div>
      )}
    </main>
  );
}

function ProviderChips({ board }: { board: DispatchBoard }) {
  return (
    <ul className="flex flex-wrap gap-2 text-xs uppercase tracking-widest">
      {board.providers.map((p) => (
        <li key={p.id} className="border border-border px-3 py-2">
          {p.label}:{" "}
          <span className={p.configured ? "text-foreground" : "text-muted-foreground"}>
            {p.configured ? (p.sandbox ? "test mode" : "connected") : "not connected"}
          </span>
        </li>
      ))}
      <li className="border border-border px-3 py-2">
        Driver texts:{" "}
        <span className={board.smsConfigured ? "text-foreground" : "text-muted-foreground"}>
          {board.smsConfigured ? "on" : "off"}
        </span>
      </li>
    </ul>
  );
}

function statusLine(row: DispatchBoardRow): string {
  const active = row.dispatch.active;
  if (active)
    return `${COURIER_LABELS[active.provider]} · ${DISPATCH_STATUS_LABELS[active.status]}`;
  if (!row.eligible) return row.eligibilityReason ?? "Not ready";
  return "Needs a driver";
}

function OrderList({
  orders,
  selectedId,
  onSelect,
}: {
  orders: DispatchBoardRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Delivery orders"
      className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible"
    >
      {orders.map((row) => {
        const active = row.dispatch.active;
        const needsDriver = row.eligible && (!active || isTerminalDispatchStatus(active.status));
        return (
          <button
            key={row.id}
            type="button"
            onClick={() => onSelect(row.id)}
            aria-current={row.id === selectedId ? "true" : undefined}
            className={`min-w-[15rem] border p-4 text-left focus-ppp lg:min-w-0 ${
              row.id === selectedId ? "border-primary bg-card" : "border-border bg-card/60"
            }`}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-display text-2xl uppercase">
                {row.orderNumber ?? row.id.slice(0, 12)}
              </span>
              <span className="text-sm text-muted-foreground">{clock(row.createdAt)}</span>
            </span>
            <span className="mt-1 block truncate text-base">{row.customerName ?? "—"}</span>
            <span className="block truncate text-sm text-muted-foreground">
              {row.deliveryAddress ?? "—"}
            </span>
            <span
              className={`mt-2 inline-block px-2 py-1 text-xs font-bold uppercase tracking-widest ${
                needsDriver ? "bg-accent text-accent-foreground" : "border border-border"
              }`}
            >
              {statusLine(row)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function OrderPanel({
  order,
  board,
  staffName,
  onChanged,
}: {
  order: DispatchBoardRow;
  board: DispatchBoard;
  staffName: string;
  onChanged: () => Promise<void>;
}) {
  const [options, setOptions] = useState<CourierOption[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [tip, setTip] = useState(() => ((order.tipCents ?? 0) / 100).toFixed(2));
  const now = useNow();
  const active = order.dispatch.active;
  const live = active && !isTerminalDispatchStatus(active.status);

  async function run<T>(
    label: string,
    action: () => Promise<DispatchResult<T>>,
    done?: (data: T) => void,
  ) {
    setBusy(label);
    setMessage(null);
    try {
      const result = await action();
      if (result.ok) {
        done?.(result.data);
      } else {
        setMessage({ ok: false, text: result.error });
      }
      await onChanged();
    } catch {
      setMessage({
        ok: false,
        text: "The server did not answer. Check the connection and try again.",
      });
    } finally {
      setBusy(null);
    }
  }

  const tipCents = Math.round(Number(tip.replace(",", ".")) * 100);
  const tipValid =
    Number.isSafeInteger(tipCents) && tipCents >= 0 && tipCents <= MAX_COURIER_TIP_CENTS;

  return (
    <section className="border border-border bg-card p-4 sm:p-6" aria-labelledby="order-title">
      <OrderSummary order={order} />

      {message && (
        <p
          role="alert"
          className={`mt-4 flex items-start gap-2 border p-4 text-lg ${
            message.ok ? "border-border" : "border-destructive text-destructive"
          }`}
        >
          {message.ok ? (
            <CheckCircle2 className="mt-1 h-5 w-5" />
          ) : (
            <XCircle className="mt-1 h-5 w-5" />
          )}
          {message.text}
        </p>
      )}

      {active && (
        <ActiveDispatch
          dispatch={order.dispatch}
          busy={busy}
          now={now}
          onRefresh={() =>
            run("refresh", () => refreshCourierDispatch({ data: { orderId: order.id } }))
          }
          onCancel={(reason) =>
            run("cancel", () =>
              cancelCourierDispatch({ data: { orderId: order.id, reason, staffName } }),
            )
          }
          onProgress={(status) =>
            run(status, () =>
              markCourierProgress({ data: { orderId: order.id, status, staffName } }),
            )
          }
        />
      )}

      {!order.eligible && (
        <p className="mt-5 flex items-center gap-2 border border-dashed border-border p-4 text-lg text-muted-foreground">
          <Clock className="h-5 w-5" /> {order.eligibilityReason}
        </p>
      )}

      {order.eligible && !live && (
        <div className="mt-5">
          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              className={`${BTN_PRIMARY} min-h-16 px-8 text-xl`}
              disabled={busy !== null}
              onClick={() =>
                run(
                  "find",
                  () => findCourierOptions({ data: { orderId: order.id, staffName } }),
                  (data) => setOptions(data.options),
                )
              }
            >
              <Truck className="h-6 w-6" />{" "}
              {busy === "find" ? "Asking couriers…" : options ? "Find again" : "Find a driver"}
            </button>
            <label className="text-sm">
              <span className="block text-muted-foreground">Courier tip (CAD)</span>
              <input
                inputMode="decimal"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                className={`${INPUT} w-32`}
                aria-invalid={!tipValid}
              />
            </label>
            {order.tipCents !== null && (
              <p className="pb-4 text-sm text-muted-foreground">
                Customer tipped {money(order.tipCents)}.
              </p>
            )}
          </div>
          {!order.addressReadable && (
            <p className="mt-3 text-base text-destructive">
              The address could not be read for DoorDash / Uber. Use your own driver or Skip, or
              check the address with the customer.
            </p>
          )}
          {options && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {options.map((option) =>
                option.provider === "own_driver" ? (
                  <OwnDriverCard
                    key={option.provider}
                    board={board}
                    busy={busy}
                    onAssign={(name, phone, sendText) =>
                      run("own", () =>
                        assignOwnDriverToOrder({
                          data: { orderId: order.id, name, phone, sendText, staffName },
                        }),
                      )
                    }
                  />
                ) : option.provider === "skip" ? (
                  <SkipCard
                    key={option.provider}
                    option={option}
                    busy={busy}
                    onRecord={(reference) =>
                      run("skip", () =>
                        recordSkipCourier({ data: { orderId: order.id, reference, staffName } }),
                      )
                    }
                  />
                ) : (
                  <QuoteCard
                    key={option.provider}
                    option={option}
                    now={now}
                    busy={busy}
                    tipCents={tipValid ? tipCents : null}
                    onBook={() => {
                      if (!option.quoteId || !tipValid) return;
                      const provider = option.provider === "uber" ? "uber" : "doordash";
                      void run(
                        "book",
                        () =>
                          bookCourierQuote({
                            data: {
                              orderId: order.id,
                              provider,
                              quoteId: option.quoteId ?? "",
                              tipCents,
                              staffName,
                            },
                          }),
                        () => setOptions(null),
                      );
                    }}
                  />
                ),
              )}
            </div>
          )}
        </div>
      )}

      {order.dispatch.history.length > 0 && (
        <details className="mt-6 text-sm">
          <summary className="cursor-pointer text-base">
            Earlier dispatches ({order.dispatch.history.length})
          </summary>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {order.dispatch.history.map((h) => (
              <li key={h.id}>
                {clock(h.chosenAt)} · {COURIER_LABELS[h.provider]} ·{" "}
                {DISPATCH_STATUS_LABELS[h.status]}
                {h.note ? ` — ${h.note}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function OrderSummary({ order }: { order: DispatchBoardRow }) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      <div className="min-w-0">
        <h2 id="order-title" className="font-display text-4xl uppercase leading-none">
          {order.orderNumber ?? order.id}
        </h2>
        <p className="mt-1 text-base text-muted-foreground">
          {clock(order.createdAt)} ·{" "}
          {order.paymentStatus === "PAID" ? "Paid online" : order.paymentStatus}
        </p>
      </div>
      <div className="min-w-0 text-lg">
        <p className="font-semibold">{order.customerName ?? "—"}</p>
        {order.customerPhone && (
          <a href={`tel:${order.customerPhone}`} className="flex items-center gap-2 underline">
            <Phone className="h-4 w-4" /> {order.customerPhone}
          </a>
        )}
        <p className="flex items-start gap-2">
          <MapPin className="mt-1 h-4 w-4 shrink-0" /> {order.deliveryAddress ?? "—"}
        </p>
      </div>
      <div className="text-base">
        <p>Food {money(order.subtotal)}</p>
        {order.deliveryFeeCents !== null && (
          <p>Delivery fee paid {money(order.deliveryFeeCents)}</p>
        )}
        {order.total !== null && <p className="font-semibold">Total paid {money(order.total)}</p>}
        <p className="text-muted-foreground">
          {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
        </p>
      </div>
    </div>
  );
}

function Badges({ badges }: { badges: CourierBadge[] }) {
  if (!badges.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <span
          key={b}
          className="bg-accent px-2 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground"
        >
          {BADGE_TEXT[b]}
        </span>
      ))}
    </span>
  );
}

function availabilityText(option: CourierOption): string {
  switch (option.availability) {
    case "available":
      return "Courier available now";
    case "busy":
      return "No courier free right now";
    case "not_connected":
      return "Not connected";
    case "manual":
      return "Book by hand";
    default:
      return "Not available";
  }
}

function QuoteCard({
  option,
  now,
  busy,
  tipCents,
  onBook,
}: {
  option: CourierOption;
  now: number;
  busy: string | null;
  tipCents: number | null;
  onBook: () => void;
}) {
  const expired = option.expiresAt !== null && Date.parse(option.expiresAt) <= now;
  const bookable = option.availability === "available" && option.quoteId !== null && !expired;
  return (
    <article
      className={`flex flex-col gap-3 border p-4 ${bookable ? "border-primary" : "border-border"}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-2xl uppercase">{option.label}</h3>
        <Badges badges={option.badges} />
      </header>
      {option.sandbox && (
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          Test mode — no real courier
        </p>
      )}
      <p className="text-4xl font-bold">
        {option.availability === "available" ? money(option.feeCents, option.currency) : "—"}
      </p>
      <p
        className={`text-lg ${option.availability === "available" ? "" : "text-muted-foreground"}`}
      >
        {availabilityText(option)}
      </p>
      {option.availability === "available" ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-base">
          <dt className="text-muted-foreground">Pickup</dt>
          <dd>
            {clock(option.pickupEta)} {minutesFromNow(option.pickupEta, now)}
          </dd>
          <dt className="text-muted-foreground">Drop-off</dt>
          <dd>
            {clock(option.dropoffEta)} {minutesFromNow(option.dropoffEta, now)}
          </dd>
          <dt className="text-muted-foreground">Distance</dt>
          <dd>{km(option.distanceMeters) ?? "not given before booking"}</dd>
          <dt className="text-muted-foreground">Quote</dt>
          <dd>{expired ? "expired — find again" : `valid until ${clock(option.expiresAt)}`}</dd>
        </dl>
      ) : (
        option.reason && <p className="text-sm text-muted-foreground">{option.reason}</p>
      )}
      {option.availability === "available" && (
        <button
          type="button"
          className={`${BTN_PRIMARY} mt-auto`}
          disabled={!bookable || busy !== null || tipCents === null}
          onClick={onBook}
        >
          {busy === "book"
            ? "Booking…"
            : `Book ${option.label} · ${money((option.feeCents ?? 0) + (tipCents ?? 0), option.currency)}`}
        </button>
      )}
    </article>
  );
}

function SkipCard({
  option,
  busy,
  onRecord,
}: {
  option: CourierOption;
  busy: string | null;
  onRecord: (reference: string) => void;
}) {
  const [reference, setReference] = useState("");
  return (
    <article className="flex flex-col gap-3 border border-border p-4">
      <h3 className="font-display text-2xl uppercase">{option.label}</h3>
      <p className="text-lg text-muted-foreground">Not available — book in the Skip portal</p>
      <p className="text-sm text-muted-foreground">
        Skip has no public courier API: no live price here. Book in Skip's portal, then record it so
        everyone sees who delivers.
      </p>
      {option.manualUrl && (
        <a href={option.manualUrl} target="_blank" rel="noreferrer" className={BTN_OUTLINE}>
          Open Skip portal <ExternalLink className="h-4 w-4" />
        </a>
      )}
      <input
        value={reference}
        maxLength={80}
        onChange={(e) => setReference(e.target.value)}
        placeholder="Skip reference (optional)"
        className={INPUT}
      />
      <button
        type="button"
        className={`${BTN_OUTLINE} mt-auto`}
        disabled={busy !== null}
        onClick={() => onRecord(reference)}
      >
        I booked it on Skip
      </button>
    </article>
  );
}

function OwnDriverCard({
  board,
  busy,
  onAssign,
}: {
  board: DispatchBoard;
  busy: string | null;
  onAssign: (name: string, phone: string | null, sendText: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sendText, setSendText] = useState(board.smsConfigured);
  return (
    <article className="flex flex-col gap-3 border border-border p-4">
      <h3 className="font-display text-2xl uppercase">My driver</h3>
      <p className="text-4xl font-bold">No fee</p>
      {board.savedDrivers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {board.savedDrivers.map((d) => (
            <button
              key={`${d.name}-${d.phone}`}
              type="button"
              onClick={() => {
                setName(d.name);
                setPhone(d.phone);
              }}
              className={`${BTN_OUTLINE} min-h-12 text-sm normal-case ${name === d.name ? "border-primary" : ""}`}
            >
              <Bike className="h-4 w-4" /> {d.name}
            </button>
          ))}
        </div>
      )}
      <input
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        placeholder="Driver name"
        className={INPUT}
      />
      <input
        value={phone}
        maxLength={40}
        inputMode="tel"
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Driver phone (514…)"
        className={INPUT}
      />
      <label className="flex min-h-12 items-center gap-3 text-base">
        <input
          type="checkbox"
          className="h-6 w-6"
          checked={sendText && board.smsConfigured}
          disabled={!board.smsConfigured}
          onChange={(e) => setSendText(e.target.checked)}
        />
        {board.smsConfigured
          ? "Text the driver the pickup and drop-off"
          : "Texting is not set up — tell the driver yourself"}
      </label>
      <button
        type="button"
        className={`${BTN_PRIMARY} mt-auto`}
        disabled={busy !== null || !name.trim()}
        onClick={() => onAssign(name, phone.trim() || null, sendText && board.smsConfigured)}
      >
        {busy === "own" ? "Saving…" : "Assign my driver"}
      </button>
    </article>
  );
}

function ActiveDispatch({
  dispatch,
  busy,
  now,
  onRefresh,
  onCancel,
  onProgress,
}: {
  dispatch: DispatchView;
  busy: string | null;
  now: number;
  onRefresh: () => void;
  onCancel: (reason: string) => void;
  onProgress: (status: "picked_up" | "delivered") => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const active = dispatch.active;
  const ended = active ? isTerminalDispatchStatus(active.status) : true;
  if (!active) return null;
  const api = active.provider === "doordash" || active.provider === "uber";
  const distance = km(active.courierDistanceMeters);
  return (
    <div className={`mt-5 border p-4 ${ended ? "border-border" : "border-primary"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            {COURIER_LABELS[active.provider]} · chosen {clock(active.chosenAt)} by {active.chosenBy}
            {active.sandbox ? " · test mode" : ""}
          </p>
          <p className="font-display text-3xl uppercase" aria-live="polite">
            {DISPATCH_STATUS_LABELS[active.status]}
          </p>
        </div>
        {active.trackingUrl && (
          <a href={active.trackingUrl} target="_blank" rel="noreferrer" className={BTN_OUTLINE}>
            Tracking <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-2 text-lg sm:grid-cols-2">
        {active.driver?.name && (
          <div>
            <dt className="text-sm text-muted-foreground">Courier</dt>
            <dd>
              {active.driver.name}
              {active.driver.vehicle ? ` · ${active.driver.vehicle}` : ""}
            </dd>
          </div>
        )}
        {active.driver?.phone && (
          <div>
            <dt className="text-sm text-muted-foreground">Courier phone</dt>
            <dd>
              <a className="underline" href={`tel:${active.driver.phone}`}>
                {active.driver.phone}
              </a>
            </dd>
          </div>
        )}
        {distance && (
          <div>
            <dt className="text-sm text-muted-foreground">Courier distance from the restaurant</dt>
            <dd>{distance}</dd>
          </div>
        )}
        {api && (
          <div>
            <dt className="text-sm text-muted-foreground">Pickup · drop-off</dt>
            <dd>
              {clock(active.pickupEta)} {minutesFromNow(active.pickupEta, now)} ·{" "}
              {clock(active.dropoffEta)} {minutesFromNow(active.dropoffEta, now)}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-sm text-muted-foreground">Cost to the restaurant</dt>
          <dd>
            {active.provider === "own_driver"
              ? "No fee"
              : active.feeCents === null
                ? "See the Skip portal"
                : `${money(active.feeCents, active.currency)}${active.tipCents ? ` + ${money(active.tipCents, active.currency)} tip` : ""}`}
          </dd>
        </div>
      </dl>
      {active.note && <p className="mt-3 text-base text-muted-foreground">{active.note}</p>}

      {!ended && (
        <div className="mt-4 flex flex-wrap gap-2">
          {api && (
            <button
              type="button"
              className={BTN_OUTLINE}
              disabled={busy !== null}
              onClick={onRefresh}
            >
              <RefreshCw className="h-5 w-5" />{" "}
              {busy === "refresh" ? "Checking…" : "Refresh status"}
            </button>
          )}
          {!api && (
            <>
              <button
                type="button"
                className={BTN_OUTLINE}
                disabled={busy !== null}
                onClick={() => onProgress("picked_up")}
              >
                Picked up
              </button>
              <button
                type="button"
                className={BTN_PRIMARY}
                disabled={busy !== null}
                onClick={() => onProgress("delivered")}
              >
                Delivered
              </button>
            </>
          )}
          {!confirming ? (
            <button
              type="button"
              className={`${BTN_OUTLINE} text-destructive`}
              disabled={busy !== null}
              onClick={() => setConfirming(true)}
            >
              {active.status === "booking" && active.provider === "uber" && !active.externalId
                ? "Release booking"
                : "Cancel courier"}
            </button>
          ) : (
            <div className="flex w-full flex-wrap items-center gap-2">
              <input
                value={reason}
                maxLength={200}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional)"
                className={`${INPUT} max-w-md`}
              />
              <button
                type="button"
                className={`${BTN} bg-destructive text-destructive-foreground`}
                disabled={busy !== null}
                onClick={() => {
                  setConfirming(false);
                  onCancel(reason);
                }}
              >
                {busy === "cancel" ? "Cancelling…" : "Yes, cancel"}
              </button>
              <button type="button" className={BTN_OUTLINE} onClick={() => setConfirming(false)}>
                Keep it
              </button>
            </div>
          )}
        </div>
      )}

      {active.events.length > 0 && (
        <ol className="mt-4 space-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
          {active.events
            .slice()
            .reverse()
            .slice(0, 8)
            .map((e, i) => (
              <li key={`${e.at}-${i}`}>
                {clock(e.at)} · {DISPATCH_STATUS_LABELS[e.status]}
                {e.detail ? ` — ${e.detail}` : ""}
              </li>
            ))}
        </ol>
      )}
    </div>
  );
}
