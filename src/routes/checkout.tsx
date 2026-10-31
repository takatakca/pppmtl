import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Bike, CreditCard, Lock, Phone, ShoppingBag } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { LocationSheet } from "@/components/layout/location-sheet";
import { GoogleButton } from "@/components/auth/google-button";
import { DeliveryDetails } from "@/components/checkout/delivery-details";
import {
  EMPTY_DELIVERY_ADDRESS,
  deliveryAreaStatus,
  tipCents,
  type DeliveryAddressValue,
  type TipChoice,
} from "@/components/checkout/checkout-values";
import { OrderSummary } from "@/components/checkout/order-summary";
import { PickupDetails } from "@/components/checkout/pickup-details";
import {
  cardClass,
  cardTitleClass,
  fieldClass,
  hintClass,
  labelClass,
  missingClass,
} from "@/components/checkout/styles";
import { TipPicker } from "@/components/checkout/tip-picker";
import { usePPP, useSelectedLocation } from "@/context/ppp-store";
import { placeOrder } from "@/lib/orders/orders.functions";
import { useCustomerSession } from "@/lib/customer/session";
import { cartTotals, selectionLabels } from "@/lib/cart";
import { menuRepository } from "@/lib/menu-repository";
import { GOOGLE_SIGN_IN_ENABLED } from "@/config/auth-flags";
import {
  DELIVERY_FEE_CENTS,
  deliveryAddressLine,
  postalCodeOf,
  websiteDeliveryAt,
} from "@/config/delivery";
import { canonicalUrl } from "@/config/site";
import { track } from "@/lib/analytics";
import { orderError, type OrderError } from "@/lib/orders/errors";
import { DEFAULT_TIP_PERCENT, checkoutTotals } from "@/lib/pricing";
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

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
/** Digits of a North American number, without the leading 1. */
const phoneDigits = (v: string) => v.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
const formatPhone = (v: string) => {
  const d = phoneDigits(v);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : v;
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Problem = "delivery_closed" | "address" | "outside" | "name" | "phone" | "email";

function CheckoutPage() {
  const { cart, mode, setMode, lang, t, openLocationSheet, savedAddresses, addSavedAddress } =
    usePPP();
  const location = useSelectedLocation();
  const { accountsAvailable, customer } = useCustomerSession();
  const submitOrderFn = useServerFn(placeOrder);

  const [name, setName] = useState(customer?.preferredName ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [address, setAddress] = useState<DeliveryAddressValue>(EMPTY_DELIVERY_ADDRESS);
  const [tip, setTip] = useState<TipChoice>({ kind: "percent", percent: DEFAULT_TIP_PERCENT });
  // After "Place order" with something missing, those fields stay outlined in red until fixed.
  const [showMissing, setShowMissing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const deliveryRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const delivery = mode === "delivery";
  const deliveryOpen = websiteDeliveryAt(location?.id);
  const area = deliveryAreaStatus(address);
  const subtotalCents = Math.round(cartTotals(cart).knownSubtotal * 100);
  const totals = checkoutTotals({
    subtotal: subtotalCents,
    deliveryFee: delivery ? DELIVERY_FEE_CENTS : 0,
    tip: tipCents(tip, subtotalCents),
  });
  const errorText = (error: OrderError) =>
    lang === "fr" ? error.messageFr : lang === "es" ? error.messageEs : error.messageEn;

  // In page order, so the first one is the field to show.
  const problems: Problem[] = [
    ...(delivery && !deliveryOpen ? (["delivery_closed"] as const) : []),
    ...(delivery && deliveryOpen && area === "incomplete" ? (["address"] as const) : []),
    ...(delivery && deliveryOpen && area === "outside" ? (["outside"] as const) : []),
    ...(!(name.trim() || customer?.preferredName) ? (["name"] as const) : []),
    ...(phoneDigits(phone).length !== 10 ? (["phone"] as const) : []),
    ...(email.trim() && !EMAIL.test(email.trim()) ? (["email"] as const) : []),
  ];
  const flagged = (p: Problem) => showMissing && problems.includes(p);
  const problemText = (p: Problem) => {
    switch (p) {
      case "delivery_closed":
        return t(
          "This restaurant delivers through Uber Eats, DoorDash and Skip. Choose pickup to order here.",
          "Ce restaurant livre par Uber Eats, DoorDash et Skip. Choisissez la cueillette pour commander ici.",
          "Este restaurante entrega por Uber Eats, DoorDash y Skip. Elige recoger para pedir aquí.",
        );
      case "address":
        return errorText(orderError("missing_address"));
      case "outside":
        return errorText(orderError("outside_delivery_area"));
      case "name":
        return problems.includes("phone") && !phone.trim()
          ? t(
              "Add your name and phone number so the kitchen knows who the order is for.",
              "Ajoutez votre nom et votre numéro de téléphone pour que la cuisine sache à qui est la commande.",
              "Agrega tu nombre y tu teléfono para que la cocina sepa de quién es el pedido.",
            )
          : errorText(orderError("missing_name"));
      case "phone":
        return phone.trim()
          ? t(
              "Enter a 10-digit phone number, e.g. (514) 555-0100.",
              "Entrez un numéro à 10 chiffres, ex. (514) 555-0100.",
              "Escribe un teléfono de 10 dígitos, p. ej. (514) 555-0100.",
            )
          : errorText(orderError("missing_phone"));
      case "email":
        return t(
          "Check your email address.",
          "Vérifiez votre adresse courriel.",
          "Revisa tu correo electrónico.",
        );
    }
  };
  // Follows the fields as they are fixed, so it never asks for something already entered.
  const statusMessage =
    (showMissing && problems[0] ? problemText(problems[0]) : null) ?? orderMessage;

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
   * Cart -> validate -> internal order -> Clover. The browser sends ids, quantities and the tip; every price, the
   * delivery fee and the delivery area are decided again on the server.
   */
  const finishOrder = async () => {
    const first = problems[0];
    if (first) {
      setShowMissing(true);
      setOrderMessage(null);
      const target =
        first === "name"
          ? nameRef.current
          : first === "phone"
            ? phoneRef.current
            : first === "email"
              ? emailRef.current
              : deliveryRef.current;
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      if (target instanceof HTMLInputElement) target.focus({ preventScroll: true });
      return;
    }
    setSubmitting(true);
    setOrderMessage(null);
    track("checkout_finish_attempted", { mode, lines: cart.length, tip: totals.tip > 0 });
    try {
      const response = await submitOrderFn({
        data: {
          locationId: location?.id ?? "",
          orderType: delivery ? ("DELIVERY" as const) : ("PICKUP" as const),
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
            phone: formatPhone(phone.trim()),
            email: email.trim() || null,
            isGuest: true,
          },
          deliveryAddress: delivery ? deliveryAddressLine(address) : null,
          notes: "",
          tip: totals.tip,
        },
      });

      if (response.ok && response.order?.paymentUrl) {
        if (
          delivery &&
          !savedAddresses.some(
            (a) =>
              a.street === address.street &&
              postalCodeOf(a.postalCode) === postalCodeOf(address.postalCode),
          )
        ) {
          addSavedAddress({
            street: address.street,
            unit: address.unit,
            city: address.city || "Montréal",
            province: "QC",
            postalCode: postalCodeOf(address.postalCode) ?? address.postalCode,
            instructions: address.instructions,
          });
        }
        // Clover Hosted Checkout: the customer pays on Clover's page, then comes back to the order page.
        track("checkout_payment_redirect", { lines: cart.length, mode });
        window.location.assign(response.order.paymentUrl);
        return;
      }
      if (response.ok && response.order) {
        setOrderNumber(response.order.orderNumber ?? response.order.id);
      } else if (response.error) {
        if (
          ["missing_name", "missing_phone", "missing_address", "outside_delivery_area"].includes(
            response.error.code,
          )
        ) {
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
          id: line.lineId,
          quantity: line.quantity,
          name: item ? (lang === "fr" ? item.nameFr : item.nameEn) : line.itemId,
          options: selectionLabels(item, line.selections ?? {}, lang === "fr"),
          instructions: line.instructions ?? "",
          price: line.unitPrice === null ? null : line.unitPrice * line.quantity,
        };
      }),
    [cart, lang],
  );

  const placeLabel = submitting
    ? t("Sending…", "Envoi…", "Enviando…")
    : `${t("Place order", "Commander", "Hacer pedido")} · ${money(totals.total)}`;
  const placeButton = (extra = "") => (
    <button
      type="button"
      onClick={() => void finishOrder()}
      disabled={submitting}
      className={cn(
        "cta-motion w-full bg-primary px-5 py-4 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp disabled:opacity-60",
        extra,
      )}
      style={{ boxShadow: "var(--shadow-glow)" }}
    >
      {placeLabel}
    </button>
  );
  const marketplaces = [
    { label: "Uber Eats", href: location?.links.uberEatsUrl },
    { label: "DoorDash", href: location?.links.doorDashUrl },
    { label: "SkipTheDishes", href: location?.links.skipUrl },
  ].filter((m): m is { label: string; href: string } => Boolean(m.href));

  return (
    <div className="min-h-dvh bg-background">
      <PPPHeader />
      <main className="mx-auto max-w-6xl px-4 pt-20 pb-36 sm:px-6 lg:pt-28 lg:pb-24">
        <Link
          to="/order"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("Back to menu", "Retour au menu", "Volver al menú")}
        </Link>
        <h1 className="mt-3 font-display text-4xl uppercase leading-none sm:text-5xl">
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
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
            <div className="space-y-6">
              {/* How the order gets to the customer */}
              <section ref={deliveryRef} className={cardClass}>
                <div
                  role="radiogroup"
                  aria-label={t("Order type", "Type de commande", "Tipo de pedido")}
                  className="grid grid-cols-2 border border-border p-1"
                >
                  {(["pickup", "delivery"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={mode === m}
                      onClick={() => setMode(m)}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest focus-ppp",
                        mode === m
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {m === "pickup" ? (
                        <ShoppingBag className="h-4 w-4" />
                      ) : (
                        <Bike className="h-4 w-4" />
                      )}
                      {m === "pickup"
                        ? t("Pickup", "Cueillette", "Recoger")
                        : t("Delivery", "Livraison", "Entrega")}
                    </button>
                  ))}
                </div>
                <div className="mt-5">
                  {!delivery ? (
                    <PickupDetails location={location} onChangeLocation={openLocationSheet} />
                  ) : deliveryOpen ? (
                    <DeliveryDetails
                      value={address}
                      onChange={setAddress}
                      location={location}
                      highlight={flagged("address")}
                    />
                  ) : (
                    <div
                      className={cn(
                        "border px-4 py-4 text-sm",
                        flagged("delivery_closed") ? missingClass : "border-border",
                      )}
                    >
                      <p>{problemText("delivery_closed")}</p>
                      {marketplaces.length > 0 && (
                        <p className="mt-2 flex flex-wrap gap-3">
                          {marketplaces.map((m) => (
                            <a
                              key={m.label}
                              href={m.href}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              {m.label}
                            </a>
                          ))}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Contact */}
              <section className={cardClass}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className={cardTitleClass}>
                    {t("Your details", "Vos coordonnées", "Tus datos")}
                  </h2>
                  {accountsAvailable && !customer && (
                    <Link
                      to="/account/sign-in"
                      className="text-xs uppercase tracking-widest text-muted-foreground underline-offset-4 hover:underline focus-ppp"
                    >
                      {t(
                        "Have an account? Sign in",
                        "Un compte? Connectez-vous",
                        "¿Tienes cuenta? Entra",
                      )}
                    </Link>
                  )}
                </div>
                {GOOGLE_SIGN_IN_ENABLED && !customer && (
                  <div className="mt-4">
                    <GoogleButton />
                  </div>
                )}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>{t("Name", "Nom", "Nombre")}</span>
                    <input
                      ref={nameRef}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      aria-invalid={flagged("name") || undefined}
                      className={cn(fieldClass, flagged("name") && missingClass)}
                    />
                    {flagged("name") && (
                      <span className={hintClass}>
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
                      onBlur={() => setPhone((p) => formatPhone(p))}
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(514) 555-0100"
                      aria-invalid={flagged("phone") || undefined}
                      className={cn(fieldClass, flagged("phone") && missingClass)}
                    />
                    {flagged("phone") && (
                      <span className={hintClass}>
                        {phone.trim()
                          ? t("10 digits", "10 chiffres", "10 dígitos")
                          : t(
                              "Phone number required",
                              "Numéro obligatoire",
                              "Teléfono obligatorio",
                            )}
                      </span>
                    )}
                  </label>
                  <label className="block sm:col-span-2">
                    <span className={labelClass}>
                      {t(
                        "Email (for your receipt)",
                        "Courriel (pour votre reçu)",
                        "Correo (para tu recibo)",
                      )}
                    </span>
                    <input
                      ref={emailRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      inputMode="email"
                      placeholder={t("you@example.com", "nom@exemple.com", "tu@ejemplo.com")}
                      aria-invalid={flagged("email") || undefined}
                      className={cn(fieldClass, flagged("email") && missingClass)}
                    />
                  </label>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t(
                    "The kitchen calls this number only if there is a question about your order.",
                    "La cuisine appelle ce numéro seulement en cas de question sur votre commande.",
                    "La cocina llama a este número solo si hay una duda sobre tu pedido.",
                  )}
                </p>
              </section>

              {/* Tip */}
              <section className={cardClass}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className={cardTitleClass}>
                    {t("Add a tip", "Ajouter un pourboire", "Añadir propina")}
                  </h2>
                  <span className="font-display text-xl leading-none">{money(totals.tip)}</span>
                </div>
                <div className="mt-4">
                  <TipPicker value={tip} onChange={setTip} subtotalCents={subtotalCents} />
                </div>
              </section>

              {/* Payment */}
              <section className={cardClass}>
                <h2 className={cardTitleClass}>{t("Payment", "Paiement", "Pago")}</h2>
                <div className="mt-4 flex items-start gap-3 border-2 border-primary px-4 py-4">
                  <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">
                      {t(
                        "Credit or debit card, or a mobile wallet",
                        "Carte de crédit ou de débit, ou portefeuille mobile",
                        "Tarjeta de crédito o débito, o billetera móvil",
                      )}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      {t(
                        "On Clover's secure page, then you come back here. PPP never sees your card.",
                        "Sur la page sécurisée de Clover, puis vous revenez ici. PPP ne voit jamais votre carte.",
                        "En la página segura de Clover y vuelves aquí. PPP nunca ve tu tarjeta.",
                      )}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <OrderSummary
              lines={lines}
              totals={totals}
              delivery={delivery}
              hasUnpriced={cart.some((l) => l.unitPrice === null)}
            >
              {placeButton()}
              {orderNumber && (
                <p className="mt-3 border border-primary px-4 py-3 text-center text-sm">
                  {t("Order", "Commande", "Pedido")} #{orderNumber}
                </p>
              )}
              {statusMessage ? (
                <p
                  role="status"
                  className="mt-3 border border-border px-4 py-3 text-center text-sm"
                >
                  {statusMessage}
                </p>
              ) : (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  {t(
                    "Secure payment by Clover",
                    "Paiement sécurisé par Clover",
                    "Pago seguro con Clover",
                  )}
                </p>
              )}
              {location?.links.phoneOrderNumber && (
                <a
                  href={`tel:${location.links.phoneOrderNumber}`}
                  className="mt-3 flex items-center justify-center gap-2 px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp"
                >
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  {t(
                    "Prefer to order by phone?",
                    "Vous préférez commander par téléphone?",
                    "¿Prefieres pedir por teléfono?",
                  )}
                </a>
              )}
            </OrderSummary>
          </div>
        )}
      </main>

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          {statusMessage && (
            <p role="status" className="mb-2 text-center text-xs">
              {statusMessage}
            </p>
          )}
          {placeButton("py-3.5 text-lg")}
        </div>
      )}
      <PPPFooter />
      <LocationSheet />
    </div>
  );
}
