import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BADGE_MAP } from "@/lib/badges";
import { format, subDays, parseISO } from "date-fns";

const BADGE_XP_REWARD = 20;

async function getEarnedIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("badges")
    .select("badge_id")
    .eq("user_id", userId);
  return new Set((data || []).map((b) => b.badge_id as string));
}

async function unlockBadge(userId: string, badgeId: string) {
  const def = BADGE_MAP[badgeId];
  if (!def) return false;

  const { error } = await supabase.from("badges").insert({
    user_id: userId,
    badge_id: badgeId,
  });
  if (error) return false;

  toast({
    title: `${def.emoji} Badge Unlocked: ${def.name}!`,
    description: def.description,
  });

  // Award +20 XP for the badge — applied directly to avoid triggering cascading
  // badge checks during the same tick.
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, level, total_xp_earned")
    .eq("id", userId)
    .single();
  if (profile) {
    const newTotal = (Number(profile.total_xp_earned) || 0) + BADGE_XP_REWARD;
    const newLevel = Math.floor(newTotal / 100) + 1;
    await supabase
      .from("profiles")
      .update({
        xp: (Number(profile.xp) || 0) + BADGE_XP_REWARD,
        total_xp_earned: newTotal,
        level: newLevel,
      })
      .eq("id", userId);
  }

  return true;
}

interface CheckCtx {
  module?: string;
  currentStreak?: number;
}

/**
 * Check all unlock conditions for the user. Safe to call after any log save
 * or XP update — already-earned badges are skipped.
 */
export async function checkBadges(userId: string, ctx: CheckCtx = {}) {
  const earned = await getEarnedIds(userId);
  const toUnlock: string[] = [];

  const tryUnlock = (id: string, condition: boolean) => {
    if (condition && !earned.has(id)) toUnlock.push(id);
  };

  // ── First Steps ────────────────────────────────────────────────────
  const firstStepChecks: Array<[string, string, string]> = [
    ["first_drop", "water_logs", "water"],
    ["first_sleep", "sleep_logs", "sleep"],
    ["first_workout", "workout_logs", "workout"],
    ["first_meal", "nutrition_logs", "nutrition"],
    ["first_mood", "mood_logs", "mood"],
  ];
  for (const [badge, table] of firstStepChecks) {
    if (earned.has(badge)) continue;
    const { count } = await supabase
      .from(table as "water_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    tryUnlock(badge, (count || 0) >= 1);
  }

  // ── Consistency: streak-based ──────────────────────────────────────
  const { data: streaks } = await supabase
    .from("streaks")
    .select("module, current_streak, longest_streak")
    .eq("user_id", userId);

  const streakMap = new Map<string, { current: number; longest: number }>();
  (streaks || []).forEach((s) => {
    streakMap.set(s.module as string, {
      current: Number(s.current_streak) || 0,
      longest: Number(s.longest_streak) || 0,
    });
  });

  const anyLongest = Math.max(0, ...Array.from(streakMap.values()).map((s) => s.longest));
  tryUnlock("week_warrior", anyLongest >= 7);
  tryUnlock("month_master", anyLongest >= 30);

  const sleepStreak = streakMap.get("sleep");
  tryUnlock("sleep_champion", (sleepStreak?.longest || 0) >= 14);

  const moodStreak = streakMap.get("mood");
  tryUnlock("zen_master", (moodStreak?.longest || 0) >= 14);

  // ── Iron will: 20 workouts total ───────────────────────────────────
  if (!earned.has("iron_will")) {
    const { count } = await supabase
      .from("workout_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    tryUnlock("iron_will", (count || 0) >= 20);
  }

  // ── Hydration hero: hit water goal 10 days in a row ────────────────
  if (!earned.has("hydration_hero")) {
    const { data: tgt } = await supabase
      .from("targets")
      .select("water")
      .eq("user_id", userId)
      .maybeSingle();
    const waterGoal = Number(tgt?.water) || 2500;
    const since = format(subDays(new Date(), 30), "yyyy-MM-dd");
    const { data: logs } = await supabase
      .from("water_logs")
      .select("logged_date, daily_total")
      .eq("user_id", userId)
      .gte("logged_date", since)
      .order("logged_date", { ascending: false });
    let run = 0;
    if (logs) {
      const map = new Map(logs.map((l) => [l.logged_date as string, Number(l.daily_total)]));
      for (let i = 0; i < 30; i++) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        if ((map.get(d) || 0) >= waterGoal) run++;
        else break;
      }
    }
    tryUnlock("hydration_hero", run >= 10);
  }

  // ── Well rested: 8+ hours sleep 5 nights in a row ──────────────────
  if (!earned.has("well_rested")) {
    const { data: logs } = await supabase
      .from("sleep_logs")
      .select("logged_date, duration_hours")
      .eq("user_id", userId)
      .order("logged_date", { ascending: false })
      .limit(30);
    let run = 0;
    if (logs) {
      const map = new Map(logs.map((l) => [l.logged_date as string, Number(l.duration_hours)]));
      for (let i = 0; i < 30; i++) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        const v = map.get(d);
        if (v !== undefined && v >= 8) run++;
        else break;
      }
    }
    tryUnlock("well_rested", run >= 5);
  }

  // ── Protein pro: hit protein target 7 days in a row ────────────────
  if (!earned.has("protein_pro")) {
    const { data: tgt } = await supabase
      .from("targets")
      .select("protein")
      .eq("user_id", userId)
      .maybeSingle();
    const proteinGoal = Number(tgt?.protein) || 0;
    if (proteinGoal > 0) {
      const { data: logs } = await supabase
        .from("nutrition_logs")
        .select("logged_date, total_protein")
        .eq("user_id", userId)
        .order("logged_date", { ascending: false })
        .limit(30);
      let run = 0;
      if (logs) {
        const map = new Map(logs.map((l) => [l.logged_date as string, Number(l.total_protein)]));
        for (let i = 0; i < 30; i++) {
          const d = format(subDays(new Date(), i), "yyyy-MM-dd");
          const v = map.get(d);
          if (v !== undefined && v >= proteinGoal) run++;
          else break;
        }
      }
      tryUnlock("protein_pro", run >= 7);
    }
  }

  // ── Full house: all 5 modules logged today ─────────────────────────
  if (!earned.has("full_house")) {
    const today = format(new Date(), "yyyy-MM-dd");
    const tables: Array<"water_logs" | "sleep_logs" | "mood_logs" | "nutrition_logs" | "workout_logs"> =
      ["water_logs", "sleep_logs", "mood_logs", "nutrition_logs", "workout_logs"];
    let allLogged = true;
    for (const t of tables) {
      const { count } = await supabase
        .from(t)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("logged_date", today);
      if (!count) {
        allLogged = false;
        break;
      }
    }
    tryUnlock("full_house", allLogged);
  }

  // ── XP / level / goals ─────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("total_xp_earned, level")
    .eq("id", userId)
    .single();
  if (profile) {
    const totalXP = Number(profile.total_xp_earned) || 0;
    const level = Number(profile.level) || 1;
    tryUnlock("century", totalXP >= 100);
    tryUnlock("level_5", level >= 5);
    tryUnlock("level_10", level >= 10);
    tryUnlock("legend", level >= 16);
  }

  if (!earned.has("goal_getter") || !earned.has("overachiever")) {
    const { count } = await supabase
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed");
    tryUnlock("goal_getter", (count || 0) >= 1);
    tryUnlock("overachiever", (count || 0) >= 5);
  }

  // Unlock sequentially so toasts stack nicely
  for (const id of toUnlock) {
    await unlockBadge(userId, id);
  }
}

/**
 * Convenience wrapper: update streak for a module then check badges.
 * Use this from log-save handlers.
 */
export async function recordLog(userId: string, module: import("./useStreaks").StreakModule) {
  const { updateStreak } = await import("./useStreaks");
  const { current } = await updateStreak(userId, module);
  await checkBadges(userId, { module, currentStreak: current });
}
