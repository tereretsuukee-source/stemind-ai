import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Send,
  ShieldCheck,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  PanelRightClose,
  PanelRight,
  GitCompare,
  AlertTriangle,
} from "lucide-react";
import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { problemsApi, type Solution } from "@/lib/stemind-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";

// ── LaTeX rendering ──────────────────────────────────────────────
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

// ── Agent step badge colours ─────────────────────────────────────
const roleMeta: Record<string, { label: string; color: string }> = {
  solver: { label: "Solver", color: "text-primary" },
  critic: { label: "Critic", color: "text-accent" },
  verifier: { label: "Verifier", color: "text-secondary" },
  final: { label: "Final Answer", color: "text-secondary" },
};

// ── Compare view: side-by-side agent differences ─────────────────
const CompareSteps = ({ solutions }: { solutions: Solution[] }) => {
  const agents = ["solver", "critic", "verifier"] as const;
  const agentSolutions = agents
    .map((role) => solutions.find((s) => s.agentRole === role))
    .filter(Boolean) as Solution[];

  if (agentSolutions.length < 2) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        Need at least 2 agent steps to compare.
      </div>
    );
  }

  // Find where confidence dropped or verification failed
  const hasIssue = (sol: Solution) =>
    sol.verificationPassed === false ||
    (sol.confidenceScore != null && sol.confidenceScore < 0.8);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <GitCompare className="w-3.5 h-3.5" />
        <span>Side-by-side agent comparison</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {agentSolutions.map((sol, idx) => {
          const meta = roleMeta[sol.agentRole] ?? {
            label: sol.agentRole,
            color: "text-foreground",
          };
          const flagged = hasIssue(sol);

          return (
            <div
              key={sol.id}
              className={cn(
                "rounded-lg border p-3 text-sm",
                flagged
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-border/60 bg-card"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("font-semibold text-xs", meta.color)}>
                  {meta.label}
                </span>
                {sol.confidenceScore != null && (
                  <span
                    className={cn(
                      "text-[11px] ml-auto",
                      sol.confidenceScore < 0.8
                        ? "text-destructive font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {(sol.confidenceScore * 100).toFixed(0)}%
                  </span>
                )}
                {sol.verificationPassed === false && (
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                )}
                {sol.verificationPassed === true && (
                  <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                )}
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                {renderMath(sol.content)}
              </div>

              {/* Show diff hint when there's a previous agent */}
              {idx > 0 && flagged && (
                <div className="mt-2 pt-2 border-t border-destructive/20 text-[11px] text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  {sol.verificationPassed === false
                    ? "Verification failed — check reasoning above"
                    : "Confidence dropped from previous step"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Workspace panel for a single problem ─────────────────────────
const WorkspaceSteps = ({
  solutions,
  compareMode,
}: {
  solutions: Solution[];
  compareMode: boolean;
}) => {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  if (solutions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Waiting for agents…
      </div>
    );
  }

  if (compareMode) {
    return <CompareSteps solutions={solutions} />;
  }

  return (
    <div className="space-y-3 p-4">
      {solutions.map((sol, idx) => {
        const meta = roleMeta[sol.agentRole] ?? {
          label: sol.agentRole,
          color: "text-foreground",
        };
        const isExpanded = expandedStep === idx;

        return (
          <div
            key={sol.id}
            className="rounded-lg border border-border/60 bg-card overflow-hidden"
          >
            <button
              onClick={() => setExpandedStep(isExpanded ? null : idx)}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className={cn("font-semibold", meta.color)}>
                {meta.label}
              </span>
              {sol.confidenceScore != null && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {(sol.confidenceScore * 100).toFixed(0)}%
                </span>
              )}
              {sol.verificationPassed != null && (
                <ShieldCheck
                  className={cn(
                    "w-3.5 h-3.5 ml-1",
                    sol.verificationPassed
                      ? "text-secondary"
                      : "text-destructive"
                  )}
                />
              )}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed border-t border-border/40 pt-3">
                {renderMath(sol.content)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────
const SessionDetail = () => {
  const { id } = useParams();
  const sessionId = Number(id);
  const { user } = useAuth();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState<"chat" | "workspace">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const { data: problems, isLoading } = useQuery({
    queryKey: ["problems", sessionId],
    queryFn: () => problemsApi.listForSession(sessionId),
    enabled: !!sessionId,
    refetchInterval: 4000,
  });

  const solutionsQueries = useQuery({
    queryKey: ["solutions", problems?.map((p) => p.id).join(",")],
    queryFn: async () => {
      if (!problems) return {};
      const entries = await Promise.all(
        problems.map(
          async (p) => [p.id, await problemsApi.getSolutions(p.id)] as const
        )
      );
      return Object.fromEntries(entries) as Record<number, Solution[]>;
    },
    enabled: !!problems && problems.length > 0,
    refetchInterval: 4000,
  });

  // Auto-select the latest problem
  useEffect(() => {
    if (problems && problems.length > 0) {
      setSelectedProblemId(problems[problems.length - 1].id);
    }
  }, [problems?.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
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
      toast({
        title: "Couldn't submit",
        description: e.message,
        variant: "destructive",
      }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    create.mutate(input.trim());
  };

  const selectedSolutions = selectedProblemId
    ? solutionsQueries.data?.[selectedProblemId] ?? []
    : [];

  // ── Chat panel ────────────────────────────────────────────────
  const chatPanel = (
    <div className="flex flex-col h-full">
      <header className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link to="/app/sessions">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="font-display font-semibold text-sm truncate">
            Session #{sessionId}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Triple-verified solutions
          </p>
        </div>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto shrink-0"
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            title={workspaceOpen ? "Hide workspace" : "Show workspace"}
          >
            {workspaceOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRight className="w-4 h-4" />
            )}
          </Button>
        )}
      </header>

      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-6">
        <div className="space-y-5 max-w-2xl mx-auto">
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}

          {!isLoading && problems && problems.length === 0 && (
            <div className="text-center py-16">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-secondary" />
              <h3 className="font-display font-semibold mb-1">
                Submit your first problem
              </h3>
              <p className="text-sm text-muted-foreground">
                Type a STEM problem below. The Solver, Critic, and Verifier
                will work it out.
              </p>
            </div>
          )}

          {problems?.map((p) => {
            const sols = solutionsQueries.data?.[p.id] ?? [];
            const finalSol =
              sols.find((s) => s.agentRole === "final") ?? sols[sols.length - 1];
            const isSelected = p.id === selectedProblemId;

            return (
              <div key={p.id} className="space-y-3">
                {/* User bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-3 text-sm whitespace-pre-wrap">
                    {p.inputData}
                  </div>
                </div>

                {/* AI response */}
                <button
                  onClick={() => setSelectedProblemId(p.id)}
                  className="w-full text-left"
                >
                  <Card
                    className={cn(
                      "border-border/60 p-4 max-w-[95%] transition-all cursor-pointer hover:border-primary/40",
                      isSelected && "border-primary/60 ring-1 ring-primary/20"
                    )}
                  >
                    {sols.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Solving · Critiquing · Verifying…
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-3 text-xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                          <span className="text-secondary font-medium">
                            {finalSol?.verificationPassed
                              ? "Verified"
                              : "Solution"}
                          </span>
                          {finalSol?.confidenceScore != null && (
                            <span className="text-muted-foreground">
                              · confidence{" "}
                              {(finalSol.confidenceScore * 100).toFixed(0)}%
                            </span>
                          )}
                          {!isMobile && (
                            <span className="ml-auto text-muted-foreground/60 text-[10px]">
                              Click to inspect steps →
                            </span>
                          )}
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                          {renderMath(finalSol?.content ?? "")}
                        </div>
                      </>
                    )}
                  </Card>
                </button>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border p-3 bg-card/30 backdrop-blur-sm shrink-0"
      >
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a STEM question…"
            className="min-h-[56px] resize-none text-sm"
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
            className="bg-gradient-stemind text-primary-foreground hover:opacity-90 h-[56px] px-4"
          >
            {create.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );

  // ── Workspace panel ───────────────────────────────────────────
  const workspacePanel = (
    <div className="flex flex-col h-full">
      <header className="px-4 py-3 border-b border-border shrink-0">
        <h2 className="font-display font-semibold text-sm">Workspace</h2>
        <p className="text-[11px] text-muted-foreground">
          Step-by-step agent reasoning
        </p>
      </header>
      <ScrollArea className="flex-1">
        {selectedProblemId ? (
          <WorkspaceSteps solutions={selectedSolutions} />
        ) : (
          <div className="flex items-center justify-center h-full p-8 text-center text-muted-foreground text-sm">
            Select a problem in the chat to see the Solver → Critic → Verifier
            pipeline.
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // ── Mobile: tabs instead of split ─────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setMobileTab("chat")}
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors",
              mobileTab === "chat"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            )}
          >
            Chat
          </button>
          <button
            onClick={() => setMobileTab("workspace")}
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors",
              mobileTab === "workspace"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            )}
          >
            Workspace
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {mobileTab === "chat" ? chatPanel : workspacePanel}
        </div>
      </div>
    );
  }

  // ── Desktop: resizable split pane ─────────────────────────────
  return (
    <div className="h-screen">
      {workspaceOpen ? (
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={55} minSize={35}>
            {chatPanel}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={25}>
            {workspacePanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        chatPanel
      )}
    </div>
  );
};

export default SessionDetail;
