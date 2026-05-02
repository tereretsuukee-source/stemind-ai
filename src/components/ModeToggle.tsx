import { useTranslation } from "react-i18next";
import { GraduationCap, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type SolverMode = "tutor" | "answer";

interface ModeToggleProps {
  value: SolverMode;
  onChange: (m: SolverMode) => void;
  className?: string;
}

export const ModeToggle = ({ value, onChange, className }: ModeToggleProps) => {
  const { t } = useTranslation();
  const opts: { key: SolverMode; label: string; Icon: typeof Zap; hint: string }[] = [
    { key: "tutor", label: t("mode.tutor"), Icon: GraduationCap, hint: t("mode.tutorHint") },
    { key: "answer", label: t("mode.answer"), Icon: Zap, hint: t("mode.answerHint") },
  ];
  return (
    <div
      role="tablist"
      aria-label={t("mode.label")}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card/60 p-0.5 text-xs",
        className,
      )}
    >
      {opts.map(({ key, label, Icon, hint }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            title={hint}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        );
      })}
    </div>
  );
};

const MODE_KEY = "stemind_solver_mode";

export const loadMode = (): SolverMode => {
  if (typeof window === "undefined") return "tutor";
  const v = localStorage.getItem(MODE_KEY);
  return v === "answer" ? "answer" : "tutor";
};

export const saveMode = (m: SolverMode) => {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    // ignore
  }
};
