import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Brain, Flame, Target, TrendingUp, BookOpen, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async () => {
      const userId = user!.id;

      const [sessionsRes, problemsRes, knowledgeRes] = await Promise.all([
        supabase.from("study_sessions").select("id", { count: "exact" }).eq("user_id", userId),
        supabase.from("problems").select("id, created_at", { count: "exact" }).eq("user_id", userId),
        supabase.from("knowledge_nodes").select("*").eq("user_id", userId),
      ]);

      const totalSessions = sessionsRes.count ?? 0;
      const totalProblems = problemsRes.count ?? 0;
      const nodes = knowledgeRes.data ?? [];

      const avgMastery = nodes.length > 0
        ? nodes.reduce((sum, n) => sum + (n.mastery_level ?? 0), 0) / nodes.length
        : 0;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyProblems = (problemsRes.data ?? []).filter(
        (p) => new Date(p.created_at) >= oneWeekAgo
      ).length;

      const sorted = [...nodes].sort((a, b) => (b.mastery_level ?? 0) - (a.mastery_level ?? 0));
      const strongTopics = sorted.slice(0, 5).map((n) => ({ topic: n.topic, mastery: n.mastery_level ?? 0 }));
      const weakTopics = sorted.slice(-5).reverse().map((n) => ({ topic: n.topic, mastery: n.mastery_level ?? 0 }));

      return {
        totalProblems,
        totalSessions,
        averageMastery: avgMastery,
        weeklyProblems,
        topicsStudied: nodes.length,
        strongTopics,
        weakTopics,
      };
    },
    enabled: !!user,
  });

  const stats = [
    { label: t("dashboard.totalProblems"), value: data?.totalProblems ?? 0, icon: Brain, accent: "text-stemind-violet" },
    { label: t("dashboard.averageMastery"), value: `${((data?.averageMastery ?? 0) * 100).toFixed(0)}%`, icon: Target, accent: "text-stemind-cyan" },
    { label: t("dashboard.topicsStudied"), value: data?.topicsStudied ?? 0, icon: BookOpen, accent: "text-stemind-violet" },
    { label: t("dashboard.thisWeek"), value: data?.weeklyProblems ?? 0, icon: TrendingUp, accent: "text-stemind-cyan" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-2">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
      </header>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("dashboard.loading")}
        </div>
      )}

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive mb-6">
          {t("dashboard.loadError")}: {(error as Error).message}
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5 border-border/60 hover:border-border transition-colors">
              <s.icon className={`w-5 h-5 mb-3 ${s.accent}`} />
              <div className="text-2xl md:text-3xl font-display font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6 border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-stemind-cyan" />
            <h2 className="font-display font-semibold">{t("dashboard.strongTopics")}</h2>
          </div>
          {data?.strongTopics?.length ? (
            <ul className="space-y-2">
              {data.strongTopics.map((t) => (
                <li key={t.topic} className="flex justify-between text-sm">
                  <span>{t.topic}</span>
                  <span className="text-muted-foreground">{(t.mastery * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("dashboard.keepPracticing")}</p>
          )}
        </Card>

        <Card className="p-6 border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-stemind-violet" />
            <h2 className="font-display font-semibold">{t("dashboard.needsReview")}</h2>
          </div>
          {data?.weakTopics?.length ? (
            <ul className="space-y-2">
              {data.weakTopics.map((t) => (
                <li key={t.topic} className="flex justify-between text-sm">
                  <span>{t.topic}</span>
                  <span className="text-muted-foreground">{(t.mastery * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("dashboard.allCaughtUp")}</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
