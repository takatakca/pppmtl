import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

export function Field({
  label,
  error,
  hint,
  ...props
}: { label: string; error?: string | null; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        {...props}
        className="mt-1 w-full border border-border bg-card px-3 py-3 text-sm outline-none transition-colors focus:border-primary focus-ppp"
      />
      {error ? (
        <span className="mt-1 block text-[0.7rem] text-primary">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[0.7rem] text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

export function PasswordField({
  label,
  error,
  hint,
  value,
  onValueChange,
  autoComplete,
  capsHint,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  value: string;
  onValueChange: (v: string) => void;
  autoComplete?: string;
  capsHint?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);

  return (
    <label className="block">
      <span className="block text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="relative mt-1 block">
        <input
          type={show ? "text" : "password"}
          value={value}
          autoComplete={autoComplete ?? "new-password"}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyUp={(e) => capsHint && setCaps(e.getModifierState?.("CapsLock") ?? false)}
          className="w-full border border-border bg-card px-3 py-3 pr-12 text-sm outline-none transition-colors focus:border-primary focus-ppp"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="press-tap absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground focus-ppp"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
      {caps && (
        <span className="mt-1 block text-[0.7rem] text-accent">Caps Lock is on.</span>
      )}
      {error ? (
        <span className="mt-1 block text-[0.7rem] text-primary">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[0.7rem] text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}
