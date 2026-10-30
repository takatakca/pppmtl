import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Gift, Heart, Loader2, LogOut, MapPin, Star, Trash2 } from "lucide-react";
import { LocationPreference } from "@/components/account/location-preference";
import { MarketingPreferencesPanel } from "@/components/account/marketing-preferences";
import { usePPP } from "@/context/ppp-store";
import { useCustomerSession } from "@/lib/customer/session";
import { addressRepository, favoriteRepository } from "@/lib/customer/repositories";
import { formatPhoneDisplay } from "@/lib/customer/token";
import { pppBusiness } from "@/config/business";
import type { RestaurantCustomer } from "@/lib/customer/types";
import { listMyOrders, type OrderView } from "@/lib/orders/orders.functions";
import { menuRepository } from "@/lib/menu-repository";
import { localizedName } from "@/lib/search";

/**
 * Signed-in /account. Everything here comes from Food Hub's `GET /customers/me` (the session profile): the
 * customer, addresses, favourites, the website orders held at Food Hub, and the loyalty / gift-card adapters,
 * which answer truthfully (`connected: false` with a reason) until LOY4LTY / REW4RDS are plugged in. The
 * verified phone number is the key everything will attach to. Nothing is faked, no balance is invented.
 */
export function MemberDashboard({ customer }: { customer: RestaurantCustomer }) {
  const { t, tr, lang, reorderToCart } = usePPP();
  const { profile, refresh, signOut, deleteAccount } = useCustomerSession();
  const name = customer.preferredName ?? customer.firstName ?? customer.username ?? "";
  const [orders, setOrders] = useState<OrderView[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Receipts this browser placed (signed guest grants) — Food Hub's list below is the cross-device one.
  useEffect(() => {
    let alive = true;
    listMyOrders({ data: { customerId: null, phone: customer.phone } })
      .then((result) => {
        if (alive) setOrders(result.orders);
      })
      .catch(() => {
        if (alive) setOrders([]);
      });
    return () => {
      alive = false;
    };
  }, [customer.phone]);

  const favourites = profile?.favourites ?? [];
  const favouriteItems = favourites
    .map((id) => menuRepository.getItem(id))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const addresses = profile?.addresses ?? [];
  const foodhubOrders = profile?.orders ?? [];
  const loyalty = profile?.loyalty ?? { connected: false as const, reason: "" };
  const giftCards = profile?.giftCards ?? { connected: false as const, reason: "" };

  const handleReorder = (order: OrderView) => {
    reorderToCart(
      order.items.map((i) => ({
        itemId: i.productId,
        quantity: i.quantity,
        notes: i.notes,
        selections: i.selections,
      })),
    );
  };

  async function removeFavourite(itemId: string) {
    setBusy(`fav:${itemId}`);
    setNotice(null);
    const result = await favoriteRepository.saveAll(favourites.filter((id) => id !== itemId));
    if (!result.ok) setNotice(result.message);
    await refresh();
    setBusy(null);
  }

  async function removeAddress(id: string) {
    setBusy(`addr:${id}`);
    setNotice(null);
    const result = await addressRepository.saveAll(
      addresses
        .filter((a) => a.id !== id)
        .map((a) => ({
          label: a.label,
          street: a.street,
          unit: a.unit,
          city: a.city,
          province: a.province,
          postalCode: a.postalCode,
          instructions: a.instructions,
          isDefault: a.isDefault,
        })),
    );
    if (!result.ok) setNotice(result.message);
    await refresh();
    setBusy(null);
  }

  async function handleDelete() {
    setBusy("delete");
    setNotice(null);
    const result = await deleteAccount();
    setBusy(null);
    if (!result.ok) {
      setConfirmDelete(false);
      setNotice(
        result.message ??
          t("The account was not deleted. Try again.", "Le compte n'a pas été supprimé. Réessayez."),
      );
    }
  }

  const dateFor = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "fr" ? "fr-CA" : lang === "es" ? "es" : "en-CA", {
      month: "short",
      day: "numeric",
    });
  const money = (dollars: number) =>
    lang === "fr" ? `${dollars.toFixed(2).replace(".", ",")} $` : `$${dollars.toFixed(2)}`;

  return (
    <>
      <section className="border border-border bg-primary p-6 sm:p-10">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-primary-foreground/80">
          PPP {pppBusiness.shortLocationName}
        </p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-[0.85] text-primary-foreground sm:text-7xl">
          {t("Hey", "Salut", "Hola")} {name}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-primary-foreground/90">
          {t(
            "Everything PPP knows about how you like to order, in one place — kept by TAKATAK Food Hub, keyed on your verified number.",
            "Tout ce que PPP sait de vos habitudes de commande, au même endroit — conservé par TAKATAK Food Hub, rattaché à votre numéro vérifié.",
            "Todo lo que PPP sabe sobre cómo te gusta pedir, en un solo lugar — guardado por TAKATAK Food Hub con tu número verificado.",
          )}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/order"
            className="press-tap cta-glow bg-background px-6 py-3.5 font-display text-xl uppercase leading-none focus-ppp"
          >
            {t("Start an order", "Commencer une commande", "Empezar un pedido")}
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="press-tap inline-flex items-center gap-2 border border-primary-foreground/40 px-6 py-3.5 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
          >
            <LogOut className="h-4 w-4" />
            {t("Sign out", "Déconnexion", "Cerrar sesión")}
          </button>
        </div>
      </section>

      {notice && (
        <p role="alert" className="mt-2 border border-border bg-card p-3 text-sm text-muted-foreground">
          {notice}
        </p>
      )}

      {/* Loyalty: truthful state from Food Hub's adapter */}
      <section className="mt-2 border border-border bg-card p-5">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
          {t("PPP Rewards", "Points PPP", "Recompensas PPP")}
        </p>
        <h2 className="mt-1 font-display text-3xl uppercase leading-none">
          {loyalty.connected
            ? t("Your points", "Vos points", "Tus puntos")
            : t("Points — coming soon", "Points — bientôt", "Puntos — próximamente")}
        </h2>
        <div className="mt-3 flex items-center gap-4 border border-dashed border-border p-4">
          <Star className={`h-8 w-8 shrink-0 ${loyalty.connected ? "text-primary" : "text-muted-foreground"}`} />
          {loyalty.connected ? (
            <p className="text-sm">
              <span className="font-display text-3xl leading-none">{loyalty.points}</span>{" "}
              <span className="text-muted-foreground">
                {t("points", "points", "puntos")}
                {loyalty.tier ? ` · ${loyalty.tier}` : ""}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(
                "The loyalty program is not connected yet, so there is no balance to show. Your verified phone number is the key it will use.",
                "Le programme de fidélité n'est pas encore branché, donc aucun solde à afficher. Votre numéro de téléphone vérifié sera la clé.",
                "El programa de fidelidad aún no está conectado, así que no hay saldo que mostrar. Tu número verificado será la clave.",
              )}
              {loyalty.reason ? (
                <span className="mt-1 block text-[0.7rem] uppercase tracking-widest text-muted-foreground/70">
                  {loyalty.reason}
                </span>
              ) : null}
            </p>
          )}
        </div>
      </section>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        {/* Orders held at Food Hub for this number + receipts from this browser */}
        <section className="border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl uppercase leading-none">{tr("account.orders")}</h2>
          </div>
          {foodhubOrders.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {foodhubOrders.slice(0, 5).map((order) => (
                <li key={order.id} className="border border-border p-3">
                  <p className="font-display text-lg uppercase leading-none">#{order.number}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dateFor(order.at)}
                    {order.total !== null ? ` · ${money(order.total)}` : ""}
                    {order.fulfillment ? ` · ${order.fulfillment}` : ""} · {order.status}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
          {orders && orders.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {orders.slice(0, 4).map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between border border-border p-3"
                >
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="min-w-0 flex-1 focus-ppp"
                  >
                    <p className="font-display text-lg uppercase leading-none">
                      #{order.orderNumber ?? order.id}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{dateFor(order.createdAt)}</p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleReorder(order)}
                    className="ml-3 border border-border px-3 py-2 text-[0.6rem] font-bold uppercase tracking-widest focus-ppp hover:border-primary"
                  >
                    {tr("orders.reorder")}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {foodhubOrders.length === 0 && (!orders || orders.length === 0) && (
            <div className="mt-3 border border-dashed border-border p-4 text-center">
              <p className="text-sm text-muted-foreground">{tr("orders.noOrders")}</p>
              <Link
                to="/order"
                className="mt-2 inline-block text-sm font-bold uppercase tracking-widest text-primary"
              >
                {tr("orders.startOrder")}
              </Link>
            </div>
          )}
          <Link
            to="/orders"
            className="mt-3 inline-block text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            {tr("orders.viewReceipt")} →
          </Link>
        </section>

        {/* Favourites (Food Hub) */}
        <section className="border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl uppercase leading-none">
              {tr("favourites.title")}
            </h2>
          </div>
          {favouriteItems.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {favouriteItems.slice(0, 6).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between border border-border p-3"
                >
                  <Link to="/order" className="min-w-0 flex-1 focus-ppp">
                    <p className="font-display text-lg uppercase leading-none">
                      {localizedName(item, lang)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.price !== null ? `$${item.price.toFixed(2)}` : ""}
                    </p>
                  </Link>
                  <button
                    type="button"
                    aria-label={tr("favourites.remove")}
                    disabled={busy === `fav:${item.id}`}
                    onClick={() => void removeFavourite(item.id)}
                    className="ml-3 p-2 text-muted-foreground focus-ppp hover:text-destructive disabled:opacity-50"
                  >
                    {busy === `fav:${item.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 border border-dashed border-border p-4 text-center">
              <p className="text-sm text-muted-foreground">{tr("favourites.empty")}</p>
              <p className="text-xs text-muted-foreground">{tr("favourites.emptyBody")}</p>
            </div>
          )}
        </section>

        {/* Saved addresses (Food Hub, max 5) */}
        <section className="border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl uppercase leading-none">
              {tr("addresses.title")}
            </h2>
          </div>
          {addresses.length > 0 ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {addresses.map((address) => (
                <li key={address.id} className="border border-border p-3">
                  <p className="font-display text-lg uppercase leading-none">
                    {address.label ?? address.street}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {address.street}
                    {address.unit ? `, ${address.unit}` : ""}
                    <br />
                    {address.city}, {address.province} {address.postalCode}
                  </p>
                  <button
                    type="button"
                    disabled={busy === `addr:${address.id}`}
                    onClick={() => void removeAddress(address.id)}
                    className="mt-2 inline-flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground focus-ppp hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    {tr("addresses.remove")}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 border border-dashed border-border p-4 text-center">
              <p className="text-sm text-muted-foreground">{tr("addresses.empty")}</p>
              <p className="text-xs text-muted-foreground">{tr("addresses.emptyBody")}</p>
            </div>
          )}
        </section>

        {/* Gift cards: truthful state from Food Hub's adapter */}
        <section className="border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl uppercase leading-none">
              {t("Gift cards", "Cartes-cadeaux", "Tarjetas de regalo")}
            </h2>
          </div>
          <div className="mt-3 flex items-center gap-4 border border-dashed border-border p-4">
            <Gift className={`h-8 w-8 shrink-0 ${giftCards.connected ? "text-primary" : "text-muted-foreground"}`} />
            {giftCards.connected ? (
              giftCards.cards.length > 0 ? (
                <ul className="text-sm">
                  {giftCards.cards.map((card) => (
                    <li key={card.last4}>
                      •••• {card.last4} — {money(card.balance)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "No gift card is attached to your number yet.",
                    "Aucune carte-cadeau n'est rattachée à votre numéro pour l'instant.",
                    "Aún no hay una tarjeta de regalo vinculada a tu número.",
                  )}
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(
                  "Gift-card purchases are not available online yet. Contact the restaurant for current options.",
                  "L’achat des cartes-cadeaux en ligne n’est pas encore disponible. Communiquez avec le restaurant pour connaître les options.",
                  "La compra de tarjetas de regalo en línea aún no está disponible. Contacta al restaurante para conocer las opciones.",
                )}
                {giftCards.reason ? (
                  <span className="mt-1 block text-[0.7rem] uppercase tracking-widest text-muted-foreground/70">
                    {giftCards.reason}
                  </span>
                ) : null}
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <LocationPreference />
        <MarketingPreferencesPanel />
      </div>

      <section className="mt-2 border border-border bg-card p-5">
        <h2 className="font-display text-3xl uppercase leading-none">
          {t("Your details", "Vos informations", "Tus datos")}
        </h2>
        <dl className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="border border-border p-4">
            <dt className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
              {t("Preferred name", "Nom d'usage", "Nombre preferido")}
            </dt>
            <dd className="mt-1 font-display text-2xl uppercase">{name}</dd>
            <p className="mt-1 text-[0.7rem] text-muted-foreground">
              {t(
                "Set once. Contact PPP Help to change it.",
                "Défini une seule fois. Contactez l'aide PPP pour le modifier.",
              )}
            </p>
          </div>
          <div className="border border-border p-4">
            <dt className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
              {t("Verified mobile", "Cellulaire vérifié", "Celular verificado")}
            </dt>
            <dd className="mt-1 text-sm">{formatPhoneDisplay(customer.phone)}</dd>
            <p className="mt-1 text-[0.7rem] text-muted-foreground">
              {t(
                "Your account key. A text code signs you in on any device.",
                "La clé de votre compte. Un code par texto vous connecte sur tout appareil.",
              )}
            </p>
          </div>
          <div className="border border-border p-4">
            <dt className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
              {t("Email", "Courriel", "Correo electrónico")}
            </dt>
            <dd className="mt-1 break-all text-sm">
              {customer.email ?? (
                <span className="text-muted-foreground">{t("Not set", "Non renseigné", "Sin definir")}</span>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
            {t("Your data (Québec Law 25)", "Vos données (Loi 25)", "Tus datos (Ley 25)")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "PPP keeps no customer database. Deleting your account anonymises it at TAKATAK Food Hub (number, name, e-mail, addresses, favourites and consent removed; order history stays without you) and signs you out everywhere.",
              "PPP ne garde aucune base de clients. Supprimer votre compte l'anonymise chez TAKATAK Food Hub (numéro, nom, courriel, adresses, favoris et consentement effacés; l'historique des commandes reste sans vous) et vous déconnecte partout.",
              "PPP no guarda ninguna base de clientes. Eliminar tu cuenta la anonimiza en TAKATAK Food Hub (número, nombre, correo, direcciones, favoritos y consentimiento borrados; el historial queda sin ti) y cierra tu sesión en todos lados.",
            )}
          </p>
          {confirmDelete ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy === "delete"}
                onClick={() => void handleDelete()}
                className="press-tap inline-flex items-center gap-2 border border-destructive px-4 py-2 text-[0.65rem] font-bold uppercase tracking-widest text-destructive focus-ppp disabled:opacity-50"
              >
                {busy === "delete" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {t("Yes, delete my account", "Oui, supprimer mon compte", "Sí, eliminar mi cuenta")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="press-tap border border-border px-4 py-2 text-[0.65rem] font-bold uppercase tracking-widest focus-ppp"
              >
                {t("Keep it", "Garder", "Conservar")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="press-tap mt-3 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground underline focus-ppp hover:text-destructive"
            >
              {t("Delete my account", "Supprimer mon compte", "Eliminar mi cuenta")}
            </button>
          )}
        </div>
      </section>
    </>
  );
}
