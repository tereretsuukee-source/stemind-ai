
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  education_level TEXT CHECK (education_level IN ('elementary','middle_school','high_school','undergraduate','graduate','phd')),
  preferred_mode TEXT DEFAULT 'socratic' CHECK (preferred_mode IN ('socratic','direct','exam')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Study sessions
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Session',
  subject TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON public.study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.study_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.study_sessions FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.study_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Problems
CREATE TABLE public.problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL CHECK (input_type IN ('text','image','pdf','diagram')),
  input_text TEXT,
  input_image_url TEXT,
  subject TEXT,
  topic TEXT,
  difficulty_estimate TEXT CHECK (difficulty_estimate IN ('easy','medium','hard','advanced')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','solving','verified','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own problems" ON public.problems FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own problems" ON public.problems FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own problems" ON public.problems FOR UPDATE USING (auth.uid() = user_id);

-- Solutions (triple-verification)
CREATE TABLE public.solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_role TEXT NOT NULL CHECK (agent_role IN ('solver','critic','verifier','final')),
  content TEXT NOT NULL,
  latex_content TEXT,
  confidence_score NUMERIC(4,3) CHECK (confidence_score BETWEEN 0 AND 1),
  verification_passed BOOLEAN,
  step_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own solutions" ON public.solutions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own solutions" ON public.solutions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Knowledge graph nodes
CREATE TABLE public.knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  subject TEXT NOT NULL,
  mastery_level NUMERIC(4,3) DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 1),
  problems_attempted INT DEFAULT 0,
  problems_correct INT DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic, subject)
);
ALTER TABLE public.knowledge_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own knowledge" ON public.knowledge_nodes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own knowledge" ON public.knowledge_nodes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own knowledge" ON public.knowledge_nodes FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_knowledge_nodes_updated_at BEFORE UPDATE ON public.knowledge_nodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Knowledge graph edges
CREATE TABLE public.knowledge_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('prerequisite','related','builds_on')),
  strength NUMERIC(4,3) DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_node_id, target_node_id)
);
ALTER TABLE public.knowledge_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own edges" ON public.knowledge_edges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own edges" ON public.knowledge_edges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own edges" ON public.knowledge_edges FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_sessions_user ON public.study_sessions(user_id);
CREATE INDEX idx_problems_session ON public.problems(session_id);
CREATE INDEX idx_problems_user ON public.problems(user_id);
CREATE INDEX idx_solutions_problem ON public.solutions(problem_id);
CREATE INDEX idx_knowledge_nodes_user ON public.knowledge_nodes(user_id);
CREATE INDEX idx_knowledge_edges_source ON public.knowledge_edges(source_node_id);
CREATE INDEX idx_knowledge_edges_target ON public.knowledge_edges(target_node_id);
