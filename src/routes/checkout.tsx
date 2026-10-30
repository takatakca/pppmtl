import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Banknote,
  CreditCard,
  Lock,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Bike,
  UserRound,
} from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { LocationSheet } from "@/components/layout/location-sheet";
import { DeliveryAddressForm } from "@/components/order/delivery-address-form";
import { GuestVerifySheet } from "@/components/auth/guest-verify-sheet";
import { useServerFn } from "@tanstack/react-start";
import { usePPP, useSelectedLocation } from "@/context/ppp-store";
import { getInteracOptions, placeOrder, type InteracOptions } from "@/lib/orders/orders.functions";
import type { OrderInteracInstructions, OrderPaymentMethod } from "@/lib/orders/types";
import { useCustomerSession } from "@/lib/customer/session";
import { formatPhoneDisplay } from "@/lib/customer/token";
import { cartTotals, selectionLabels } from "@/lib/cart";
import { menuRepository } from "@/lib/menu-repository";
import {
  interacInstructionRows,
  interacInstructionText,
  interacQuote,
} from "@/lib/integration/providers/foodhub/interac";
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

interface InteracConfirmation {
  orderId: string;
  orderNumber: string;
  totalCents: number;
  instructions: OrderInteracInstructions;
}

function CheckoutPage() {
  const { cart, mode, setMode, lang, t, openLocationSheet, addSavedAddress, clearCart } = usePPP();
  const location = useSelectedLocation();
  const { accountsAvailable, customer, signOut } = useCustomerSession();
  const totals = cartTotals(cart);
  const money = (cents: number) =>
    lang === "fr"
      ? `${(cents / 100).toFixed(2).replace(".", ",")} $`
      : `$${(cents / 100).toFixed(2)}`;

  /** Card payment happens on Clover's own secure page (Clover Hosted Checkout); PPP never sees the card. */
  const paymentCopy = t(
    "You pay on Clover's secure page, then come back here. Your order goes straight to the restaurant's Clover register.",
    "Vous payez sur la page sécurisée de Clover, puis vous revenez ici. Votre commande va directement à la caisse Clover du restaurant.",
    "Pagas en la página segura de Clover y vuelves aquí. Tu pedido va directo a la caja Clover del restaurante.",
  );

  const [identity, setIdentity] = useState<"guest" | "account">("guest");
  const [name, setName] = useState(customer?.preferredName ?? "");
  const [phone, setPhone] = useState(customer ? formatPhoneDisplay(customer.phone) : "");
  const [showVerify, setShowVerify] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [payment, setPayment] = useState<OrderPaymentMethod>("card");
  const [interacOptions, setInteracOptions] = useState<InteracOptions | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [interacConfirmation, setInteracConfirmation] = useState<InteracConfirmation | null>(null);
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

  // A signed-in customer's verified number is the order contact; the name is a suggestion they can change.
  useEffect(() => {
    if (!customer) return;
    setPhone(formatPhoneDisplay(customer.phone));
    setName((current) => current.trim() || customer.preferredName || "");
    setShowVerify(false);
  }, [customer]);

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

  // Interac e-Transfer: the server says whether it is offered here and what the fee is, before anything is committed.
  const orderType = mode === "delivery" ? ("DELIVERY" as const) : ("PICKUP" as const);
  const locationId = location?.id ?? null;
  useEffect(() => {
    if (!locationId) return;
    let alive = true;
    getInteracOptions({ data: { locationId, orderType } })
      .then((options) => {
        if (alive) setInteracOptions(options);
      })
      .catch(() => {
        if (alive) setInteracOptions(null);
      });
    return () => {
      alive = false;
    };
  }, [locationId, orderType]);

  const interacAvailable = Boolean(interacOptions?.available) && totals.unpricedLines === 0;
  const cardAvailable = mode === "pickup";
  useEffect(() => {
    if (payment === "interac" && !interacAvailable) setPayment("card");
  }, [payment, interacAvailable]);

  const subtotalCents = Math.round(totals.knownSubtotal * 100);
  const quote =
    payment === "interac" && interacOptions
      ? interacQuote({
          subtotalCents,
          interacFeeCents: interacOptions.feeCents,
          feeTaxable: interacOptions.feeTaxable,
          deliveryFeeCents: mode === "delivery" ? (interacOptions.deliveryFeeCents ?? 0) : 0,
        })
      : null;

  const interacUnavailableReason = (() => {
    if (totals.unpricedLines > 0) {
      return t(
        "An item in your order has no published price, so a final total cannot be shown.",
        "Un article de votre commande n'a pas de prix publié : impossible d'afficher un total final.",
        "Un artículo de tu pedido no tiene precio publicado, así que no se puede mostrar un total final.",
      );
    }
    switch (interacOptions?.reason) {
      case "delivery_fee_unknown":
        return t(
          "Pickup only for e-Transfer right now.",
          "Cueillette seulement pour le virement pour l'instant.",
          "Solo para recoger por ahora.",
        );
      case "not_configured":
      case "not_enabled":
      case "location_not_mapped":
        return t(
          "Not available at this restaurant yet.",
          "Pas encore disponible à ce restaurant.",
          "Aún no disponible en este restaurante.",
        );
      default:
        return interacOptions
          ? null
          : t(
              "Checking availability…",
              "Vérification de la disponibilité…",
              "Verificando disponibilidad…",
            );
    }
  })();

  /**
   * Cart -> validate -> internal order -> provider. The browser sends ids and
   * quantities only; every price and every decision happens on the server. For Interac the browser also sends the
   * all-inclusive total it displayed, so the server can refuse to send anything else.
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
    track("checkout_finish_attempted", { mode, lines: cart.length, payment });
    try {
      const response = await submitOrderFn({
        data: {
          locationId: location?.id ?? "",
          orderType,
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
            isGuest: !customer,
          },
          deliveryAddress: mode === "delivery" ? address : null,
          notes: "",
          payment,
          displayedTotalCents: quote?.totalCents ?? null,
          lang,
        },
      });

      if (response.ok && response.order?.paymentUrl) {
        // Clover Hosted Checkout: the customer pays on Clover's page, then comes back to the order page.
        track("checkout_payment_redirect", { lines: cart.length });
        window.location.assign(response.order.paymentUrl);
        return;
      }
      if (response.ok && response.order?.interac) {
        // Food Hub holds the order until the restaurant confirms the transfer. The cart is done.
        track("checkout_interac_held", { lines: cart.length });
        setInteracConfirmation({
          orderId: response.order.id,
          orderNumber: response.order.orderNumber ?? response.order.id,
          totalCents: response.order.total ?? quote?.totalCents ?? 0,
          instructions: response.order.interac,
        });
        setOrderNumber(response.order.orderNumber ?? response.order.id);
        setOrderMessage(null);
        clearCart();
        window.scrollTo({ top: 0, behavior: "smooth" });
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

  const confirmLabel = submitting
    ? t("Sending…", "Envoi…", "Enviando…")
    : payment === "interac"
      ? t(
          "Confirm · Interac e-Transfer",
          "Confirmer · Virement Interac",
          "Confirmar · Interac e-Transfer",
        )
      : t("Pay with Clover", "Payer avec Clover", "Pagar con Clover");

  return (
    <div className="min-h-dvh bg-background">
      <PPPHeader />
      <main className="mx-auto max-w-6xl px-4 pt-20 pb-24 sm:px-6 lg:pt-28">
        <h1 className="font-display text-3xl uppercase leading-none sm:text-5xl">
          {t("Checkout", "Paiement", "Pago")}
        </h1>

        {interacConfirmation ? (
          <InteracHeldPanel confirmation={interacConfirmation} />
        ) : cart.length === 0 ? (
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
                        authenticated={Boolean(customer)}
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

                {customer ? (
                  <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border border-primary p-4">
                    <div>
                      <p className="flex items-center gap-2 font-display text-lg uppercase leading-none">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        {t("Signed in to PPP", "Connecté à PPP", "Conectado a PPP")}
                      </p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {customer.preferredName ? `${customer.preferredName} · ` : ""}
                        {formatPhoneDisplay(customer.phone)} ·{" "}
                        {t("verified number", "numéro vérifié", "número verificado")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground underline focus-ppp"
                    >
                      {t("Not you? Sign out", "Pas vous ? Déconnexion", "¿No eres tú? Salir")}
                    </button>
                  </div>
                ) : (
                  <>
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
                          {t(
                            "Continue as guest",
                            "Continuer sans compte",
                            "Continuar como invitado",
                          )}
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
                          {t(
                            "Sign in with my number",
                            "Me connecter avec mon numéro",
                            "Entrar con mi número",
                          )}
                        </span>
                        <span className="mt-1.5 block text-xs text-muted-foreground">
                          {t(
                            "A text code, no password. Keeps your orders, favourites and addresses.",
                            "Un code par texto, aucun mot de passe. Garde vos commandes, favoris et adresses.",
                            "Un código por SMS, sin contraseña. Guarda tus pedidos, favoritos y direcciones.",
                          )}
                        </span>
                      </button>
                    </div>

                    {identity === "account" && (
                      <div className="step-in mt-4">
                        {accountsAvailable ? (
                          <GuestVerifySheet
                            initialPhone={phone}
                            onCancel={() => setIdentity("guest")}
                          />
                        ) : (
                          <p className="border border-border p-4 text-sm text-muted-foreground">
                            {t(
                              "Phone sign-in is not switched on yet. Finish as a guest today — nothing is lost.",
                              "La connexion par téléphone n'est pas encore activée. Terminez sans compte aujourd'hui.",
                              "El inicio de sesión por teléfono aún no está activo. Continúa como invitado hoy.",
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {(customer || identity === "guest") && (
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
                        readOnly={Boolean(customer)}
                        aria-invalid={phoneMissing || undefined}
                        aria-describedby={phoneMissing ? "checkout-phone-missing" : undefined}
                        className={cn(
                          inputClass,
                          phoneMissing && missingClass,
                          customer && "text-muted-foreground",
                        )}
                      />
                      {phoneMissing && (
                        <span id="checkout-phone-missing" className={missingHintClass}>
                          {t("Phone number required", "Numéro obligatoire", "Teléfono obligatorio")}
                        </span>
                      )}
                    </label>
                  </div>
                )}

                {!customer && identity === "guest" && (
                  <div className="mt-3 border border-dashed border-border px-4 py-3">
                    {showVerify && accountsAvailable ? (
                      <GuestVerifySheet
                        initialPhone={phone}
                        className="border-0 p-0 sm:p-0"
                        onCancel={() => setShowVerify(false)}
                      />
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        {accountsAvailable && (
                          <button
                            type="button"
                            onClick={() => setShowVerify(true)}
                            className="border border-border px-4 py-2 text-[0.65rem] font-bold uppercase tracking-widest focus-ppp"
                          >
                            {t(
                              "Verify my number by text (optional)",
                              "Vérifier mon numéro par texto (facultatif)",
                              "Verificar mi número por SMS (opcional)",
                            )}
                          </button>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {accountsAvailable
                            ? t(
                                "A verified number becomes your PPP account — orders, favourites and addresses follow it.",
                                "Un numéro vérifié devient votre compte PPP — commandes, favoris et adresses le suivent.",
                                "Un número verificado se convierte en tu cuenta PPP — pedidos, favoritos y direcciones lo siguen.",
                              )
                            : t(
                                "We use your number only to confirm the order.",
                                "Nous utilisons votre numéro seulement pour confirmer la commande.",
                                "Usamos tu número solo para confirmar el pedido.",
                              )}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* 3 — payment */}
              <section className="panel-in border border-border p-5">
                <SectionTitle n={3}>{t("Payment", "Paiement", "Pago")}</SectionTitle>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => cardAvailable && setPayment("card")}
                    disabled={!cardAvailable}
                    aria-pressed={payment === "card"}
                    className={`lift-btn border p-4 text-left focus-ppp disabled:cursor-not-allowed disabled:opacity-60 ${
                      payment === "card" ? "border-primary" : "border-border"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-display text-lg uppercase leading-none">
                      <CreditCard className="h-4 w-4 text-primary" />
                      {t("Card (Clover)", "Carte (Clover)", "Tarjeta (Clover)")}
                    </span>
                    <span className="mt-1.5 block text-xs text-muted-foreground">
                      {cardAvailable
                        ? t(
                            "Secure page by Clover. Taxes are added there. Pickup only.",
                            "Page sécurisée de Clover. Les taxes s'ajoutent là. Cueillette seulement.",
                            "Página segura de Clover. Los impuestos se suman allí. Solo para recoger.",
                          )
                        : t(
                            "Online card payment is for pickup. For delivery, use Interac below, or Uber Eats, DoorDash or Skip.",
                            "Le paiement par carte en ligne est pour la cueillette. Pour la livraison : Interac ci-dessous, ou Uber Eats, DoorDash ou Skip.",
                            "El pago con tarjeta en línea es para recoger. Para entrega: Interac abajo, o Uber Eats, DoorDash o Skip.",
                          )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => interacAvailable && setPayment("interac")}
                    disabled={!interacAvailable}
                    aria-pressed={payment === "interac"}
                    className={`lift-btn border p-4 text-left focus-ppp disabled:cursor-not-allowed disabled:opacity-60 ${
                      payment === "interac" ? "border-primary" : "border-border"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-display text-lg uppercase leading-none">
                      <Banknote className="h-4 w-4 text-primary" />
                      {t(
                        "Interac e-Transfer (+ fee)",
                        "Interac e-Transfer (+ frais)",
                        "Interac e-Transfer (+ cargo)",
                      )}
                    </span>
                    <span className="mt-1.5 block text-xs text-muted-foreground">
                      {interacOptions && interacAvailable
                        ? t(
                            `Fee ${money(interacOptions.feeCents)}${interacOptions.feeTaxable ? " + taxes" : ""}, shown in your total before you confirm. You send the transfer after confirming; the restaurant starts your order once it is received.`,
                            `Frais de ${money(interacOptions.feeCents)}${interacOptions.feeTaxable ? " + taxes" : ""}, inclus dans votre total avant de confirmer. Vous envoyez le virement après avoir confirmé; le restaurant lance votre commande dès réception.`,
                            `Cargo de ${money(interacOptions.feeCents)}${interacOptions.feeTaxable ? " + impuestos" : ""}, incluido en tu total antes de confirmar. Envías la transferencia después; el restaurante inicia tu pedido al recibirla.`,
                          )
                        : interacUnavailableReason}
                    </span>
                  </button>
                </div>
                <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {payment === "interac"
                    ? t(
                        "No card is entered here. You will get the recipient, the exact amount and the message to put on the transfer right after confirming — and by text message.",
                        "Aucune carte n'est saisie ici. Vous recevrez le destinataire, le montant exact et le message à inscrire sur le virement tout de suite après la confirmation — et par texto.",
                        "No se ingresa ninguna tarjeta aquí. Recibirás el destinatario, el monto exacto y el mensaje de la transferencia justo después de confirmar — y por SMS.",
                      )
                    : paymentCopy}
                </p>
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
                {quote ? (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {t(
                          "Interac e-Transfer fee",
                          "Frais Interac e-Transfer",
                          "Cargo Interac e-Transfer",
                        )}
                      </dt>
                      <dd>{money(quote.interacFeeCents)}</dd>
                    </div>
                    {quote.deliveryFeeCents > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          {t("Delivery", "Livraison", "Entrega")}
                        </dt>
                        <dd>{money(quote.deliveryFeeCents)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {t("Taxes (GST + QST)", "Taxes (TPS + TVQ)", "Impuestos (GST + QST)")}
                      </dt>
                      <dd>{money(quote.taxCents)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-border pt-3">
                      <dt className="font-display text-lg uppercase leading-none">
                        {t("Total", "Total", "Total")}
                        <span className="ml-2 text-[0.6rem] tracking-widest text-muted-foreground">
                          {t("all included", "tout inclus", "todo incluido")}
                        </span>
                      </dt>
                      <dd className="font-display text-2xl leading-none">
                        {money(quote.totalCents)}
                      </dd>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </dl>

              <button
                onClick={() => void finishOrder()}
                disabled={submitting || (payment === "card" && !cardAvailable)}
                className="cta-motion mt-5 w-full bg-primary px-5 py-4 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp disabled:opacity-60"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                {confirmLabel}
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
                  {payment === "interac"
                    ? t(
                        "Interac e-Transfer · held until received",
                        "Virement Interac · en attente de réception",
                        "Interac e-Transfer · en espera de recepción",
                      )
                    : t(
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

/** After an Interac order: what to send, where, with which message — and what happens next. */
function InteracHeldPanel({ confirmation }: { confirmation: InteracConfirmation }) {
  const { t, lang } = usePPP();
  const rows = interacInstructionRows(confirmation.instructions, lang);
  const text = interacInstructionText(confirmation.instructions, lang);
  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="panel-in border border-primary bg-card p-6 sm:p-8">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
          {t("Order", "Commande", "Pedido")} #{confirmation.orderNumber}
        </p>
        <h2 className="mt-2 flex items-center gap-3 font-display text-3xl uppercase leading-[0.9] sm:text-4xl">
          <Banknote className="h-7 w-7 shrink-0 text-primary" />
          {t("Waiting for your transfer", "En attente du virement", "Esperando tu transferencia")}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {t(
            "Your order is held by the restaurant until the e-Transfer arrives. Send it now from your bank app with the details below; the restaurant starts your order once it is received and confirms by text message.",
            "Votre commande est réservée par le restaurant jusqu'à l'arrivée du virement. Envoyez-le maintenant depuis votre application bancaire avec les détails ci-dessous; le restaurant lance votre commande dès réception et confirme par texto.",
            "El restaurante retiene tu pedido hasta que llegue la transferencia. Envíala ahora desde tu app bancaria con los datos de abajo; el restaurante inicia tu pedido al recibirla y confirma por SMS.",
          )}
        </p>
        <dl className="mt-5 grid gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.key} className="border border-border p-4">
              <dt className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
                {row.label}
              </dt>
              <dd
                className={cn(
                  "mt-1 break-words",
                  row.key === "amount" ? "font-display text-3xl leading-none" : "text-sm",
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        {text ? <p className="mt-4 text-sm text-muted-foreground">{text}</p> : null}
        <p className="mt-4 text-xs text-muted-foreground">
          {t(
            "Not received in time? The restaurant cancels the order and lets you know by text. A late transfer is handled by a person, never kept silently.",
            "Virement non reçu à temps ? Le restaurant annule la commande et vous prévient par texto. Un virement en retard est traité par une personne, jamais gardé en silence.",
            "¿No llega a tiempo? El restaurante cancela el pedido y te avisa por SMS. Una transferencia tardía la atiende una persona, nunca se queda en silencio.",
          )}
        </p>
      </div>
      <aside className="panel-in border border-border p-5">
        <h3 className="font-display text-2xl uppercase leading-none">
          {t("Keep these details", "Gardez ces détails", "Guarda estos datos")}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "They stay on your receipt page, and the restaurant texts them to you too.",
            "Ils restent sur votre page de reçu, et le restaurant vous les texte aussi.",
            "Quedan en tu página de recibo y el restaurante también te los envía por SMS.",
          )}
        </p>
        <Link
          to="/orders/$orderId"
          params={{ orderId: confirmation.orderId }}
          className="mt-4 block bg-primary px-5 py-3.5 text-center font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
        >
          {t("View my receipt", "Voir mon reçu", "Ver mi recibo")}
        </Link>
        <Link
          to="/order"
          className="mt-2 block border border-border px-5 py-3 text-center font-display text-lg uppercase leading-none focus-ppp hover:border-primary"
        >
          {t("Back to the menu", "Retour au menu", "Volver al menú")}
        </Link>
      </aside>
    </section>
  );
}
