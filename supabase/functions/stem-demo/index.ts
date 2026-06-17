import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Strict CORS allow-list. Browser origins not on this list get NO
// Access-Control-Allow-Origin header (browser blocks the response) and
// preflights are rejected with 403.
const ALLOWED_ORIGINS = new Set<string>([
  "https://stemind.lovable.app",
  "https://id-preview--4775df88-a536-453b-ac3b-086b8e2115e5.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
]);
const ALLOWED_ORIGIN_SUFFIXES = [".lovable.app", ".lovableproject.com"];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return ALLOWED_ORIGIN_SUFFIXES.some((s) => host.endsWith(s));
  } catch {
    return false;
  }
}

function buildCors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "600",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
  if (isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
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
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
};

// Best-effort in-memory limiter per IP. Resets on cold start.
// (Platform does not yet provide distributed rate-limiting primitives.)
const ipHits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

const MAX_BODY_BYTES = 16 * 1024; // 16 KB demo cap
const MAX_MESSAGES = 8;
const MAX_MSG_CHARS = 2000;

serve(async (req) => {
  const corsHeaders = buildCors(req);
  const json = jsonWith(corsHeaders);
  const origin = req.headers.get("origin") ?? "";

  // CORS preflight — reject unknown origins outright
  if (req.method === "OPTIONS") {
    if (origin && !isAllowedOrigin(origin)) {
      return new Response("Forbidden origin", { status: 403 });
    }
    return new Response(null, { headers: corsHeaders });
  }

  // Reject browser-initiated requests from disallowed origins
  if (origin && !isAllowedOrigin(origin)) {
    return json({ error: "Forbidden origin" }, 403);
  }

  // 405: only POST allowed
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST, OPTIONS" });
  }

  // 415: require JSON
  const ctype = req.headers.get("content-type") ?? "";
  if (!ctype.toLowerCase().includes("application/json")) {
    return json({ error: "Unsupported media type, expected application/json" }, 415);
  }

  // Honeypot: clients legitimately should not send this header
  if (req.headers.get("x-demo-honeypot")) {
    return json({ error: "Bad request" }, 400);
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Don't leak which env var is missing
      console.error("stem-demo: missing LOVABLE_API_KEY");
      return json({ error: "Service unavailable" }, 503);
    }

    // Best-effort per-IP limit
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
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
          429,
          { "Retry-After": String(retry) }
        );
      }
    }

    // 413: enforce body size cap before parsing
    const cl = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (cl && cl > MAX_BODY_BYTES) {
      return json({ error: "Payload too large" }, 413);
    }
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json({ error: "Payload too large" }, 413);
    }

    // 400: parse JSON safely without leaking parser errors
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    // 400: shape validation
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid request body" }, 400);
    }
    const { messages, language, mode } = body as {
      messages?: unknown;
      language?: unknown;
      mode?: unknown;
    };
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return json({ error: "messages must be a non-empty array (max 8)" }, 400);
    }
    const trimmed: { role: "user" | "assistant"; content: string }[] = [];
    for (const m of messages) {
      if (!m || typeof m !== "object") {
        return json({ error: "Invalid message entry" }, 400);
      }
      const mm = m as { role?: unknown; content?: unknown };
      if (typeof mm.content !== "string") {
        return json({ error: "Invalid message content" }, 400);
      }
      const role: "user" | "assistant" = mm.role === "assistant" ? "assistant" : "user";
      trimmed.push({ role, content: mm.content.slice(0, MAX_MSG_CHARS) });
    }

    const langCode = (typeof language === "string" ? language.split("-")[0] : "en")
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .slice(0, 5);
    const langName = LANGUAGE_NAMES[langCode] ?? "English";
    const modeKey = mode === "answer" ? "answer" : "tutor";
    const basePrompt = modeKey === "answer" ? ANSWER_PROMPT : TUTOR_PROMPT;
    const localized = `${basePrompt}\n\nIMPORTANT: Respond entirely in ${langName} (${langCode}). Keep math in standard LaTeX. The phrase "**Final answer:**" must remain in English.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: localized }, ...trimmed],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      // Log details server-side, return generic messages to client (no provider/model leak)
      const detail = await aiResponse.text().catch(() => "");
      console.error("stem-demo upstream error:", status, detail.slice(0, 500));
      if (status === 429) {
        return json({ error: "Service is busy, please try again shortly." }, 429, { "Retry-After": "10" });
      }
      if (status === 402) {
        return json({ error: "Demo temporarily unavailable." }, 503);
      }
      return json({ error: "Demo temporarily unavailable." }, 502);
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-store" },
    });
  } catch (e) {
    // Never echo raw error details to the client
    console.error("stem-demo error:", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
