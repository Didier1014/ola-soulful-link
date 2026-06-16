import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/notifications/config")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/settings" });
  },
  component: () => null,
});
