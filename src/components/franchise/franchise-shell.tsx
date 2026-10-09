import type { ReactNode } from "react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { SearchOverlay } from "@/components/search/search-overlay";
import { CartPanel } from "@/components/order/cart-panel";

/** Header, footer and the shared overlays (search, order choices, one cart) around a franchise page. */
export function FranchiseShell({ children }: { children: ReactNode }) {
  return (
    <div id="top" className="min-h-screen bg-background">
      <PPPHeader />
      <main>{children}</main>
      <PPPFooter />
      <SearchOverlay />
      <LocationSheet />
      <OrderSheet />
      <CartPanel />
    </div>
  );
}
