import { Link } from "@tanstack/react-router";
import { Clock, Gift, Heart, LogOut, MapPin, Star } from "lucide-react";
import { LocationPreference } from "@/components/account/location-preference";
import { MarketingPreferencesPanel } from "@/components/account/marketing-preferences";
import { usePPP } from "@/context/ppp-store";
import { useCustomerSession } from "@/lib/customer/session";
import { pppBusiness } from "@/config/business";
import type { RestaurantCustomer } from "@/lib/customer/types";

/**
 * Signed-in "My PPP" dashboard. Empty states say plainly that there is
 * nothing yet instead of inventing points, orders or favourites.
 */
export function MemberDashboard({ customer }: { customer: RestaurantCustomer }) {
  const { t } = usePPP();
  const { signOut } = useCustomerSession();
  const name = customer.preferredName ?? customer.firstName ?? customer.username ?? "";

  const empties = [
    {
      icon: Clock,
      title: t("Order again", "Recommander"),
      body: t(
        "No PPP Direct orders yet. Your first one lands here for one-tap reordering.",
        "Aucune commande PPP Direct. La première apparaîtra ici pour recommander en une touche.",
      ),
    },
    {
      icon: Heart,
      title: t("Favourites", "Favoris"),
      body: t(
        "Tap the heart on any item to pin it here.",
        "Touchez le cœur d'un article pour l'épingler ici.",
      ),
    },
    {
      icon: MapPin,
      title: t("Saved addresses", "Adresses enregistrées"),
      body: t(
        "Add a delivery address at checkout and it stays saved here.",
        "Ajoutez une adresse au paiement et elle sera enregistrée ici.",
      ),
    },
    {
      icon: Gift,
      title: t("Gift cards", "Cartes-cadeaux"),
      body: t(
        "Buy, send and redeem PPP gift cards.",
        "Achetez, offrez et utilisez des cartes PPP.",
      ),
    },
  ];

  return (
    <>
      <section className="border border-border bg-primary p-6 sm:p-10">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-primary-foreground/80">
          PPP {pppBusiness.shortLocationName}
        </p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-[0.85] text-primary-foreground sm:text-7xl">
          {t("Hey", "Salut")} {name}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-primary-foreground/90">
          {t(
            "Everything PPP knows about how you like to order, in one place.",
            "Tout ce que PPP sait de vos habitudes de commande, au même endroit.",
          )}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/order"
            className="press-tap cta-glow bg-background px-6 py-3.5 font-display text-xl uppercase leading-none focus-ppp"
          >
            {t("Start an order", "Commencer une commande")}
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="press-tap inline-flex items-center gap-2 border border-primary-foreground/40 px-6 py-3.5 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
          >
            <LogOut className="h-4 w-4" />
            {t("Sign out", "Déconnexion")}
          </button>
        </div>
      </section>

      <section className="mt-2 border border-border bg-card p-5">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
          {t("PPP Rewards", "Points PPP")}
        </p>
        <h2 className="mt-1 font-display text-3xl uppercase leading-none">
          {t("Your rewards progress", "Votre progression")}
        </h2>
        <div className="mt-3 flex items-center gap-4 border border-dashed border-border p-4">
          <Star className="h-8 w-8 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t(
              "No points yet. Order directly from PPP to start earning.",
              "Aucun point pour l'instant. Commandez directement chez PPP pour en gagner.",
            )}
          </p>
        </div>
      </section>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {empties.map((p) => (
          <section key={p.title} className="border border-border bg-card p-5">
            <p.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-3 font-display text-2xl uppercase leading-none">{p.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <LocationPreference />
        <MarketingPreferencesPanel />
      </div>

      <section className="mt-2 border border-border bg-card p-5">
        <h2 className="font-display text-3xl uppercase leading-none">
          {t("Your details", "Vos informations")}
        </h2>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="border border-border p-4">
            <dt className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
              {t("Preferred name", "Nom d'usage")}
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
              {t("Email", "Courriel")}
            </dt>
            <dd className="mt-1 break-all text-sm">{customer.email}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
