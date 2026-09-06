import { en, type Dictionary } from "./en";
import { fr } from "./fr";
import { es } from "./es";
import type { Lang } from "./types";

export { LANGUAGE_CONFIG, LANGUAGES, htmlLangFor, isLang } from "./types";
export type { Lang, LanguageMeta } from "./types";

const dictionaries = { en, fr, es } as const;

/** Dotted key paths available in the dictionary, e.g. "popup.welcome". */
export type TranslationKey = {
  [N in keyof Dictionary]: `${N & string}.${keyof Dictionary[N] & string}`;
}[keyof Dictionary];

const warned = new Set<string>();

function lookup(dict: unknown, key: string): string | undefined {
  const [namespace, entry] = key.split(".");
  const ns = (dict as Record<string, Record<string, string> | undefined>)[namespace!];
  const value = ns?.[entry!];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Typed translation lookup. Missing FR/ES values fall back to English so a
 * customer never sees a raw key; in development a single warning is logged.
 */
export function translate(lang: Lang, key: TranslationKey): string {
  const value = lookup(dictionaries[lang], key);
  if (value) return value;

  if (import.meta.env.DEV && lang !== "en") {
    const id = `${lang}:${key}`;
    if (!warned.has(id)) {
      warned.add(id);
      console.warn(`[i18n] Missing ${lang} translation for "${key}" — using English.`);
    }
  }

  return lookup(en, key) ?? "";
}
