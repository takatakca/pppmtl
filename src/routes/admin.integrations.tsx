import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import { signOutAdmin } from "@/lib/security/admin.functions";
import {
  getIntegrationSnapshot,
  type IntegrationSnapshot,
} from "@/lib/integration/integrations.functions";
import { integrationRoadmap, providerPlans } from "@/config/integration-readiness";

export const Route = createFileRoute("/admin/integrations")({
  head: () => ({
    meta: [
      { title: "PPP / Food Hub integrations | Internal" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Internal PPP Pizzeria platform readiness." },
    ],
  }),
  component: IntegrationsAdmin,
});

function StatusIcon({ available }: { available: boolean }) {
  return available ? (
    <CheckCircle2 aria-label="Ready" className="h-4 w-4 shrink-0 text-primary" />
  ) : (
    <MinusCircle aria-label="Not connected" className="h-4 w-4 shrink-0 text-muted-foreground" />
  );
}

function IntegrationsAdmin() {
  const [snapshot, setSnapshot] = useState<IntegrationSnapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getIntegrationSnapshot()
      .then((data) => {
        if (active) setSnapshot(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-dvh bg-background px-4 py-10 sm:px-8">
      <header className="border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            PPP Pizzeria · TAKATAK
          </p>
          <button
            type="button"
            className="text-xs underline focus-ppp"
            onClick={async () => {
              await signOutAdmin();
              window.location.assign("/admin/sign-in");
            }}
          >
            Sign out
          </button>
        </div>
        <h1 className="mt-1 font-display text-4xl uppercase leading-none">
          Food Hub & integrations
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Our first-party restaurant platform. This screen only reports real capabilities; it cannot
          transmit orders, publish menus or enable payments.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-2 flex items-center gap-2 border border-border bg-card p-4 text-sm text-muted-foreground"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" /> Access denied or unavailable.{" "}
          <Link to="/admin/sign-in" className="underline focus-ppp">
            Sign in to operations
          </Link>
        </p>
      )}

      {snapshot && (
        <>
          <section
            className="mt-2 border border-border bg-card p-5"
            aria-label="Food Hub readiness"
          >
            <div className="flex items-start gap-3">
              <StatusIcon
                available={snapshot.foodhub.configured && snapshot.foodhub.reachable === true}
              />
              <div>
                <h2 className="font-display text-2xl uppercase leading-none">
                  TAKATAK Food Hub —{" "}
                  {!snapshot.foodhub.configured
                    ? "not configured"
                    : snapshot.foodhub.reachable
                      ? "connected"
                      : "configured, not reachable"}
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  {snapshot.foodhub.message}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>
                    Host: <code>{snapshot.foodhub.host ?? "—"}</code> · health:{" "}
                    <code>
                      {snapshot.foodhub.reachable === null
                        ? "not pinged"
                        : snapshot.foodhub.reachable
                          ? (snapshot.foodhub.health ?? "answered")
                          : "no answer"}
                    </code>{" "}
                    (public <code>GET /api/health</code>; no customer route is called)
                  </li>
                  <li>
                    Customer identity (phone sign-in):{" "}
                    {snapshot.foodhub.configured ? "served by Food Hub" : "closed"} · Interac
                    e-Transfer orders:{" "}
                    {snapshot.foodhub.interacEnabled
                      ? `on — fee $${snapshot.foodhub.interacFee.toFixed(2)}${snapshot.foodhub.interacFeeTaxable ? " + taxes" : ""}`
                      : "off (FOODHUB_INTERAC_ENABLED not set)"}
                  </li>
                  <li>
                    Website-order ingress: <code>{snapshot.foodhub.ingressPath}</code> · store
                    codes:{" "}
                    {Object.entries(snapshot.foodhub.locationCodes).map(([slug, code]) => (
                      <code key={slug} className="mr-2">
                        {slug}→{code}
                      </code>
                    ))}
                  </li>
                </ul>
                {!snapshot.foodhub.interacEnabled && (
                  <p className="mt-2 text-xs font-semibold text-destructive">
                    No Interac order is sent until the owner sets FOODHUB_INTERAC_ENABLED=true
                    (after Food Hub's Interac branch is deployed). Card orders go through Clover as
                    before.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-2 grid gap-2 lg:grid-cols-2">
            {snapshot.providers.map((p) => (
              <div key={p.provider} className="border border-border bg-card p-5">
                <h2 className="font-display text-2xl uppercase leading-none">{p.provider}</h2>
                <ul className="mt-3 space-y-2">
                  {p.capabilities.map((c) => (
                    <li key={c.capability} className="flex items-start gap-2 text-sm">
                      <StatusIcon available={c.available} />
                      <span>
                        <span className="uppercase tracking-wide">{c.capability}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.available ? "Active" : c.reasonEn}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section className="mt-2 border border-border bg-card p-5">
            <h2 className="font-display text-2xl uppercase leading-none">Store routing</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">PPP location</th>
                    <th className="py-2 pr-4">Menu</th>
                    <th className="py-2 pr-4">Order engine</th>
                    <th className="py-2">Connected store</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.locations.map((l) => (
                    <tr key={l.internalId} className="border-t border-border">
                      <td className="py-2 pr-4">
                        {l.name}
                        <span className="block font-mono text-[0.65rem] text-muted-foreground">
                          {l.internalId}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{l.menuSource}</td>
                      <td className="py-2 pr-4">{l.orderingProvider}</td>
                      <td className="py-2 text-muted-foreground">
                        {l.providerLocationId ?? "not mapped"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-2 grid gap-2 lg:grid-cols-2">
            <div className="border border-border bg-card p-5">
              <h2 className="font-display text-2xl uppercase leading-none">Server credentials</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Presence only; no secret values are exposed. Legacy vendor credentials are not used.
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {Object.entries(snapshot.credentials).map(([key, present]) => (
                  <li key={key} className="flex items-center gap-2">
                    <StatusIcon available={present} />
                    <span className="font-mono text-xs">{key}</span>
                    <span className="text-xs text-muted-foreground">
                      {present ? "set" : "not set"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-border bg-card p-5">
              <h2 className="font-display text-2xl uppercase leading-none">Recent events</h2>
              {snapshot.events.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No provider events received yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {snapshot.events.map((event) => (
                    <li key={event.id} className="border border-border p-3">
                      <p className="font-mono text-xs">{event.eventType}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.provider} · {event.status} · {event.receivedAt}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="mt-2 border border-border bg-card p-5">
            <h2 className="font-display text-2xl uppercase leading-none">
              Owner-controlled integration plan
            </h2>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {providerPlans.map((plan) => (
                <div key={plan.id} className="border border-border p-4">
                  <h3 className="font-display text-xl uppercase leading-none">{plan.label}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.role}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-accent">
                    PPP controls
                  </p>
                  <p className="text-sm">{plan.ppmOwns}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-accent">
                    Platform controls
                  </p>
                  <p className="text-sm">{plan.providerOwns}</p>
                  {plan.requiredCredentials.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {plan.requiredCredentials.map((key) => (
                        <li key={key} className="flex items-center gap-2">
                          <StatusIcon available={snapshot.credentials[key] === true} />
                          <code className="text-xs">{key}</code>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <h3 className="mt-5 text-sm font-semibold uppercase tracking-widest">
              Verification gates
            </h3>
            <ul className="mt-2 grid gap-2 md:grid-cols-2">
              {integrationRoadmap.map((item) => (
                <li key={item.label} className="border border-border p-3 text-sm">
                  {item.label}
                  <span className="block text-xs text-muted-foreground">{item.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
