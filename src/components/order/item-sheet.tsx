import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import type { MenuItem } from "@/data/menu";
import { usePPP } from "@/context/ppp-store";
import { MenuImage } from "@/components/menu/menu-item-image";
import type { LineSelections } from "@/lib/cart";
import { menuRepository } from "@/lib/menu-repository";

/**
 * Mobile: full-height bottom sheet. Desktop: centred panel. No modifier group
 * is invented — options are only described in the item's published text.
 */
export function ItemSheet({
  item,
  onClose,
  onSelectItem,
}: {
  item: MenuItem | null;
  onClose: () => void;
  /** Swap the sheet to a paired item without leaving the flow. */
  onSelectItem?: (item: MenuItem) => void;
}) {
  const { lang, t, addToCart, locationId } = usePPP();
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [selections, setSelections] = useState<LineSelections>({});

  useEffect(() => {
    setQty(1);
    setNotes("");
    setSelections({});
  }, [item?.id]);

  useEffect(() => {
    if (!item) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  const groups = useMemo(() => item?.modifierGroups ?? [], [item]);
  const missing = groups.filter((g) => g.required && !selections[g.id]);
  const pairings = useMemo(
    () => (item ? menuRepository.getRelatedItems(item.id, locationId, 6) : []),
    [item, locationId],
  );

  if (!item) return null;
  const name = lang === "fr" ? item.nameFr : item.nameEn;
  const description = lang === "fr" ? item.descriptionFr : item.descriptionEn;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-background/85 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-label={name}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col border border-border bg-card promo-in"
      >
        <div className="relative">
          <MenuImage src={item.image} alt={name} variant="promo" priority />
          <button
            onClick={onClose}
            aria-label={t("Close", "Fermer")}
            className="absolute right-3 top-3 border border-border bg-background/85 p-2 focus-ppp"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <h2 className="font-display text-3xl uppercase leading-none">{name}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{description}</p>

          <p className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-3xl leading-none text-accent">
              {item.price !== null ? `$${item.price.toFixed(2)}` : t("See price", "Voir le prix")}
            </span>
            {item.compareAtPrice != null && item.price !== null && (
              <span className="text-sm text-muted-foreground line-through">
                ${item.compareAtPrice.toFixed(2)}
              </span>
            )}
          </p>
          {item.price === null && (
            <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              {t("Price not published for this item.", "Prix non publié pour cet item.")}
            </p>
          )}

          {groups.length > 0 && (
            <div className="mt-6 space-y-5">
              {groups.map((group) => (
                <fieldset key={group.id}>
                  <legend className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                    {lang === "fr" ? group.labelFr : group.labelEn}
                    <span className="ml-2 text-primary">
                      {group.required
                        ? t("Required · choose 1", "Requis · choisissez 1")
                        : t("Optional", "Optionnel")}
                    </span>
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.choices.map((choice) => {
                      const active = selections[group.id] === choice.id;
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelections((s) => ({ ...s, [group.id]: choice.id }))}
                          className={`border px-3 py-2 text-[0.7rem] font-bold uppercase tracking-widest transition-colors focus-ppp ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {lang === "fr" ? choice.labelFr : choice.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <p className="text-xs text-muted-foreground">
                {t(
                  "Option pricing is not published for this item, so no surcharge is shown or added.",
                  "Le prix des options n'est pas publié pour cet item : aucun supplément n'est affiché ni ajouté.",
                )}
              </p>
            </div>
          )}

          <label className="mt-6 block text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            {t("Special instructions", "Instructions spéciales")}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder={t("No pickles, extra sauce…", "Sans cornichons, extra sauce…")}
            className="mt-2 w-full resize-none border border-border bg-background px-3 py-2 text-sm focus-ppp"
          />

          {pairings.length > 0 && (
            <div className="mt-7">
              <h3 className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                {t("Complete your order", "Complétez votre commande")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  "One tap adds it to the same order.",
                  "Un seul geste l'ajoute à la même commande.",
                )}
              </p>
              <ul className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                {pairings.map((p) => (
                  <li key={p.id} className="shrink-0">
                    <div className="card-lift w-36 border border-border transition-colors hover:border-primary">
                      <button
                        type="button"
                        onClick={() => onSelectItem?.(p)}
                        className="block w-full text-left focus-ppp"
                      >
                      <MenuImage
                        src={p.image}
                        alt={lang === "fr" ? p.nameFr : p.nameEn}
                        variant="hero"
                        className="h-20 w-full"
                      />
                      <span className="block px-2 py-2">
                        <span className="line-clamp-2 block font-display text-sm uppercase leading-tight">
                          {lang === "fr" ? p.nameFr : p.nameEn}
                        </span>
                        <span className="mt-1 block font-display text-sm leading-none text-accent">
                          {p.price !== null
                            ? `$${p.price.toFixed(2)}`
                            : t("See price", "Voir le prix")}
                        </span>
                      </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (p.modifierGroups.some((g) => g.required)) {
                            onSelectItem?.(p);
                            return;
                          }
                          addToCart(p.id, 1, "", {});
                        }}
                        className="press-tap flex w-full items-center justify-center gap-1 border-t border-border bg-primary py-1.5 font-display text-xs uppercase leading-none text-primary-foreground focus-ppp"
                      >
                        <Plus className="h-3 w-3" />
                        {p.modifierGroups.some((g) => g.required)
                          ? t("Choose", "Choisir")
                          : t("Add", "Ajouter")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border p-4">
          <div className="flex items-center border border-border">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label={t("Decrease quantity", "Diminuer la quantité")}
              className="p-3 focus-ppp"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span aria-live="polite" className="w-8 text-center font-display text-xl leading-none">
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => Math.min(20, q + 1))}
              aria-label={t("Increase quantity", "Augmenter la quantité")}
              className="p-3 focus-ppp"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => {
              if (missing.length > 0) return;
              addToCart(item.id, qty, notes.trim(), selections);
              onClose();
            }}
            disabled={missing.length > 0}
            className="flex-1 bg-primary px-5 py-3.5 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp disabled:cursor-not-allowed disabled:opacity-50"
            style={missing.length > 0 ? undefined : { boxShadow: "var(--shadow-glow)" }}
          >
            {missing.length > 0
              ? t(
                  `Choose ${lang === "fr" ? missing[0]!.labelFr : missing[0]!.labelEn}`,
                  `Choisissez ${missing[0]!.labelFr.toLowerCase()}`,
                )
              : t("Add to order", "Ajouter à la commande")}
            {missing.length === 0 && item.price !== null && ` · $${(item.price * qty).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
