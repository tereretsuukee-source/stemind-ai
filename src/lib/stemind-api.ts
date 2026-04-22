// Typed client for the STEMind Replit backend.
// Base URL is configurable via VITE_STEMIND_API_URL with a sensible default.

const BASE_URL =
  (import.meta.env.VITE_STEMIND_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://stemind-backend--tereretsuukee.replit.app";

// ---------- Types ----------
export type StudyMode = "socratic" | "direct" | "exam";
export type InputType = "text" | "image" | "pdf";

export interface Session {
  id: number;
  userId: string;
  title: string;
  subject: string | null;
  createdAt: string;
}

export interface Problem {
  id: number;
  sessionId: number;
  inputType: InputType;
  inputData: string;
  subject: string | null;
  topic: string | null;
  mode: StudyMode;
  createdAt: string;
}

export interface Solution {
  id: number;
  problemId: number;
  agentRole: "solver" | "critic" | "verifier" | "final" | string;
  content: string;
  latexContent?: string | null;
  stepData?: unknown;
  confidenceScore?: number | null;
  verificationPassed?: boolean | null;
  createdAt: string;
}

export interface DashboardStats {
  totalProblems: number;
  totalSessions: number;
  averageMastery: number;
  weeklyProblems: number;
  topicsStudied: number;
  strongTopics: Array<{ topic: string; mastery: number }>;
  weakTopics: Array<{ topic: string; mastery: number }>;
}

export interface KnowledgeNode {
  id: number;
  userId: string;
  subject: string;
  topic: string;
  masteryLevel: number;
  problemsAttempted: number;
  problemsCorrect: number;
  lastPracticedAt?: string | null;
}

export interface Cheatsheet {
  id: number;
  userId: string;
  topic: string;
  contentJson: string;
  createdAt?: string;
}

// ---------- Internal fetch helper ----------
async function request<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { query, headers, ...rest } = init;
  let url = `${BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`STEMind API ${res.status}: ${text || res.statusText}`);
  }

  // Some endpoints return empty body
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return undefined as T;
  return (await res.json()) as T;
}

// ---------- Sessions ----------
export const sessionsApi = {
  list: (userId: string) =>
    request<Session[]>("/api/sessions", { query: { userId } }),
  create: (input: { userId: string; title: string; subject?: string | null }) =>
    request<Session>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  delete: (sessionId: number) =>
    request<void>(`/api/sessions/${sessionId}`, { method: "DELETE" }),
};

// ---------- Problems ----------
export const problemsApi = {
  listForSession: (sessionId: number) =>
    request<Problem[]>("/api/problems", { query: { sessionId } }),
  create: (input: {
    sessionId: number;
    userId: string;
    inputType: InputType;
    inputData: string;
    subject?: string;
    topic?: string;
    mode?: StudyMode;
  }) =>
    request<Problem>("/api/problems", {
      method: "POST",
      body: JSON.stringify({ mode: "socratic", ...input }),
    }),
  // Some backends nest solutions under a problem; we expose a fetch attempt
  // that gracefully returns [] if the endpoint is missing.
  getSolutions: async (problemId: number): Promise<Solution[]> => {
    try {
      return await request<Solution[]>(`/api/problems/${problemId}/solutions`);
    } catch {
      return [];
    }
  },
};

// ---------- OCR / Image solving ----------
export const ocrApi = {
  solve: (input: { userId: string; sessionId: number; imageBase64: string }) =>
    request<Problem>("/api/ocr/solve", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

// ---------- Dashboard / Knowledge graph ----------
export const dashboardApi = {
  stats: (userId: string) =>
    request<DashboardStats>("/api/stats/dashboard", { query: { userId } }),
};

export const knowledgeApi = {
  graph: (userId: string) =>
    request<KnowledgeNode[]>("/api/knowledge-graph", { query: { userId } }),
};

// ---------- Cheatsheets ----------
export const cheatsheetsApi = {
  list: (userId: string) =>
    request<Cheatsheet[]>("/api/cheatsheets", { query: { userId } }),
  create: (input: { userId: string; topic: string }) =>
    request<Cheatsheet>("/api/cheatsheets", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

// ---------- Practice ----------
export const practiceApi = {
  generate: (input: { userId: string; topic: string; count?: number }) =>
    request<Problem[]>("/api/practice", {
      method: "POST",
      body: JSON.stringify({ count: 5, ...input }),
    }),
};

export const stemindApi = {
  baseUrl: BASE_URL,
  sessions: sessionsApi,
  problems: problemsApi,
  ocr: ocrApi,
  dashboard: dashboardApi,
  knowledge: knowledgeApi,
  cheatsheets: cheatsheetsApi,
  practice: practiceApi,
};
