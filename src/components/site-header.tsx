import { useState } from "react";
import { Menu, X, User } from "lucide-react";

const links = [
  { label: "Home", href: "#top" },
  { label: "Order", href: "#order" },
  { label: "Menu", href: "#menu" },
  { label: "Rewards", href: "#rewards" },
  { label: "Locations", href: "#locations" },
  { label: "Franchise", href: "#franchise" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2">
          <span className="rounded-md bg-primary px-2 py-1 font-display text-lg leading-none text-primary-foreground">
            PPP
          </span>
          <span className="font-display text-lg tracking-wide text-foreground">MTL-NORD</span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button className="hidden items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground sm:inline-flex">
            EN / FR
          </button>
          <a
            href="#account"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            <User className="h-4 w-4" aria-hidden="true" />
            Sign in
          </a>
          <button
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-background px-4 pb-5 pt-3 lg:hidden">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 font-display text-xl uppercase tracking-wide text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}