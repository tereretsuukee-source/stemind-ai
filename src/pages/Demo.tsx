import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2, Sparkles, Bot, Lock, AlertTriangle, RefreshCw } from "lucide-react";
import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ModeToggle, loadMode, saveMode, type SolverMode } from "@/components/ModeToggle";

type Msg = { role: "user" | "assistant"; content: string };

const DEMO_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stem-demo`;

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
          <ReactMarkdown
            key={i}
            components={{
              p: ({ children }) => <p className="mb-2">{children}</p>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              code: ({ children }) => <code className="bg-muted px-1 rounded text-xs">{children}</code>,
            }}
          >
            {part}
          </ReactMarkdown>
        );
      })}
    </>
  );
};

const Demo = () => {
  const { t, i18n } = useTranslation();

  const PREFILLED = t("demo.prefilledQuestion");

  const [input, setInput] = useState(PREFILLED);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<string>("");
  const [mode, setMode] = useState<SolverMode>(() => loadMode());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const stream = async (userText: string) => {
    setError(null);
    setLastInput(userText);

    const userMsg: Msg = { role: "user", content: userText };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsStreaming(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(DEMO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated,
          language: i18n.language?.split("-")[0] ?? "en",
          mode,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(errData.error || `HTTP ${resp.status}`);
      }

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

      if (!assistantSoFar) throw new Error(t("session.streamInterrupted"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      // Roll back the unanswered user message so retry doesn't double-send
      setMessages((prev) => {
        const next = [...prev];
        if (next[next.length - 1]?.role === "assistant" && !next[next.length - 1].content) next.pop();
        if (next[next.length - 1]?.role === "user" && next[next.length - 1].content === userText) next.pop();
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    stream(input.trim());
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0 bg-card/50 backdrop-blur-sm">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link to="/" aria-label={t("session.back")}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-semibold text-sm truncate flex items-center gap-2">
            {t("demo.title")}
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              <Sparkles className="w-2.5 h-2.5" />
              {t("demo.badge")}
            </span>
          </h1>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" />
            {t("demo.subtitle")}
          </p>
        </div>
        <Button asChild size="sm" className="bg-gradient-stemind text-primary-foreground hover:opacity-90">
          <Link to="/auth">{t("demo.signUpToSave")}</Link>
        </Button>
      </header>

      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-6">
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.length === 0 && (
            <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                  {t("demo.tryItOutLabel")}
                </span>
              </div>
              <h2 className="font-display font-semibold text-lg mb-2">{t("demo.welcomeTitle")}</h2>
              <p className="text-sm text-muted-foreground mb-4">{t("demo.welcomeDesc")}</p>
              <div className="rounded-md border border-border/60 bg-card/60 p-3 text-sm font-mono text-foreground/90 mb-4">
                {PREFILLED}
              </div>
              <Button
                onClick={() => stream(PREFILLED)}
                disabled={isStreaming}
                className="bg-gradient-stemind text-primary-foreground hover:opacity-90"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t("demo.runExample")}
              </Button>
            </Card>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
                {msg.role === "user" ? msg.content : <RenderMath text={msg.content} />}
              </div>
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-card border border-border/60 px-4 py-3 text-sm space-y-2 w-full max-w-[85%]">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t("session.thinking")}
                </div>
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
          )}

          {error && (
            <Card className="p-4 border-destructive/40 bg-destructive/5 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 text-sm">
                <div className="font-semibold text-destructive">{t("session.errorTitle")}</div>
                <p className="text-muted-foreground mt-0.5">{error}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => stream(lastInput)} disabled={isStreaming}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                {t("session.retry")}
              </Button>
            </Card>
          )}

          {messages.length > 0 && !isStreaming && (
            <Card className="p-4 border-primary/30 bg-primary/5">
              <p className="text-sm font-medium mb-2">{t("demo.likeIt")}</p>
              <p className="text-xs text-muted-foreground mb-3">{t("demo.upgradeNote")}</p>
              <Button asChild size="sm" className="bg-gradient-stemind text-primary-foreground hover:opacity-90">
                <Link to="/auth">{t("demo.signUpFree")}</Link>
              </Button>
            </Card>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={onSubmit} className="border-t border-border p-3 bg-card/30 backdrop-blur-sm shrink-0">
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("session.placeholder")}
            className="min-h-[56px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e as unknown as FormEvent);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isStreaming} className="shrink-0 bg-primary">
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Demo;
