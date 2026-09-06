import { usePPP } from "@/context/ppp-store";
import { LANGUAGES } from "@/i18n/types";
import { track } from "@/lib/analytics";

type Variant = "compact" | "menu" | "popup";

/**
 * The single EN / FR / ES control. Changing language only writes the language
 * field of the PPP session — cart, store, mode and searches are untouched.
 */
export function LanguageSwitcher({
  variant = "compact",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const { lang, setLang } = usePPP();

  const choose = (next: (typeof LANGUAGES)[number]["code"]) => {
    if (next === lang) return;
    track("language_changed", { lang: next });
    setLang(next);
  };

  if (variant === "menu") {
    return (
      <div className={className}>
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          {lang === "fr" ? "Langue" : lang === "es" ? "Idioma" : "Language"}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => choose(l.code)}
              aria-pressed={l.code === lang}
              lang={l.htmlLang}
              className={`press-tap border py-3 text-xs font-bold uppercase tracking-widest focus-ppp ${
                l.code === lang
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const popup = variant === "popup";

  return (
    <div
      role="group"
      aria-label={lang === "fr" ? "Langue" : lang === "es" ? "Idioma" : "Language"}
      className={`inline-flex items-center border border-border ${className}`}
    >
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => choose(l.code)}
          aria-pressed={l.code === lang}
          lang={l.htmlLang}
          className={`focus-ppp ${popup ? "px-3 py-1.5 text-[0.7rem]" : "px-2 py-0.5 text-[0.65rem]"} font-bold uppercase tracking-[0.2em] transition-colors ${
            l.code === lang
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.shortLabel}
        </button>
      ))}
    </div>
  );
}
