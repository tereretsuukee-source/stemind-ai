import { useTranslation } from "react-i18next";
import { Globe, Palette, User, LogOut, Sun, Moon, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { cn } from "@/lib/utils";

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const currentLang = i18n.language?.split("-")[0] ?? "en";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-2">
          {t("settings.title")}
        </h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </header>

      {/* Language */}
      <Card className="p-6 border-border/60 mb-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-semibold">{t("settings.language")}</h2>
            <p className="text-sm text-muted-foreground">{t("settings.languageDesc")}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={cn(
                  "flex items-center justify-between gap-2 px-4 py-3 rounded-lg border text-left transition-colors",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-border hover:bg-muted/40"
                )}
              >
                <div>
                  <div className="font-medium text-sm">{lang.nativeName}</div>
                  {lang.nativeName !== lang.name && (
                    <div className="text-xs text-muted-foreground">{lang.name}</div>
                  )}
                </div>
                {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Appearance */}
      <Card className="p-6 border-border/60 mb-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-semibold">{t("settings.appearance")}</h2>
            <p className="text-sm text-muted-foreground">{t("settings.appearanceDesc")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTheme("light")}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors",
              theme === "light"
                ? "border-primary bg-primary/5"
                : "border-border/60 hover:border-border hover:bg-muted/40"
            )}
          >
            <Sun className="w-4 h-4" />
            {t("nav.lightMode")}
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors",
              theme === "dark"
                ? "border-primary bg-primary/5"
                : "border-border/60 hover:border-border hover:bg-muted/40"
            )}
          >
            <Moon className="w-4 h-4" />
            {t("nav.darkMode")}
          </button>
        </div>
      </Card>

      {/* Account */}
      <Card className="p-6 border-border/60">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-semibold">{t("settings.account")}</h2>
            <p className="text-sm text-muted-foreground">{t("settings.accountDesc")}</p>
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-4 px-1">
          {user?.email ?? "—"}
        </div>

        <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
          <LogOut className="w-4 h-4 mr-2" />
          {t("nav.signOut")}
        </Button>
      </Card>
    </div>
  );
};

export default Settings;
