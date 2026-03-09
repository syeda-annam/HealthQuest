
CREATE TABLE public.nutrition_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  logged_date date NOT NULL DEFAULT CURRENT_DATE,
  meals jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_calories numeric NOT NULL DEFAULT 0,
  total_protein numeric NOT NULL DEFAULT 0,
  total_carbs numeric NOT NULL DEFAULT 0,
  total_fat numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, logged_date)
);

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nutrition logs" ON public.nutrition_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nutrition logs" ON public.nutrition_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nutrition logs" ON public.nutrition_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
