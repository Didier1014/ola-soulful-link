import { createFileRoute } from "@tanstack/react-router";
import { handlePaynowWebhook } from "@/lib/paynow-webhook";

export const Route = createFileRoute("/api/public/paynow-webhook")({
  server: {
    handlers: {
      GET: () => Response.json({ service: "Redox Pay", webhook: "PayNow", status: "ready" }),
      POST: ({ request }) => handlePaynowWebhook(request, process.env.PAYNOW_WEBHOOK_SECRET, async (reference, event) => {
        const { settlePaynow } = await import("@/lib/paynow.server");
        return settlePaynow(reference, event);
      }),
    },
  },
});