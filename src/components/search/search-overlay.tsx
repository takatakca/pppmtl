import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Search, X, Loader2, ArrowRight } from "lucide-react";
import { MenuImage } from "@/components/menu/menu-item-image";
import { usePPP } from "@/context/ppp-store";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { categories } from "@/data/menu";
import { highlightParts, localizedDescription, localizedName, searchMenu } from "@/lib/search";
import { track } from "@/lib/analytics";

const CRAVINGS: Array<{ en: string; fr: string }> = [
  { en: "poutine", fr: "poutine" },
  { en: "chicken", fr: "poulet" },
  { en: "pizza", fr: "pizza" },
  { en: "burger", fr: "burger" },
  { en: "shawarma", fr: "shawarma" },
  { en: "combo under $16", fr: "combo à moins de 16 $" },
];

function Highlighted({ label, terms }: { label: string; terms: string[] }) {
  return (
    <>
      {highlightParts(label, terms).map((part, i) =>
        part.match ? (
          <mark key={i} className="bg-transparent text-accent">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function SearchOverlay() {
  const {
    searchOpen,
    searchSeed,
    closeSearch,
    lang,
    locationId,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    t,
  } = usePPP();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const voice = useVoiceSearch(lang, (text) => {
    setQuery(text);
    addRecentSearch(text);
    track("voice_search_completed", { text });
  });

  useEffect(() => {
    if (searchOpen) {
      setQuery(searchSeed);
      const id = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
    voice.stop();
    voice.reset();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen, searchSeed]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearch();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [searchOpen, closeSearch]);

  const results = useMemo(() => searchMenu(query, { lang, locationId }), [query, lang, locationId]);
  const hasQuery = query.trim().length > 0;

  if (!searchOpen) return null;

  const voiceLabel =
    voice.status === "listening"
      ? t("Listening…", "À l'écoute…")
      : voice.status === "denied"
        ? t("Microphone blocked — type instead", "Micro bloqué — écrivez plutôt")
        : voice.status === "unsupported"
          ? t("Voice isn't supported on this browser", "La voix n'est pas prise en charge ici")
          : voice.status === "error"
            ? t("Voice failed — try typing", "Échec de la voix — essayez d'écrire")
            : t("Tap the mic and say what you're craving", "Touchez le micro et dites votre envie");

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background/95 backdrop-blur-xl rise-in">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 pb-8 pt-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-3 border border-border bg-card px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && hasQuery) {
                  addRecentSearch(query);
                  track("food_search_submitted", { query });
                }
              }}
              aria-label={t("Search the menu", "Rechercher au menu")}
              placeholder={t("What are you craving?", "Quelle est votre envie ?")}
              className="w-full bg-transparent text-lg outline-none placeholder:text-muted-foreground"
            />
            {hasQuery && (
              <button
                onClick={() => setQuery("")}
                aria-label={t("Clear search", "Effacer la recherche")}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-ppp"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => {
                if (voice.status === "listening") {
                  voice.stop();
                } else {
                  track("voice_search_started", {});
                  voice.start();
                }
              }}
              disabled={!voice.supported}
              aria-label={t("Search by voice", "Recherche vocale")}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center transition-colors focus-ppp ${
                voice.status === "listening"
                  ? "listening-ring bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground disabled:opacity-40"
              }`}
            >
              {voice.status === "processing" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : voice.supported ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </button>
          </div>
          <button
            onClick={closeSearch}
            className="border border-border px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp"
          >
            {t("Close", "Fermer")}
          </button>
        </div>

        <p
          aria-live="polite"
          className="mt-3 text-xs uppercase tracking-widest text-muted-foreground"
        >
          {voice.status === "listening" && voice.transcript ? `“${voice.transcript}”` : voiceLabel}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {CRAVINGS.map((c) => {
            const label = lang === "fr" ? c.fr : c.en;
            return (
              <button
                key={c.en}
                onClick={() => {
                  setQuery(label);
                  track("quick_craving_selected", { craving: c.en });
                }}
                className="border border border-border bg-card px-4 py-2 text-sm font-semibold capitalize transition-colors hover:border-primary focus-ppp"
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pr-1">
          {!hasQuery && recentSearches.length > 0 && (
            <section>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm uppercase tracking-widest text-accent">
                  {t("Recent", "Récents")}
                </h2>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp"
                >
                  {t("Clear", "Effacer")}
                </button>
              </div>
              <ul className="mt-3 space-y-1">
                {recentSearches.map((r) => (
                  <li key={r}>
                    <button
                      onClick={() => setQuery(r)}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground focus-ppp"
                    >
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!hasQuery && (
            <section className="mt-8">
              <h2 className="font-display text-sm uppercase tracking-widest text-accent">
                {t("Browse the menu", "Parcourir le menu")}
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setQuery(localizedName(c, lang))}
                    className="press-tap flex items-center gap-3 border border-border bg-card p-2 text-left transition-colors hover:border-primary focus-ppp"
                  >
                    <MenuImage src={c.image} alt="" variant="thumbnail" />
                    <span>
                      <span className="block font-display text-lg uppercase">
                        {localizedName(c, lang)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {localizedDescription(c, lang)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {hasQuery && results.isEmpty && (
            <div className="border border-dashed border-border p-8 text-center">
              <p className="font-display text-2xl uppercase">
                {t("Nothing matched that", "Aucun résultat")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  "Try a food word like poutine, taouk or pizza.",
                  "Essayez un mot comme poutine, taouk ou pizza.",
                )}
              </p>
            </div>
          )}

          {hasQuery && !results.isEmpty && (
            <div className="space-y-8">
              {results.categories.length > 0 && (
                <section>
                  <h2 className="font-display text-sm uppercase tracking-widest text-accent">
                    {t("Categories", "Catégories")}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {results.categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() =>
                          track("search_category_selected", { categoryId: c.id, query })
                        }
                        className="border border border-primary/60 bg-card px-4 py-2 text-sm font-semibold focus-ppp"
                      >
                        <Highlighted label={localizedName(c, lang)} terms={results.terms} />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {results.items.length > 0 && (
                <section>
                  <h2 className="font-display text-sm uppercase tracking-widest text-accent">
                    {t("Items", "Articles")}
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {results.items.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => {
                            addRecentSearch(query);
                            track("search_product_selected", { itemId: item.id, query });
                          }}
                          className="press-tap flex w-full items-center gap-3 border border-border bg-card p-2 text-left transition-colors hover:border-primary focus-ppp"
                        >
                          <MenuImage src={item.image} alt="" variant="search" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-lg uppercase leading-tight">
                              <Highlighted
                                label={localizedName(item, lang)}
                                terms={results.terms}
                              />
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {localizedDescription(item, lang)}
                            </span>
                          </span>
                          {item.price !== null && (
                            <span className="shrink-0 font-display text-lg">
                              ${item.price.toFixed(2)}
                            </span>
                          )}
                          <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {results.related.length > 0 && (
                <section>
                  <h2 className="font-display text-sm uppercase tracking-widest text-accent">
                    {t("Goes well with", "Va bien avec")}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {results.related.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setQuery(localizedName(c, lang))}
                        className="border border border-border bg-secondary px-4 py-2 text-sm font-semibold focus-ppp"
                      >
                        {localizedName(c, lang)}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
