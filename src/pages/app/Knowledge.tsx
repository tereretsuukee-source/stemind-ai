import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Network, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const Knowledge = () => {
  const { user } = useAuth();

  const { data: nodes, isLoading, error } = useQuery({
    queryKey: ["knowledge", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_nodes")
        .select("*")
        .eq("user_id", user!.id)
        .order("mastery_level", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Group by subject
  const grouped = (nodes ?? []).reduce<Record<string, typeof nodes>>((acc, n) => {
    const key = n.subject || "Other";
    if (!acc[key]) acc[key] = [] as typeof nodes;
    acc[key]!.push(n);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-2">Knowledge graph</h1>
        <p className="text-muted-foreground">Your mastery, mapped topic by topic.</p>
      </header>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          {(error as Error).message}
        </Card>
      )}

      {!isLoading && nodes && nodes.length === 0 && (
        <Card className="p-10 text-center border-dashed">
          <Network className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-display font-semibold mb-1">No topics yet</h3>
          <p className="text-sm text-muted-foreground">
            Solve problems to start building your personal knowledge graph.
          </p>
        </Card>
      )}

      <div className="space-y-8">
        {Object.entries(grouped).map(([subject, items]) => (
          <section key={subject}>
            <h2 className="font-display font-semibold text-lg mb-3">{subject}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items!.map((n, i) => {
                const pct = Math.round((n.mastery_level ?? 0) * 100);
                return (
                  <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card className="p-5 border-border/60">
                      <div className="flex items-baseline justify-between mb-3">
                        <h3 className="font-medium truncate">{n.topic}</h3>
                        <span className="text-sm text-muted-foreground tabular-nums">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                      <div className="text-xs text-muted-foreground mt-3">
                        {n.problems_correct ?? 0} / {n.problems_attempted ?? 0} correct
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default Knowledge;
