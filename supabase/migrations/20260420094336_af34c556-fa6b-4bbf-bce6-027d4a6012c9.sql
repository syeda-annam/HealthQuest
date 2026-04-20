
CREATE TABLE public.streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module TEXT NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_logged_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks"
ON public.streaks FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks"
ON public.streaks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks"
ON public.streaks FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_streaks_updated_at
BEFORE UPDATE ON public.streaks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  seen BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, badge_id)
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
ON public.badges FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges"
ON public.badges FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own badges"
ON public.badges FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_streaks_user ON public.streaks(user_id);
CREATE INDEX idx_badges_user ON public.badges(user_id);
