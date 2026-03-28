import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Droplets, Pencil, Check, X, Flame } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { awardXP, XPSource } from "@/hooks/useXP";
import { useProfile } from "@/contexts/ProfileContext";
import { updateGoalsForModule } from "@/hooks/useGoalProgress";

interface WaterEntry {
  amount_ml: number;
  logged_at: string;
}

interface WaterLog {
  id: string;
  user_id: string;
  logged_date: string;
  entries: WaterEntry[];
  daily_total: number;
}

export default function Water() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [todayLog, setTodayLog] = useState<WaterLog | null>(null);
  const [weekData, setWeekData] = useState<{ day: string; total: number }[]>([]);
  const [goal, setGoal] = useState(2500);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [streak, setStreak] = useState(0);

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch target
    const { data: targetData } = await supabase
      .from("targets")
      .select("water")
      .eq("user_id", user.id)
      .single();
    if (targetData?.water) setGoal(Number(targetData.water));

    // Fetch today's log
    const { data: todayData } = await supabase
      .from("water_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("logged_date", today)
      .single();
    if (todayData) {
      setTodayLog({
        ...todayData,
        entries: (todayData.entries as unknown as WaterEntry[]) || [],
      } as WaterLog);
    } else {
      setTodayLog(null);
    }

    // Fetch last 30 days for chart + streak
    const thirtyDaysAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");
    const { data: logsData } = await supabase
      .from("water_logs")
      .select("logged_date, daily_total")
      .eq("user_id", user.id)
      .gte("logged_date", thirtyDaysAgo)
      .order("logged_date", { ascending: true });

    // Build week chart data
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
      const log = logsData?.find((l) => l.logged_date === d);
      return {
        day: format(subDays(new Date(), 6 - i), "EEE"),
        total: Number(log?.daily_total || 0),
      };
    });
    setWeekData(last7);

    // Calculate streak
    const waterGoal = targetData?.water ? Number(targetData.water) : 2500;
    let s = 0;
    if (logsData) {
      const logMap = new Map(logsData.map((l) => [l.logged_date, Number(l.daily_total)]));
      for (let i = 0; i < 30; i++) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        const total = logMap.get(d) || 0;
        if (total >= waterGoal) s++;
        else break;
      }
    }
    setStreak(s);

    setLoading(false);
  }, [user, today]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addWater = async (amount: number) => {
    if (!user || amount <= 0) return;

    const newEntry: WaterEntry = {
      amount_ml: amount,
      logged_at: new Date().toISOString(),
    };

    if (todayLog) {
      const updatedEntries = [...(todayLog.entries || []), newEntry];
      const newTotal = Number(todayLog.daily_total) + amount;
      const { error } = await supabase
        .from("water_logs")
        .update({
          entries: updatedEntries as unknown as any,
          daily_total: newTotal,
        })
        .eq("id", todayLog.id);

      if (!error) {
        setTodayLog({ ...todayLog, entries: updatedEntries, daily_total: newTotal });
        toast({ title: `+${amount}ml added 💧` });
        // Award XP
        const sources: XPSource[] = [{ action: "Logged water", xp: 5 }];
        if (newTotal >= goal) sources.push({ action: "Hit water goal", xp: 10 });
        awardXP(user.id, sources, (window as any).__healthquest_level_up).then(() => refreshProfile());
      }
    } else {
      const { data, error } = await supabase
        .from("water_logs")
        .insert({
          user_id: user.id,
          logged_date: today,
          entries: [newEntry] as unknown as any,
          daily_total: amount,
        })
        .select()
        .single();

      if (!error && data) {
        setTodayLog(data as unknown as WaterLog);
        toast({ title: `+${amount}ml added 💧` });
        const sources: XPSource[] = [{ action: "Logged water", xp: 5 }];
        if (amount >= goal) sources.push({ action: "Hit water goal", xp: 10 });
        awardXP(user.id, sources, (window as any).__healthquest_level_up).then(() => refreshProfile());
      }
    }
    if (user) updateGoalsForModule(user.id, "Water");
    fetchData();
  };

  const saveGoal = async () => {
    if (!user) return;
    const val = parseInt(goalInput);
    if (isNaN(val) || val <= 0) return;
    await supabase.from("targets").update({ water: val }).eq("user_id", user.id);
    setGoal(val);
    setEditingGoal(false);
    toast({ title: "Water goal updated" });
    fetchData();
  };

  const totalToday = todayLog ? Number(todayLog.daily_total) : 0;
  const pct = Math.min((totalToday / goal) * 100, 100);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground flex items-center gap-2">
          <Droplets className="h-7 w-7 text-primary" />
          Water Intake
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Goal:
          {editingGoal ? (
            <span className="flex items-center gap-1">
              <Input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="w-24 h-8 text-sm"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveGoal}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingGoal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </span>
          ) : (
            <span className="flex items-center gap-1 font-medium text-foreground">
              {goal}ml
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => {
                  setGoalInput(String(goal));
                  setEditingGoal(true);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Water Fill Visual */}
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="relative w-32 h-64 rounded-2xl border-2 border-primary/30 overflow-hidden bg-muted/30">
              <div
                className="absolute bottom-0 left-0 right-0 bg-primary/20 transition-all duration-700 ease-out"
                style={{ height: `${pct}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-primary/10" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-heading font-bold text-foreground">
                  {Math.round(pct)}%
                </span>
              </div>
            </div>
            <p className="mt-4 text-lg font-heading font-semibold text-foreground">
              {totalToday}ml <span className="text-muted-foreground font-normal text-sm">/ {goal}ml</span>
            </p>

           {totalToday === 0 && (
              <p className="mt-2 text-sm text-muted-foreground text-center">
                Hydration check! You haven't logged any water today. Start with a glass right now. 💧
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Add & Streak */}
        <div className="flex flex-col gap-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-heading">Quick Add</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button onClick={() => addWater(250)} className="flex-1 gap-2">
                  <Droplets className="h-4 w-4" /> 250ml
                </Button>
                <Button onClick={() => addWater(500)} className="flex-1 gap-2">
                  <Droplets className="h-4 w-4" /> 500ml
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Custom ml"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    const v = parseInt(customAmount);
                    if (v > 0) {
                      addWater(v);
                      setCustomAmount("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Streak */}
          <Card className="border-border bg-card">
            <CardContent className="flex items-center justify-center py-8 gap-4">
              <span className="text-5xl">🔥</span>
              <div>
                <p className="text-4xl font-heading font-bold text-foreground">{streak}</p>
                <p className="text-sm text-muted-foreground">day streak</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 7-Day Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading">Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
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
                  formatter={(value: number) => [`${value}ml`, "Water"]}
                />
                <ReferenceLine y={goal} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Goal", fill: "hsl(var(--destructive))", fontSize: 12 }} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Today's Entries */}
      {todayLog && todayLog.entries && todayLog.entries.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading">Today's Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayLog.entries.map((entry, i) => (
                <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-border last:border-0">
                  <span className="text-foreground">{entry.amount_ml}ml</span>
                  <span className="text-muted-foreground">
                    {format(new Date(entry.logged_at), "h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
