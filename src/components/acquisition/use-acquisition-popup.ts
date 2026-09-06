import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { usePPP } from "@/context/ppp-store";

const DISMISSED_KEY = "ppp.welcome.dismissed.v1";
/** Survives the session so a second visit gets the returning-customer wording. */
const SEEN_KEY = "ppp.welcome.seen.v1";

/** Routes where a welcome interruption would get in the customer's way. */
const SUPPRESSED = ["/account/sign-in", "/account/sign-up", "/account/forgot-password", "/dev"];

function isSuppressed(pathname: string) {
  return SUPPRESSED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function alreadyDismissed() {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * Deterministic, once-per-session welcome trigger: ~10s of browsing, 35% scroll,
 * or a second public-route navigation — whichever happens first. Never on first
 * paint, never on auth routes, never on top of another open sheet.
 */
function isReturningVisitor() {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function useAcquisitionPopup() {
  const { searchOpen, locationSheetOpen, orderSheetOpen, cartOpen } = usePPP();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [navCount, setNavCount] = useState(0);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    setNavCount((n) => n + 1);
  }, [pathname]);

  const blocked =
    isSuppressed(pathname) || searchOpen || locationSheetOpen || orderSheetOpen || cartOpen;

  useEffect(() => {
    if (open || blocked || alreadyDismissed()) return undefined;

    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      setReturning(isReturningVisitor());
      try {
        window.localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
      setOpen(true);
    };

    if (navCount >= 2) {
      show();
      return undefined;
    }

    const timer = window.setTimeout(show, 10000);
    const onScroll = () => {
      const depth = window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1);
      if (depth > 0.35) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open, blocked, navCount]);

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return { open: open && !blocked, dismiss, returning };
}
