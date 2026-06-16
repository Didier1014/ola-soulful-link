import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "./auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel — Redox Pay" },
      { name: "description", content: "Acesse o seu painel Redox Pay." },
    ],
  }),
  component: AuthLayout,
});
