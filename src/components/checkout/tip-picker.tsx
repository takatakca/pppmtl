import { usePPP } from "@/context/ppp-store";
import { TIP_PERCENTS, tipFromPercent } from "@/lib/pricing";
import type { TipChoice } from "./checkout-values";
import { cn } from "@/lib/utils";
import { fieldClass } from "./styles";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function TipPicker({
  value,
  onChange,
  subtotalCents,
}: {
  value: TipChoice;
  onChange: (next: TipChoice) => void;
  subtotalCents: number;
}) {
  const { t } = usePPP();
  const chip = (selected: boolean) =>
    cn(
      "flex min-h-14 flex-col items-center justify-center border px-2 py-2 text-sm font-bold focus-ppp",
      selected
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border hover:border-primary",
    );

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="radiogroup">
        <button
          type="button"
          role="radio"
          aria-checked={value.kind === "none"}
          onClick={() => onChange({ kind: "none" })}
          className={chip(value.kind === "none")}
        >
          {t("No tip", "Aucun", "Sin propina")}
        </button>
        {TIP_PERCENTS.map((p) => {
          const selected = value.kind === "percent" && value.percent === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ kind: "percent", percent: p })}
              className={chip(selected)}
            >
              {p} %
              <span
                className={cn(
                  "text-[0.7rem] font-normal",
                  selected ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {money(tipFromPercent(subtotalCents, p))}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={value.kind === "amount"}
          onClick={() =>
            onChange({ kind: "amount", text: value.kind === "amount" ? value.text : "" })
          }
          className={chip(value.kind === "amount")}
        >
          {t("Other", "Autre", "Otro")}
        </button>
      </div>
      {value.kind === "amount" && (
        <label className="mt-3 block max-w-48">
          <span className="sr-only">
            {t("Tip amount", "Montant du pourboire", "Monto de propina")}
          </span>
          <input
            autoFocus
            inputMode="decimal"
            placeholder="$ 0.00"
            value={value.text}
            onChange={(e) => onChange({ kind: "amount", text: e.target.value })}
            className={fieldClass}
          />
        </label>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {t(
          "Optional. Calculated on the food before taxes; the tip itself is not taxed.",
          "Facultatif. Calculé sur la nourriture avant taxes; le pourboire n'est pas taxé.",
          "Opcional. Se calcula sobre la comida antes de impuestos; la propina no lleva impuestos.",
        )}
      </p>
    </div>
  );
}
