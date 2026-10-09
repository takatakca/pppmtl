import { createFileRoute } from "@tanstack/react-router";
import { FranchiseShell } from "@/components/franchise/franchise-shell";
import { KitchenView } from "@/components/franchise/brand-store";
import { KITCHENS, defaultKitchen, listKitchens, type KitchenId } from "@/config/brands";
import { useBrand } from "@/context/brand";
import { currentBrand } from "@/lib/brand/current";
import { brandsInKitchen } from "@/lib/brand/facts";
import { kitchenListJsonLd } from "@/lib/brand/schema";
import { canonicalUrl } from "@/config/site";
import { currentOrigin } from "@/lib/brand/current";

/** Every restaurant of a kitchen in one list (?cuisine=ndg | st-leonard). */
export const Route = createFileRoute("/marques/")({
  validateSearch: (search: Record<string, unknown>): { cuisine?: KitchenId | undefined } => ({
    cuisine:
      search["cuisine"] === "st-leonard"
        ? "st-leonard"
        : search["cuisine"] === "ndg"
          ? "ndg"
          : undefined,
  }),
  head: ({ match }) => {
    const kitchen: KitchenId = defaultKitchen(currentBrand(), match.search.cuisine);
    const k = KITCHENS[kitchen];
    const title = `Tous nos restaurants · ${k.labelFr}, Montréal`;
    const description = `Les restaurants de notre cuisine ${k.area} (${k.street}, ${k.city}) : un seul panier, une seule commande.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: canonicalUrl("/marques") },
      ],
      links: [{ rel: "canonical", href: canonicalUrl("/marques") }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            kitchenListJsonLd(currentOrigin(), brandsInKitchen(kitchen), k.labelFr),
          ),
        },
      ],
    };
  },
  component: KitchenPage,
});

function KitchenPage() {
  const { cuisine } = Route.useSearch();
  const site = useBrand();
  return (
    <FranchiseShell>
      <KitchenView kitchen={defaultKitchen(site, cuisine)} options={listKitchens(site)} />
    </FranchiseShell>
  );
}
