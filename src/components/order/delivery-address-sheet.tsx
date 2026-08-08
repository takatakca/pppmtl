import { Bike, X } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { DeliveryAddressForm } from "@/components/order/delivery-address-form";

/** Delivery never redirects away — it opens this sheet and stays in the menu. */
export function DeliveryAddressSheet({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (summary: string) => void;
}) {
  const { t } = usePPP();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[92] flex items-end justify-center bg-background/85 backdrop-blur-sm dim-in sm:items-center">
      <div
        role="dialog"
        aria-label={t("Delivery address", "Adresse de livraison")}
        className="sheet-up flex max-h-[88dvh] w-full max-w-lg flex-col border border-border bg-card"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="inline-flex items-center gap-2 font-display text-2xl uppercase leading-none">
            <Bike className="h-5 w-5 text-primary" />
            {t("Where to?", "Où livrer ?")}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("Close", "Fermer")}
            className="border border-border p-2 focus-ppp"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <DeliveryAddressForm
            onSubmit={(d) => {
              onConfirm([d.street, d.unit, d.city].filter(Boolean).join(", "));
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
