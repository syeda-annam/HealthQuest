import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

interface Goal {
  id: string;
  module: string;
  type: string;
  target_value: number;
  current_value: number;
  status: string;
  milestones: Record<string, boolean>;
}

async function checkAndCelebrateMilestones(goal: Goal, newValue: number) {
  const pct = goal.target_value > 0 ? (newValue / goal.target_value) * 100 : 0;
  const milestones = { ...(goal.milestones || { "25": false, "50": false, "75": false, "100": false }) };
  let celebrated = false;

  for (const threshold of ["25", "50", "75", "100"] as const) {
    if (pct >= Number(threshold) && !milestones[threshold]) {
      milestones[threshold] = true;
      celebrated = true;
      toast({
        title: `🎉 ${threshold}% Milestone!`,
        description: threshold === "100"
          ? "You completed your goal! Amazing work!"
          : `You reached ${threshold}% of your goal! Keep going!`,
      });
    }
  }

  if (celebrated) {
    confetti({ particleCount: threshold100Reached(pct) ? 200 : 100, spread: 70, origin: { y: 0.6 } });
  }

  const isComplete = newValue >= goal.target_value;
  await supabase.from("goals").update({
    current_value: newValue,
    milestones: milestones as unknown as Json,
    status: isComplete ? "completed" : "active",
  }).eq("id", goal.id);
}

function threshold100Reached(pct: number) {
  return pct >= 100;
}

export async function updateGoalsForModule(userId: string, module: string) {
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  if (!goals || goals.length === 0) return;

  const relevantGoals = (goals as unknown as Goal[]).filter(g => g.module === module);
  if (relevantGoals.length === 0) return;

  for (const goal of relevantGoals) {
    let newValue = goal.current_value;

    if (module === "Workout" && goal.type === "milestone") {
      const { count } = await supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("user_id", userId);
      newValue = count || 0;
    } else if (module === "Workout" && goal.type === "streak") {
      // Count weeks where user logged >= target_value workouts
      const { data: logs } = await supabase.from("workout_logs").select("logged_date").eq("user_id", userId).order("logged_date", { ascending: true });
      if (logs) {
        const weeks = new Map<string, number>();
        logs.forEach(l => {
          const d = new Date(l.logged_date + "T00:00:00");
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay());
          const key = weekStart.toISOString().slice(0, 10);
          weeks.set(key, (weeks.get(key) || 0) + 1);
        });
        // Count consecutive weeks meeting the threshold (simplified: just count qualifying weeks)
        newValue = Array.from(weeks.values()).filter(v => v >= 4).length;
      }
    } else if (module === "Water" && goal.type === "habit") {
      const { data: targets } = await supabase.from("targets").select("water").eq("user_id", userId).single();
      const waterTarget = Number(targets?.water) || 2500;
      const { data: logs } = await supabase.from("water_logs").select("daily_total").eq("user_id", userId);
      newValue = (logs || []).filter(l => Number(l.daily_total) >= waterTarget).length;
    } else if (module === "Sleep" && goal.type === "streak") {
      const { data: targets } = await supabase.from("targets").select("sleep").eq("user_id", userId).single();
      const sleepTarget = Number(targets?.sleep) || 7.5;
      const { data: logs } = await supabase.from("sleep_logs").select("duration_hours, logged_date").eq("user_id", userId).order("logged_date", { ascending: false });
      // Count consecutive nights meeting target
      let streak = 0;
      for (const l of logs || []) {
        if (Number(l.duration_hours) >= sleepTarget) streak++;
        else break;
      }
      newValue = streak;
    } else if (module === "Nutrition" && goal.type === "habit") {
      const { data: targets } = await supabase.from("targets").select("calories").eq("user_id", userId).single();
      const calTarget = Number(targets?.calories) || 2000;
      const { data: logs } = await supabase.from("nutrition_logs").select("total_calories").eq("user_id", userId);
      newValue = (logs || []).filter(l => {
        const cal = Number(l.total_calories);
        return cal > 0 && Math.abs(cal - calTarget) / calTarget <= 0.1;
      }).length;
    } else if (module === "Mood" && goal.type === "streak") {
      const { data: logs } = await supabase.from("mood_logs").select("logged_date").eq("user_id", userId).order("logged_date", { ascending: false });
      let streak = 0;
      for (const l of logs || []) {
        if (l.logged_date) streak++;
        else break;
      }
      newValue = streak;
    }

    if (newValue !== goal.current_value) {
      await checkAndCelebrateMilestones(goal, newValue);
    }
  }
}
