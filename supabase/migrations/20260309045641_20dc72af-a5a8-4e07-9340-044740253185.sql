
CREATE TABLE public.cycle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  logged_date date NOT NULL DEFAULT CURRENT_DATE,
  is_period_day boolean NOT NULL DEFAULT false,
  flow text,
  symptoms text[] DEFAULT '{}'::text[],
  bbt numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, logged_date)
);

ALTER TABLE public.cycle_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cycle logs" ON public.cycle_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cycle logs" ON public.cycle_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cycle logs" ON public.cycle_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cycle logs" ON public.cycle_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
