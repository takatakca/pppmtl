/** Canonical language type for the whole PPP storefront. */
export type Lang = "en" | "fr" | "es";

export interface LanguageMeta {
  code: Lang;
  /** Value written to <html lang>. */
  htmlLang: string;
  label: string;
  shortLabel: string;
}

export const LANGUAGE_CONFIG: Record<Lang, LanguageMeta> = {
  en: { code: "en", htmlLang: "en-CA", label: "English", shortLabel: "EN" },
  fr: { code: "fr", htmlLang: "fr-CA", label: "Français", shortLabel: "FR" },
  es: { code: "es", htmlLang: "es", label: "Español", shortLabel: "ES" },
};

export const LANGUAGES: LanguageMeta[] = [
  LANGUAGE_CONFIG.en,
  LANGUAGE_CONFIG.fr,
  LANGUAGE_CONFIG.es,
];

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "fr" || value === "es";
}

export function htmlLangFor(lang: Lang): string {
  return LANGUAGE_CONFIG[lang].htmlLang;
}
