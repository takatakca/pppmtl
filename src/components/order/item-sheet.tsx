import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Minus, Plus, X } from "lucide-react";
import type { MenuItem } from "@/data/menu";
import { usePPP } from "@/context/ppp-store";
import { MenuImage } from "@/components/menu/menu-item-image";
import type { LineSelections } from "@/lib/cart";
import { menuRepository } from "@/lib/menu-repository";
import {
  checkSelections,
  chosenIds,
  defaultSelections,
  groupMax,
  groupRule,
  optionsTotal,
  toggleChoice,
} from "@/lib/modifiers";

/**
 * Mobile: full-height bottom sheet. Desktop: centred panel. The option groups are the item's real Clover
 * modifier groups (required ones first, with Clover's minimum, maximum and option prices).
 */
export function ItemSheet({
  item,
  onClose,
  onSelectItem,
  orderAlternative,
}: {
  item: MenuItem | null;
  onClose: () => void;
  /** Swap the sheet to a paired item without leaving the flow. */
  onSelectItem?: (item: MenuItem) => void;
  /** When set, the dish is shown without "Add to order" (a kitchen without online ordering): call or apps instead. */
  orderAlternative?: { note: string; href: string; label: string };
}) {
  const { lang, t, addToCart, locationId, isFavourite, addFavourite, removeFavourite } = usePPP();
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [selections, setSelections] = useState<LineSelections>({});
  /** Set when the customer confirms with a required group incomplete: those groups get highlighted. */
  const [attempted, setAttempted] = useState(false);
  const optionScroller = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const favourited = isFavourite(item?.id ?? "");

  useEffect(() => {
    setQty(1);
    setNotes("");
    setAttempted(false);
    setSelections(defaultSelections(item?.modifierGroups ?? []));
    // Switching from a suggested dish to another must start at the main
    // product choice, not retain the previous sheet's extras scroll position.
    optionScroller.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [item?.id, item?.modifierGroups]);

  useEffect(() => {
    if (!item) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [item, onClose]);

  const groups = useMemo(() => item?.modifierGroups ?? [], [item]);
  const missing = checkSelections(groups, selections).missing;
  const unitPrice = item?.price != null ? item.price + optionsTotal(groups, selections) : null;
  const unpricedOptions = groups.some((g) => g.choices.some((c) => c.priceDelta === null));
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
        aria-modal="true"
        aria-label={name}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col border border-border bg-card promo-in"
      >
        <div className="relative">
          <MenuImage src={item.image} alt={name} variant="promo" priority />
          <div className="absolute right-3 top-3 flex gap-2">
            <button
              type="button"
              aria-label={
                favourited
                  ? t("Remove from favourites", "Retirer des favoris")
                  : t("Add to favourites", "Ajouter aux favoris")
              }
              onClick={() => {
                if (favourited) removeFavourite(item.id);
                else addFavourite(item.id);
              }}
              className="flex h-9 w-9 items-center justify-center border border-border bg-background/85 backdrop-blur-sm focus-ppp hover:border-primary"
            >
              <Heart
                className={`h-4 w-4 transition-all duration-200 ${
                  favourited ? "fill-primary text-primary" : "fill-transparent text-foreground"
                }`}
              />
            </button>
            <button
              ref={closeButton}
              onClick={onClose}
              aria-label={t("Close", "Fermer")}
              className="border border-border bg-background/85 p-2 focus-ppp"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={optionScroller}
          className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-5 py-5"
        >
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
            <div className="mt-6 space-y-6">
              {groups.map((group) => {
                const single = groupMax(group) === 1;
                const highlight = attempted && missing.some((g) => g.id === group.id);
                return (
                  <fieldset
                    key={group.id}
                    data-sheet-group={group.id}
                    className={highlight ? "border border-primary bg-primary/5 p-3" : undefined}
                  >
                    <legend className="font-display text-lg uppercase leading-none">
                      {lang === "fr" ? group.labelFr : group.labelEn}
                      <span className="ml-2 align-middle font-sans text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary">
                        {groupRule(group, lang === "fr")}
                      </span>
                    </legend>
                    <div className="mt-2 divide-y divide-border border border-border">
                      {group.choices.map((choice) => {
                        const active = chosenIds(selections, group.id).includes(choice.id);
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setSelections((s) => toggleChoice(s, group, choice.id))}
                            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors focus-ppp ${
                              active ? "bg-primary/10" : "hover:bg-muted/50"
                            }`}
                          >
                            <span
                              aria-hidden
                              className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                                single ? "rounded-full" : ""
                              } ${active ? "border-primary" : "border-muted-foreground/50"}`}
                            >
                              {active && (
                                <span
                                  className={`bg-primary ${single ? "h-2.5 w-2.5 rounded-full" : "h-3 w-3"}`}
                                />
                              )}
                            </span>
                            <span className="min-w-0 flex-1 text-sm font-medium">
                              {lang === "fr" ? choice.labelFr : choice.labelEn}
                            </span>
                            <span className="shrink-0 text-sm text-muted-foreground">
                              {choice.priceDelta !== null &&
                                (choice.priceDelta > 0
                                  ? `+$${choice.priceDelta.toFixed(2)}`
                                  : t("Included", "Inclus"))}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}
              {unpricedOptions && (
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Some option prices are not published, so no surcharge is shown or added for them.",
                    "Certains prix d'options ne sont pas publiés : aucun supplément n'est affiché ni ajouté pour eux.",
                  )}
                </p>
              )}
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
                          if ((p.modifierGroups ?? []).some((g) => g.required)) {
                            onSelectItem?.(p);
                            return;
                          }
                          addToCart(p.id, 1, "", {});
                        }}
                        className="press-tap flex w-full items-center justify-center gap-1 border-t border-border bg-primary py-1.5 font-display text-xs uppercase leading-none text-primary-foreground focus-ppp"
                      >
                        <Plus className="h-3 w-3" />
                        {(p.modifierGroups ?? []).some((g) => g.required)
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

        {orderAlternative ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-border p-4">
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">{orderAlternative.note}</p>
            <a
              href={orderAlternative.href}
              className="bg-primary px-5 py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            >
              {orderAlternative.label}
            </a>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-t border-border p-4">
            <div className="flex items-center border border-border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label={t("Decrease quantity", "Diminuer la quantité")}
                className="p-3 focus-ppp"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span
                aria-live="polite"
                className="w-8 text-center font-display text-xl leading-none"
              >
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
                if (missing.length > 0) {
                  // Not a dead end: highlight the incomplete groups and scroll to the first one.
                  setAttempted(true);
                  // Only scroll INSIDE the item sheet. scrollIntoView also
                  // scrolled the document behind the dialog on mobile.
                  const scroller = optionScroller.current;
                  const field = Array.from(
                    scroller?.querySelectorAll<HTMLElement>("[data-sheet-group]") ?? [],
                  ).find((node) => node.dataset["sheetGroup"] === missing[0]?.id);
                  if (scroller && field) {
                    scroller.scrollTo({
                      top: Math.max(
                        0,
                        scroller.scrollTop +
                          field.getBoundingClientRect().top -
                          scroller.getBoundingClientRect().top -
                          12,
                      ),
                      behavior: "auto",
                    });
                  }
                  return;
                }
                addToCart(item.id, qty, notes.trim(), selections);
                onClose();
              }}
              aria-disabled={missing.length > 0}
              className="flex-1 bg-primary px-5 py-3.5 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
              style={missing.length > 0 ? undefined : { boxShadow: "var(--shadow-glow)" }}
            >
              {missing.length > 0
                ? t(
                    `Choose ${lang === "fr" ? missing[0]!.labelFr : missing[0]!.labelEn}`,
                    `Choisissez ${missing[0]!.labelFr.toLowerCase()}`,
                  )
                : t("Add to order", "Ajouter à la commande")}
              {missing.length === 0 && unitPrice !== null && ` · $${(unitPrice * qty).toFixed(2)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
