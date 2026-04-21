-- 1. Add opt-in flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in boolean NOT NULL DEFAULT false;

-- 2. Friends table
CREATE TABLE IF NOT EXISTS public.friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Users can see rows where they are sender OR recipient
CREATE POLICY "Users can view own friend rows"
  ON public.friends FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can send friend requests (only as themselves, status pending)
CREATE POLICY "Users can send friend requests"
  ON public.friends FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Recipient can accept (update status). Sender can also update (for symmetry / re-send).
CREATE POLICY "Users can update own friend rows"
  ON public.friends FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Either party can delete (decline / unfriend)
CREATE POLICY "Users can delete own friend rows"
  ON public.friends FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE INDEX IF NOT EXISTS idx_friends_user ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON public.friends(friend_id);

-- 3. SECURITY DEFINER function: global leaderboard (top 20 opted-in by total XP)
CREATE OR REPLACE FUNCTION public.get_global_leaderboard()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  level integer,
  total_xp_earned integer,
  weekly_xp integer,
  badge_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH opted AS (
    SELECT p.id, p.name, p.level, p.total_xp_earned
    FROM public.profiles p
    WHERE p.leaderboard_opt_in = true
    ORDER BY p.total_xp_earned DESC
    LIMIT 20
  )
  SELECT
    o.id,
    -- "Priya K." style: first name + first letter of last name
    CASE
      WHEN o.name IS NULL OR length(trim(o.name)) = 0 THEN 'Adventurer'
      WHEN position(' ' in trim(o.name)) = 0 THEN trim(o.name)
      ELSE split_part(trim(o.name), ' ', 1) || ' ' || left(split_part(trim(o.name), ' ', 2), 1) || '.'
    END,
    o.level,
    o.total_xp_earned,
    -- Weekly XP placeholder: we don't have an XP-event log, so we approximate as 0 here.
    -- Front-end will compute approx weekly XP from logs if needed; otherwise show 0.
    0::int,
    (SELECT count(*)::int FROM public.badges b WHERE b.user_id = o.id)
  FROM opted o
  ORDER BY o.total_xp_earned DESC;
$$;

-- 4. SECURITY DEFINER function: my global rank (only counts opted-in users)
CREATE OR REPLACE FUNCTION public.get_my_global_rank()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND leaderboard_opt_in = true
    ) THEN NULL
    ELSE (
      SELECT count(*)::int + 1
      FROM public.profiles p
      WHERE p.leaderboard_opt_in = true
        AND p.total_xp_earned > (
          SELECT total_xp_earned FROM public.profiles WHERE id = auth.uid()
        )
    )
  END;
$$;

-- 5. SECURITY DEFINER function: friends leaderboard (XP, level, badge count, streak sum)
CREATE OR REPLACE FUNCTION public.get_friends_leaderboard()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  level integer,
  total_xp_earned integer,
  badge_count integer,
  streak_sum integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH friend_ids AS (
    SELECT CASE WHEN f.user_id = auth.uid() THEN f.friend_id ELSE f.user_id END AS fid
    FROM public.friends f
    WHERE f.status = 'accepted'
      AND (f.user_id = auth.uid() OR f.friend_id = auth.uid())
    UNION
    SELECT auth.uid()
  )
  SELECT
    p.id,
    CASE
      WHEN p.name IS NULL OR length(trim(p.name)) = 0 THEN 'Adventurer'
      WHEN position(' ' in trim(p.name)) = 0 THEN trim(p.name)
      ELSE split_part(trim(p.name), ' ', 1) || ' ' || left(split_part(trim(p.name), ' ', 2), 1) || '.'
    END,
    p.level,
    p.total_xp_earned,
    (SELECT count(*)::int FROM public.badges b WHERE b.user_id = p.id),
    COALESCE((SELECT sum(current_streak)::int FROM public.streaks s WHERE s.user_id = p.id), 0)
  FROM public.profiles p
  JOIN friend_ids fi ON fi.fid = p.id
  ORDER BY p.total_xp_earned DESC;
$$;

-- 6. Friend search: name or email lookup, returns minimal info
CREATE OR REPLACE FUNCTION public.search_users_for_friend(_query text)
RETURNS TABLE (
  user_id uuid,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
    CASE
      WHEN p.name IS NULL OR length(trim(p.name)) = 0 THEN 'Adventurer'
      ELSE p.name
    END
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id <> auth.uid()
    AND length(trim(coalesce(_query, ''))) >= 2
    AND (
      p.name ILIKE '%' || _query || '%'
      OR u.email ILIKE '%' || _query || '%'
    )
  LIMIT 10;
$$;

-- 7. Pending friend requests received: include sender display name
CREATE OR REPLACE FUNCTION public.get_pending_friend_requests()
RETURNS TABLE (
  request_id uuid,
  sender_id uuid,
  sender_name text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.user_id, COALESCE(NULLIF(trim(p.name), ''), 'Adventurer'), f.created_at
  FROM public.friends f
  JOIN public.profiles p ON p.id = f.user_id
  WHERE f.friend_id = auth.uid() AND f.status = 'pending'
  ORDER BY f.created_at DESC;
$$;