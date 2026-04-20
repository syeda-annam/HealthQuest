
CREATE TABLE public.weekly_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL UNIQUE,
  challenges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view weekly challenges"
ON public.weekly_challenges FOR SELECT TO authenticated
USING (true);

CREATE TABLE public.user_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id TEXT NOT NULL,
  week_start DATE NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, week_start)
);

ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenge progress"
ON public.user_challenges FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge progress"
ON public.user_challenges FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge progress"
ON public.user_challenges FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_challenges_updated_at
BEFORE UPDATE ON public.user_challenges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_challenges_user_week ON public.user_challenges(user_id, week_start);
