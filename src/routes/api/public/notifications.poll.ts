import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/notifications/poll")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const userId = url.searchParams.get("user_id");
        const after = url.searchParams.get("after");

        if (!userId) return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let query = supabaseAdmin
          .from("notifications")
          .select("id,type,title,message,data,created_at")
          .eq("user_id", userId)
          .eq("type", "sale")
          .order("created_at", { ascending: false })
          .limit(10);

        if (after) {
          query = query.gt("created_at", after);
        }

        const { data, error } = await query;
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        return new Response(JSON.stringify(data ?? []), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
