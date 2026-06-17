// @ts-nocheck
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount } from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const typeIcons: Record<string, string> = {
  sale: "🟢",
  sale_failed: "🔴",
  withdrawal_paid: "💳",
  withdrawal_rejected: "❌",
};

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchList = useServerFn(listNotifications);
  const fetchCount = useServerFn(getUnreadCount);
  const markRead = useServerFn(markNotificationRead);

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => fetchCount(),
    refetchInterval: 15000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchList(),
    refetchInterval: 30000,
  });

  // Realtime: invalidate on any change to notifications for current user
  useEffect(() => {
    let channel: any;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) return;
      channel = supabase
        .channel(`user:${uid}:notif-bell`, { config: { private: true } })
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
        })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [queryClient]);

  const fetchMarkAll = useServerFn(markAllNotificationsRead);

  const { mutate: doMarkRead } = useMutation({
    mutationFn: (id: string) => markRead({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const { mutate: doMarkAllRead } = useMutation({
    mutationFn: () => fetchMarkAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-xl h-10 w-10 bg-white/5 border-white/10 hover:bg-white/10 text-foreground">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0 rounded-xl border-white/10 bg-background/95 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unread > 0 && (
            <button onClick={() => doMarkAllRead()} className="text-xs text-primary hover:underline">
              {unread} não lida{unread > 1 ? "s" : ""}
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma notificação</p>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="divide-y divide-white/5">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.read) doMarkRead(n.id); }}
                  className={cn(
                    "w-full text-left px-4 py-3 transition-colors hover:bg-white/5",
                    !n.read && "bg-primary/5",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-sm">{typeIcons[n.type] ?? "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", !n.read && "font-semibold")}>{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
        <div className="border-t border-white/5 p-2">
          <button
            onClick={() => navigate({ to: "/dashboard/settings" })}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Configurações
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}