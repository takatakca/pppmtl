import { useState } from "react";
import { PhoneCall } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePPP } from "@/context/ppp-store";
import { restaurantLocations } from "@/config/locations";
import { trackCallbackRequested } from "@/lib/analytics";

type Reason = "order_issue" | "phone_order" | "general" | "franchise" | "other";

interface FormState {
  name: string;
  phone: string;
  locationSlug: string;
  reason: Reason;
  preferredTime: string;
}

const emptyForm: FormState = {
  name: "",
  phone: "",
  locationSlug: restaurantLocations[0]!.slug,
  reason: "order_issue",
  preferredTime: "",
};

const reasonLabels: Record<Reason, { en: string; fr: string }> = {
  order_issue: { en: "An order I placed", fr: "Une commande passée" },
  phone_order: { en: "I want to place a phone order", fr: "Je veux commander par téléphone" },
  general: { en: "General question", fr: "Question générale" },
  franchise: { en: "Franchise", fr: "Franchise" },
  other: { en: "Other", fr: "Autre" },
};

/** Very small local phone sanity check — not a carrier validation. */
function isPlausiblePhone(v: string) {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 10;
}

interface CallbackSheetProps {
  trigger?: React.ReactNode;
  defaultReason?: Reason;
  defaultLocationSlug?: string;
}

export function CallbackSheet({ trigger, defaultReason, defaultLocationSlug }: CallbackSheetProps) {
  const { t } = usePPP();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => ({
    ...emptyForm,
    reason: defaultReason ?? emptyForm.reason,
    locationSlug: defaultLocationSlug ?? emptyForm.locationSlug,
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  function reset() {
    setForm({
      ...emptyForm,
      reason: defaultReason ?? emptyForm.reason,
      locationSlug: defaultLocationSlug ?? emptyForm.locationSlug,
    });
    setErrors({});
    setSubmitted(false);
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length < 2) {
      next.name = t("Enter your name.", "Entrez votre nom.");
    }
    if (!isPlausiblePhone(form.phone)) {
      next.phone = t("Enter a valid phone number.", "Entrez un numéro de téléphone valide.");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const location = restaurantLocations.find((l) => l.slug === form.locationSlug) ?? null;
    trackCallbackRequested({ locationId: location?.id ?? null, reason: form.reason });
    setSubmitted(true);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <SheetTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="press-tap inline-flex items-center gap-2 border border-border px-4 py-2.5 font-display text-sm uppercase leading-none text-foreground hover:border-primary focus-ppp"
          >
            <PhoneCall className="h-4 w-4 text-primary" />
            {t("Request a callback", "Demander un rappel")}
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl uppercase leading-none">
            {t("Request a callback", "Demander un rappel")}
          </SheetTitle>
          <SheetDescription>
            {t(
              "Callback requests aren't sent automatically yet. For anything urgent, please call the location directly.",
              "Les demandes de rappel ne sont pas encore envoyées automatiquement. Pour toute urgence, veuillez appeler l'établissement directement.",
            )}
          </SheetDescription>
        </SheetHeader>

        {submitted ? (
          <div className="mt-6 space-y-4">
            <div className="border border-primary/40 bg-primary/5 p-4 text-sm text-foreground">
              <p className="font-display text-base uppercase leading-none text-primary">
                {t("Callback requests coming soon", "Demandes de rappel bientôt disponibles")}
              </p>
              <p className="mt-2 text-muted-foreground">
                {t(
                  "This request wasn't sent to the restaurant yet — we're still setting up callback requests. For anything urgent, please call the location directly.",
                  "Cette demande n'a pas encore été envoyée au restaurant — nous mettons en place les demandes de rappel. Pour toute urgence, veuillez appeler l'établissement directement.",
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="press-tap w-full border border-border py-2.5 font-display text-sm uppercase leading-none hover:border-primary focus-ppp"
            >
              {t("Start over", "Recommencer")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-1 flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cb-name">{t("Name", "Nom")}</Label>
              <Input
                id="cb-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("Your name", "Votre nom")}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cb-phone">{t("Phone", "Téléphone")}</Label>
              <Input
                id="cb-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(514) 555-0123"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cb-location">{t("Location", "Emplacement")}</Label>
              <select
                id="cb-location"
                value={form.locationSlug}
                onChange={(e) => setForm((f) => ({ ...f, locationSlug: e.target.value }))}
                className="flex h-10 w-full border border-border bg-background px-3 text-sm focus-ppp"
              >
                {restaurantLocations.map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cb-reason">{t("Reason", "Raison")}</Label>
              <select
                id="cb-reason"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value as Reason }))}
                className="flex h-10 w-full border border-border bg-background px-3 text-sm focus-ppp"
              >
                {(Object.keys(reasonLabels) as Reason[]).map((r) => (
                  <option key={r} value={r}>
                    {t(reasonLabels[r].en, reasonLabels[r].fr)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cb-time">
                {t("Preferred callback time (optional)", "Heure de rappel préférée (optionnel)")}
              </Label>
              <Textarea
                id="cb-time"
                rows={2}
                value={form.preferredTime}
                onChange={(e) => setForm((f) => ({ ...f, preferredTime: e.target.value }))}
                placeholder={t("e.g. today after 5pm", "ex. aujourd'hui après 17h")}
              />
            </div>

            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              {t(
                "To prevent spam, only one request can be prepared at a time.",
                "Pour éviter les abus, une seule demande peut être préparée à la fois.",
              )}
            </p>

            <SheetFooter className="mt-auto">
              <button
                type="submit"
                className="press-tap w-full bg-primary py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
              >
                {t("Prepare request", "Préparer la demande")}
              </button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
