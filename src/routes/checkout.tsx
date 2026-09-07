import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, Lock, Phone, ShieldCheck, ShoppingBag, Bike, UserRound } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { LocationSheet } from "@/components/layout/location-sheet";
import { DeliveryAddressForm } from "@/components/order/delivery-address-form";
import { GoogleButton } from "@/components/auth/google-button";
import { usePPP, useSelectedLocation } from "@/context/ppp-store";
import { useCustomerSession } from "@/lib/customer/session";
import { cartTotals, selectionLabels } from "@/lib/cart";
import { menuRepository } from "@/lib/menu-repository";
import { orderingIntegration } from "@/lib/integration";
import { GOOGLE_SIGN_IN_ENABLED } from "@/config/auth-flags";
import { canonicalUrl } from "@/config/site";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout | PPP Pizzeria NDG" },
      {
        name: "description",
        content:
          "Review your PPP order, choose pickup or delivery and confirm your details before finishing your order with the Notre-Dame-de-Grâce kitchen.",
      },
      { property: "og:title", content: "Checkout | PPP Pizzeria NDG" },
      {
        property: "og:description",
        content: "Review your PPP order and confirm pickup or delivery details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
      { property: "og:url", content: canonicalUrl("/checkout") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/checkout") }],
  }),
  component: CheckoutPage,
});

const SectionTitle = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <h2 className="flex items-baseline gap-3 font-display text-2xl uppercase leading-none">
    <span className="text-flame">{String(n).padStart(2, "0")}</span>
    {children}
  </h2>
);

function CheckoutPage() {
  const { cart, mode, setMode, lang, t, openLocationSheet } = usePPP();
  const location = useSelectedLocation();
  const { accountsAvailable, customer } = useCustomerSession();
  const totals = cartTotals(cart);
  const orderStatus = orderingIntegration.orders.status(location?.id ?? "");

  const [identity, setIdentity] = useState<"guest" | "account">("guest");
  const [name, setName] = useState(customer?.preferredName ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<"idle" | "unavailable">("idle");

  const lines = useMemo(
    () =>
      cart.map((line) => {
        const item = menuRepository.getItem(line.itemId);
        return {
          line,
          name: item ? (lang === "fr" ? item.nameFr : item.nameEn) : line.itemId,
          options: selectionLabels(item, line.selections ?? {}, lang === "fr"),
        };
      }),
    [cart, lang],
  );

  const inputClass =
    "mt-1.5 h-12 w-full border border-border bg-background px-3 text-sm outline-none focus-ppp";
  const labelClass =
    "block text-[0.6rem] font-bold uppercase tracking-[0.3em] text-muted-foreground";

  return (
    <div className="min-h-dvh bg-background">
      <PPPHeader />
      <main className="mx-auto max-w-6xl px-4 pt-20 pb-24 sm:px-6 lg:pt-28">
        <h1 className="font-display text-3xl uppercase leading-none sm:text-5xl">
          {t("Checkout", "Paiement", "Pago")}
        </h1>

        {cart.length === 0 ? (
          <div className="mt-6 border border-dashed border-border p-10 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-display text-2xl uppercase leading-none">
              {t("Your order is empty", "Votre commande est vide", "Tu pedido está vacío")}
            </p>
            <Link
              to="/order"
              className="mt-5 inline-block bg-primary px-6 py-3.5 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t("Browse the menu", "Voir le menu", "Ver el menú")}
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div className="space-y-8">
              {/* 1 — order type */}
              <section className="panel-in border border-border p-5">
                <SectionTitle n={1}>
                  {t("Order type", "Type de commande", "Tipo de pedido")}
                </SectionTitle>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {(["pickup", "delivery"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      aria-pressed={mode === m}
                      className={`lift-btn flex items-center justify-center gap-2 border py-3.5 text-xs font-bold uppercase tracking-widest focus-ppp ${
                        mode === m
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {m === "pickup" ? (
                        <ShoppingBag className="h-4 w-4" />
                      ) : (
                        <Bike className="h-4 w-4" />
                      )}
                      {m === "pickup"
                        ? t("Pickup", "Cueillette", "Para recoger")
                        : t("Delivery", "Livraison", "Entrega")}
                    </button>
                  ))}
                </div>
                {mode === "pickup" ? (
                  <button
                    onClick={openLocationSheet}
                    className="mt-3 w-full border border-dashed border-border px-4 py-3 text-left text-xs uppercase tracking-widest text-muted-foreground focus-ppp"
                  >
                    {location
                      ? `${t("Pickup at", "Cueillette à", "Recoger en")} · ${location.name}, ${location.address}`
                      : t("Choose a location", "Choisir un emplacement", "Elegir un local")}
                  </button>
                ) : (
                  <div className="mt-4">
                    {address ? (
                      <p className="border border-border px-4 py-3 text-sm text-muted-foreground">
                        {t("Delivering to", "Livraison à", "Entrega a")} · {address}
                      </p>
                    ) : (
                      <DeliveryAddressForm
                        authenticated={false}
                        onSubmit={(d) =>
                          setAddress(
                            [d.street, d.unit, d.city, d.province, d.postalCode]
                              .filter(Boolean)
                              .join(", "),
                          )
                        }
                      />
                    )}
                  </div>
                )}
              </section>

              {/* 2 — who is ordering */}
              <section className="panel-in border border-border p-5">
                <SectionTitle n={2}>
                  {t("Who is ordering", "Qui commande", "Quién pide")}
                </SectionTitle>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => setIdentity("guest")}
                    aria-pressed={identity === "guest"}
                    className={`lift-btn border p-4 text-left focus-ppp ${
                      identity === "guest" ? "border-primary" : "border-border"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-display text-lg uppercase leading-none">
                      <UserRound className="h-4 w-4 text-primary" />
                      {t("Continue as guest", "Continuer sans compte", "Continuar como invitado")}
                    </span>
                    <span className="mt-1.5 block text-xs text-muted-foreground">
                      {t(
                        "No account needed. Guest ordering always stays open.",
                        "Aucun compte requis. La commande sans compte reste toujours possible.",
                        "Sin cuenta. El pedido como invitado siempre está disponible.",
                      )}
                    </span>
                  </button>
                  <button
                    onClick={() => setIdentity("account")}
                    aria-pressed={identity === "account"}
                    className={`lift-btn border p-4 text-left focus-ppp ${
                      identity === "account" ? "border-primary" : "border-border"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-display text-lg uppercase leading-none">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      {t("Sign in to PPP", "Se connecter à PPP", "Entrar a PPP")}
                    </span>
                    <span className="mt-1.5 block text-xs text-muted-foreground">
                      {t(
                        "Save your orders, favourites and addresses for next time.",
                        "Gardez vos commandes, favoris et adresses pour la prochaine fois.",
                        "Guarda tus pedidos, favoritos y direcciones para la próxima.",
                      )}
                    </span>
                  </button>
                </div>

                {identity === "account" && (
                  <div className="step-in mt-4 border border-border p-4">
                    {accountsAvailable ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Link
                          to="/account/sign-in"
                          className="border border-border px-4 py-3 text-center font-display text-lg uppercase leading-none focus-ppp"
                        >
                          {t("Sign in", "Se connecter", "Entrar")}
                        </Link>
                        <Link
                          to="/account/sign-up"
                          className="bg-primary px-4 py-3 text-center font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
                        >
                          {t("Create account", "Créer un compte", "Crear cuenta")}
                        </Link>
                        {GOOGLE_SIGN_IN_ENABLED && (
                          <div className="sm:col-span-2">
                            <GoogleButton />
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t(
                          "PPP accounts are not open yet. Finish as a guest today — nothing is lost.",
                          "Les comptes PPP ne sont pas encore ouverts. Terminez sans compte aujourd'hui.",
                          "Las cuentas PPP aún no están abiertas. Continúa como invitado hoy.",
                        )}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>{t("Name", "Nom", "Nombre")}</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>
                      {t("Phone number", "Numéro de téléphone", "Teléfono")}
                    </span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      autoComplete="tel"
                      className={inputClass}
                    />
                  </label>
                </div>

                {/* SMS verification foundation — no code is sent until a provider exists */}
                <div className="mt-3 flex flex-wrap items-center gap-3 border border-dashed border-border px-4 py-3">
                  <button
                    onClick={() => setVerifyState("unavailable")}
                    className="border border-border px-4 py-2 text-[0.65rem] font-bold uppercase tracking-widest focus-ppp"
                  >
                    {t("Send verification code", "Envoyer un code", "Enviar código")}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {verifyState === "unavailable"
                      ? t(
                          "Text verification is not switched on yet — the kitchen confirms by phone.",
                          "La vérification par texto n'est pas activée — la cuisine confirme par téléphone.",
                          "La verificación por SMS aún no está activa — la cocina confirma por teléfono.",
                        )
                      : t(
                          "We use your number only to confirm the order.",
                          "Nous utilisons votre numéro seulement pour confirmer la commande.",
                          "Usamos tu número solo para confirmar el pedido.",
                        )}
                  </span>
                </div>
              </section>

              {/* 3 — payment */}
              <section className="panel-in border border-border p-5">
                <SectionTitle n={3}>{t("Payment", "Paiement", "Pago")}</SectionTitle>
                <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {lang === "fr" ? orderStatus.reasonFr : orderStatus.reasonEn}
                </p>
                <div className="mt-4 flex items-center gap-2 border border-dashed border-border px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  {t(
                    "Card payment opens here",
                    "Le paiement par carte s'ouvrira ici",
                    "El pago con tarjeta se abrirá aquí",
                  )}
                </div>
              </section>
            </div>

            {/* Summary */}
            <aside className="panel-in sticky top-24 border border-border p-5">
              <h2 className="font-display text-2xl uppercase leading-none">
                {t("Your order", "Votre commande", "Tu pedido")}
              </h2>
              <ul className="mt-4 space-y-3">
                {lines.map(({ line, name: itemName, options }) => (
                  <li key={line.lineId} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-display text-base uppercase leading-tight">
                        {line.quantity}× {itemName}
                      </span>
                      {options.length > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {options.join(" · ")}
                        </span>
                      )}
                      {line.instructions && (
                        <span className="block text-xs text-muted-foreground">
                          “{line.instructions}”
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-display text-base leading-none text-accent">
                      {line.unitPrice === null
                        ? t("See price", "Voir le prix", "Ver precio")
                        : `$${(line.unitPrice * line.quantity).toFixed(2)}`}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {t("Subtotal", "Sous-total", "Subtotal")}
                  </dt>
                  <dd>${totals.knownSubtotal.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("Taxes", "Taxes", "Impuestos")}</dt>
                  <dd className="text-muted-foreground">
                    {t(
                      "Confirmed by the restaurant",
                      "Confirmées par le restaurant",
                      "Confirmados por el restaurante",
                    )}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-border pt-3">
                  <dt className="font-display text-lg uppercase leading-none">
                    {t("Total", "Total", "Total")}
                  </dt>
                  <dd className="font-display text-2xl leading-none">
                    ${totals.knownSubtotal.toFixed(2)}+
                  </dd>
                </div>
              </dl>

              <button
                onClick={() => track("checkout_finish_attempted", { mode, lines: cart.length })}
                className="cta-motion mt-5 w-full bg-primary px-5 py-4 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                {t("Finish my order", "Terminer ma commande", "Terminar mi pedido")}
              </button>
              <p className="mt-2 text-center text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                {lang === "fr" ? orderStatus.reasonFr : orderStatus.reasonEn}
              </p>
              {location?.links.phoneOrderNumber && (
                <a
                  href={`tel:${location.links.phoneOrderNumber}`}
                  className="mt-3 flex items-center justify-center gap-2 border border-border px-4 py-3 font-display text-lg uppercase leading-none focus-ppp hover:border-primary"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  {t("Call to finish", "Appeler pour terminer", "Llamar para terminar")}
                </a>
              )}
            </aside>
          </div>
        )}
      </main>
      <PPPFooter />
      <LocationSheet />
    </div>
  );
}
