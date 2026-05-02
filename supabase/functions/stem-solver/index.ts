import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TUTOR_PROMPT = `You are STEMind, an expert STEM tutor that uses the Socratic method.

1. **Never give direct answers immediately.** Guide the student step-by-step with leading questions and hints.
2. When the student is stuck, provide a small hint, not the full solution.
3. Use LaTeX for all mathematical expressions: inline with $...$ and display with $$...$$.
4. Structure responses with numbered steps.
5. After guiding to the answer, verify the solution and explain why it's correct.
6. Cover Calculus, Algebra, Physics, Chemistry, Biology, Geometry, Statistics, Linear Algebra, Differential Equations.
7. If the question is vague, ask one clarifying question first.
8. Be encouraging and patient.

CRITICAL — Always end your response with a single line in this exact format on its own line, after all reasoning is complete:
**Final answer:** <the final result in LaTeX or plain text>
If a problem is purely conceptual or you asked a clarifying question, write \`**Final answer:** _pending_\` instead.`;

const ANSWER_PROMPT = `You are STEMind, an expert STEM solver. The student wants the answer first, then a clear explanation.

1. Begin your response with the final answer on the very first line, in this exact format:
**Final answer:** <the final result in LaTeX or plain text>
2. Then provide a concise, well-structured explanation with numbered steps showing how to derive it.
3. Use LaTeX for all math: inline $...$, display $$...$$.
4. Verify the result at the end and briefly note any assumptions.
5. End your response by repeating the final answer on its own line in the exact same format:
**Final answer:** <same result>
6. Cover Calculus, Algebra, Physics, Chemistry, Biology, Geometry, Statistics, Linear Algebra, Differential Equations.
7. If the question is genuinely ambiguous, ask one clarifying question and write \`**Final answer:** _pending_\` at top and bottom.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: missing bearer token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { messages, sessionId, problemId, subject, topic, language, mode } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Append a language directive to the system prompt so the tutor responds
    // in the student's chosen language while keeping LaTeX/math intact.
    const LANGUAGE_NAMES: Record<string, string> = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      zh: "Chinese (Simplified)",
      ja: "Japanese",
    };
    const langCode = (typeof language === "string" ? language.split("-")[0] : "en").toLowerCase();
    const langName = LANGUAGE_NAMES[langCode] ?? "English";
    const localizedSystemPrompt = `${SYSTEM_PROMPT}\n\nIMPORTANT: Respond entirely in ${langName} (${langCode}). All explanations, hints, and prose must be in ${langName}. Keep mathematical notation in standard LaTeX (do NOT translate symbols, variables, or LaTeX commands).`;

    // Call Lovable AI with streaming
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: localizedSystemPrompt },
          ...messages,
        ],
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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("stem-solver error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
