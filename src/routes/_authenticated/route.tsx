import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Package, Receipt, Wallet, LogOut, Menu, X,
  PlusCircle, BarChart3, Plug, BookOpen, Settings as SettingsIcon, Sun, Moon,
  Users, Link2, Code2, MessageSquare, RotateCcw, User, Shield, Bell, Mail, Store,
} from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { FloatingSaleNotification } from "@/components/floating-sale-notification";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth" });
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
  { to: "/dashboard/merchants", label: "Merchants", icon: Store, exact: false },
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

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen text-foreground relative overflow-x-hidden">

      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute top-1/3 -right-32 h-[380px] w-[380px] rounded-full bg-primary-glow/15 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      <div className="relative z-10 bg-background min-h-screen">
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-white/5">
          <div className="max-w-7xl mx-auto flex items-center gap-2 px-4 lg:px-8 h-14">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 bg-white/5 border-white/10 hover:bg-white/10 text-foreground">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-sidebar text-sidebar-foreground w-80 p-0 border-r border-white/5 [&>button]:hidden">
                <DrawerContent close={() => setOpen(false)} onSignOut={signOut} />
              </SheetContent>
            </Sheet>
            <Link to="/dashboard" className="font-bold tracking-tight ml-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary-glow shadow-[0_0_12px_var(--primary-glow)]" />
              REDOX <span className="text-gradient-red">PAY</span>
            </Link>
            <div className="ml-auto">
              <NotificationBell />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 lg:px-8 py-5 lg:py-8 pb-24">
          <Outlet />
        </main>
        <FloatingSaleNotification />
      </div>
    </div>
  );
}

function DrawerContent({ close, onSignOut }: { close: () => void; onSignOut: () => void }) {
  const [isDark, setIsDark] = useState(true);
  function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  }
  return (
    <div className="flex flex-col h-full bg-sidebar relative">
      <div aria-hidden className="absolute top-0 left-0 h-40 w-full bg-gradient-to-b from-primary/15 to-transparent pointer-events-none" />
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 relative">
        <button onClick={close} className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
        <span className="font-bold tracking-widest text-sm flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-glow shadow-[0_0_8px_var(--primary-glow)]" />
          REDOX PAY
        </span>
        <div className="w-9" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <p className="px-5 pt-5 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Menu</p>
        <nav className="px-3 pb-3 flex flex-col gap-1">
          {navItems.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              onClick={close}
              activeOptions={{ exact: !!it.exact }}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground/70 hover:bg-white/5 hover:text-foreground transition-colors"
              activeProps={{ className: "flex items-center gap-3 rounded-xl px-3 py-3 text-sm bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 text-foreground font-semibold shadow-[0_0_20px_-8px_var(--primary-glow)]" }}
            >
              <it.icon className="h-4 w-4" /> {it.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/5 p-3 space-y-1 shrink-0">
        <button onClick={toggleTheme} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-foreground/60 hover:bg-white/5">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {isDark ? "Modo claro" : "Modo escuro"}
        </button>
        <button onClick={() => { onSignOut(); close(); }} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-foreground/60 hover:bg-white/5">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </div>
  );
}
