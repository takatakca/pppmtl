import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";

export const Route = createFileRoute("/support")({
  component: SupportLayout,
});

function SupportLayout() {
  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <Outlet />
      <PPPFooter />
      <MobileOrderBar />
      <SearchOverlay />
      <LocationSheet />
      <OrderSheet />
    </div>
  );
}
