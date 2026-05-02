import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TUTOR_PROMPT = `You are STEMind, an expert STEM tutor in DEMO mode using the Socratic method.

1. Guide the student step-by-step with leading questions and small hints.
2. Use LaTeX for math: inline $...$ and display $$...$$.
3. Structure responses as clear, numbered markdown.
4. Cover Calculus, Algebra, Physics, Chemistry, Biology, Geometry, Statistics, Linear Algebra, Differential Equations.
5. Be encouraging, patient, and concise (under ~400 words).

CRITICAL — End your response with a single line in this exact format on its own line:
**Final answer:** <the final result in LaTeX or plain text>
If purely conceptual or you asked a clarifying question, write \`**Final answer:** _pending_\`.`;

const ANSWER_PROMPT = `You are STEMind, an expert STEM solver in DEMO mode. The student wants the answer first.

1. Begin with the final answer on the very first line:
**Final answer:** <result>
2. Then a concise, numbered explanation showing the derivation (under ~400 words).
3. Use LaTeX for math: inline $...$, display $$...$$.
4. End by repeating the same line:
**Final answer:** <same result>
5. If genuinely ambiguous, ask one clarifying question and use \`**Final answer:** _pending_\` at top and bottom.`;

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
};

// Very small in-memory rate limit per IP (best-effort, resets on cold start)
const ipHits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Rate limiting by IP
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
        return new Response(
          JSON.stringify({ error: "Demo rate limit reached. Sign up for unlimited usage." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const body = await req.json();
    const { messages, language } = body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap demo conversation length to keep cost predictable
    const trimmed = messages.slice(-8).map((m: { role?: string; content?: unknown }) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content.slice(0, 2000) : "",
    }));

    const langCode = (typeof language === "string" ? language.split("-")[0] : "en").toLowerCase();
    const langName = LANGUAGE_NAMES[langCode] ?? "English";
    const localized = `${SYSTEM_PROMPT}\n\nIMPORTANT: Respond entirely in ${langName} (${langCode}). Keep math in standard LaTeX.`;

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
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("Demo AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("stem-demo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
