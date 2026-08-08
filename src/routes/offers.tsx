import { createFileRoute, Link } from "@tanstack/react-router";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { MenuImage } from "@/components/menu/menu-item-image";
import { usePPP } from "@/context/ppp-store";
import { getDiscountedItems } from "@/lib/promotions";
import { localizedDescription, localizedName } from "@/lib/search";
import { orderSearch } from "@/lib/order-links";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Offers & Deals | PPP Pizzeria NDG Montréal" },
      {
        name: "description",
        content:
          "Every current PPP NDG discount in one place — reduced fried chicken combos, pizza promos and more, for pickup or delivery from 6280 Av. Somerled.",
      },
      { property: "og:title", content: "Offers & Deals | PPP Pizzeria NDG" },
      {
        property: "og:description",
        content: "All current PPP Notre-Dame-de-Grâce discounts, straight from the menu.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/offers" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/offers" }],
  }),
  component: OffersPage,
});

function OffersPage() {
  const { lang, locationId, t } = usePPP();
  const deals = getDiscountedItems(locationId);

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <PPPHeader />
      <main className="mx-auto max-w-[110rem] px-3 pt-24 sm:px-6 lg:pt-28">
        <h1 className="font-display text-5xl uppercase leading-[0.85] sm:text-7xl">
          {t("Deals on now", "Rabais en cours")}
          <span className="block text-flame">
            {deals.length} {t("items", "articles")}
          </span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          {t(
            "Every price below is a real reduction published on our Notre-Dame-de-Grâce menu.",
            "Chaque prix ci-dessous est une réduction réelle publiée sur notre menu de Notre-Dame-de-Grâce.",
          )}
        </p>

        {deals.length === 0 ? (
          <p className="mt-8 border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t(
              "No discounts are running right now — browse the full menu instead.",
              "Aucun rabais en cours — parcourez le menu complet.",
            )}
          </p>
        ) : (
          <ul className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {deals.map(({ item, percent, save }) => (
              <li key={item.id}>
                <Link
                  to="/order"
                  search={orderSearch({ item: item.id })}
                  className="press-tap flex h-full items-stretch gap-3 border border-border bg-card transition-colors hover:border-primary focus-ppp"
                >
                  <MenuImage src={item.image} alt={localizedName(item, lang)} variant="list" />
                  <span className="min-w-0 flex-1 py-3 pr-3">
                    <span className="inline-block bg-primary px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-primary-foreground">
                      −{percent}% · {t("save", "économisez")} ${save.toFixed(2)}
                    </span>
                    <span className="mt-1 block font-display text-lg uppercase leading-tight">
                      {localizedName(item, lang)}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                      {localizedDescription(item, lang)}
                    </span>
                    <span className="mt-2 flex items-baseline gap-2">
                      <span className="font-display text-2xl leading-none text-flame">
                        ${(item.price as number).toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground line-through">
                        ${(item.compareAtPrice as number).toFixed(2)}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <PPPFooter />
      <MobileOrderBar />
      <SearchOverlay />
      <LocationSheet />
      <OrderSheet />
    </div>
  );
}
