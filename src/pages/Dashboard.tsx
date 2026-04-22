import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { ProgressRing } from "@/components/ProgressRing";
import { DashboardXPCard } from "@/components/DashboardXPCard";
import { DashboardStreaksRow } from "@/components/DashboardStreaksRow";
import { ChallengesCard } from "@/components/ChallengesCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Droplets, Moon, Smile, Lightbulb, Dumbbell, UtensilsCrossed } from "lucide-react";
import { format } from "date-fns";

interface Targets {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  water: number;
  sleep: number;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      setLoading(true);
      const today = format(new Date(), "yyyy-MM-dd");

      const [profileRes, targetRes, waterRes, sleepRes, moodRes, nutritionRes, workoutRes] = await Promise.all([
        supabase.from("profiles").select("name").eq("id", user.id).single(),
        supabase.from("targets").select("*").eq("user_id", user.id).single(),
        supabase.from("water_logs").select("daily_total").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("sleep_logs").select("duration_hours").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("mood_logs").select("mood").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("nutrition_logs").select("total_calories").eq("user_id", user.id).eq("logged_date", today).single(),
        supabase.from("workout_logs").select("id").eq("user_id", user.id).eq("logged_date", today).limit(1),
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
      setLoading(false);
    };

    fetchAll();
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const today = format(new Date(), "EEEE, MMMM d");

  if (loading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
         <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">
           {getGreeting()}, {name || "there"}. 👋
         </h1>
         <p className="text-muted-foreground mt-1">Here's your wellness snapshot for today — {today}.</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap justify-around gap-6 py-6">
          <ProgressRing value={caloriesToday} max={targets?.calories || 2000} label="Calories" unit="kcal" />
          <ProgressRing value={waterToday} max={targets?.water || 2500} label="Water" unit="ml" color="hsl(var(--secondary))" />
          <ProgressRing value={sleepLastNight} max={targets?.sleep || 7.5} label="Sleep" unit="hrs" color="hsl(var(--chart-4))" />
          <ProgressRing value={workoutToday ? 1 : 0} max={1} label="Workout" unit="" color="hsl(var(--chart-5))" />
          <ProgressRing value={moodToday} max={5} label="Mood" unit="/5" color="hsl(var(--accent))" />
        </CardContent>
      </Card>

      <DashboardStreaksRow />

      <ChallengesCard />

      <div className="grid gap-6 md:grid-cols-2">
        <DashboardXPCard level={level} totalXP={totalXPEarned} />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading font-semibold flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-highlight" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
               <p className="text-sm text-muted-foreground">
                 Log a few more days and I'll start uncovering patterns across your sleep, mood, and nutrition.
               </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading font-semibold">Quick Log</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2" onClick={() => navigate("/water")}>
            <Droplets className="h-4 w-4" /> Log Water
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/mood")}>
            <Smile className="h-4 w-4" /> Log Mood
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/sleep")}>
            <Moon className="h-4 w-4" /> Log Sleep
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/workouts")}>
            <Dumbbell className="h-4 w-4" /> Log Workout
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/nutrition")}>
            <UtensilsCrossed className="h-4 w-4" /> Log Meal
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">Your activity feed will show up here as you log throughout the day.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
