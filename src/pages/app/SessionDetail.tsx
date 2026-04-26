import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Send, Loader2, Sparkles, Bot, AlertTriangle, RefreshCw, LogIn,
} from "lucide-react";
import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stem-solver`;

type Msg = { role: "user" | "assistant"; content: string };

// ── Render LaTeX inside text ──
const RenderMath = ({ text }: { text: string }) => {
  const parts = text.split(/(\$\$[^$]+\$\$|\$[^$\n]+\$)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("$$") && part.endsWith("$$"))
          return <BlockMath key={i} math={part.slice(2, -2)} />;
        if (part.startsWith("$") && part.endsWith("$"))
          return <InlineMath key={i} math={part.slice(1, -1)} />;
        return (
          <ReactMarkdown key={i} components={{
            p: ({ children }) => <p className="mb-2">{children}</p>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            code: ({ children }) => <code className="bg-muted px-1 rounded text-xs">{children}</code>,
          }}>
            {part}
          </ReactMarkdown>
        );
      })}
    </>
  );
};

const SessionDetail = () => {
  const { id } = useParams();
  const sessionId = id!;
  const { user, session } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatError, setChatError] = useState<{ kind: "auth" | "network" | "stream" | "generic"; message: string; lastInput: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load session info
  const { data: sessionRecord } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  // Load existing problems for this session to restore history
  const { data: existingProblems } = useQuery({
    queryKey: ["problems", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("problems")
        .select("*, solutions(*)")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  // Restore chat history from DB on load
  useEffect(() => {
    if (!existingProblems || messages.length > 0) return;
    const restored: Msg[] = [];
    for (const p of existingProblems) {
      restored.push({ role: "user", content: p.input_text || "" });
      const sol = p.solutions?.[0];
      if (sol) {
        restored.push({ role: "assistant", content: sol.content });
      }
    }
    if (restored.length > 0) setMessages(restored);
  }, [existingProblems]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const saveProblemAndSolution = useCallback(
    async (userText: string, aiResponse: string) => {
      if (!user) return;
      // Save problem
      const { data: problem, error: pErr } = await supabase
        .from("problems")
        .insert({
          session_id: sessionId,
          user_id: user.id,
          input_type: "text",
          input_text: userText,
          subject: sessionRecord?.subject,
          status: "solved",
        })
        .select("id")
        .single();

      if (pErr || !problem) {
        console.error("Failed to save problem:", pErr);
        return;
      }

      // Save solution
      await supabase.from("solutions").insert({
        problem_id: problem.id,
        user_id: user.id,
        agent_role: "solver",
        content: aiResponse,
        confidence_score: 1.0,
        verification_passed: true,
      });

      // Update knowledge node
      if (sessionRecord?.subject) {
        const topic = sessionRecord.subject;
        const { data: existing } = await supabase
          .from("knowledge_nodes")
          .select("*")
          .eq("user_id", user.id)
          .eq("subject", topic)
          .eq("topic", topic)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("knowledge_nodes")
            .update({
              problems_attempted: (existing.problems_attempted ?? 0) + 1,
              problems_correct: (existing.problems_correct ?? 0) + 1,
              mastery_level: Math.min(1, (existing.mastery_level ?? 0) + 0.05),
              last_practiced_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("knowledge_nodes").insert({
            user_id: user.id,
            subject: topic,
            topic: topic,
            problems_attempted: 1,
            problems_correct: 1,
            mastery_level: 0.1,
            last_practiced_at: new Date().toISOString(),
          });
        }
      }

      qc.invalidateQueries({ queryKey: ["problems", sessionId] });
      qc.invalidateQueries({ queryKey: ["dashboard", user.id] });
      qc.invalidateQueries({ queryKey: ["knowledge", user.id] });
    },
    [user, sessionId, sessionRecord, qc]
  );

  const streamChat = useCallback(
    async (userText: string) => {
      if (!session?.access_token) {
        throw new Error(t("session.needSignIn"));
      }

      const userMsg: Msg = { role: "user", content: userText };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");
      setIsStreaming(true);

      let assistantSoFar = "";

      try {
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: updatedMessages,
            sessionId,
            subject: sessionRecord?.subject,
            language: i18n.language?.split("-")[0] ?? "en",
          }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errData.error || `HTTP ${resp.status}`);
        }

        if (!resp.body) throw new Error("No response body");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                assistantSoFar += content;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return prev.map((m, i) =>
                      i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                    );
                  }
                  return [...prev, { role: "assistant", content: assistantSoFar }];
                });
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Save to DB after streaming completes
        if (assistantSoFar) {
          await saveProblemAndSolution(userText, assistantSoFar);
        }
      } catch (e) {
        console.error("Stream error:", e);
        toast({
          title: t("session.errorTitle"),
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, sessionId, session, sessionRecord, saveProblemAndSolution, t, i18n.language]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    streamChat(input.trim());
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0 bg-card/50 backdrop-blur-sm">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link to="/app/sessions" aria-label={t("session.back")}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="font-display font-semibold text-sm truncate">
            {sessionRecord?.title ?? t("session.fallbackTitle")}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {sessionRecord?.subject || t("sessions.general")} · {t("session.subtitle")}
          </p>
        </div>
      </header>

      {/* Chat area */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-6">
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-display font-semibold mb-1">{t("session.emptyTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("session.emptyDesc")}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={
                  msg.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-3 text-sm whitespace-pre-wrap"
                    : "max-w-[85%] rounded-2xl rounded-bl-sm bg-card border border-border/60 px-4 py-3 text-sm prose prose-sm dark:prose-invert max-w-none"
                }
              >
                {msg.role === "user" ? (
                  msg.content
                ) : (
                  <RenderMath text={msg.content} />
                )}
              </div>
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-card border border-border/60 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                {t("session.thinking")}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border p-3 bg-card/30 backdrop-blur-sm shrink-0"
      >
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("session.placeholder")}
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
            size="icon"
            disabled={!input.trim() || isStreaming}
            className="shrink-0 bg-primary"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SessionDetail;
