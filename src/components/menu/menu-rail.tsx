import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * One horizontal row per category. Products never wrap into a second row:
 * the whole category lives inside a single swipeable / draggable rail with
 * desktop arrow controls and edge fades so more product is always implied.
 */
export function MenuRail({
  id,
  kicker,
  title,
  count,
  action,
  children,
}: {
  id?: string;
  kicker?: ReactNode;
  title: string;
  count?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: false, end: true });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft > 8,
      end: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <section id={id} className="scroll-mt-28 py-3 sm:py-4">
      <div className="mx-auto grid max-w-[110rem] grid-cols-[minmax(0,1fr)_auto] items-end gap-3 px-3 sm:px-6">
        <div className="min-w-0">
          {kicker && (
            <p className="flex items-center gap-1.5 font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {kicker}
            </p>
          )}
          <h2 className="mt-0.5 truncate font-display text-xl uppercase leading-none sm:text-3xl lg:text-4xl">
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {count && (
            <span className="hidden text-[0.6rem] font-bold uppercase tracking-[0.25em] text-muted-foreground sm:inline">
              {count}
            </span>
          )}
          {action}
          <div className="hidden items-center gap-1 lg:flex">
            <button
              type="button"
              onClick={() => nudge(-1)}
              disabled={!edges.start}
              aria-label="Scroll left"
              className="border border-border p-1.5 text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-ppp disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => nudge(1)}
              disabled={!edges.end}
              aria-label="Scroll right"
              className="border border-border p-1.5 text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-ppp disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative mt-2">
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent transition-opacity duration-200 ${
            edges.start ? "opacity-100" : "opacity-0"
          }`}
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent transition-opacity duration-200 ${
            edges.end ? "opacity-100" : "opacity-0"
          }`}
        />
        <ul
          ref={ref}
          onScroll={measure}
          className="no-scrollbar snap-rail mx-auto flex max-w-[110rem] scroll-pl-3 gap-2 overflow-x-auto px-3 pb-2 pt-1 sm:scroll-pl-6 sm:px-6"
        >
          {children}
        </ul>
      </div>
    </section>
  );
}
