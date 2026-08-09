import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/t/$id")({
  component: () => <div>TID</div>,
});
