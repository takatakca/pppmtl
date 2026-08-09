import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { faqEntries, type FaqEntry } from "@/data/support";

/** Deterministic local keyword match — no AI call, answers only from src/data/support.ts. */
function rank(query: string, lang: "en" | "fr"): FaqEntry[] {
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

export function AskPPP({ onEscalate }: { onEscalate?: () => void }) {
  const { t, lang } = usePPP();
  const [query, setQuery] = useState("");
  const results = useMemo(() => rank(query, lang), [query, lang]);

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
          "Answers come only from PPP's published help content — not a live agent or AI guess.",
          "Les réponses proviennent uniquement du contenu d'aide publié par PPP — pas d'un agent en direct ni d'une supposition d'IA.",
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
          {results.length > 0 ? (
            results.map((r) => (
              <div key={r.id} className="border border-border bg-background p-3">
                <p className="font-display text-sm uppercase leading-tight">
                  {lang === "fr" ? r.questionFr : r.questionEn}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lang === "fr" ? r.answerFr : r.answerEn}
                </p>
              </div>
            ))
          ) : (
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
              {t("Still need help? Use support router", "Besoin d'aide? Utilisez l'aiguillage support")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
