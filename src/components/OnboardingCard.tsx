import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Plus, MessagesSquare, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const OnboardingCard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const steps = [
    { icon: Plus, title: t("dashboard.stepCreate"), desc: t("dashboard.stepCreateDesc") },
    { icon: MessagesSquare, title: t("dashboard.stepAsk"), desc: t("dashboard.stepAskDesc") },
    { icon: ShieldCheck, title: t("dashboard.stepNext"), desc: t("dashboard.stepNextDesc") },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="p-6 md:p-8 mb-8 border-border/60 bg-gradient-to-br from-primary/5 via-card to-card relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-stemind opacity-10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Get started
          </span>
        </div>

        <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight mb-2">
          {t("dashboard.welcomeTitle")}
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl">
          {t("dashboard.welcomeDesc")}
        </p>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="rounded-lg border border-border/60 bg-card/50 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {i + 1}
                </div>
                <s.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-sm mb-1">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => navigate("/app/sessions")}
            className="bg-gradient-stemind text-primary-foreground hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("dashboard.ctaCreateSession")}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/app/sessions")}
          >
            {t("dashboard.ctaTryDemo")}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};
