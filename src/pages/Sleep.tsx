import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Moon, Star, Flame } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, ResponsiveContainer, Tooltip,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { updateGoalsForModule } from "@/hooks/useGoalProgress";
import { recordLog } from "@/hooks/useBadges";
import { StreakBanner } from "@/components/StreakBanner";
import { awardXP, XPSource } from "@/hooks/useXP";
import { useProfile } from "@/contexts/ProfileContext";

const DISRUPTOR_TAGS = ["stress", "caffeine", "screens", "late meal", "exercise", "alcohol"];

function calcDuration(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let bedMin = bh * 60 + bm;
  let wakeMin = wh * 60 + wm;
  if (wakeMin <= bedMin) wakeMin += 24 * 60;
  return Math.round(((wakeMin - bedMin) / 60) * 10) / 10;
}

export default function Sleep() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [sleepTarget, setSleepTarget] = useState(7.5);
  const [streak, setStreak] = useState(0);

  // Form state
  const [bedtime, setBedtime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [quality, setQuality] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [todayLogged, setTodayLogged] = useState(false);

  // Chart data
  const [durationData, setDurationData] = useState<{ day: string; hours: number }[]>([]);
  const [qualityData, setQualityData] = useState<{ day: string; quality: number }[]>([]);
  const [tagFrequency, setTagFrequency] = useState<{ tag: string; count: number }[]>([]);
  const [workoutInsight, setWorkoutInsight] = useState<{ withWorkout: number | null; withoutWorkout: number | null }>({ withWorkout: null, withoutWorkout: null });

  const today = format(new Date(), "yyyy-MM-dd");
  const duration = bedtime && wakeTime ? calcDuration(bedtime, wakeTime) : 0;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const fourteenAgo = format(subDays(new Date(), 13), "yyyy-MM-dd");
    const thirtyAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");

    const [targetRes, logsRes, todayRes] = await Promise.all([
      supabase.from("targets").select("sleep").eq("user_id", user.id).single(),
      supabase.from("sleep_logs").select("*").eq("user_id", user.id).gte("logged_date", fourteenAgo).order("logged_date", { ascending: true }),
      supabase.from("sleep_logs").select("id").eq("user_id", user.id).eq("logged_date", today).single(),
    ]);

    const target = targetRes.data?.sleep ? Number(targetRes.data.sleep) : 7.5;
    setSleepTarget(target);
    setTodayLogged(!!todayRes.data);

    const logs = logsRes.data || [];

    // Duration chart (last 14 days)
    const durArr = Array.from({ length: 14 }, (_, i) => {
      const d = format(subDays(new Date(), 13 - i), "yyyy-MM-dd");
      const log = logs.find((l: any) => l.logged_date === d);
      return { day: format(subDays(new Date(), 13 - i), "MM/dd"), hours: Number(log?.duration_hours || 0) };
    });
    setDurationData(durArr);

    // Quality chart
    const qualArr = logs
      .filter((l: any) => l.quality)
      .map((l: any) => ({ day: format(new Date(l.logged_date + "T00:00:00"), "MM/dd"), quality: Number(l.quality) }));
    setQualityData(qualArr);

    // Tag frequency
    const tagCounts: Record<string, number> = {};
    logs.forEach((l: any) => {
      const tags = l.tags as string[] | null;
      if (tags) tags.forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    });
    setTagFrequency(Object.entries(tagCounts).map(([tag, count]) => ({ tag, count })));

    // Streak (from 30 day window)
    const { data: streakLogs } = await supabase
      .from("sleep_logs").select("logged_date, duration_hours")
      .eq("user_id", user.id).gte("logged_date", thirtyAgo).order("logged_date", { ascending: false });

    let s = 0;
    if (streakLogs) {
      for (let i = 0; i < 30; i++) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        const log = streakLogs.find((l: any) => l.logged_date === d);
        if (log && Number(log.duration_hours) >= target) s++;
        else break;
      }
    }
    setStreak(s);

    // Workout insight — check if workout_logs table exists
    try {
      const { data: workoutDays } = await (supabase as any).from("workout_logs").select("logged_date").eq("user_id", user.id);
      if (workoutDays && workoutDays.length > 0) {
        const workoutSet = new Set(workoutDays.map((w: any) => w.logged_date));
        let wSum = 0, wCount = 0, rSum = 0, rCount = 0;
        logs.forEach((l: any) => {
          if (!l.quality) return;
          if (workoutSet.has(l.logged_date)) { wSum += Number(l.quality); wCount++; }
          else { rSum += Number(l.quality); rCount++; }
        });
        setWorkoutInsight({
          withWorkout: wCount > 0 ? Math.round((wSum / wCount) * 10) / 10 : null,
          withoutWorkout: rCount > 0 ? Math.round((rSum / rCount) * 10) / 10 : null,
        });
      }
    } catch {
      // workout_logs table doesn't exist yet
    }

    setLoading(false);
  }, [user, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const logSleep = async () => {
    if (!user || !bedtime || !wakeTime || quality === 0) {
      toast({ title: "Please fill in bedtime, wake time, and quality", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("sleep_logs").upsert({
      user_id: user.id,
      logged_date: today,
      bedtime,
      wake_time: wakeTime,
      duration_hours: duration,
      quality,
      tags: selectedTags,
      notes: notes || null,
    }, { onConflict: "user_id,logged_date" });

    if (error) {
      toast({ title: "Error logging sleep", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sleep logged 🌙" });
      updateGoalsForModule(user.id, "Sleep");
      const sources: XPSource[] = [{ action: "Logged sleep", xp: 5 }];
      if (duration >= 7) sources.push({ action: "Slept 7+ hours", xp: 10 });
      awardXP(user.id, sources, (window as any).__healthquest_level_up).then(() => refreshProfile());
      recordLog(user.id, "sleep");
      setBedtime("");
      setWakeTime("");
      setQuality(0);
      setSelectedTags([]);
      setNotes("");
      setTodayLogged(true);
      fetchData();
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-foreground flex items-center gap-2">
          <Moon className="h-6 w-6 text-secondary" />
          Sleep Tracker
        </h1>
        <span className="text-sm text-muted-foreground">
          Your target: <span className="font-semibold text-foreground">{sleepTarget}h</span>
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Log Sleep Form */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading">
              {todayLogged ? "Update Today's Sleep" : "Log Last Night's Sleep"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Time Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Bedtime</label>
                <Input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Wake Time</label>
                <Input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
              </div>
            </div>

            {/* Duration Display */}
            {bedtime && wakeTime && (
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <span className="text-2xl font-heading font-bold text-foreground">{duration}h</span>
                <span className="text-sm text-muted-foreground ml-2">sleep duration</span>
              </div>
            )}

            {/* Quality Stars */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Sleep Quality</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setQuality(star)}
                    className="p-1 transition-colors"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        star <= quality
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Disruptor Tags */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Sleep Disruptors</label>
              <div className="flex flex-wrap gap-2">
                {DISRUPTOR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      selectedTags.includes(tag)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Notes (optional)</label>
              <Textarea
                placeholder="How did you sleep?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button onClick={logSleep} className="w-full gap-2">
              <Moon className="h-4 w-4" />
              {todayLogged ? "Update Sleep Log" : "Log Sleep"}
            </Button>
          </CardContent>
        </Card>

        {/* Streak + Empty State */}
        <div className="flex flex-col gap-6">
          <Card className="border-border bg-card">
            <CardContent className="flex items-center justify-center py-8 gap-4">
              <span className="text-5xl">🔥</span>
              <div>
                <p className="text-4xl font-heading font-bold text-foreground">{streak}</p>
                <p className="text-sm text-muted-foreground">night streak (≥ {sleepTarget}h)</p>
              </div>
            </CardContent>
          </Card>

          {/* Workout Insight */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-heading">💡 Insight</CardTitle>
            </CardHeader>
            <CardContent>
              {workoutInsight.withWorkout !== null && workoutInsight.withoutWorkout !== null ? (
                <div className="space-y-2 text-sm">
                  <p className="text-foreground">
                    On days you logged a workout, your average sleep quality was{" "}
                    <span className="font-bold text-primary">{workoutInsight.withWorkout}/5</span>.
                  </p>
                  <p className="text-foreground">
                    On rest days, it was{" "}
                    <span className="font-bold text-primary">{workoutInsight.withoutWorkout}/5</span>.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Insights will appear once you have workout and sleep data to compare. 🏋️‍♂️
                </p>
              )}
            </CardContent>
          </Card>

          {durationData.every((d) => d.hours === 0) && (
            <Card className="border-border bg-card">
              <CardContent className="py-8 text-center">
                <Moon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No sleep logged yet. How did you sleep last night? Your body will thank you for tracking.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Duration Bar Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading">Last 14 Nights — Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number) => [`${value}h`, "Duration"]}
                />
                <ReferenceLine y={sleepTarget} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Target", fill: "hsl(var(--destructive))", fontSize: 12 }} />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quality Line Chart */}
      {qualityData.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading">Sleep Quality Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={qualityData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis domain={[0, 5]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [`${value}/5`, "Quality"]}
                  />
                  <Line type="monotone" dataKey="quality" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tag Frequency Chart */}
      {tagFrequency.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading">Disruptor Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tagFrequency} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="tag" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [`${value}×`, "Occurrences"]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
