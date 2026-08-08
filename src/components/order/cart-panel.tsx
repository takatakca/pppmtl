import { Minus, Phone, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { usePPP, useSelectedLocation } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { cartTotals } from "@/lib/cart";
import { marketplaceChannels } from "@/lib/channels";
import { track } from "@/lib/analytics";

/**
 * Customer cart. Only published prices are summed — no tax, delivery fee,
 * service charge or tip is modelled, so none is displayed. Direct checkout is
 * not wired, so the final action is truthful about what happens next.
 */
export function CartPanel() {
  const { cart, cartOpen, closeCart, setLineQuantity, removeLine, clearCart, mode, lang, t } =
    usePPP();
  const location = useSelectedLocation();
  const totals = cartTotals(cart);
  const marketplaces = marketplaceChannels(location, mode).filter((c) => c.href);

  if (!cartOpen) return null;

  return (
    <div className="fixed inset-0 z-[88] flex justify-end bg-background/80 backdrop-blur-sm">
      <aside
        role="dialog"
        aria-label={t("Your order", "Votre commande")}
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-card"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl uppercase leading-none">
            {t("Your order", "Votre commande")}
            <span className="ml-2 text-accent">{totals.itemCount}</span>
          </h2>
          <button onClick={closeCart} aria-label={t("Close", "Fermer")} className="border border-border p-2 focus-ppp">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-display text-2xl uppercase leading-none">
                {t("Your order is empty", "Votre commande est vide")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  "Add something from the menu to get started.",
                  "Ajoutez un item du menu pour commencer.",
                )}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {cart.map((line) => {
                const item = menuRepository.getItem(line.itemId);
                const name = item ? (lang === "fr" ? item.nameFr : item.nameEn) : line.itemId;
                return (
                  <li key={line.lineId} className="border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-lg uppercase leading-tight">{name}</p>
                        {line.instructions && (
                          <p className="mt-1 text-xs text-muted-foreground">“{line.instructions}”</p>
                        )}
                      </div>
                      <span className="shrink-0 font-display text-lg leading-none text-accent">
                        {line.unitPrice === null
                          ? t("See price", "Voir le prix")
                          : `$${(line.unitPrice * line.quantity).toFixed(2)}`}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex items-center border border-border">
                        <button
                          onClick={() => setLineQuantity(line.lineId, line.quantity - 1)}
                          aria-label={t("Decrease quantity", "Diminuer la quantité")}
                          className="p-2 focus-ppp"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm">{line.quantity}</span>
                        <button
                          onClick={() => setLineQuantity(line.lineId, line.quantity + 1)}
                          aria-label={t("Increase quantity", "Augmenter la quantité")}
                          className="p-2 focus-ppp"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          track("cart_item_removed", { itemId: line.itemId });
                          removeLine(line.lineId);
                        }}
                        className="ml-auto inline-flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("Remove", "Retirer")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-border p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                {t("Subtotal of priced items", "Sous-total des items avec prix")}
              </span>
              <span className="font-display text-3xl leading-none">
                ${totals.knownSubtotal.toFixed(2)}
              </span>
            </div>
            {totals.unpricedLines > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t(
                  `${totals.unpricedLines} item(s) are priced by the restaurant and are not in this subtotal.`,
                  `${totals.unpricedLines} item(s) sont tarifés par le restaurant et ne sont pas inclus dans ce sous-total.`,
                )}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {t(
                "Taxes, delivery and any fees are confirmed by the restaurant when the order is placed.",
                "Taxes, livraison et frais sont confirmés par le restaurant au moment de la commande.",
              )}
            </p>

            <button
              onClick={() => track("cart_checkout_continued", { mode, lines: cart.length })}
              className="mt-4 w-full bg-primary px-5 py-4 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              {t("Continue to direct order", "Continuer vers la commande directe")}
            </button>
            <p className="mt-2 text-center text-[0.6rem] uppercase tracking-widest text-muted-foreground">
              {t(
                "Direct online payment is not live yet — finish by phone or an app below.",
                "Le paiement en ligne direct n'est pas actif — terminez par téléphone ou via une app ci-dessous.",
              )}
            </p>

            {location?.links.phoneOrderNumber && (
              <a
                href={`tel:${location.links.phoneOrderNumber}`}
                className="mt-3 flex items-center justify-center gap-2 border border-border px-5 py-3 font-display text-lg uppercase leading-none focus-ppp hover:border-primary"
              >
                <Phone className="h-4 w-4 text-primary" />
                {t("Call to order", "Appeler pour commander")}
              </a>
            )}
            {marketplaces.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {marketplaces.map((c) => (
                  <a
                    key={c.id}
                    href={c.href ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-border px-3 py-2.5 text-center text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp"
                  >
                    {c.label}
                  </a>
                ))}
              </div>
            )}
            <button
              onClick={clearCart}
              className="mt-3 w-full text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp"
            >
              {t("Clear order", "Vider la commande")}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}