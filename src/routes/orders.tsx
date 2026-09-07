import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";

export const Route = createFileRoute("/orders")({
  component: OrdersLayout,
});

function OrdersLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <PPPHeader />
      <Outlet />
      <PPPFooter />
    </div>
  );
}
