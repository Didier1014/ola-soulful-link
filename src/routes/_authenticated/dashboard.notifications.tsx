// @ts-nocheck
import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationRead, markAllNotificationsRead, sendTestNotification } from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCheck, Settings2, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  component: NotificationsPage,
});

const typeIcons: Record<string, string> = {
  sale: "🟢",
  sale_failed: "🔴",
  withdrawal_paid: "💳",
  withdrawal_rejected: "❌",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d atrás`;
  return new Date(date).toLocaleDateString("pt-MZ");
}

function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchList = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const sendTest = useServerFn(sendTestNotification);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchList(),
    refetchInterval: 15000,
  });

  // Realtime sync: any change refreshes both the list and the unread badge.
  useEffect(() => {
    let channel: any;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) return;
      channel = supabase
        .channel(`notif-page-${uid}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
        })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [queryClient]);

  const { mutate: doMarkRead } = useMutation({
    mutationFn: (id: string) => markRead({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const { mutate: doMarkAll } = useMutation({
    mutationFn: () => markAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const { mutate: doSendTest, isPending: testing } = useMutation({
    mutationFn: () => sendTest(),
    onSuccess: (r: any) => {
      if (r?.push_sent) {
        toast.success("Notificação enviada — confira o aviso do navegador");
      } else {
        toast.success("Notificação criada", {
          description: "Active as notificações push em Configurar para receber alertas mesmo com o site fechado.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao testar"),
  });

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="px-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            {notifications.length} no total{unread > 0 && ` · ${unread} não lida${unread > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => doSendTest()} disabled={testing} className="gap-1.5">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Testar venda
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/dashboard/settings" })} className="gap-1.5">
            <Settings2 className="h-4 w-4" />
            Configurar
          </Button>
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={() => doMarkAll()} className="gap-1.5">
              <CheckCheck className="h-4 w-4" />
              Marcar todas lidas
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Nenhuma notificação ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">As notificações aparecerão aqui quando houver vendas ou movimentações.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => { if (!n.read) doMarkRead(n.id); }}
              className={`w-full text-left rounded-xl border ${n.read ? "border-border/50" : "border-primary/30 bg-primary/5"} p-4 transition-colors hover:bg-white/5`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{typeIcons[n.type] ?? "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${n.read ? "" : "font-semibold"}`}>{n.title}</p>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                  {n.data?.transaction_id && n.type === "sale" && (
                    <Link
                      to="/dashboard/transactions"
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      Ver transação →
                    </Link>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}