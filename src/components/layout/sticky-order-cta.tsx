import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { orderSearch } from "@/lib/order-links";

/**
 * Desktop-only ordering anchor. It appears once the hero terminal scrolls
 * away so "start an order" is never more than one click from any section.
 */
export function StickyOrderCTA() {
  const { mode, t } = usePPP();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 620);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed bottom-6 right-6 z-[60] hidden transition-all duration-300 lg:block ${
        show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <Link
        to="/order"
        search={orderSearch()}
        tabIndex={show ? 0 : -1}
        aria-hidden={!show}
        className="cta-motion pointer-events-auto inline-flex items-center gap-3 bg-primary px-6 py-4 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
        style={{ boxShadow: "var(--shadow-glow)" }}
      >
        <ShoppingBag className="h-5 w-5" />
        {mode === "pickup"
          ? t("Start pickup order", "Commander en cueillette")
          : t("Start delivery order", "Commander en livraison")}
        <ArrowRight className="cta-arrow h-5 w-5" />
      </Link>
    </div>
  );
}