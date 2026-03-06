import { ReactNode, useState } from "react";
import logoArenaHills from "@/assets/logo-arena-hills.jpeg";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LogOut, LayoutDashboard, Users, Layers, Trophy,
  Loader2, Target, ExternalLink, Menu, X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin",            icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/categories", icon: Trophy,          label: "Categorias" },
  { to: "/admin/teams",      icon: Users,           label: "Duplas" },
  { to: "/admin/groups",     icon: Layers,          label: "Grupos" },
  { to: "/admin/matches",    icon: Target,          label: "Partidas" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut, loading } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
          <img src={logoArenaHills} alt="Arena Hills" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          <div>
            <p className="font-display text-sm leading-none text-white">Arena Hills</p>
            <p className="text-xs text-brand-lime mt-0.5 tracking-wider uppercase font-semibold">Admin</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                active
                  ? "bg-brand-lime text-white"
                  : "text-blue-100 hover:text-white hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-0.5">
        <Link
          to="/live"
          target="_blank"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-live live-pulse flex-shrink-0" />
          Tela Pública
          <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50" />
        </Link>
        <Button
          variant="ghost"
          onClick={() => { signOut(); setMobileOpen(false); }}
          className="w-full justify-start gap-2.5 px-3 py-2.5 h-auto text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
        {/* Dev credit */}
        <div className="px-3 pt-3 pb-1">
          <p className="text-xs text-sidebar-foreground/40 leading-relaxed">
            Sistema desenvolvido por <span className="font-semibold text-sidebar-foreground/60">29Tech</span>
          </p>
          <a
            href="https://vintenove.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-lime/70 hover:text-brand-lime transition-colors"
          >
            vintenove.com ↗
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 bg-primary flex-col fixed h-full z-10">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-primary px-4 py-3 flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-2.5">
          <img src={logoArenaHills} alt="Arena Hills" className="w-8 h-8 rounded-full object-cover" />
          <span className="font-display text-base text-white">Arena Hills</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white hover:bg-sidebar-accent h-8 w-8"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-64 bg-primary h-full">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-56 min-h-screen bg-background p-5 lg:p-7 pt-16 lg:pt-7">
        {children}
      </main>
    </div>
  );
}
