import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, ShieldCheck, Loader2, Sparkles } from "lucide-react";
import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";
import { useAuth } from "@/hooks/useAuth";
import { problemsApi, type Solution } from "@/lib/stemind-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

// Render mixed text + LaTeX. Splits on $$...$$ (block) and $...$ (inline).
const renderMath = (text: string) => {
  const parts = text.split(/(\$\$[^$]+\$\$|\$[^$\n]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      return <BlockMath key={i} math={part.slice(2, -2)} />;
    }
    if (part.startsWith("$") && part.endsWith("$")) {
      return <InlineMath key={i} math={part.slice(1, -1)} />;
    }
    return <span key={i}>{part}</span>;
  });
};

const SessionDetail = () => {
  const { id } = useParams();
  const sessionId = Number(id);
  const { user } = useAuth();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: problems, isLoading } = useQuery({
    queryKey: ["problems", sessionId],
    queryFn: () => problemsApi.listForSession(sessionId),
    enabled: !!sessionId,
    refetchInterval: 4000, // poll for new solutions
  });

  // Fetch solutions for each problem
  const solutionsQueries = useQuery({
    queryKey: ["solutions", problems?.map((p) => p.id).join(",")],
    queryFn: async () => {
      if (!problems) return {};
      const entries = await Promise.all(
        problems.map(async (p) => [p.id, await problemsApi.getSolutions(p.id)] as const)
      );
      return Object.fromEntries(entries) as Record<number, Solution[]>;
    },
    enabled: !!problems && problems.length > 0,
    refetchInterval: 4000,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [problems?.length]);

  const create = useMutation({
    mutationFn: (text: string) =>
      problemsApi.create({
        sessionId,
        userId: user!.id,
        inputType: "text",
        inputData: text,
        mode: "socratic",
      }),
    onSuccess: () => {
      setInput("");
      qc.invalidateQueries({ queryKey: ["problems", sessionId] });
    },
    onError: (e: Error) =>
      toast({ title: "Couldn't submit", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    create.mutate(input.trim());
  };

  return (
    <div className="flex flex-col h-screen md:h-screen">
      <header className="px-6 py-4 border-b border-border flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/sessions">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display font-semibold">Session #{sessionId}</h1>
          <p className="text-xs text-muted-foreground">Triple-verified solutions</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}

        {!isLoading && problems && problems.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-stemind-cyan" />
            <h3 className="font-display font-semibold mb-1">Submit your first problem</h3>
            <p className="text-sm text-muted-foreground">
              Type a STEM problem below. The Solver, Critic, and Verifier will work it out.
            </p>
          </div>
        )}

        {problems?.map((p) => {
          const sols = solutionsQueries.data?.[p.id] ?? [];
          const finalSol = sols.find((s) => s.agentRole === "final") ?? sols[sols.length - 1];
          return (
            <div key={p.id} className="space-y-3">
              {/* User bubble */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-3 text-sm whitespace-pre-wrap">
                  {p.inputData}
                </div>
              </div>

              {/* AI response */}
              <Card className="border-border/60 p-4 max-w-[95%]">
                {sols.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Solving · Critiquing · Verifying…
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3 text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-stemind-cyan" />
                      <span className="text-stemind-cyan font-medium">
                        {finalSol?.verificationPassed ? "Verified" : "Solution"}
                      </span>
                      {finalSol?.confidenceScore != null && (
                        <span className="text-muted-foreground">
                          · confidence {(finalSol.confidenceScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                      {renderMath(finalSol?.content ?? "")}
                    </div>
                  </>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border p-4 bg-card/30 backdrop-blur-sm shrink-0"
      >
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a STEM question, paste a problem, or describe what's stuck…"
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as FormEvent);
              }
            }}
          />
          <Button
            type="submit"
            disabled={create.isPending || !input.trim()}
            className="bg-gradient-stemind text-primary-foreground hover:opacity-90 h-[60px] px-4"
          >
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SessionDetail;
