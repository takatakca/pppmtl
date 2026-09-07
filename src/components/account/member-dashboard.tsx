import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Gift, Heart, LogOut, MapPin, Star, Trash2 } from "lucide-react";
import { LocationPreference } from "@/components/account/location-preference";
import { MarketingPreferencesPanel } from "@/components/account/marketing-preferences";
import { usePPP } from "@/context/ppp-store";
import { useCustomerSession } from "@/lib/customer/session";
import { pppBusiness } from "@/config/business";
import type { RestaurantCustomer } from "@/lib/customer/types";
import { listMyOrders, type OrderView } from "@/lib/orders/orders.functions";
import { menuRepository } from "@/lib/menu-repository";
import { localizedName } from "@/lib/search";

export function MemberDashboard({ customer }: { customer: RestaurantCustomer }) {
  const { t, tr, favourites, savedAddresses, removeFavourite, removeSavedAddress, reorderToCart } =
    usePPP();
  const { signOut } = useCustomerSession();
  const name = customer.preferredName ?? customer.firstName ?? customer.username ?? "";
  const [orders, setOrders] = useState<OrderView[] | null>(null);

  useEffect(() => {
    let alive = true;
    listMyOrders({ data: { customerId: customer.id ?? null, phone: customer.phone ?? null } })
      .then((result) => {
        if (alive) setOrders(result.orders);
      })
      .catch(() => {
        if (alive) setOrders([]);
      });
    return () => {
      alive = false;
    };
  }, [customer.id, customer.phone]);

  const favouriteItems = favourites
    .map((id) => menuRepository.getItem(id))
    .filter((item): item is NonNullable<typeof item> => item !== null);

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
            "Everything PPP knows about how you like to order, in one place.",
            "Tout ce que PPP sait de vos habitudes de commande, au même endroit.",
            "Todo lo que PPP sabe sobre cómo te gusta pedir, en un solo lugar.",
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

      <section className="mt-2 border border-border bg-card p-5">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
          {t("PPP Rewards", "Points PPP", "Recompensas PPP")}
        </p>
        <h2 className="mt-1 font-display text-3xl uppercase leading-none">
          {t("Your rewards progress", "Votre progression", "Tu progreso de recompensas")}
        </h2>
        <div className="mt-3 flex items-center gap-4 border border-dashed border-border p-4">
          <Star className="h-8 w-8 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t(
              "No points yet. Order directly from PPP to start earning.",
              "Aucun point pour l'instant. Commandez directement chez PPP pour en gagner.",
              "Aún no hay puntos. Pide directamente en PPP para empezar a acumular.",
            )}
          </p>
        </div>
      </section>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        {/* Orders */}
        <section className="border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl uppercase leading-none">
              {tr("account.orders")}
            </h2>
          </div>
          {orders && orders.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {orders.slice(0, 4).map((order) => (
                <li key={order.id} className="flex items-center justify-between border border-border p-3">
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="min-w-0 flex-1 focus-ppp"
                  >
                    <p className="font-display text-lg uppercase leading-none">
                      #{order.orderNumber ?? order.id}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
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
          ) : (
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

        {/* Favourites */}
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
                <li key={item.id} className="flex items-center justify-between border border-border p-3">
                  <Link to="/order" className="min-w-0 flex-1 focus-ppp">
                    <p className="font-display text-lg uppercase leading-none">
                      {localizedName(item, "en")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.price !== null ? `$${item.price.toFixed(2)}` : ""}
                    </p>
                  </Link>
                  <button
                    type="button"
                    aria-label={tr("favourites.remove")}
                    onClick={() => removeFavourite(item.id)}
                    className="ml-3 p-2 text-muted-foreground focus-ppp hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
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

        {/* Saved addresses */}
        <section className="border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl uppercase leading-none">
              {tr("addresses.title")}
            </h2>
          </div>
          {savedAddresses.length > 0 ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {savedAddresses.map((address) => (
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
                    onClick={() => removeSavedAddress(address.id)}
                    className="mt-2 inline-flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground focus-ppp hover:text-destructive"
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

        {/* Gift cards */}
        <section className="border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl uppercase leading-none">
              {t("Gift cards", "Cartes-cadeaux", "Tarjetas de regalo")}
            </h2>
          </div>
          <div className="mt-3 flex items-center gap-4 border border-dashed border-border p-4">
            <Gift className="h-8 w-8 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t(
                "Buy, send and redeem PPP gift cards.",
                "Achetez, offrez et utilisez des cartes PPP.",
                "Compra, envía y usa tarjetas de regalo PPP.",
              )}
            </p>
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
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
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
              {t("Email", "Courriel", "Correo electrónico")}
            </dt>
            <dd className="mt-1 break-all text-sm">{customer.email}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
