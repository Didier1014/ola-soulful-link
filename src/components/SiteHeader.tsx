import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold tracking-wide">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inset-0 rounded-full bg-brand-red animate-ping opacity-60" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-brand-red" />
      </span>
      <span className="text-foreground">REDOX</span>
      <span className="text-brand-gradient">PAY</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#funcionalidades" className="hover:text-foreground transition">Funcionalidades</a>
          <a href="#seguranca" className="hover:text-foreground transition">Segurança</a>
          <a href="#painel" className="hover:text-foreground transition">Painel</a>
          <a href="#contacto" className="hover:text-foreground transition">Contacto</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">Entrar</Link>
          <Link
            to="/auth"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground btn-glow hover:brightness-110 transition"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer id="contacto" className="border-t border-white/5 mt-24">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <Logo />
        <p>© 2026 Redox Pay · Maputo, Moçambique</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-foreground">Termos</a>
          <a href="#" className="hover:text-foreground">Privacidade</a>
          <a href="https://wa.me/258840000000" className="hover:text-foreground">Suporte</a>
        </div>
      </div>
    </footer>
  );
}
