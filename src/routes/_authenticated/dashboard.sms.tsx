import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listSms, sendSms } from "@/lib/sms.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/sms")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listSms);
  const send = useServerFn(sendSms);
  const { data: logs = [] } = useQuery({ queryKey: ["sms_logs"], queryFn: () => fetchList() });
  const [form, setForm] = useState({ phone: "", message: "" });

  const sendM = useMutation({
    mutationFn: () => send({ data: form }),
    onSuccess: () => { toast.success("SMS registado"); setForm({ phone: "", message: "" }); qc.invalidateQueries({ queryKey: ["sms_logs"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight">SMS</h1>
        <p className="text-sm text-muted-foreground">Notifique clientes e confirme pagamentos</p>
      </div>

      <Card className="p-5 bg-white/5 border-white/10 rounded-2xl space-y-3">
        <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+258..." /></div>
        <div><Label>Mensagem</Label><Textarea rows={3} maxLength={480} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /><p className="mt-1 text-xs text-muted-foreground text-right">{form.message.length}/480</p></div>
        <Button className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white" disabled={sendM.isPending || !form.phone || !form.message} onClick={() => sendM.mutate()}>
          <Send className="h-4 w-4 mr-2" /> Enviar SMS
        </Button>
      </Card>

      <div>
        <p className="px-1 text-xs uppercase tracking-wider text-muted-foreground mb-2">Histórico</p>
        {logs.length === 0 ? (
          <Card className="p-10 text-center bg-white/5 border-white/10 rounded-2xl">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Sem mensagens</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map((s) => (
              <Card key={s.id} className="p-3 bg-white/5 border-white/10 rounded-2xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono">{s.phone}</span>
                  <span className="text-muted-foreground">{new Date(s.created_at).toLocaleString("pt-MZ")}</span>
                </div>
                <p className="mt-1 text-sm">{s.message}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
