import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";

interface AnswerSummaryProps {
  topic?: string | null;
  masteryDelta: number; // 0..1
  streak: number;
}

export const AnswerSummary = ({ topic, masteryDelta, streak }: AnswerSummaryProps) => {
  const { t } = useTranslation();
  const pct = Math.round(masteryDelta * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-3 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-stemind-cyan" />
            <span>{t("session.answeredLabel")}</span>
          </div>
          {topic && (
            <span className="text-muted-foreground">
              · <span className="text-foreground">{topic}</span>
            </span>
          )}
          <div className="flex items-center gap-1 text-stemind-cyan ml-auto">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="tabular-nums">+{pct}% {t("session.mastery")}</span>
          </div>
          {streak > 1 && (
            <div className="flex items-center gap-1 text-stemind-amber">
              <Flame className="w-3.5 h-3.5" />
              <span className="tabular-nums">{t("session.streakDays", { count: streak })}</span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
