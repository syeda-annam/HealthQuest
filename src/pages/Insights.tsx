import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, Download, Trophy, Activity } from "lucide-react";
import {
  format, subDays, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, addWeeks, differenceInDays,
} from "date-fns";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import html2canvas from "html2canvas";

interface SleepLog { logged_date: string; duration_hours: number | null; quality: number | null; tags: string[] | null }
interface MoodLog { logged_date: string; mood: number | null; stress: number | null }
interface WaterLog { logged_date: string; daily_total: number }
interface NutritionLog { logged_date: string; total_calories: number; total_protein: number }
interface WorkoutLog { logged_date: string; total_volume: number; type: string }

export default function Insights() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Correlation data
  const [sleepMoodData, setSleepMoodData] = useState<{ category: string; mood: number }[]>([]);
  const [sleepMoodInsight, setSleepMoodInsight] = useState("");
  const [workoutSleepData, setWorkoutSleepData] = useState<{ category: string; sleep: number }[]>([]);
  const [workoutSleepInsight, setWorkoutSleepInsight] = useState("");
  const [waterMoodScatter, setWaterMoodScatter] = useState<{ water: number; mood: number }[]>([]);
  const [waterMoodInsight, setWaterMoodInsight] = useState("");
  const [proteinVolumeData, setProteinVolumeData] = useState<{ week: string; volume: number }[]>([]);
  const [proteinVolumeInsight, setProteinVolumeInsight] = useState("");

  // Wellness
  const [wellnessScore, setWellnessScore] = useState(0);
  const [wellnessTrend, setWellnessTrend] = useState<{ month: string; score: number }[]>([]);

  // Best week
  const [bestWeek, setBestWeek] = useState<{ range: string; score: number } | null>(null);

  // Monthly summary
  const [summary, setSummary] = useState({
    wellness: 0, avgSleep: 0, avgCal: 0, workouts: 0,
    waterDays: 0, totalDays: 0, avgMood: 0,
  });

  // Targets
  const [targets, setTargets] = useState({ calories: 2000, protein: 120, water: 2500, sleep: 7.5 });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const ninetyAgo = format(subDays(new Date(), 90), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

    const [targetRes, sleepRes, moodRes, waterRes, nutritionRes, workoutRes] = await Promise.all([
      supabase.from("targets").select("*").eq("user_id", user.id).single(),
      supabase.from("sleep_logs").select("logged_date, duration_hours, quality, tags").eq("user_id", user.id).gte("logged_date", ninetyAgo).order("logged_date"),
      supabase.from("mood_logs").select("logged_date, mood, stress").eq("user_id", user.id).gte("logged_date", ninetyAgo).order("logged_date"),
      supabase.from("water_logs").select("logged_date, daily_total").eq("user_id", user.id).gte("logged_date", ninetyAgo).order("logged_date"),
      supabase.from("nutrition_logs").select("logged_date, total_calories, total_protein").eq("user_id", user.id).gte("logged_date", ninetyAgo).order("logged_date"),
      supabase.from("workout_logs").select("logged_date, total_volume, type").eq("user_id", user.id).gte("logged_date", ninetyAgo).order("logged_date"),
    ]);

    const t = {
      calories: Number(targetRes.data?.calories) || 2000,
      protein: Number(targetRes.data?.protein) || 120,
      water: Number(targetRes.data?.water) || 2500,
      sleep: Number(targetRes.data?.sleep) || 7.5,
    };
    setTargets(t);

    const sleepLogs = (sleepRes.data || []) as SleepLog[];
    const moodLogs = (moodRes.data || []) as MoodLog[];
    const waterLogs = (waterRes.data || []) as WaterLog[];
    const nutritionLogs = (nutritionRes.data || []) as NutritionLog[];
    const workoutLogs = (workoutRes.data || []) as WorkoutLog[];

    // Helper maps
    const sleepByDate = new Map(sleepLogs.map(l => [l.logged_date, l]));
    const moodByDate = new Map(moodLogs.map(l => [l.logged_date, l]));
    const waterByDate = new Map(waterLogs.map(l => [l.logged_date, l]));
    const nutritionByDate = new Map(nutritionLogs.map(l => [l.logged_date, l]));
    const workoutDates = new Set(workoutLogs.map(l => l.logged_date));

    // === Card 1: Sleep vs Mood ===
    const goodSleepMoods: number[] = [];
    const badSleepMoods: number[] = [];
    sleepLogs.forEach(sl => {
      const nextDay = format(addDays90(new Date(sl.logged_date + "T00:00:00"), 1), "yyyy-MM-dd");
      const moodLog = moodByDate.get(nextDay);
      if (moodLog?.mood) {
        if (Number(sl.duration_hours) >= 7) goodSleepMoods.push(Number(moodLog.mood));
        else badSleepMoods.push(Number(moodLog.mood));
      }
    });
    const avgGoodMood = goodSleepMoods.length > 0 ? +(goodSleepMoods.reduce((a, b) => a + b, 0) / goodSleepMoods.length).toFixed(1) : 0;
    const avgBadMood = badSleepMoods.length > 0 ? +(badSleepMoods.reduce((a, b) => a + b, 0) / badSleepMoods.length).toFixed(1) : 0;
    setSleepMoodData([
      { category: "7+ hours", mood: avgGoodMood },
      { category: "Under 7h", mood: avgBadMood },
    ]);
    setSleepMoodInsight(
      avgGoodMood > 0 || avgBadMood > 0
        ? `On nights you slept 7+ hours, your next-day mood averaged ${avgGoodMood}/5. On shorter nights, it averaged ${avgBadMood}/5.`
        : "Not enough sleep + mood data yet to show correlations."
    );

    // === Card 2: Workouts vs Sleep ===
    const workoutDaySleep: number[] = [];
    const restDaySleep: number[] = [];
    sleepLogs.forEach(sl => {
      const dur = Number(sl.duration_hours);
      if (!dur) return;
      if (workoutDates.has(sl.logged_date)) workoutDaySleep.push(dur);
      else restDaySleep.push(dur);
    });
    const avgWorkoutSleep = workoutDaySleep.length > 0 ? +(workoutDaySleep.reduce((a, b) => a + b, 0) / workoutDaySleep.length).toFixed(1) : 0;
    const avgRestSleep = restDaySleep.length > 0 ? +(restDaySleep.reduce((a, b) => a + b, 0) / restDaySleep.length).toFixed(1) : 0;
    setWorkoutSleepData([
      { category: "Workout Days", sleep: avgWorkoutSleep },
      { category: "Rest Days", sleep: avgRestSleep },
    ]);
    setWorkoutSleepInsight(
      avgWorkoutSleep > 0 || avgRestSleep > 0
        ? `On workout days, you slept an average of ${avgWorkoutSleep} hours. On rest days, ${avgRestSleep} hours.`
        : "Not enough workout + sleep data yet."
    );

    // === Card 3: Water vs Mood ===
    const waterMoodPoints: { water: number; mood: number }[] = [];
    waterLogs.forEach(wl => {
      const ml = moodByDate.get(wl.logged_date);
      if (ml?.mood) waterMoodPoints.push({ water: Number(wl.daily_total), mood: Number(ml.mood) });
    });
    setWaterMoodScatter(waterMoodPoints);
    const metWater = waterMoodPoints.filter(p => p.water >= t.water);
    const notMetWater = waterMoodPoints.filter(p => p.water < t.water);
    const avgMetMood = metWater.length > 0 ? +(metWater.reduce((s, p) => s + p.mood, 0) / metWater.length).toFixed(1) : 0;
    const avgNotMetMood = notMetWater.length > 0 ? +(notMetWater.reduce((s, p) => s + p.mood, 0) / notMetWater.length).toFixed(1) : 0;
    setWaterMoodInsight(
      waterMoodPoints.length > 0
        ? `On days you hit your water target, your mood averaged ${avgMetMood}/5. On days you didn't, ${avgNotMetMood}/5.`
        : "Not enough water + mood data yet."
    );

    // === Card 4: Protein vs Workout Volume ===
    const weeklyData: { week: string; volume: number; proteinMet: number; totalDays: number }[] = [];
    const startDate = subDays(new Date(), 90);
    for (let i = 0; i < 13; i++) {
      const ws = startOfWeek(addWeeks(startDate, i), { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: ws, end: addDays90(ws, 6) });
      let vol = 0;
      let protDays = 0;
      let counted = 0;
      days.forEach(d => {
        const ds = format(d, "yyyy-MM-dd");
        const wl = workoutLogs.filter(w => w.logged_date === ds);
        vol += wl.reduce((s, w) => s + Number(w.total_volume), 0);
        const nl = nutritionByDate.get(ds);
        if (nl) {
          counted++;
          if (Number(nl.total_protein) >= t.protein) protDays++;
        }
      });
      weeklyData.push({ week: format(ws, "MMM d"), volume: vol, proteinMet: protDays, totalDays: counted });
    }
    setProteinVolumeData(weeklyData.map(w => ({ week: w.week, volume: w.volume })));
    const highProtWeeks = weeklyData.filter(w => w.proteinMet >= 4);
    const lowProtWeeks = weeklyData.filter(w => w.proteinMet < 4 && w.totalDays > 0);
    const avgHighVol = highProtWeeks.length > 0 ? Math.round(highProtWeeks.reduce((s, w) => s + w.volume, 0) / highProtWeeks.length) : 0;
    const avgLowVol = lowProtWeeks.length > 0 ? Math.round(lowProtWeeks.reduce((s, w) => s + w.volume, 0) / lowProtWeeks.length) : 0;
    setProteinVolumeInsight(
      highProtWeeks.length > 0 || lowProtWeeks.length > 0
        ? `In weeks where you hit your protein target 4+ days, your avg workout volume was ${avgHighVol.toLocaleString()}. In other weeks, it was ${avgLowVol.toLocaleString()}.`
        : "Not enough protein + workout data yet."
    );

    // === Wellness Score (current month) ===
    const monthDays = eachDayOfInterval({ start: startOfMonth(new Date()), end: new Date() });
    const computeWellness = (days: Date[]) => {
      let sleepMet = 0, calMet = 0, workoutCount = 0, waterMet = 0, moodSum = 0, moodCount = 0;
      days.forEach(d => {
        const ds = format(d, "yyyy-MM-dd");
        const sl = sleepByDate.get(ds);
        if (sl && Number(sl.duration_hours) >= t.sleep) sleepMet++;
        const nl = nutritionByDate.get(ds);
        if (nl && Math.abs(Number(nl.total_calories) - t.calories) / t.calories <= 0.1) calMet++;
        if (workoutDates.has(ds)) workoutCount++;
        const wl = waterByDate.get(ds);
        if (wl && Number(wl.daily_total) >= t.water) waterMet++;
        const ml = moodByDate.get(ds);
        if (ml?.mood) { moodSum += Number(ml.mood); moodCount++; }
      });
      const total = days.length || 1;
      const workoutTarget = Math.round(total * 4 / 7);
      const sleepPct = (sleepMet / total) * 100;
      const calPct = (calMet / total) * 100;
      const workoutPct = Math.min((workoutCount / (workoutTarget || 1)) * 100, 100);
      const waterPct = (waterMet / total) * 100;
      const moodPct = moodCount > 0 ? (moodSum / moodCount / 5) * 100 : 50;
      return Math.round(sleepPct * 0.25 + calPct * 0.25 + workoutPct * 0.20 + waterPct * 0.15 + moodPct * 0.15);
    };

    const currentWellness = computeWellness(monthDays);
    setWellnessScore(currentWellness);

    // Trend: last 3 months
    const trend: { month: string; score: number }[] = [];
    for (let m = 2; m >= 0; m--) {
      const ms = startOfMonth(subDays(new Date(), m * 30));
      const me = m === 0 ? new Date() : endOfMonth(ms);
      const days = eachDayOfInterval({ start: ms, end: me });
      trend.push({ month: format(ms, "MMM"), score: computeWellness(days) });
    }
    setWellnessTrend(trend);

    // === Best Week ===
    let bestScore = 0;
    let bestRange = "";
    for (let i = 0; i <= 83; i++) {
      const ws = subDays(new Date(), 90 - i);
      const days = eachDayOfInterval({ start: ws, end: addDays90(ws, 6) });
      const score = computeWellness(days);
      if (score > bestScore) {
        bestScore = score;
        bestRange = `${format(ws, "MMM d")} – ${format(addDays90(ws, 6), "MMM d")}`;
      }
    }
    setBestWeek(bestScore > 0 ? { range: bestRange, score: bestScore } : null);

    // === Monthly Summary ===
    const mSleep = sleepLogs.filter(l => l.logged_date >= monthStart && l.logged_date <= monthEnd);
    const mCal = nutritionLogs.filter(l => l.logged_date >= monthStart && l.logged_date <= monthEnd);
    const mWork = workoutLogs.filter(l => l.logged_date >= monthStart && l.logged_date <= monthEnd);
    const mWater = waterLogs.filter(l => l.logged_date >= monthStart && l.logged_date <= monthEnd);
    const mMood = moodLogs.filter(l => l.logged_date >= monthStart && l.logged_date <= monthEnd);
    const mDays = monthDays.length;

    setSummary({
      wellness: currentWellness,
      avgSleep: mSleep.length > 0 ? +(mSleep.reduce((s, l) => s + Number(l.duration_hours || 0), 0) / mSleep.length).toFixed(1) : 0,
      avgCal: mCal.length > 0 ? Math.round(mCal.reduce((s, l) => s + Number(l.total_calories), 0) / mCal.length) : 0,
      workouts: new Set(mWork.map(w => w.logged_date)).size,
      waterDays: mWater.filter(w => Number(w.daily_total) >= t.water).length,
      totalDays: mDays,
      avgMood: mMood.length > 0 ? +(mMood.reduce((s, l) => s + Number(l.mood || 0), 0) / mMood.length).toFixed(1) : 0,
    });

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const downloadSummary = async () => {
    if (!summaryRef.current) return;
    const canvas = await html2canvas(summaryRef.current, { backgroundColor: null, scale: 2 });
    const link = document.createElement("a");
    link.download = `healthquest-${format(new Date(), "MMMM-yyyy").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Gauge arc
  const gaugeAngle = (wellnessScore / 100) * 180;

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-foreground flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-highlight" /> Progress & Insights
        </h1>
        <p className="text-muted-foreground">Cross-module correlations from the last 90 days</p>
      </div>

      {/* Wellness Score */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border bg-card flex flex-col items-center justify-center">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading text-center">Monthly Wellness Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative w-48 h-28 mb-2">
              <svg viewBox="0 0 200 110" className="w-full h-full">
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" strokeLinecap="round" />
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${(gaugeAngle / 180) * 251.2} 251.2`}
                />
              </svg>
              <div className="absolute inset-0 flex items-end justify-center pb-1">
                <span className="text-4xl font-bold text-foreground">{wellnessScore}</span>
                <span className="text-lg text-muted-foreground ml-1">/100</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">Sleep 25% · Nutrition 25% · Workouts 20% · Water 15% · Mood 15%</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Wellness Trend (3 months)</CardTitle>
          </CardHeader>
          <CardContent>
            {wellnessTrend.every(w => w.score === 0) ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Not enough data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={wellnessTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Best Week */}
      {bestWeek && (
        <Card className="border-border bg-card">
          <CardContent className="py-5 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-500 shrink-0" />
            <div>
              <p className="font-heading font-bold text-foreground">Your best week was {bestWeek.range}</p>
              <p className="text-sm text-muted-foreground">with a wellness score of {bestWeek.score}/100</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Correlation Cards */}
      <h2 className="text-lg font-heading font-bold text-foreground">Cross-Module Correlations</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card 1: Sleep vs Mood */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Sleep vs Next-Day Mood</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{sleepMoodInsight}</p>
            {sleepMoodData.some(d => d.mood > 0) && (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={sleepMoodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis domain={[0, 5]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="mood" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Workouts vs Sleep */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Workouts vs Sleep</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{workoutSleepInsight}</p>
            {workoutSleepData.some(d => d.sleep > 0) && (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={workoutSleepData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="sleep" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Water vs Energy/Mood */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Water vs Mood</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{waterMoodInsight}</p>
            {waterMoodScatter.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="water" name="Water (ml)" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis dataKey="mood" name="Mood" domain={[0, 5]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Scatter data={waterMoodScatter} fill="hsl(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Protein vs Workout Volume */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Protein vs Workout Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{proteinVolumeInsight}</p>
            {proteinVolumeData.some(d => d.volume > 0) && (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={proteinVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Line type="monotone" dataKey="volume" stroke="hsl(var(--highlight))" strokeWidth={2} dot={{ fill: "hsl(var(--highlight))" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      <Card className="border-border bg-card" ref={summaryRef}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {format(new Date(), "MMMM yyyy")} Summary
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-2" onClick={downloadSummary}>
              <Download className="h-4 w-4" /> Download PNG
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Wellness Score", value: `${summary.wellness}/100` },
              { label: "Avg Sleep", value: `${summary.avgSleep}h` },
              { label: "Avg Calories", value: `${summary.avgCal} kcal` },
              { label: "Workouts", value: `${summary.workouts} sessions` },
              { label: "Water Goal Met", value: `${summary.waterDays}/${summary.totalDays} days` },
              { label: "Avg Mood", value: `${summary.avgMood}/5` },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-3 rounded-lg border border-border">
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function addDays90(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
