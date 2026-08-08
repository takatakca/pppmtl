import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

/** True when the visitor asked the OS to reduce motion. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

/**
 * One shared scroll-reveal observer contract: the element enters once,
 * never re-animates, and is fully visible with no JS or reduced motion.
 */
export function useRevealRef<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-revealed");
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Wrapper that fades + rises its children once they scroll into view. */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  clip = false,
  className = "",
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  clip?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRevealRef<HTMLElement>();
  return (
    <Tag
      ref={ref}
      className={`reveal ${clip ? "reveal-clip" : ""} ${className}`}
      style={{ ["--reveal-delay" as string]: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}

/**
 * Desktop pointer depth: returns a transform style that shifts a layer by a
 * few pixels as the pointer crosses the section. Disabled for touch and for
 * reduced-motion visitors.
 */
export function usePointerDepth(strength = 10) {
  const reduced = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || reduced) return undefined;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return undefined;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
      const py = (e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setOffset({ x: px, y: py }));
    };
    const onLeave = () => setOffset({ x: 0, y: 0 });
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  const layer = (depth: number): CSSProperties => ({
    transform: `translate3d(${(offset.x * strength * depth).toFixed(2)}px, ${(
      offset.y *
      strength *
      depth
    ).toFixed(2)}px, 0)`,
    transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
  });

  return { containerRef, layer };
}