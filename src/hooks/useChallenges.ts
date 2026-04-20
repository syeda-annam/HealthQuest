import { format, startOfWeek, getISOWeek, addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type ChallengeModule =
  | "water"
  | "sleep"
  | "workout"
  | "nutrition_protein"
  | "nutrition_calories"
  | "mood"
  | "all_modules"
  | "any_streak";

export interface ChallengeDef {
  id: string;
  title: string;
  description: string;
  module: ChallengeModule;
  target_value: number;
  xp_reward: number;
}

const WEEK_A: ChallengeDef[] = [
  { id: "hydration_hero_w", title: "Hydration Hero", description: "Hit your water goal every day this week.", module: "water", target_value: 7, xp_reward: 25 },
  { id: "sleep_consistent", title: "Sleep Consistent", description: "Log sleep on 5 of 7 days.", module: "sleep", target_value: 5, xp_reward: 25 },
  { id: "move_it", title: "Move It", description: "Log 3 workouts this week.", module: "workout", target_value: 3, xp_reward: 30 },
];

const WEEK_B: ChallengeDef[] = [
  { id: "protein_push", title: "Protein Push", description: "Hit your protein target on 5 days.", module: "nutrition_protein", target_value: 5, xp_reward: 25 },
  { id: "mood_monitor", title: "Mood Monitor", description: "Log your mood every day this week.", module: "mood", target_value: 7, xp_reward: 20 },
  { id: "early_bird", title: "Early Bird", description: "Sleep before midnight on 4 nights.", module: "sleep", target_value: 4, xp_reward: 25 },
];

const WEEK_C: ChallengeDef[] = [
  { id: "full_logger", title: "Full Logger", description: "Log all 5 modules at least once.", module: "all_modules", target_value: 5, xp_reward: 30 },
  { id: "calorie_control", title: "Calorie Control", description: "Stay within 10% of your calorie target on 5 days.", module: "nutrition_calories", target_value: 5, xp_reward: 25 },
  { id: "streak_builder", title: "Streak Builder", description: "Maintain any module streak for the whole week.", module: "any_streak", target_value: 7, xp_reward: 25 },
];

const ROTATION = [WEEK_A, WEEK_B, WEEK_C];

/** Monday-anchored start of the week containing `date`, formatted yyyy-MM-dd. */
export function weekStartFor(date: Date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

/** Returns the 3 challenges for a given week (rotates A → B → C → A …). */
export function getChallengesForWeek(weekStart: string): ChallengeDef[] {
  const wk = getISOWeek(parseISO(weekStart));
  return ROTATION[wk % ROTATION.length];
}

export function daysRemainingInWeek(weekStart: string): number {
  const end = addDays(parseISO(weekStart), 7);
  return Math.max(0, differenceInCalendarDays(end, new Date()));
}

interface ProgressCtx {
  userId: string;
  weekStart: string;
}

async function evaluateChallenge(def: ChallengeDef, ctx: ProgressCtx): Promise<number> {
  const { userId, weekStart } = ctx;
  const weekEnd = format(addDays(parseISO(weekStart), 6), "yyyy-MM-dd");

  switch (def.module) {
    case "water": {
      const { data: tgt } = await supabase
        .from("targets").select("water").eq("user_id", userId).maybeSingle();
      const goal = Number(tgt?.water) || 2500;
      const { data } = await supabase
        .from("water_logs")
        .select("logged_date, daily_total")
        .eq("user_id", userId)
        .gte("logged_date", weekStart)
        .lte("logged_date", weekEnd);
      return (data || []).filter((l) => Number(l.daily_total) >= goal).length;
    }
    case "sleep": {
      const { data } = await supabase
        .from("sleep_logs")
        .select("logged_date, bedtime")
        .eq("user_id", userId)
        .gte("logged_date", weekStart)
        .lte("logged_date", weekEnd);
      // Early bird: bedtime BEFORE midnight (i.e. <24:00 evening) — interpret
      // as bedtime hour >= 18 OR < 04 just for the early-bird challenge.
      if (def.id === "early_bird") {
        return (data || []).filter((l) => {
          if (!l.bedtime) return false;
          const hour = parseInt(String(l.bedtime).slice(0, 2), 10);
          // before midnight = evening hours (18:00–23:59)
          return hour >= 18 && hour <= 23;
        }).length;
      }
      return (data || []).length;
    }
    case "workout": {
      const { count } = await supabase
        .from("workout_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("logged_date", weekStart)
        .lte("logged_date", weekEnd);
      return count || 0;
    }
    case "mood": {
      const { data } = await supabase
        .from("mood_logs")
        .select("logged_date")
        .eq("user_id", userId)
        .gte("logged_date", weekStart)
        .lte("logged_date", weekEnd);
      const uniq = new Set((data || []).map((l) => l.logged_date as string));
      return uniq.size;
    }
    case "nutrition_protein": {
      const { data: tgt } = await supabase
        .from("targets").select("protein").eq("user_id", userId).maybeSingle();
      const goal = Number(tgt?.protein) || 0;
      if (!goal) return 0;
      const { data } = await supabase
        .from("nutrition_logs")
        .select("logged_date, total_protein")
        .eq("user_id", userId)
        .gte("logged_date", weekStart)
        .lte("logged_date", weekEnd);
      return (data || []).filter((l) => Number(l.total_protein) >= goal).length;
    }
    case "nutrition_calories": {
      const { data: tgt } = await supabase
        .from("targets").select("calories").eq("user_id", userId).maybeSingle();
      const goal = Number(tgt?.calories) || 0;
      if (!goal) return 0;
      const { data } = await supabase
        .from("nutrition_logs")
        .select("logged_date, total_calories")
        .eq("user_id", userId)
        .gte("logged_date", weekStart)
        .lte("logged_date", weekEnd);
      return (data || []).filter((l) => {
        const cal = Number(l.total_calories);
        return cal > 0 && Math.abs(cal - goal) / goal <= 0.1;
      }).length;
    }
    case "all_modules": {
      const tables: Array<"water_logs" | "sleep_logs" | "workout_logs" | "nutrition_logs" | "mood_logs"> =
        ["water_logs", "sleep_logs", "workout_logs", "nutrition_logs", "mood_logs"];
      let count = 0;
      for (const t of tables) {
        const { count: c } = await supabase
          .from(t)
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("logged_date", weekStart)
          .lte("logged_date", weekEnd);
        if ((c || 0) > 0) count++;
      }
      return count;
    }
    case "any_streak": {
      const { data } = await supabase
        .from("streaks")
        .select("current_streak")
        .eq("user_id", userId);
      const max = Math.max(0, ...(data || []).map((s) => Number(s.current_streak) || 0));
      return Math.min(max, 7);
    }
  }
}

/** Ensure a user_challenges row exists for each of this week's challenges. */
async function ensureRows(userId: string, weekStart: string, defs: ChallengeDef[]) {
  const { data: existing } = await supabase
    .from("user_challenges")
    .select("challenge_id")
    .eq("user_id", userId)
    .eq("week_start", weekStart);
  const have = new Set((existing || []).map((r) => r.challenge_id as string));
  const toInsert = defs.filter((d) => !have.has(d.id)).map((d) => ({
    user_id: userId,
    challenge_id: d.id,
    week_start: weekStart,
  }));
  if (toInsert.length > 0) {
    await supabase.from("user_challenges").insert(toInsert);
  }
}

/** Re-evaluate every active challenge after a log save and persist updates. */
export async function updateChallengeProgress(userId: string) {
  const weekStart = weekStartFor();
  const defs = getChallengesForWeek(weekStart);

  await ensureRows(userId, weekStart, defs);

  const { data: rows } = await supabase
    .from("user_challenges")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart);

  for (const def of defs) {
    const row = (rows || []).find((r) => r.challenge_id === def.id);
    if (!row) continue;

    const value = await evaluateChallenge(def, { userId, weekStart });
    const wasComplete = !!row.completed;
    const nowComplete = value >= def.target_value;

    if (value === Number(row.current_value) && wasComplete === nowComplete) continue;

    const update: Record<string, unknown> = { current_value: Math.min(value, def.target_value) };
    if (nowComplete && !wasComplete) {
      update.completed = true;
      update.completed_at = new Date().toISOString();
    }
    await supabase.from("user_challenges").update(update).eq("id", row.id);

    // Award XP once on transition to complete
    if (nowComplete && !wasComplete) {
      toast({
        title: "Challenge Complete!",
        description: `${def.title} · +${def.xp_reward} XP`,
      });
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp, total_xp_earned, level")
        .eq("id", userId)
        .single();
      if (profile) {
        const newTotal = (Number(profile.total_xp_earned) || 0) + def.xp_reward;
        await supabase.from("profiles").update({
          xp: (Number(profile.xp) || 0) + def.xp_reward,
          total_xp_earned: newTotal,
          level: Math.floor(newTotal / 100) + 1,
        }).eq("id", userId);
      }
    }
  }
}

/** Cache the week's challenges in `weekly_challenges` (idempotent). */
export async function ensureWeeklyChallengeRow(weekStart: string) {
  const defs = getChallengesForWeek(weekStart);
  await supabase.from("weekly_challenges").upsert(
    [{ week_start: weekStart, challenges: defs as unknown as object[] }],
    { onConflict: "week_start" },
  );
}
