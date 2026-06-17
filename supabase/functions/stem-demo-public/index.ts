import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allow-listed browser origins. Non-browser clients (curl/bots) bypass CORS
// anyway, so this is defence-in-depth for the widget, not an auth boundary.
const ALLOWED_ORIGINS = new Set<string>([
  "https://stemind.lovable.app",
  "https://id-preview--4775df88-a536-453b-ac3b-086b8e2115e5.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
]);
const ALLOWED_ORIGIN_SUFFIXES = [".lovable.app", ".lovableproject.com"];

function resolveOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  if (!origin) return "https://stemind.lovable.app";
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  try {
    const host = new URL(origin).hostname;
    if (ALLOWED_ORIGIN_SUFFIXES.some((s) => host.endsWith(s))) return origin;
  } catch { /* ignore */ }
  return "https://stemind.lovable.app";
}

function buildCors(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveOrigin(req),
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-turnstile-token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

const jsonWith = (cors: Record<string, string>) =>
  (body: unknown, status: number, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json", ...extra },
    });

const TUTOR_PROMPT = `You are STEMind, an expert STEM tutor in DEMO mode using the Socratic method.

1. Guide the student step-by-step with leading questions and small hints.
2. Use LaTeX for math: inline $...$ and display $$...$$.
3. Structure responses as clear, numbered markdown.
4. Cover Calculus, Algebra, Physics, Chemistry, Biology, Geometry, Statistics, Linear Algebra, Differential Equations.
5. Be encouraging, patient, and concise (under ~400 words).

CRITICAL OUTPUT CONTRACT — End your response with a single line in this EXACT format on its own line:
**Final answer:** <a concrete final result in LaTeX or plain text>

You MUST always produce a concrete final answer. NEVER write "_pending_", "TBD", "unknown", "to be determined", or any placeholder. If the student's question is genuinely ambiguous, make the most reasonable assumption, state it briefly, and still give a concrete final answer.`;

const ANSWER_PROMPT = `You are STEMind, an expert STEM solver in DEMO mode. The student wants the answer first.

1. Begin with the final answer on the very first line:
**Final answer:** <result>
2. Then a concise, numbered explanation showing the derivation (under ~400 words).
3. Use LaTeX for math: inline $...$, display $$...$$.
4. End by repeating the same line:
**Final answer:** <same result>

CRITICAL: NEVER write "_pending_", "TBD", "unknown", or any placeholder as the final answer. If the question is genuinely ambiguous, make the most reasonable assumption, state it in one line, and still give a concrete final answer at top and bottom.`;

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German",
  zh: "Chinese (Simplified)", ja: "Japanese",
};

// Per-IP best-effort limiter (cold-start resets). Stricter than authenticated demo.
const ipHits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

// Turnstile token replay protection (in-memory, best-effort)
const usedTokens = new Map<string, number>();
const TOKEN_TTL_MS = 5 * 60_000;

const MAX_BODY_BYTES = 16 * 1024;
const MAX_MESSAGES = 8;
const MAX_MSG_CHARS = 2000;

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

async function verifyTurnstile(token: string, ip: string, secret: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const form = new FormData();
    form.append("secret", secret);
    form.append("response", token);
    if (ip && ip !== "unknown") form.append("remoteip", ip);
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body: form });
    if (!res.ok) return { success: false, error: `siteverify HTTP ${res.status}` };
    const data = await res.json();
    return { success: data?.success === true, data };
  } catch (e) {
    console.error("turnstile verify failed:", e);
    return { success: false, error: String(e) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // GET /config → publish site key for the browser widget
  if (req.method === "GET") {
    const siteKey = Deno.env.get("TURNSTILE_SITE_KEY") ?? "";
    return json({ siteKey }, 200, { "Cache-Control": "public, max-age=300" });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "GET, POST, OPTIONS" });
  }

  const ctype = req.headers.get("content-type") ?? "";
  if (!ctype.toLowerCase().includes("application/json")) {
    return json({ error: "Unsupported media type, expected application/json" }, 415);
  }

  if (req.headers.get("x-demo-honeypot")) return json({ error: "Bad request" }, 400);

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!LOVABLE_API_KEY || !TURNSTILE_SECRET) {
      console.error("stem-demo-public: missing required env");
      return json({ error: "Service unavailable" }, 503);
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") || "unknown";

    // Per-IP rate limit
    const now = Date.now();
    const entry = ipHits.get(ip);
    if (!entry || entry.resetAt < now) {
      ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    } else {
      entry.count += 1;
      if (entry.count > MAX_PER_WINDOW) {
        const retry = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
        return json(
          { error: "Demo rate limit reached. Sign up for unlimited usage." },
          429, { "Retry-After": String(retry) },
        );
      }
    }

    // Body size cap
    const cl = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (cl && cl > MAX_BODY_BYTES) return json({ error: "Payload too large" }, 413);
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "Payload too large" }, 413);

    let body: unknown;
    try { body = JSON.parse(raw); } catch { return json({ error: "Invalid JSON body" }, 400); }
    if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);

    const { messages, language, mode, turnstileToken, diagnose } = body as {
      messages?: unknown; language?: unknown; mode?: unknown; turnstileToken?: unknown; diagnose?: unknown;
    };

    // Accept token from header or body
    const token =
      (typeof turnstileToken === "string" && turnstileToken) ||
      req.headers.get("x-turnstile-token") || "";
    if (!token || token.length > 4096) {
      return json({ error: "CAPTCHA required" }, 401);
    }

    // Replay protection (sweep + reject if seen) — skip for diagnose mode
    for (const [k, t] of usedTokens) if (t < now - TOKEN_TTL_MS) usedTokens.delete(k);
    if (!diagnose && usedTokens.has(token)) {
      return json({ error: "CAPTCHA token already used" }, 401);
    }

    const verifyResult = await verifyTurnstile(token, ip, TURNSTILE_SECRET);

    if (diagnose === true) {
      return json({
        success: verifyResult.success,
        hostname: verifyResult.data?.hostname ?? null,
        challenge_ts: verifyResult.data?.challenge_ts ?? null,
        action: verifyResult.data?.action ?? null,
        errorCodes: verifyResult.data?.["error-codes"] ?? [],
        siteverifyError: verifyResult.error ?? null,
        observedIp: ip,
      }, 200);
    }

    if (!verifyResult.success) return json({ error: "CAPTCHA verification failed" }, 401);
    usedTokens.set(token, now);

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return json({ error: "messages must be a non-empty array (max 8)" }, 400);
    }
    const trimmed: { role: "user" | "assistant"; content: string }[] = [];
    for (const m of messages) {
      if (!m || typeof m !== "object") return json({ error: "Invalid message entry" }, 400);
      const mm = m as { role?: unknown; content?: unknown };
      if (typeof mm.content !== "string") return json({ error: "Invalid message content" }, 400);
      const role: "user" | "assistant" = mm.role === "assistant" ? "assistant" : "user";
      trimmed.push({ role, content: mm.content.slice(0, MAX_MSG_CHARS) });
    }

    const langCode = (typeof language === "string" ? language.split("-")[0] : "en")
      .toLowerCase().replace(/[^a-z]/g, "").slice(0, 5);
    const langName = LANGUAGE_NAMES[langCode] ?? "English";
    const modeKey = mode === "answer" ? "answer" : "tutor";
    const basePrompt = modeKey === "answer" ? ANSWER_PROMPT : TUTOR_PROMPT;
    const localized = `${basePrompt}\n\nIMPORTANT: Respond entirely in ${langName} (${langCode}). Keep math in standard LaTeX. The phrase "**Final answer:**" must remain in English.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: localized }, ...trimmed],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const detail = await aiResponse.text().catch(() => "");
      console.error("stem-demo-public upstream error:", status, detail.slice(0, 500));
      if (status === 429) return json({ error: "Service is busy, please try again shortly." }, 429, { "Retry-After": "10" });
      if (status === 402) return json({ error: "Demo temporarily unavailable." }, 503);
      return json({ error: "Demo temporarily unavailable." }, 502);
    }

    // Wrap upstream stream: pass-through chunks, assemble content, then emit
    // a final [[VALIDATION]] sentinel SSE event with strict checks before [DONE].
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let assembled = "";
    let sseBuf = "";
    let sawDone = false;

    const validate = (text: string) => {
      const reasons: string[] = [];
      const trimmed = text.trim();
      if (trimmed.length < 20) reasons.push("response_too_short");

      const finalRegex = /\*\*Final answer:\*\*\s*(.+?)(?:\n|$)/gi;
      const matches = [...trimmed.matchAll(finalRegex)].map((m) => m[1].trim());
      const finalAnswer = matches.length ? matches[matches.length - 1] : "";
      if (!finalAnswer) reasons.push("missing_final_answer");

      const placeholderRe = /(^|[^a-z])(_?pending_?|tbd|unknown|to\s*be\s*determined|n\/a|\?{2,})($|[^a-z])/i;
      if (finalAnswer && placeholderRe.test(finalAnswer)) reasons.push("placeholder_final_answer");
      if (placeholderRe.test(trimmed)) reasons.push("placeholder_in_body");

      // Balanced LaTeX delimiters (best-effort)
      const dollarCount = (trimmed.match(/(?<!\\)\$/g) ?? []).length;
      if (dollarCount % 2 !== 0) reasons.push("unbalanced_latex");

      return {
        valid: reasons.length === 0,
        reasons,
        finalAnswer,
        length: trimmed.length,
      };
    };

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        // Pass through immediately
        controller.enqueue(chunk);
        sseBuf += decoder.decode(chunk, { stream: true });
        let idx: number;
        while ((idx = sseBuf.indexOf("\n")) !== -1) {
          let line = sseBuf.slice(0, idx);
          sseBuf = sseBuf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") { sawDone = true; continue; }
          try {
            const p = JSON.parse(payload);
            const c = p?.choices?.[0]?.delta?.content;
            if (typeof c === "string") assembled += c;
          } catch { /* ignore partial */ }
        }
      },
      flush(controller) {
        const v = validate(assembled);
        const sentinel = `data: ${JSON.stringify({ validation: v })}\n\n`;
        controller.enqueue(encoder.encode(sentinel));
        if (!sawDone) controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      },
    });

    return new Response(aiResponse.body!.pipeThrough(transform), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("stem-demo-public error:", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
