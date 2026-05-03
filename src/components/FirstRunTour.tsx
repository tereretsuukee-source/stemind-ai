import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Sparkles, Network, X, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TOUR_KEY = "stemind_tour_done";

export const FirstRunTour = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(TOUR_KEY) !== "1";
  });
  const [step, setStep] = useState(0);

  const steps = [
    { Icon: GraduationCap, title: t("tour.step1Title"), desc: t("tour.step1Desc") },
    { Icon: Sparkles, title: t("tour.step2Title"), desc: t("tour.step2Desc") },
    { Icon: Network, title: t("tour.step3Title"), desc: t("tour.step3Desc") },
  ];

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, "1");
    setOpen(false);
  };

  if (!open) return null;
  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="mb-6"
      >
        <Card className="p-5 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card relative">
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("tour.skip")}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <s.Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                {t("tour.stepCounter", { current: step + 1, total: steps.length })}
              </div>
              <h3 className="font-display font-semibold text-base mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{s.desc}</p>
              <div className="flex items-center gap-2">
                {last ? (
                  <Button size="sm" onClick={dismiss} className="bg-gradient-stemind text-primary-foreground hover:opacity-90">
                    {t("tour.done")}
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setStep(step + 1)}>
                    {t("tour.next")}
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={dismiss}>
                  {t("tour.skip")}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
