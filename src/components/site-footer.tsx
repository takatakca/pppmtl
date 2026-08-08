const columns = [
  { title: "Order", items: ["Order online", "Pickup", "Delivery", "Too Good To Go"] },
  { title: "PPP", items: ["About us", "Careers", "Franchise", "Contact us"] },
  { title: "Rewards", items: ["PPP Rewards", "Gift cards", "Offers", "Download the app"] },
  { title: "Support", items: ["FAQs", "Privacy policy", "Terms of service", "Sitemap"] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary px-2 py-1 font-display text-xl leading-none text-primary-foreground">
                PPP
              </span>
              <span className="font-display text-xl tracking-wide">MTL-NORD</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Poulet · Pizza · Poutine. Serving Montréal-Nord with rotisserie, grill and late-night
              comfort food, powered by Clover ordering.
            </p>
            <form
              className="mt-6 flex max-w-sm overflow-hidden rounded-md border border-border"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                required
                placeholder="Join us for offers"
                aria-label="Email address"
                className="w-full bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button className="bg-primary px-4 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                Subscribe
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((c) => (
              <div key={c.title}>
                <h3 className="font-display text-sm uppercase tracking-widest text-accent">{c.title}</h3>
                <ul className="mt-3 space-y-2">
                  {c.items.map((i) => (
                    <li key={i}>
                      <a href="#top" className="text-sm text-muted-foreground hover:text-foreground">
                        {i}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-12 border-t border-border pt-6 text-xs uppercase tracking-widest text-muted-foreground">
          © {new Date().getFullYear()} PPP Montréal-Nord · Groupe Takatak Inc.
        </p>
      </div>
    </footer>
  );
}