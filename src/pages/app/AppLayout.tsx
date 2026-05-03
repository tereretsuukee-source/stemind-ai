import { Outlet, NavLink, useNavigate, Navigate } from "react-router-dom";
import { Brain, LayoutDashboard, MessagesSquare, Network, LogOut, Loader2, Moon, Sun, Settings as SettingsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";

const AppLayout = () => {
  const { user, loading } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const navItems = [
    { to: "/app/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "/app/sessions", label: t("nav.sessions"), icon: MessagesSquare },
    { to: "/app/knowledge", label: t("nav.knowledge"), icon: Network },
    { to: "/app/settings", label: t("nav.settings"), icon: SettingsIcon },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card/30 backdrop-blur-sm">
        <div className="px-6 py-5 border-b border-border">
          <NavLink to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-stemind flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold tracking-tight">
              STEM<span className="text-gradient">ind</span>
            </span>
          </NavLink>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">
            {user.email}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="flex-1 justify-start" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
            </Button>
            <LanguageSwitcher variant="icon" />
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            {t("nav.signOut")}
          </Button>
        </div>
      </aside>

      {/* Mobile top bar (in normal flow, not fixed) */}
      <div className="md:hidden shrink-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 py-2.5">
          <NavLink to="/app/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-stemind flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-base font-display font-bold">
              STEM<span className="text-gradient">ind</span>
            </span>
          </NavLink>
          <div className="flex items-center gap-1">
            <LanguageSwitcher variant="icon" />
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex border-t border-border overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium whitespace-nowrap",
                  isActive ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto md:overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
