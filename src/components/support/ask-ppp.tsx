import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Search, Sparkles } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { faqEntries, faqCategories, type FaqEntry } from "@/data/support";
import type { Lang } from "@/i18n/types";

/** Deterministic local keyword match — no AI call, answers only from src/data/support.ts. */
function rank(query: string, lang: Lang): FaqEntry[] {
  const q = query.trim().toLowerCase();
  if (!q.length) return [];
  const words = q.split(/\s+/).filter(Boolean);
  const scored = faqEntries
    .map((entry) => {
      const hay = (
        lang === "fr"
          ? `${entry.questionFr} ${entry.answerFr}`
          : `${entry.questionEn} ${entry.answerEn}`
      ).toLowerCase();
      const tagHay = entry.tags.join(" ").toLowerCase();
      let score = 0;
      if (hay.includes(q)) score += 5;
      for (const w of words) {
        if (hay.includes(w)) score += 2;
        if (tagHay.includes(w)) score += 3;
      }
      return { entry, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 4).map((r) => r.entry);
}

/**
 * Ask PPP — grounded local search over src/data/support.ts only.
 * Never calls an AI model and never invents order status. Every result
 * shows its source article and offers "still need help" into the support
 * decision tree (SupportRouter) for anything the knowledge base can't answer.
 */
export function AskPPP({ onEscalate }: { onEscalate?: () => void }) {
  const { t, lang } = usePPP();
  const [query, setQuery] = useState("");
  const results = useMemo(() => rank(query, lang), [query, lang]);
  const isOrderStatusQuery = /order|status|where.?s|où|statut/i.test(query) && results.length === 0;

  return (
    <div className="border border-border bg-card p-4 sm:p-6">
      <p className="flex items-center gap-1.5 font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
        <Sparkles className="h-3.5 w-3.5" />
        {t("Ask PPP", "Demandez à PPP")}
      </p>
      <h3 className="mt-1 font-display text-2xl uppercase leading-none">
        {t("Help me find it", "Aidez-moi à trouver")}
      </h3>
      <p className="mt-2 text-xs text-muted-foreground">
        {t(
          "Answers come only from PPP's published help articles below — never a live order lookup or an AI guess.",
          "Les réponses proviennent uniquement des articles d'aide publiés par PPP ci-dessous — jamais d'une vérification de commande en direct ni d'une supposition d'IA.",
        )}
      </p>

      <label className="mt-4 flex items-center gap-2 border border-border bg-background px-3 py-2.5 focus-within:border-primary">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            "Try: Where is my DoorDash order?",
            "Essayez : Où est ma commande DoorDash?",
          )}
          className="w-full bg-transparent text-sm outline-none"
          aria-label={t("Ask PPP a question", "Posez une question à PPP")}
        />
      </label>

      {query.trim().length > 0 && (
        <div className="mt-3 space-y-2">
          {isOrderStatusQuery && (
            <p className="border border-border bg-background p-3 text-xs text-muted-foreground">
              {t(
                "I can't see a current PPP order status yet. Use the support router below and I'll route you to the right place.",
                "Je ne peux pas encore voir le statut actuel d'une commande PPP. Utilisez l'aiguillage support ci-dessous et je vous dirigerai au bon endroit.",
              )}
            </p>
          )}
          {results.length > 0
            ? results.map((r) => {
                const category = faqCategories.find((c) => c.id === r.category);
                return (
                  <div key={r.id} className="border border-border bg-background p-3">
                    {category && (
                      <p className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-accent">
                        {lang === "fr" ? category.labelFr : category.labelEn}
                      </p>
                    )}
                    <p className="mt-1 font-display text-sm uppercase leading-tight">
                      {lang === "fr" ? r.questionFr : r.questionEn}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {lang === "fr" ? r.answerFr : r.answerEn}
                    </p>
                    {r.ctaHref && (
                      <Link
                        to={r.ctaHref}
                        className="mt-2 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-accent underline focus-ppp"
                      >
                        {lang === "fr" ? r.ctaFr : r.ctaEn}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    <p className="mt-2 text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground/70">
                      {t("Source: PPP help article", "Source : article d'aide PPP")}
                    </p>
                  </div>
                );
              })
            : !isOrderStatusQuery && (
                <p className="border border-border bg-background p-3 text-sm text-muted-foreground">
                  {t(
                    "No match yet in PPP's help content. Use the support router below to reach the right help.",
                    "Aucune correspondance dans le contenu d'aide de PPP. Utilisez l'aiguillage support ci-dessous pour obtenir la bonne aide.",
                  )}
                </p>
              )}
          {onEscalate && (
            <button
              type="button"
              onClick={onEscalate}
              className="press-tap mt-1 w-full border border-border py-2.5 font-display text-sm uppercase leading-none text-foreground transition-colors hover:border-primary focus-ppp"
            >
              {t(
                "Still need help? Use the support router",
                "Besoin d'aide? Utilisez l'aiguillage support",
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
