import { useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import type { MenuItem } from "@/data/menu";
import { usePPP } from "@/context/ppp-store";
import { ProductImage } from "@/components/order/product-image";

/**
 * Mobile: full-height bottom sheet. Desktop: centred panel. No modifier group
 * is invented — options are only described in the item's published text.
 */
export function ItemSheet({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const { lang, t, addToCart } = usePPP();
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setQty(1);
    setNotes("");
  }, [item?.id]);

  useEffect(() => {
    if (!item) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

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
          <ProductImage src={item.image} alt={name} className="h-40 w-full sm:h-56" />
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
              {t(
                "Price is confirmed by the restaurant at checkout.",
                "Le prix est confirmé par le restaurant à la commande.",
              )}
            </p>
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
              addToCart(item.id, qty, notes.trim());
              onClose();
            }}
            className="flex-1 bg-primary px-5 py-3.5 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            {t("Add to order", "Ajouter à la commande")}
            {item.price !== null && ` · $${(item.price * qty).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
