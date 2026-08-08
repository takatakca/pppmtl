import type { InputHTMLAttributes } from "react";

/**
 * Boundary for a future geocoder (Google Places / Mapbox). Deliberately no
 * fake suggestions: until a provider is wired, this is a plain input.
 */
export function AddressAutocomplete({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-[0.6rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </span>
      <input
        {...props}
        autoComplete="street-address"
        className="mt-1.5 h-12 w-full border border-border bg-background px-3 text-sm outline-none focus-ppp"
      />
      {hint && <span className="mt-1 block text-[0.65rem] text-muted-foreground">{hint}</span>}
    </label>
  );
}
