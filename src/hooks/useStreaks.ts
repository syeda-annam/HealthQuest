import { supabase } from "@/integrations/supabase/client";
import { format, differenceInCalendarDays, parseISO } from "date-fns";

export type StreakModule = "water" | "sleep" | "mood" | "nutrition" | "workout" | "cycle";

export interface StreakRow {
  module: string;
  current_streak: number;
  longest_streak: number;
  last_logged_date: string | null;
}

/**
 * Update the user's streak for a given module after a log entry was saved.
 * Returns the new current_streak and longest_streak so callers can use them
 * (e.g. to check streak-based badges immediately).
 */
export async function updateStreak(
  userId: string,
  module: StreakModule,
): Promise<{ current: number; longest: number }> {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: existing } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .eq("module", module)
    .maybeSingle();

  let current = 1;
  let longest = 1;

  if (existing) {
    const last = existing.last_logged_date
      ? parseISO(existing.last_logged_date as unknown as string)
      : null;
    longest = Number(existing.longest_streak) || 0;

    if (last) {
      const diff = differenceInCalendarDays(parseISO(today), last);
      if (diff === 0) {
        // Already logged today — no change
        return {
          current: Number(existing.current_streak) || 0,
          longest,
        };
      }
      if (diff === 1) {
        current = (Number(existing.current_streak) || 0) + 1;
      } else {
        current = 1;
      }
    }

    if (current > longest) longest = current;

    await supabase
      .from("streaks")
      .update({
        current_streak: current,
        longest_streak: longest,
        last_logged_date: today,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("streaks").insert({
      user_id: userId,
      module,
      current_streak: 1,
      longest_streak: 1,
      last_logged_date: today,
    });
  }

  return { current, longest };
}

export async function fetchStreak(
  userId: string,
  module: StreakModule,
): Promise<StreakRow | null> {
  const { data } = await supabase
    .from("streaks")
    .select("module, current_streak, longest_streak, last_logged_date")
    .eq("user_id", userId)
    .eq("module", module)
    .maybeSingle();
  return (data as StreakRow) || null;
}

export async function fetchAllStreaks(userId: string): Promise<Record<string, StreakRow>> {
  const { data } = await supabase
    .from("streaks")
    .select("module, current_streak, longest_streak, last_logged_date")
    .eq("user_id", userId);
  const map: Record<string, StreakRow> = {};
  (data || []).forEach((row) => {
    map[(row as StreakRow).module] = row as StreakRow;
  });
  return map;
}
