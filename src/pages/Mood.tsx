import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Smile, Settings } from "lucide-react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { updateGoalsForModule } from "@/hooks/useGoalProgress";
import { awardXP } from "@/hooks/useXP";
import { useProfile } from "@/contexts/ProfileContext";
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

const MOOD_EMOJIS = [
  { value: 1, emoji: "😞", label: "Very Low" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
];

const MOOD_TAGS = ["work", "relationships", "sleep", "exercise", "diet", "other"];

function stressColor(stress: number): string {
  // light teal (low) to dark navy (high)
  const lightness = 80 - (stress - 1) * 6; // 80% down to ~26%
  const hue = stress <= 5 ? 174 : 220; // teal for low, navy for high
  const sat = 40 + stress * 5;
  return `hsl(${hue}, ${sat}%, ${lightness}%)`;
}

export default function Mood() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);

  // Form
  const [mood, setMood] = useState(0);
  const [stress, setStress] = useState(5);
  const [journal, setJournal] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [todayLogged, setTodayLogged] = useState(false);

  // Chart data
  const [moodTrend, setMoodTrend] = useState<{ day: string; mood: number }[]>([]);
  const [stressHeatmap, setStressHeatmap] = useState<{ date: string; day: string; stress: number }[]>([]);
  const [sleepMoodScatter, setSleepMoodScatter] = useState<{ sleep: number; mood: number }[]>([]);
  const [tagFrequency, setTagFrequency] = useState<{ tag: string; count: number }[]>([]);

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Check module_mood
    const { data: profile } = await supabase
      .from("profiles").select("module_mood").eq("id", user.id).single();

    if (!profile?.module_mood) {
      setModuleEnabled(false);
      setLoading(false);
      return;
    }
    setModuleEnabled(true);

    const thirtyAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");

    const [logsRes, todayRes, sleepRes] = await Promise.all([
      supabase.from("mood_logs").select("*").eq("user_id", user.id)
        .gte("logged_date", thirtyAgo).order("logged_date", { ascending: true }),
      supabase.from("mood_logs").select("id").eq("user_id", user.id).eq("logged_date", today).single(),
      supabase.from("sleep_logs").select("logged_date, duration_hours").eq("user_id", user.id)
        .gte("logged_date", thirtyAgo),
    ]);

    setTodayLogged(!!todayRes.data);
    const logs = logsRes.data || [];

    // Mood trend
    const trend = logs
      .filter((l: any) => l.mood)
      .map((l: any) => ({ day: format(new Date(l.logged_date + "T00:00:00"), "MM/dd"), mood: Number(l.mood) }));
    setMoodTrend(trend);

    // Stress heatmap (last 30 days)
    const logMap = new Map(logs.map((l: any) => [l.logged_date, Number(l.stress || 0)]));
    const days30 = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    const heatmap = days30.map((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      return { date: dateStr, day: format(d, "MM/dd"), stress: logMap.get(dateStr) || 0 };
    });
    setStressHeatmap(heatmap);

    // Sleep vs mood scatter
    const sleepMap = new Map((sleepRes.data || []).map((s: any) => [s.logged_date, Number(s.duration_hours)]));
    const scatter = logs
      .filter((l: any) => l.mood && sleepMap.has(l.logged_date))
      .map((l: any) => ({ sleep: sleepMap.get(l.logged_date)!, mood: Number(l.mood) }));
    setSleepMoodScatter(scatter);

    // Tag frequency (all time from these logs)
    const tagCounts: Record<string, number> = {};
    logs.forEach((l: any) => {
      const tags = l.tags as string[] | null;
      if (tags) tags.forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    });
    setTagFrequency(Object.entries(tagCounts).map(([tag, count]) => ({ tag, count })));

    setLoading(false);
  }, [user, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const logMood = async () => {
    if (!user || mood === 0) {
      toast({ title: "Please select a mood", variant: "destructive" });
      return;
    }

    const journalTrimmed = journal.slice(0, 500);

    const { error } = await supabase.from("mood_logs").upsert({
      user_id: user.id,
      logged_date: today,
      mood,
      stress,
      journal: journalTrimmed || null,
      tags: selectedTags,
    }, { onConflict: "user_id,logged_date" });

    if (error) {
      toast({ title: "Error logging mood", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mood logged ✨" });
      if (user) updateGoalsForModule(user.id, "Mood");
      setMood(0);
      setStress(5);
      setJournal("");
      setSelectedTags([]);
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
      </div>
    );
  }

  if (moduleEnabled === false) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border-border bg-card max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <Smile className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <h2 className="text-xl font-heading font-bold text-foreground">
              Mental Health Tracking is turned off.
            </h2>
            <p className="text-sm text-muted-foreground">
              Enable it in your settings to start tracking your mood and stress levels.
            </p>
            <Button onClick={() => navigate("/settings")} className="gap-2">
              <Settings className="h-4 w-4" /> Enable in Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    color: "hsl(var(--foreground))",
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground flex items-center gap-2">
        <Smile className="h-7 w-7 text-primary" />
        Mental Health
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Log Form */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading">
              {todayLogged ? "Update Today's Check-in" : "How are you feeling?"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Mood Emojis */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Mood</label>
              <div className="flex justify-between gap-1">
                {MOOD_EMOJIS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMood(m.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                      mood === m.value
                        ? "bg-primary/15 scale-110 ring-2 ring-primary"
                        : "hover:bg-muted/50"
                    }`}
                    aria-label={m.label}
                  >
                    <span className="text-3xl">{m.emoji}</span>
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stress Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">Stress Level</label>
                <span className="text-sm font-bold text-primary">{stress}/10</span>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[stress]}
                onValueChange={([v]) => setStress(v)}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            {/* Journal */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">Journal</label>
                <span className="text-xs text-muted-foreground">{journal.length}/500</span>
              </div>
              <Textarea
                placeholder="What's on your mind?"
                value={journal}
                onChange={(e) => setJournal(e.target.value.slice(0, 500))}
                rows={3}
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tags</label>
              <div className="flex flex-wrap gap-2">
                {MOOD_TAGS.map((tag) => (
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

            <Button onClick={logMood} className="w-full gap-2">
              <Smile className="h-4 w-4" />
              {todayLogged ? "Update Check-in" : "Log Check-in"}
            </Button>
          </CardContent>
        </Card>

        {/* Empty state or info */}
        <div className="flex flex-col gap-6">
          {moodTrend.length === 0 && (
            <Card className="border-border bg-card">
              <CardContent className="py-8 text-center">
                <Smile className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No mood data yet. Log your first check-in to start seeing trends! 🧠
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stress Heatmap */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-heading">Stress Heatmap (30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-10 gap-1">
                {stressHeatmap.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.day}: Stress ${d.stress || "N/A"}`}
                    className="aspect-square rounded-sm transition-colors"
                    style={{
                      backgroundColor: d.stress > 0 ? stressColor(d.stress) : "hsl(var(--muted))",
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>Low stress</span>
                <span>High stress</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mood Trend */}
      {moodTrend.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading">Mood Trend (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moodTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis domain={[0, 5]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}/5`, "Mood"]} />
                  <Line type="monotone" dataKey="mood" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sleep vs Mood Scatter */}
      {sleepMoodScatter.length > 1 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading">Sleep vs Mood</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="sleep" name="Sleep" unit="h" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="mood" name="Mood" domain={[0, 5]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [name === "sleep" ? `${v}h` : `${v}/5`, name === "sleep" ? "Sleep" : "Mood"]} />
                  <Scatter data={sleepMoodScatter} fill="hsl(var(--primary))">
                    {sleepMoodScatter.map((_, i) => (
                      <Cell key={i} fill="hsl(var(--primary))" />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tag Frequency */}
      {tagFrequency.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading">Tag Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tagFrequency} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="tag" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}×`, "Occurrences"]} />
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
