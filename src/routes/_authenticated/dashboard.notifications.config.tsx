import { pageHead } from "@/lib/page-head";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/notifications/config")({
  head: () => pageHead('Preferências de notificações', 'Consulte preferências de notificações na Redox Pay com segurança.'),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/settings" });
  },
  component: () => null,
});
