import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import {
  getIntegrationSnapshot,
  type IntegrationSnapshot,
} from "@/lib/integration/integrations.functions";

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
        </>
      )}
    </main>
  );
}
