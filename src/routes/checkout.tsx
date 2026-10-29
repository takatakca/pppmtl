import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, Lock, Phone, ShieldCheck, ShoppingBag, Bike, UserRound } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { LocationSheet } from "@/components/layout/location-sheet";
import { DeliveryAddressForm } from "@/components/order/delivery-address-form";
import { GoogleButton } from "@/components/auth/google-button";
import { useServerFn } from "@tanstack/react-start";
import { usePPP, useSelectedLocation } from "@/context/ppp-store";
import { placeOrder } from "@/lib/orders/orders.functions";
import { useCustomerSession } from "@/lib/customer/session";
import { cartTotals, selectionLabels } from "@/lib/cart";
import { menuRepository } from "@/lib/menu-repository";
import { GOOGLE_SIGN_IN_ENABLED } from "@/config/auth-flags";
import { canonicalUrl } from "@/config/site";
import { track } from "@/lib/analytics";
import { orderError, type OrderError } from "@/lib/orders/errors";
import { cn } from "@/lib/utils";

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
  const { cart, mode, setMode, lang, t, openLocationSheet, addSavedAddress } = usePPP();
  const location = useSelectedLocation();
  const { accountsAvailable, customer } = useCustomerSession();
  const totals = cartTotals(cart);
  /** Card payment happens on Clover's own secure page (Clover Hosted Checkout); PPP never sees the card. */
  const paymentCopy = t(
    "You pay on Clover's secure page, then come back here. Your order goes straight to the restaurant's Clover register.",
    "Vous payez sur la page sécurisée de Clover, puis vous revenez ici. Votre commande va directement à la caisse Clover du restaurant.",
    "Pagas en la página segura de Clover y vuelves aquí. Tu pedido va directo a la caja Clover del restaurante.",
  );

  const [identity, setIdentity] = useState<"guest" | "account">("guest");
  const [name, setName] = useState(customer?.preferredName ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<"idle" | "unavailable">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  // After a "Pay" with a blank name or phone, those fields stay outlined in red until filled.
  const [showMissing, setShowMissing] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const nameMissing = showMissing && !(name.trim() || customer?.preferredName);
  const phoneMissing = showMissing && !phone.trim();
  const errorText = (error: OrderError) =>
    lang === "fr" ? error.messageFr : lang === "es" ? error.messageEs : error.messageEn;
  // Follows the fields as they are filled in, so it never asks for something already entered.
  const missingMessage =
    nameMissing && phoneMissing
      ? t(
          "Add your name and phone number so the kitchen knows who the order is for.",
          "Ajoutez votre nom et votre numéro de téléphone pour que la cuisine sache à qui est la commande.",
          "Agrega tu nombre y tu teléfono para que la cocina sepa de quién es el pedido.",
        )
      : nameMissing || phoneMissing
        ? errorText(orderError(nameMissing ? "missing_name" : "missing_phone"))
        : null;
  const statusMessage = missingMessage ?? orderMessage;

  const submitOrderFn = useServerFn(placeOrder);

  // Back from Clover's payment page without paying: the cart is still here.
  useEffect(() => {
    const payment = new URLSearchParams(window.location.search).get("payment");
    if (payment === "cancelled") {
      setOrderMessage(
        t(
          "Payment cancelled — your order is still here.",
          "Paiement annulé — votre commande est toujours là.",
          "Pago cancelado — tu pedido sigue aquí.",
        ),
      );
    } else if (payment === "failed") {
      setOrderMessage(
        t(
          "The card was not accepted. Try again or use another card.",
          "La carte n'a pas été acceptée. Réessayez ou utilisez une autre carte.",
          "La tarjeta no fue aceptada. Inténtalo de nuevo o usa otra tarjeta.",
        ),
      );
    }
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Cart -> validate -> internal order -> provider. The browser sends ids and
   * quantities only; every price and every decision happens on the server.
   */
  const finishOrder = async () => {
    if (!(name.trim() || customer?.preferredName) || !phone.trim()) {
      setShowMissing(true);
      setOrderMessage(null);
      const first = (name.trim() || customer?.preferredName ? phoneRef : nameRef).current;
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      first?.focus({ preventScroll: true });
      return;
    }
    setSubmitting(true);
    setOrderMessage(null);
    track("checkout_finish_attempted", { mode, lines: cart.length });
    try {
      const response = await submitOrderFn({
        data: {
          locationId: location?.id ?? "",
          orderType: mode === "delivery" ? ("DELIVERY" as const) : ("PICKUP" as const),
          lines: cart.map((line) => ({
            itemId: line.itemId,
            quantity: line.quantity,
            notes: line.instructions ?? "",
            selections: line.selections ?? {},
          })),
          customer: {
            customerId: customer?.id ?? null,
            takatakCustomerId: null,
            name: name.trim() || (customer?.preferredName ?? null),
            phone: phone.trim() || null,
            email: customer?.email ?? null,
            isGuest: identity === "guest",
          },
          deliveryAddress: mode === "delivery" ? address : null,
          notes: "",
        },
      });

      if (response.ok && response.order?.paymentUrl) {
        // Clover Hosted Checkout: the customer pays on Clover's page, then comes back to the order page.
        track("checkout_payment_redirect", { lines: cart.length });
        window.location.assign(response.order.paymentUrl);
        return;
      }
      if (response.ok && response.order) {
        setOrderNumber(response.order.orderNumber ?? response.order.id);
        setOrderMessage(null);
      } else if (response.error) {
        if (response.error.code === "missing_name" || response.error.code === "missing_phone") {
          setShowMissing(true);
        }
        setOrderMessage(errorText(response.error));
      }
    } catch {
      setOrderMessage(
        t(
          "We could not finish your order. Please try again or call us.",
          "Nous n'avons pas pu terminer votre commande. Réessayez ou appelez-nous.",
          "No pudimos terminar tu pedido. Inténtalo de nuevo o llámanos.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

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
  const missingClass = "border-2 border-destructive";
  const missingHintClass = "mt-1 block text-xs font-semibold text-destructive";

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
                        onSubmit={(d) => {
                          setAddress(
                            [d.street, d.unit, d.city, d.province, d.postalCode]
                              .filter(Boolean)
                              .join(", "),
                          );
                          addSavedAddress({
                            street: d.street,
                            unit: d.unit,
                            city: d.city,
                            province: d.province,
                            postalCode: d.postalCode,
                            instructions: d.instructions,
                          });
                        }}
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
                      ref={nameRef}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      aria-invalid={nameMissing || undefined}
                      aria-describedby={nameMissing ? "checkout-name-missing" : undefined}
                      className={cn(inputClass, nameMissing && missingClass)}
                    />
                    {nameMissing && (
                      <span id="checkout-name-missing" className={missingHintClass}>
                        {t("Name required", "Nom obligatoire", "Nombre obligatorio")}
                      </span>
                    )}
                  </label>
                  <label className="block">
                    <span className={labelClass}>
                      {t("Phone number", "Numéro de téléphone", "Teléfono")}
                    </span>
                    <input
                      ref={phoneRef}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      autoComplete="tel"
                      aria-invalid={phoneMissing || undefined}
                      aria-describedby={phoneMissing ? "checkout-phone-missing" : undefined}
                      className={cn(inputClass, phoneMissing && missingClass)}
                    />
                    {phoneMissing && (
                      <span id="checkout-phone-missing" className={missingHintClass}>
                        {t("Phone number required", "Numéro obligatoire", "Teléfono obligatorio")}
                      </span>
                    )}
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
                  {paymentCopy}
                </p>
                <div className="mt-4 flex items-center gap-2 border border-dashed border-border px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  {mode === "delivery"
                    ? t(
                        "Online payment is for pickup. For delivery, use Uber Eats, DoorDash or Skip.",
                        "Le paiement en ligne est pour la cueillette. Pour la livraison : Uber Eats, DoorDash ou Skip.",
                        "El pago en línea es para recoger. Para entrega: Uber Eats, DoorDash o Skip.",
                      )
                    : t(
                        "Card payment opens on Clover's secure page",
                        "Le paiement par carte s'ouvre sur la page sécurisée de Clover",
                        "El pago con tarjeta se abre en la página segura de Clover",
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
                      "Added on Clover's payment page",
                      "Ajoutées sur la page de paiement Clover",
                      "Se suman en la página de pago de Clover",
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
                onClick={() => void finishOrder()}
                disabled={submitting}
                className="cta-motion mt-5 w-full bg-primary px-5 py-4 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp disabled:opacity-60"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                {submitting
                  ? t("Sending…", "Envoi…", "Enviando…")
                  : t("Pay with Clover", "Payer avec Clover", "Pagar con Clover")}
              </button>
              {orderNumber ? (
                <p className="mt-3 border border-primary px-4 py-3 text-center text-sm">
                  {t("Order", "Commande", "Pedido")} #{orderNumber}
                </p>
              ) : null}
              {statusMessage ? (
                <p
                  role="status"
                  className="mt-3 border border-border px-4 py-3 text-center text-sm text-muted-foreground"
                >
                  {statusMessage}
                </p>
              ) : (
                <p className="mt-2 text-center text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                  {t(
                    "Secure payment by Clover · pickup",
                    "Paiement sécurisé par Clover · cueillette",
                    "Pago seguro con Clover · para recoger",
                  )}
                </p>
              )}
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
