import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export function DailyProgressBar() {
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");

    const compute = async () => {
      const [waterRes, sleepRes, nutritionRes, workoutRes] = await Promise.all([
        supabase.from("water_logs").select("daily_total").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("sleep_logs").select("id").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("nutrition_logs").select("id").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("workout_logs").select("id").eq("user_id", user.id).eq("logged_date", today).limit(1),
      ]);

      let completed = 0;
      const total = 4;
      if (waterRes.data) completed++;
      if (sleepRes.data) completed++;
      if (nutritionRes.data) completed++;
      if (workoutRes.data && workoutRes.data.length > 0) completed++;

      setProgress(Math.round((completed / total) * 100));
    };

    compute();
  }, [user]);

  return (
    <div className="h-1 w-full bg-muted">
      <div
        className="h-full bg-accent transition-all duration-700 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
