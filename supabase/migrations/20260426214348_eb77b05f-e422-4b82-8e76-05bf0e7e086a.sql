-- Dedupe targets keeping the most recently updated row per user
DELETE FROM public.targets t
USING public.targets t2
WHERE t.user_id = t2.user_id
  AND (
    (t.updated_at IS NULL AND t2.updated_at IS NOT NULL)
    OR (t.updated_at < t2.updated_at)
    OR (t.updated_at = t2.updated_at AND t.id < t2.id)
  );

-- Add unique constraint on user_id so upserts work correctly
ALTER TABLE public.targets ADD CONSTRAINT targets_user_id_unique UNIQUE (user_id);