import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XPBar } from "@/components/XPBar";
import { getLevelName } from "@/hooks/useXP";
import { Star } from "lucide-react";
import { format } from "date-fns";

interface XPEvent {
  action: string;
  xp: number;
}

export function DashboardXPCard({ level, totalXP }: { level: number; totalXP: number }) {
  const { user } = useAuth();
  const [todayXP, setTodayXP] = useState(0);
  const [todaySources, setTodaySources] = useState<XPEvent[]>([]);

  useEffect(() => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");

    const computeTodayXP = async () => {
      const sources: XPEvent[] = [];

      const [waterRes, sleepRes, moodRes, nutritionRes, workoutRes, cycleRes] = await Promise.all([
        supabase.from("water_logs").select("daily_total").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("sleep_logs").select("duration_hours").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("mood_logs").select("id").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("nutrition_logs").select("total_calories").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("workout_logs").select("id").eq("user_id", user.id).eq("logged_date", today),
        supabase.from("cycle_logs").select("id").eq("user_id", user.id).eq("logged_date", today).single(),
      ]);

      const { data: targets } = await supabase.from("targets").select("water, sleep, calories").eq("user_id", user.id).single();

      if (waterRes.data) {
        sources.push({ action: "Logged water", xp: 5 });
        const waterGoal = Number(targets?.water) || 2500;
        if (Number(waterRes.data.daily_total) >= waterGoal) {
          sources.push({ action: "Hit water goal", xp: 10 });
        }
      }
      if (sleepRes.data) {
        sources.push({ action: "Logged sleep", xp: 5 });
        if (Number(sleepRes.data.duration_hours) >= 7) {
          sources.push({ action: "Slept 7+ hours", xp: 10 });
        }
      }
      if (moodRes.data) {
        sources.push({ action: "Logged mood", xp: 5 });
      }
      if (nutritionRes.data) {
        sources.push({ action: "Logged meal", xp: 5 });
        const calTarget = Number(targets?.calories) || 2000;
        const cal = Number(nutritionRes.data.total_calories);
        if (cal > 0 && Math.abs(cal - calTarget) / calTarget <= 0.1) {
          sources.push({ action: "Hit calorie target", xp: 10 });
        }
      }
      if (workoutRes.data && workoutRes.data.length > 0) {
        workoutRes.data.forEach(() => sources.push({ action: "Logged workout", xp: 15 }));
      }
      if (cycleRes.data) {
        sources.push({ action: "Logged cycle", xp: 5 });
      }

      setTodaySources(sources);
      setTodayXP(sources.reduce((sum, s) => sum + s.xp, 0));
    };

    computeTodayXP();
  }, [user, level, totalXP]);

  return (
    <Card className="border-l-4 border-l-secondary">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading font-semibold flex items-center gap-2">
          <Star className="h-5 w-5 text-highlight" />
          XP &amp; Level
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <XPBar level={level} totalXP={totalXP} />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">XP earned today</span>
          <span className="font-bold text-secondary">+{todayXP} XP</span>
        </div>

        {todaySources.length > 0 ? (
          <div className="space-y-1">
            {todaySources.map((s, i) => (
              <div key={i} className="flex justify-between text-xs text-muted-foreground">
                <span>{s.action}</span>
                <span className="text-secondary font-medium">+{s.xp}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">
            Start logging to earn XP today!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
