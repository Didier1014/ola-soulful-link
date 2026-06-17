import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { hasInvalidPushSubscription } from "@/lib/push.functions";
import { usePushNotifications } from "@/components/push-setup";

export function PushReactivateBanner() {
  const check = useServerFn(hasInvalidPushSubscription);
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["push-invalid"],
    queryFn: () => check(),
    refetchOnWindowFocus: true,
  });
  const { enable, loading } = usePushNotifications();

  if (!data?.invalid) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-200">
          As notificações deste dispositivo estão desactualizadas
        </p>
        <p className="mt-1 text-xs text-amber-100/80">
          A inscrição push deixou de ser válida{data.reason ? ` (${data.reason})` : ""}. Clique para reactivar e voltar a receber alertas de venda.
        </p>
      </div>
      <button
        onClick={async () => {
          await enable();
          await refetch();
        }}
        disabled={loading || isFetching}
        className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-60"
      >
        {loading ? "A reactivar..." : "Reactivar"}
      </button>
    </div>
  );
}
