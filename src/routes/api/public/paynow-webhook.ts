import { createFileRoute } from "@tanstack/react-router";
import { handlePaynowWebhook } from "@/lib/paynow-webhook";

export const Route = createFileRoute("/api/public/paynow-webhook")({
  server: {
    handlers: {
      GET: () => Response.json({ service: "Redox Pay", webhook: "PayNow", status: "awaiting_activation" }),
      POST: ({ request }) => handlePaynowWebhook(request, process.env.PAYNOW_WEBHOOK_SECRET),
    },
  },
});