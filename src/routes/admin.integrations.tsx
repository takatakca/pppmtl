import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import {
  getIntegrationSnapshot,
  type IntegrationSnapshot,
} from "@/lib/integration/integrations.functions";
import {
  integrationRoadmap,
  providerPlans,
  urbanPiperAccessChecklist,
} from "@/config/integration-readiness";

/**
 * Internal integrations status screen. Not a merchant dashboard: it only
 * reports what is truly configured. Nothing here is ever shown as connected
 * unless credentials AND a store mapping exist.
 */
export const Route = createFileRoute("/admin/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations status | PPP internal" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Internal provider integration status for PPP Pizzeria." },
      { property: "og:title", content: "Integrations status" },
      { property: "og:description", content: "Internal provider integration status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegrationsAdmin,
});

function StatusIcon({ available }: { available: boolean }) {
  return available ? (
    <CheckCircle2 className="h-4 w-4 text-primary" />
  ) : (
    <MinusCircle className="h-4 w-4 text-muted-foreground" />
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
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
          PPP internal
        </p>
        <h1 className="mt-1 font-display text-4xl uppercase leading-none">Integrations status</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Provider engines, store mapping and recent events. A capability shows as active only when
          real credentials and a store id exist.
        </p>
      </header>

      {error && (
        <p className="mt-2 flex items-center gap-2 border border-border bg-card p-4 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4" /> Status could not be loaded.
        </p>
      )}

      {snapshot && (
        <>
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
            <h2 className="font-display text-2xl uppercase leading-none">Location mapping</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Internal id</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Menu source</th>
                    <th className="py-2 pr-4">Ordering</th>
                    <th className="py-2">Provider store id</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.locations.map((l) => (
                    <tr key={l.internalId} className="border-t border-border">
                      <td className="py-2 pr-4 font-mono text-xs">{l.internalId}</td>
                      <td className="py-2 pr-4">{l.name}</td>
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
              <h2 className="font-display text-2xl uppercase leading-none">Credentials</h2>
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
                  {snapshot.events.map((e) => (
                    <li key={e.id} className="border border-border p-3">
                      <p className="font-mono text-xs">{e.eventType}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.provider} · {e.status} · {e.receivedAt}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="mt-2 border border-border bg-card p-5">
            <h2 className="font-display text-2xl uppercase leading-none">
              UrbanPiper menu sync
            </h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <StatusIcon available={snapshot.menuSync.connected} />
              {snapshot.menuSync.connected ? "Connected" : "Not connected"} ·{" "}
              {snapshot.menuSync.reason}
            </p>
            <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
              Mapping coverage: {snapshot.menuSync.coverage.categoriesMapped}/
              {snapshot.menuSync.coverage.categoriesTotal} categories ·{" "}
              {snapshot.menuSync.coverage.productsMapped} products ·{" "}
              {snapshot.menuSync.coverage.modifiersMapped} modifiers
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Store</th>
                    <th className="py-2 pr-4">Sync</th>
                    <th className="py-2 pr-4">Last run</th>
                    <th className="py-2 pr-4">Categories</th>
                    <th className="py-2 pr-4">Products</th>
                    <th className="py-2">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.menuSync.stores.map((s) => (
                    <tr key={s.internalId} className="border-t border-border align-top">
                      <td className="py-2 pr-4">
                        {s.name}
                        <span className="block font-mono text-[0.65rem] text-muted-foreground">
                          {s.internalId}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <StatusIcon available={s.connected} />
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {s.lastSyncAt ?? "never run"}
                        <span className="block uppercase tracking-widest">{s.lastStatus}</span>
                      </td>
                      <td className="py-2 pr-4">{s.categoriesReceived}</td>
                      <td className="py-2 pr-4">
                        {s.productsReceived}
                        <span className="block text-xs text-muted-foreground">
                          {s.itemsUpdated} published
                        </span>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {s.errors.length === 0 ? "—" : s.errors.slice(0, 3).join("; ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-2 border border-border bg-card p-5">
            <h2 className="font-display text-2xl uppercase leading-none">Provider comparison</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Planned division of responsibility. This is intent, not connection state.
            </p>
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              {providerPlans.map((p) => (
                <div key={p.id} className="border border-border p-4">
                  <h3 className="font-display text-xl uppercase leading-none">{p.label}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.role}</p>
                  <p className="mt-3 text-xs uppercase tracking-widest text-accent">PPP owns</p>
                  <p className="text-sm">{p.ppmOwns}</p>
                  <p className="mt-2 text-xs uppercase tracking-widest text-accent">Provider owns</p>
                  <p className="text-sm">{p.providerOwns}</p>
                  <p className="mt-2 text-xs uppercase tracking-widest text-accent">
                    Required credentials
                  </p>
                  {p.requiredCredentials.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None — storefront links only.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {p.requiredCredentials.map((key) => (
                        <li key={key} className="flex items-center gap-2">
                          <StatusIcon available={snapshot.credentials[key] === true} />
                          <span className="font-mono text-xs">{key}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-2 grid gap-2 lg:grid-cols-2">
            <div className="border border-border bg-card p-5">
              <h2 className="font-display text-2xl uppercase leading-none">
                UrbanPiper access checklist
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {urbanPiperAccessChecklist.map((c) => (
                  <li key={c.label} className="flex items-start gap-2">
                    <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                      {c.label}
                      <span className="block text-xs text-muted-foreground">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-border bg-card p-5">
              <h2 className="font-display text-2xl uppercase leading-none">
                Connection order
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {integrationRoadmap.map((c) => (
                  <li key={c.label} className="border border-border p-3">
                    {c.label}
                    <span className="block text-xs text-muted-foreground">{c.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
