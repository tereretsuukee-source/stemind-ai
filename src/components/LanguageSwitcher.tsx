import { Globe, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  variant?: "icon" | "full";
  className?: string;
}

export const LanguageSwitcher = ({ variant = "icon", className }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();
  const current =
    SUPPORTED_LANGUAGES.find((l) => i18n.language?.startsWith(l.code)) ?? SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon" className={cn(className)} aria-label="Change language">
            <Globe className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className={cn("w-full justify-start", className)}>
            <Globe className="w-4 h-4 mr-2" />
            {current.nativeName}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = current.code === lang.code;
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className="flex items-center justify-between gap-2 cursor-pointer"
            >
              <span>
                <span className="font-medium">{lang.nativeName}</span>
                {lang.nativeName !== lang.name && (
                  <span className="text-xs text-muted-foreground ml-2">{lang.name}</span>
                )}
              </span>
              {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
