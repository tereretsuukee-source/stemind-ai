import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2, Sparkles, Bot, Lock, AlertTriangle, RefreshCw, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
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
import { FinalAnswerCard, extractFinalAnswer } from "@/components/FinalAnswerCard";

type Msg = { role: "user" | "assistant"; content: string };

const DEMO_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stem-demo-public`;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: {
        sitekey: string;
        callback: (token: string) => void;
        "error-callback"?: () => void;
        "expired-callback"?: () => void;
        theme?: "light" | "dark" | "auto";
        size?: "normal" | "compact" | "invisible" | "flexible";
      }) => string;
      reset: (id?: string) => void;
      execute: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

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
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [captchaReady, setCaptchaReady] = useState(false);
  const captchaTokenRef = useRef<string | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const captchaContainerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  type DiagState =
    | { status: "idle" }
    | { status: "running" }
    | { status: "ok"; hostname: string | null; challenge_ts: string | null; observedIp: string }
    | { status: "fail"; reason: string; errorCodes?: string[]; hostname?: string | null };
  const [diag, setDiag] = useState<DiagState>({ status: "idle" });
  const [showDiag, setShowDiag] = useState(false);

  // Fetch site key + load Turnstile script once
  useEffect(() => {
    let cancelled = false;
    fetch(DEMO_URL, { method: "GET" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d?.siteKey) setSiteKey(d.siteKey); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!siteKey) return;
    const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    const exists = document.querySelector(`script[src="${SRC}"]`);
    const onLoad = () => {
      if (!captchaContainerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(captchaContainerRef.current, {
        sitekey: siteKey,
        theme: "auto",
        size: "flexible",
        callback: (token) => {
          captchaTokenRef.current = token;
          setCaptchaReady(true);
        },
        "expired-callback": () => {
          captchaTokenRef.current = null;
          setCaptchaReady(false);
        },
        "error-callback": () => {
          captchaTokenRef.current = null;
          setCaptchaReady(false);
        },
      });
    };
    if (exists) { onLoad(); return; }
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.onload = onLoad;
    document.head.appendChild(s);
  }, [siteKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const stream = async (userText: string) => {
    setError(null);
    setLastInput(userText);

    const token = captchaTokenRef.current;
    if (!token) {
      setError(t("demo.captchaRequired", "Please complete the CAPTCHA below."));
      return;
    }

    const userMsg: Msg = { role: "user", content: userText };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsStreaming(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(DEMO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-turnstile-token": token },
        body: JSON.stringify({
          messages: updated,
          language: i18n.language?.split("-")[0] ?? "en",
          mode,
          turnstileToken: token,
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
            // Server-emitted validation sentinel (no choices field)
            if (parsed.validation && typeof parsed.validation === "object") {
              const v = parsed.validation as { valid: boolean; reasons: string[]; finalAnswer: string };
              if (!v.valid) {
                console.warn("[stem-demo] validation failed:", v.reasons);
                setError(
                  t(
                    "demo.validationFailed",
                    "The answer didn't meet quality checks ({{reasons}}). Please try again.",
                    { reasons: v.reasons.join(", ") }
                  )
                );
              }
              continue;
            }
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
      captchaTokenRef.current = null;
      setCaptchaReady(false);
      try { window.turnstile?.reset(widgetIdRef.current ?? undefined); } catch { /* noop */ }
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    stream(input.trim());
  };

  const runDiagnostic = async () => {
    setShowDiag(true);
    const token = captchaTokenRef.current;
    if (!token) {
      setDiag({ status: "fail", reason: "No CAPTCHA token yet — solve the widget first." });
      return;
    }
    setDiag({ status: "running" });
    try {
      const resp = await fetch(DEMO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-turnstile-token": token },
        body: JSON.stringify({ diagnose: true, turnstileToken: token, messages: [{ role: "user", content: "ping" }] }),
      });
      const data = await resp.json();
      if (data?.success) {
        setDiag({
          status: "ok",
          hostname: data.hostname ?? null,
          challenge_ts: data.challenge_ts ?? null,
          observedIp: data.observedIp ?? "unknown",
        });
      } else {
        setDiag({
          status: "fail",
          reason: data?.siteverifyError || "Turnstile siteverify rejected the token.",
          errorCodes: data?.errorCodes,
          hostname: data?.hostname,
        });
      }
    } catch (e) {
      setDiag({ status: "fail", reason: e instanceof Error ? e.message : "Network error" });
    } finally {
      // Token consumed — reset widget so the user can submit a real query next
      captchaTokenRef.current = null;
      setCaptchaReady(false);
      try { window.turnstile?.reset(widgetIdRef.current ?? undefined); } catch { /* noop */ }
    }
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
                disabled={isStreaming || !captchaReady}
                className="bg-gradient-stemind text-primary-foreground hover:opacity-90"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t("demo.runExample")}
              </Button>
            </Card>
          )}

          {messages.map((msg, i) => {
            const isLastAssistant =
              msg.role === "assistant" && i === messages.length - 1 && !isStreaming;
            const final = isLastAssistant ? extractFinalAnswer(msg.content) : null;
            return (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={
                    msg.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-3 text-sm whitespace-pre-wrap break-words"
                      : "max-w-[85%] rounded-2xl rounded-bl-sm bg-card border border-border/60 px-4 py-3 text-sm prose prose-sm dark:prose-invert max-w-none break-words"
                  }
                >
                  {msg.role === "user" ? msg.content : (
                    <>
                      <RenderMath text={msg.content} />
                      {final?.answer && (
                        <FinalAnswerCard answer={final.answer} verification={final.verification} />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

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
        <div className="max-w-2xl mx-auto mb-2 flex justify-end">
          <ModeToggle
            value={mode}
            onChange={(m) => {
              setMode(m);
              saveMode(m);
            }}
          />
        </div>
        <div className="max-w-2xl mx-auto mb-2">
          <div ref={captchaContainerRef} className="cf-turnstile flex justify-center" />
          {!siteKey && (
            <p className="text-[11px] text-muted-foreground text-center mt-1">
              {t("demo.captchaLoading", "Loading verification…")}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className="text-[10px] text-muted-foreground">
              host: <code>{typeof window !== "undefined" ? window.location.hostname : "?"}</code>
              {siteKey && <> · key: <code>{siteKey.slice(0, 12)}…</code></>}
            </span>
            <button
              type="button"
              onClick={runDiagnostic}
              className="text-[10px] underline text-muted-foreground hover:text-foreground"
            >
              Validate domain/key
            </button>
          </div>
          {showDiag && (
            <div className="mt-2 rounded-md border border-border/60 bg-card/60 p-2 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 font-medium">
                {diag.status === "ok" && <ShieldCheck className="w-3.5 h-3.5 text-green-500" />}
                {diag.status === "fail" && <ShieldAlert className="w-3.5 h-3.5 text-destructive" />}
                {(diag.status === "idle" || diag.status === "running") && (
                  <ShieldQuestion className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                Turnstile validation
                <button
                  type="button"
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  onClick={() => setShowDiag(false)}
                  aria-label="Close diagnostics"
                >×</button>
              </div>
              {diag.status === "running" && <p className="text-muted-foreground">Verifying token with siteverify…</p>}
              {diag.status === "ok" && (
                <div className="text-muted-foreground space-y-0.5">
                  <div>✅ Site key authorized for hostname <code className="text-foreground">{diag.hostname ?? "(none returned)"}</code></div>
                  <div>Issued at: <code>{diag.challenge_ts}</code></div>
                  <div>Observed IP: <code>{diag.observedIp}</code></div>
                  <p className="pt-1">You can now submit queries.</p>
                </div>
              )}
              {diag.status === "fail" && (
                <div className="text-muted-foreground space-y-0.5">
                  <div className="text-destructive">❌ {diag.reason}</div>
                  {diag.errorCodes && diag.errorCodes.length > 0 && (
                    <div>Codes: <code>{diag.errorCodes.join(", ")}</code></div>
                  )}
                  {diag.hostname && <div>Reported hostname: <code>{diag.hostname}</code></div>}
                  <p className="pt-1">
                    Add the current host (<code>{typeof window !== "undefined" ? window.location.hostname : "?"}</code>) to
                    the allowlist of this site key in the Cloudflare Turnstile dashboard, then re-solve and validate again.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
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
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming || !captchaReady}
            className="shrink-0 bg-primary"
            title={!captchaReady ? t("demo.captchaRequired", "Please complete the CAPTCHA below.") : undefined}
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Demo;
