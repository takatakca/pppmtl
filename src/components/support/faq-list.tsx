import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { faqCategories, faqEntries, type FaqCategory } from "@/data/support";

export function FaqList() {
  const { t, lang } = usePPP();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqEntries.filter((f) => {
      if (category !== "all" && f.category !== category) return false;
      if (!q) return true;
      const hay = `${f.questionEn} ${f.questionFr} ${f.answerEn} ${f.answerFr} ${f.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, category]);

  return (
    <div>
      <label className="flex items-center gap-2 border border-border bg-card px-3 py-2.5 focus-within:border-primary">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search the FAQ", "Recherchez dans la FAQ")}
          className="w-full bg-transparent text-sm outline-none"
          aria-label={t("Search FAQ", "Rechercher dans la FAQ")}
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={`press-tap border px-3 py-1.5 font-display text-xs uppercase leading-none focus-ppp ${
            category === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("All", "Tout")}
        </button>
        {faqCategories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`press-tap border px-3 py-1.5 font-display text-xs uppercase leading-none focus-ppp ${
              category === c.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {lang === "fr" ? c.labelFr : c.labelEn}
          </button>
        ))}
      </div>

      <div className="mt-4 divide-y divide-border border border-border bg-card">
        {filtered.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            {t("No FAQ matches that search.", "Aucune question ne correspond à cette recherche.")}
          </p>
        )}
        {filtered.map((f) => {
          const open = openId === f.id;
          return (
            <div key={f.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : f.id)}
                aria-expanded={open}
                className="press-tap flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left focus-ppp"
              >
                <span className="font-display text-sm uppercase leading-tight sm:text-base">
                  {lang === "fr" ? f.questionFr : f.questionEn}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  {lang === "fr" ? f.answerFr : f.answerEn}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
