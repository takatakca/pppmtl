import { createFileRoute, redirect } from "@tanstack/react-router";
import { adminAuthStatus } from "@/lib/security/admin.functions";
import { auditMenu } from "@/lib/menu-audit";

export const Route = createFileRoute("/dev/menu-audit")({
  // Client-side navigation must not bypass the SSR /dev access boundary.
  beforeLoad: async () => {
    const { authenticated } = await adminAuthStatus();
    if (!authenticated) throw redirect({ to: "/admin/sign-in" });
  },
  head: () => ({
    meta: [
      { title: "Menu source audit (internal) | PPP NDG" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Internal reconciliation of the PPP NDG catalog." },
      { property: "og:title", content: "Menu source audit (internal)" },
      { property: "og:description", content: "Internal reconciliation of the PPP NDG catalog." },
    ],
  }),
  component: MenuAuditPage,
});

function Row({ label, value, bad }: { label: string; value: string | number; bad?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-border py-1.5 text-sm">
      <span className="min-w-0 truncate uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className={`font-display text-lg leading-none ${bad ? "text-primary" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function MenuAuditPage() {
  const a = auditMenu();
  return (
    <div className="min-h-dvh bg-background px-4 py-10 sm:px-8">
      <main className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl uppercase leading-none">Menu source audit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Internal only. Source storefront: {a.storefront.name} — {a.storefront.address}.{" "}
          {a.storefront.note}
        </p>

        <h2 className="mt-8 font-display text-2xl uppercase">Reconciliation</h2>
        <Row label="Source-visible placements" value={a.sourceVisiblePlacements} />
        <Row label="Canonical unique products" value={a.canonicalUniqueItems} />
        <Row label="Difference" value={a.difference} />
        <Row label="Category placements" value={a.categoryPlacements} />
        <Row label="Duplicate placements normalized" value={a.duplicatePlacements} />
        <Row label="Most Ordered duplicates" value={a.mostOrderedDuplicates} />
        <Row label="Promo / featured duplicates" value={a.promoDuplicates} />
        <Row label="Variant placements" value={a.variantPlacements} />
        <Row label="Cross-category placements" value={a.crossCategoryPlacements} />
        <Row
          label="Unclassified placements"
          value={a.unclassifiedPlacements}
          bad={a.unclassifiedPlacements > 0}
        />
        <Row label="Excluded placements" value={a.excludedPlacements} />
        <Row
          label="Category counts match source"
          value={a.categoryCountsMatchSource ? "yes" : "NO"}
          bad={!a.categoryCountsMatchSource}
        />

        <h2 className="mt-8 font-display text-2xl uppercase">Catalog health</h2>
        <Row label="Categories" value={a.categoryCount} />
        <Row label="Collections" value={a.collectionCount} />
        <Row label="Priced" value={a.priced} />
        <Row label="Price unknown" value={a.priceUnknown} />
        <Row label="Compare-at prices" value={a.compareAtPrices} />
        <Row label="Discounted items" value={a.discounted} />
        <Row label="Descriptions" value={a.descriptions} />
        <Row label="Images present" value={a.imagesPresent} />
        <Row label="Images missing" value={a.imagesMissing} bad={a.imagesMissing > 0} />
        <Row label="Modifiers confirmed" value={a.modifiersConfirmed} />
        <Row label="Modifiers partial (no published deltas)" value={a.modifiersPartial} />
        <Row label="Modifiers unavailable" value={a.modifiersUnavailable} />
        <Row label="Orphan products" value={a.orphanItems} bad={a.orphanItems > 0} />
        <Row
          label="Uncategorized products"
          value={a.uncategorizedItems}
          bad={a.uncategorizedItems > 0}
        />
        <Row label="Broken product ids" value={a.brokenIds} bad={a.brokenIds > 0} />
        <Row label="Duplicate ids" value={a.duplicateIds} bad={a.duplicateIds > 0} />
        <Row label="Search index count" value={a.searchIndexCount} />

        <h2 className="mt-8 font-display text-2xl uppercase">Categories</h2>
        {a.categories.map((c) => (
          <Row
            key={c.id}
            label={c.name}
            value={`${c.extracted} / ${c.declared}`}
            bad={!c.matches}
          />
        ))}

        <h2 className="mt-8 font-display text-2xl uppercase">Duplicate placements</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {a.duplicates.map((d) => (
            <li key={`${d.placement}-${d.itemId}`}>
              {d.placement} → {d.canonicalName} ({d.canonicalCategoryId}) · {d.reason}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
