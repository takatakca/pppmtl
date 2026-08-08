import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Bike,
  Clock,
  Gift,
  MapPin,
  Phone,
  ShoppingBag,
  Smartphone,
  Star,
  Store,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import heroImg from "@/assets/hero-montreal.jpg";
import comboPita from "@/assets/combo-pita.jpg";
import comboBurger from "@/assets/combo-burger.jpg";
import menuRotisserie from "@/assets/menu-rotisserie.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PPP MTL-Nord | Order Poulet, Pizza & Poutine in Montréal" },
      {
        name: "description",
        content:
          "Order PPP MTL-Nord online for pickup or delivery. $15.99 combos, rotisserie, shawarma, poutine, PPP Rewards points and gift cards in Montréal-Nord.",
      },
      { property: "og:title", content: "PPP MTL-Nord | Poulet · Pizza · Poutine" },
      {
        property: "og:description",
        content: "Pickup, delivery, combos and PPP Rewards — Montréal-Nord's neighbourhood kitchen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const channels = [
  { name: "PPP Direct", note: "Best price · Clover", accent: true },
  { name: "Uber Eats", note: "Delivery" },
  { name: "SkipTheDishes", note: "Delivery" },
  { name: "DoorDash", note: "Delivery" },
  { name: "Too Good To Go", note: "Surprise bags" },
];

const combos = [
  { title: "Pita Shish Taouk / Shawarma", price: "$15.99", img: comboPita, tag: "Combo" },
  { title: "Burger + Petite Poutine", price: "$15.99", img: comboBurger, tag: "Combo" },
  { title: "Assiette Rotisserie", price: "$18.99", img: menuRotisserie, tag: "Famille" },
];

const menuCats = [
  { title: "Rotisserie", desc: "Chicken, ribs, family platters" },
  { title: "Pizza", desc: "Montréal style, all dressed" },
  { title: "Poutine", desc: "Classic, italienne, galvaude" },
  { title: "Grill & Shawarma", desc: "Taouk, gyros, mixte" },
  { title: "Déjeuner", desc: "Served every morning" },
  { title: "Crèmerie", desc: "Soft serve, sundaes, shakes" },
];

function Index() {
  const [mode, setMode] = useState<"pickup" | "delivery">("pickup");

  return (
    <div id="top" className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative clip-hero min-h-[86vh] pt-16">
          <img
            src={heroImg}
            alt="Montréal skyline at night"
            width={1920}
            height={1080}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
          <div className="relative mx-auto flex min-h-[86vh] max-w-7xl flex-col justify-center px-4 pb-40 pt-16 sm:px-6">
            <p className="font-display text-sm uppercase tracking-[0.35em] text-accent">
              Montréal-Nord · Depuis 2013
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl uppercase leading-[0.95] sm:text-7xl">
              Poulet. Pizza. <span className="text-flame">Poutine.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Order ahead, skip the line, and earn points on every dollar. Same PPP flavour, a much
              faster way to get it.
            </p>

            <div className="mt-8 inline-flex w-fit rounded-lg border border-border bg-background/70 p-1 backdrop-blur">
              {(["pickup", "delivery"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex items-center gap-2 rounded-md px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
                    mode === m
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "pickup" ? <ShoppingBag className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
                  {m}
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#order"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-7 py-3.5 font-display text-lg uppercase tracking-wide text-primary-foreground"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                Order {mode} <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="#menu"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background/60 px-7 py-3.5 font-display text-lg uppercase tracking-wide backdrop-blur"
              >
                See the menu
              </a>
            </div>
          </div>
        </section>

        {/* Ordering channels */}
        <section id="order" className="mx-auto -mt-10 max-w-7xl px-4 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {channels.map((c) => (
              <a
                key={c.name}
                href="#order"
                className={`rounded-xl border p-5 transition-transform hover:-translate-y-1 ${
                  c.accent ? "border-primary bg-card" : "border-border bg-card"
                }`}
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <p className="font-display text-lg uppercase tracking-wide">{c.name}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{c.note}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Combos */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl uppercase sm:text-5xl">
              Combos <span className="text-flame">$15.99</span>
            </h2>
            <a href="#menu" className="text-sm font-semibold uppercase tracking-widest text-accent">
              View more
            </a>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {combos.map((c) => (
              <article
                key={c.title}
                className="group overflow-hidden rounded-2xl border border-border bg-card"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="overflow-hidden">
                  <img
                    src={c.img}
                    alt={c.title}
                    loading="lazy"
                    width={1024}
                    height={1024}
                    className="h-60 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-accent">{c.tag}</p>
                    <h3 className="mt-1 font-display text-xl uppercase leading-tight">{c.title}</h3>
                  </div>
                  <span className="shrink-0 rounded-md bg-primary px-3 py-1.5 font-display text-lg text-primary-foreground">
                    {c.price}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Menu categories */}
        <section id="menu" className="border-y border-border bg-secondary/40 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="font-display text-4xl uppercase sm:text-5xl">The Menu</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {menuCats.map((m) => (
                <a
                  key={m.title}
                  href="#order"
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary"
                >
                  <div>
                    <h3 className="font-display text-2xl uppercase">{m.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-primary" />
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Rewards + gift cards */}
        <section id="rewards" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-8">
              <Star className="h-8 w-8 text-accent" />
              <h2 className="mt-4 font-display text-3xl uppercase">PPP Rewards</h2>
              <p className="mt-3 text-muted-foreground">
                Earn 10 points for every dollar spent, unlock offers, and track everything from your
                account — orders, receipts, favourites and redemptions in one place.
              </p>
              <a
                href="#account"
                className="mt-6 inline-flex items-center gap-2 rounded-md border border-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-primary"
              >
                Join the program <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="rounded-2xl border border-border bg-card p-8">
              <Gift className="h-8 w-8 text-accent" />
              <h2 className="mt-4 font-display text-3xl uppercase">Gift Cards</h2>
              <p className="mt-3 text-muted-foreground">
                Buy a PPP gift card and get a welcome offer of up to 5,000 points on qualifying
                purchases. Terms apply.
              </p>
              <a
                href="#order"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground"
              >
                Buy a gift card <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {/* App */}
        <section className="bg-primary py-20 text-primary-foreground">
          <div className="mx-auto flex max-w-5xl flex-col items-center px-4 text-center sm:px-6">
            <Smartphone className="h-10 w-10" />
            <h2 className="mt-4 font-display text-5xl uppercase leading-none sm:text-6xl">
              We have an app
            </h2>
            <p className="mt-4 max-w-lg text-lg opacity-90">
              Easily order ahead for pick-up and skip the line. Points, offers and reorders in two taps.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a
                href="#top"
                className="rounded-md bg-background px-6 py-3 font-display text-lg uppercase text-foreground"
              >
                App Store
              </a>
              <a
                href="#top"
                className="rounded-md border border-primary-foreground/60 px-6 py-3 font-display text-lg uppercase"
              >
                Google Play
              </a>
            </div>
          </div>
        </section>

        {/* Locations */}
        <section id="locations" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-4xl uppercase sm:text-5xl">Locations</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-border bg-card p-7">
              <h3 className="font-display text-2xl uppercase">PPP Montréal-Nord</h3>
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" /> Montréal-Nord, QC
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" /> +1 514 458 4587
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" /> Open daily · late night
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                {["Pickup", "Delivery", "Uber Eats", "Skip", "DoorDash", "Too Good To Go"].map((t) => (
                  <span key={t} className="rounded-full border border-border px-3 py-1">
                    {t}
                  </span>
                ))}
              </div>
            </article>
            <article className="flex flex-col justify-center rounded-2xl border border-dashed border-border bg-card/50 p-7">
              <Store className="h-8 w-8 text-accent" />
              <h3 className="mt-3 font-display text-2xl uppercase">New locations coming</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                We're expanding across Greater Montréal. Every new PPP launches with Clover POS, KDS,
                kiosks and delivery integrations from day one.
              </p>
            </article>
          </div>
        </section>

        {/* Franchise */}
        <section id="franchise" className="border-t border-border bg-secondary/40 py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="font-display text-4xl uppercase sm:text-5xl">
                Own a <span className="text-flame">PPP</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                A complete restaurant system, not just a brand: Clover POS, kitchen display screens,
                self-serve kiosks, tablets, centralized menus, marketplace integrations, online
                ordering, reporting and support.
              </p>
              <a
                href="#franchise"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-display text-lg uppercase text-primary-foreground"
              >
                Start an application <ArrowRight className="h-5 w-5" />
              </a>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                "Clover POS + payments",
                "KDS kitchen screens",
                "Self-service kiosks",
                "Uber / Skip / DoorDash",
                "Centralized menu control",
                "Marketing & loyalty",
              ].map((f) => (
                <li key={f} className="rounded-xl border border-border bg-card p-5 text-sm font-semibold">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Account teaser */}
        <section id="account" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-12">
            <h2 className="font-display text-4xl uppercase">Your PPP account</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Sign in to see recent orders across PPP Direct and delivery partners, reorder in one tap,
              track your points balance, manage gift cards and save your favourites.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#account"
                className="rounded-md bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground"
              >
                Create account
              </a>
              <a
                href="#account"
                className="rounded-md border border-border px-6 py-3 text-xs font-bold uppercase tracking-widest"
              >
                Sign in
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
