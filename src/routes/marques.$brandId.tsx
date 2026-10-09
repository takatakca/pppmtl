import { createFileRoute, notFound } from "@tanstack/react-router";
import { FranchiseShell } from "@/components/franchise/franchise-shell";
import { BrandStorePage } from "@/components/franchise/brand-store";
import { BRANDS, brandOrigin, type Brand } from "@/config/brands";
import { brandJsonLd } from "@/lib/brand/schema";
import { currentOrigin } from "@/lib/brand/current";

function findBrand(id: string): Brand | undefined {
  return BRANDS.find((b) => b.id === id && b.id !== "ppp");
}

/**
 * A brand's store page inside any of the group's sites (same cart, same checkout). Its canonical address is the
 * brand's own domain, so search engines index one page per brand.
 */
export const Route = createFileRoute("/marques/$brandId")({
  beforeLoad: ({ params }) => {
    if (!findBrand(params.brandId)) throw notFound();
  },
  head: ({ params }) => {
    const brand = findBrand(params.brandId);
    if (!brand) return {};
    const title = `${brand.name} | ${brand.cuisine.fr.join(", ")} · Montréal`;
    const canonical = `${brandOrigin(brand)}/`;
    return {
      meta: [
        { title },
        { name: "description", content: brand.description.fr },
        { property: "og:title", content: title },
        { property: "og:description", content: brand.description.fr },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(brandJsonLd(brand)) }],
    };
  },
  component: BrandPage,
});

function BrandPage() {
  const { brandId } = Route.useParams();
  const brand = findBrand(brandId)!;
  return (
    <FranchiseShell>
      <BrandStorePage brand={brand} origin={currentOrigin()} />
    </FranchiseShell>
  );
}
