import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { signInAdmin } from "@/lib/security/admin.functions";

export const Route = createFileRoute("/admin/sign-in")({
  head: () => ({ meta: [{ title: "Administrator sign in | PPP" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminSignIn,
});

function AdminSignIn() {
  const [credential, setCredential] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const result = await signInAdmin({ data: { credential } });
      setCredential("");
      if (!result.ok) {
        setError(true);
        return;
      }
      window.location.assign("/admin/orders");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">PPP · Internal operations</p>
        <h1 className="mt-3 font-display text-3xl uppercase">Administrator sign in</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter the private administrator access credential issued for this installation.
          Production credentials must be configured on the server.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm">
            Access credential
            <input type="password" required autoComplete="off" value={credential}
              onChange={(event) => setCredential(event.target.value)}
              className="mt-2 w-full border border-border bg-background p-3"
              aria-invalid={error} />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">
            Access denied or server authentication not configured.
          </p>}
          <button type="submit" disabled={busy || credential.length === 0}
            className="w-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? "Checking…" : "Sign in"}
          </button>
        </form>
        <Link to="/" className="mt-6 inline-block text-sm underline">Back to restaurant</Link>
      </div>
    </main>
  );
}
