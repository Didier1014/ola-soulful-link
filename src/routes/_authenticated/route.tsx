import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Package, Receipt, Wallet, LogOut, Menu, X,
  PlusCircle, BarChart3, Plug, Settings as SettingsIcon,
  Users, Link2, MessageSquare, RotateCcw, User, Shield, Bell, Mail,
} from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { FloatingSaleNotification } from "@/components/floating-sale-notification";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";


import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth" });
    }
    // Enforce profile completion
    if (location.pathname !== "/dashboard/complete-profile") {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name,whatsapp,birth_date,province,neighborhood")
        .eq("id", data.user.id)
        .maybeSingle();
      const missing = !p || !p.full_name || !p.whatsapp || !p.birth_date || !p.province || !p.neighborhood;
      if (missing) {
        throw redirect({ to: "/dashboard/complete-profile" });
      }
    }
    return {};
  },
  component: AuthedShell,
});

const navItems = [
  { to: "/dashboard", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/transactions", label: "Transações", icon: Receipt, exact: false },
  { to: "/dashboard/new-transaction", label: "Nova transacção", icon: PlusCircle, exact: false },
  { to: "/dashboard/customers", label: "Clientes", icon: Users, exact: false },
  { to: "/dashboard/products", label: "Produtos", icon: Package, exact: false },
  { to: "/dashboard/payment-links", label: "Links de pagamento", icon: Link2, exact: false },

  { to: "/dashboard/notifications", label: "Notificações", icon: Bell, exact: false },
  { to: "/dashboard/subscriptions", label: "Recorrência", icon: RotateCcw, exact: false },
  { to: "/dashboard/sms", label: "SMS", icon: MessageSquare, exact: false },
  { to: "/dashboard/withdrawals", label: "Saques", icon: Wallet, exact: false },
  { to: "/dashboard/reports", label: "Relatórios", icon: BarChart3, exact: false },
  
  { to: "/dashboard/integrations", label: "Integrações", icon: Plug, exact: false },
  { to: "/dashboard/profile", label: "Meu perfil", icon: User, exact: false },
  { to: "/dashboard/admin", label: "Admin", icon: Shield, exact: false },
  { to: "/dashboard/email-logs", label: "Emails", icon: Mail, exact: false },
  { to: "/dashboard/settings", label: "Configurações", icon: SettingsIcon, exact: false },
] as const;

function AuthedShell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const path = useRouterState({ select: (state) => state.location.pathname });
  const activeItem = navItems.find(item => item.exact ? path === item.to || path === `${item.to}/` : path.startsWith(item.to));
  const ActiveIcon = activeItem?.icon ?? LayoutDashboard;
  useEffect(() => {
    document.body.classList.add("saas-active");
    return () => document.body.classList.remove("saas-active");
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className={`dash-shell min-h-screen text-foreground ${collapsed ? "dash-collapsed" : ""}`}>
      <aside className="dash-sidebar hidden lg:flex">
        <Link to="/dashboard" className="dash-brand"><span className="dash-brand-symbol">R</span>{!collapsed && <span>REDOX<span className="text-primary-glow"> PAY</span></span>}</Link>
        {!collapsed && <p className="px-4 pt-7 pb-3 text-[10px] text-muted-foreground">ESPAÇO DE TRABALHO</p>}
        <nav aria-label="Menu principal" className="flex-1 min-h-0 overflow-y-auto space-y-1 py-3">{navItems.map(it => <Link key={it.to} to={it.to} title={it.label} activeOptions={{ exact: it.exact }} className="dash-nav-link" activeProps={{ className: "dash-nav-link dash-nav-active" }}><it.icon className="size-4 shrink-0" strokeWidth={1.65} />{!collapsed && <span className="truncate">{it.label}</span>}</Link>)}</nav>
        <div className="border-t border-border pt-3 space-y-1"><Button variant="ghost" onClick={() => setCollapsed(v => !v)} title={collapsed ? "Expandir menu" : "Recolher menu"} aria-label={collapsed ? "Expandir menu" : "Recolher menu"} className="dash-nav-link w-full justify-start"><Menu className="size-4 shrink-0" />{!collapsed && "Recolher menu"}</Button><Button variant="ghost" onClick={signOut} title="Sair" className="dash-nav-link w-full justify-start"><LogOut className="size-4 shrink-0" />{!collapsed && "Sair"}</Button></div>
      </aside>
      <div className="dash-workspace relative z-10 min-h-screen">
        <header className="dash-topbar sticky top-0 z-40 border-b border-border">
          <div className="max-w-7xl mx-auto grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 lg:px-10 h-14">
            <div className="flex items-center gap-3 min-w-0">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild><Button variant="outline" size="icon" aria-label="Abrir menu" className="lg:hidden rounded-md size-8 shrink-0 bg-secondary border-border text-foreground"><Menu className="size-4" /></Button></SheetTrigger>
                <SheetContent side="left" className="saas-mobile-menu w-72 p-0 [&>button]:hidden"><SheetTitle className="sr-only">Menu Redox Pay</SheetTitle><DrawerContent close={() => setOpen(false)} onSignOut={signOut} /></SheetContent>
              </Sheet>
              <Link to="/dashboard" className="font-semibold text-xs flex items-center gap-1 lg:hidden">REDOX <span className="text-primary-glow">PAY</span></Link>
              <span className="hidden lg:flex text-xs text-muted-foreground items-center gap-2 min-w-0"><ActiveIcon className="size-3.5 shrink-0" /><span className="truncate">{activeItem?.label ?? "Redox Pay"}</span></span>
            </div>
            <div className="flex items-center gap-2 shrink-0"><ThemeToggle minimal /><NotificationBell /></div>
          </div>
        </header>
        <main className="saas-content max-w-7xl mx-auto min-w-0 px-5 sm:px-8 lg:px-10 py-7 lg:py-9 pb-16"><Outlet /></main>
        <FloatingSaleNotification />
      </div>
    </div>
  );
}

function DrawerContent({ close, onSignOut }: { close: () => void; onSignOut: () => void }) {
  return <div className="flex flex-col h-full bg-background text-foreground">
    <div className="flex items-center justify-between px-5 py-5 border-b border-border"><Link to="/dashboard" onClick={close} className="dash-brand"><span className="dash-brand-symbol">R</span><span>REDOX<span className="text-primary-glow"> PAY</span></span></Link><Button size="icon" variant="ghost" aria-label="Fechar menu" onClick={close}><X className="size-4" /></Button></div>
    <p className="px-6 pt-5 pb-2 text-[10px] text-muted-foreground">ESPAÇO DE TRABALHO</p>
    <nav aria-label="Menu principal" className="px-3 flex-1 min-h-0 overflow-y-auto space-y-1 py-2">{navItems.map(it => <Link key={it.to} to={it.to} onClick={close} activeOptions={{ exact:it.exact }} className="dash-nav-link" activeProps={{ className:"dash-nav-link dash-nav-active" }}><it.icon className="size-4 shrink-0" strokeWidth={1.65} /><span className="truncate">{it.label}</span></Link>)}</nav>
    <div className="border-t border-border p-4 flex items-center justify-between"><ThemeToggle minimal /><Button variant="ghost" onClick={() => { onSignOut(); close(); }}><LogOut className="size-4" />Sair</Button></div>
  </div>;
}
