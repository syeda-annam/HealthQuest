import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { ProgressRing } from "@/components/ProgressRing";
import { DashboardXPCard } from "@/components/DashboardXPCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Droplets, Moon, Smile, Lightbulb, Target, Dumbbell, UtensilsCrossed } from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";

interface Targets {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  water: number;
  sleep: number;
}

interface GoalData {
  id: string;
  title: string;
  module: string;
  target_value: number;
  current_value: number;
  target_date: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { level, totalXPEarned } = useProfile();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [targets, setTargets] = useState<Targets | null>(null);
  const [waterToday, setWaterToday] = useState(0);
  const [sleepLastNight, setSleepLastNight] = useState(0);
  const [moodToday, setMoodToday] = useState(0);
  const [caloriesToday, setCaloriesToday] = useState(0);
  const [workoutToday, setWorkoutToday] = useState(false);
  const [activeGoals, setActiveGoals] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      setLoading(true);
      const today = format(new Date(), "yyyy-MM-dd");

      const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

      const [profileRes, targetRes, waterRes, sleepRes, moodRes, nutritionRes, workoutRes, goalsRes] = await Promise.all([
        supabase.from("profiles").select("name").eq("id", user.id).single(),
        supabase.from("targets").select("*").eq("user_id", user.id).single(),
        supabase.from("water_logs").select("daily_total").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("sleep_logs").select("duration_hours").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("mood_logs").select("mood").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("nutrition_logs").select("total_calories").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("workout_logs").select("id").eq("user_id", user.id).eq("logged_date", today).limit(1),
        supabase.from("goals").select("id, title, module, target_value, current_value, target_date").eq("user_id", user.id).eq("status", "active").limit(3),
      ]);

      setName(profileRes.data?.name || "");
      if (targetRes.data) {
        setTargets({
          calories: targetRes.data.calories || 2000,
          protein: targetRes.data.protein || 120,
          fat: targetRes.data.fat || 65,
          carbs: targetRes.data.carbs || 250,
          water: targetRes.data.water || 2500,
          sleep: targetRes.data.sleep || 7.5,
        });
      }
      setWaterToday(Number(waterRes.data?.daily_total || 0));
      setSleepLastNight(Number(sleepRes.data?.duration_hours || 0));
      setMoodToday(Number(moodRes.data?.mood || 0));
      setCaloriesToday(Number(nutritionRes.data?.total_calories || 0));
      setWorkoutToday((workoutRes.data?.length || 0) > 0);
      setActiveGoals((goalsRes.data as unknown as GoalData[]) || []);
      setLoading(false);
    };

    fetchAll();
  }, [user]);

  const today = format(new Date(), "EEEE, MMMM d");

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
          Hello, {name || "there"} 👋
        </h1>
        <p className="text-muted-foreground">{today}</p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="flex flex-wrap justify-around gap-4 py-6">
          <ProgressRing value={caloriesToday} max={targets?.calories || 2000} label="Calories" unit="kcal" />
          <ProgressRing value={waterToday} max={targets?.water || 2500} label="Water" unit="ml" color="hsl(200, 80%, 50%)" />
          <ProgressRing value={sleepLastNight} max={targets?.sleep || 7.5} label="Sleep" unit="hrs" color="hsl(260, 60%, 55%)" />
          <ProgressRing value={workoutToday ? 1 : 0} max={1} label="Workout" unit="" color="hsl(30, 90%, 55%)" />
          <ProgressRing value={moodToday} max={5} label="Mood" unit="/5" color="hsl(340, 70%, 55%)" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeGoals.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No active goals yet.</p>
                <Button variant="link" className="text-sm" onClick={() => navigate("/goals")}>
                  Create a goal →
                </Button>
              </div>
            ) : (
              activeGoals.map((goal) => {
                const pct = goal.target_value > 0 ? Math.min(Math.round((goal.current_value / goal.target_value) * 100), 100) : 0;
                const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null;
                return (
                  <div key={goal.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground truncate">{goal.title}</span>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    {daysLeft !== null && (
                      <p className={`text-xs ${daysLeft < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                AI-powered insights will appear here once you start logging your daily activities.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading">Quick Log</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2" onClick={() => navigate("/water")}>
            <Droplets className="h-4 w-4 text-primary" /> Log Water
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/mood")}>
            <Smile className="h-4 w-4 text-primary" /> Log Mood
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/sleep")}>
            <Moon className="h-4 w-4 text-primary" /> Log Sleep
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">No activity logged yet. Use the quick log buttons above to get started!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
