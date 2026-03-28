import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { awardXP } from "@/hooks/useXP";
import { useProfile } from "@/contexts/ProfileContext";
import { Heart, Settings, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths,
  addDays, differenceInDays, isSameDay,
} from "date-fns";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip,
} from "recharts";

const SYMPTOMS = ["cramps", "bloating", "headache", "fatigue", "mood swings", "spotting", "cravings"];
const FLOW_OPTIONS = ["light", "medium", "heavy"];

interface CycleLog {
  id: string;
  user_id: string;
  logged_date: string;
  is_period_day: boolean;
  flow: string | null;
  symptoms: string[];
  bbt: number | null;
}

export default function Cycle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { refreshProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [moduleEnabled, setModuleEnabled] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [logs, setLogs] = useState<CycleLog[]>([]);
  const [allLogs, setAllLogs] = useState<CycleLog[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isPeriodDay, setIsPeriodDay] = useState(false);
  const [flow, setFlow] = useState("medium");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [bbt, setBbt] = useState("");

  // Computed
  const [avgCycleLength, setAvgCycleLength] = useState(28);
  const [currentCycleDay, setCurrentCycleDay] = useState<number | null>(null);
  const [nextPeriodDate, setNextPeriodDate] = useState<Date | null>(null);
  const [cycleLengthHistory, setCycleLengthHistory] = useState<{ cycle: number; length: number }[]>([]);
  const [symptomFrequency, setSymptomFrequency] = useState<{ symptom: string; count: number }[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [profileRes, allLogsRes] = await Promise.all([
      supabase.from("profiles").select("module_cycle").eq("id", user.id).single(),
      supabase.from("cycle_logs").select("*").eq("user_id", user.id).order("logged_date", { ascending: true }),
    ]);

    const enabled = profileRes.data?.module_cycle || false;
    setModuleEnabled(enabled);
    if (!enabled) { setLoading(false); return; }

    const all = (allLogsRes.data as unknown as CycleLog[]) || [];
    setAllLogs(all);

    // Filter for current month view
    const mStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const mEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    setLogs(all.filter(l => l.logged_date >= mStart && l.logged_date <= mEnd));

    // Calculate cycles from period start days
    const periodDays = all.filter(l => l.is_period_day).map(l => new Date(l.logged_date + "T00:00:00"));
    periodDays.sort((a, b) => a.getTime() - b.getTime());

    // Find cycle starts (first period day after a gap)
    const cycleStarts: Date[] = [];
    for (let i = 0; i < periodDays.length; i++) {
      if (i === 0 || differenceInDays(periodDays[i], periodDays[i - 1]) > 5) {
        cycleStarts.push(periodDays[i]);
      }
    }

    // Cycle lengths
    const lengths: number[] = [];
    for (let i = 1; i < cycleStarts.length; i++) {
      lengths.push(differenceInDays(cycleStarts[i], cycleStarts[i - 1]));
    }
    setCycleLengthHistory(lengths.map((l, i) => ({ cycle: i + 1, length: l })));

    const avg = lengths.length >= 2 ? Math.round(lengths.reduce((s, l) => s + l, 0) / lengths.length) : 28;
    setAvgCycleLength(avg);

    // Current cycle day & next period
    if (cycleStarts.length > 0) {
      const lastStart = cycleStarts[cycleStarts.length - 1];
      const dayInCycle = differenceInDays(new Date(), lastStart) + 1;
      setCurrentCycleDay(dayInCycle > 0 ? dayInCycle : null);
      setNextPeriodDate(addDays(lastStart, avg));
    } else {
      setCurrentCycleDay(null);
      setNextPeriodDate(null);
    }

    // Symptom frequency
    const symCounts: Record<string, number> = {};
    SYMPTOMS.forEach(s => (symCounts[s] = 0));
    all.forEach(l => (l.symptoms || []).forEach(s => { if (symCounts[s] !== undefined) symCounts[s]++; }));
    setSymptomFrequency(SYMPTOMS.map(s => ({ symptom: s, count: symCounts[s] })));

    setLoading(false);
  }, [user, currentMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDayModal = (date: Date) => {
    setSelectedDate(date);
    const dateStr = format(date, "yyyy-MM-dd");
    const existing = allLogs.find(l => l.logged_date === dateStr);
    if (existing) {
      setIsPeriodDay(existing.is_period_day);
      setFlow(existing.flow || "medium");
      setSelectedSymptoms(existing.symptoms || []);
      setBbt(existing.bbt ? String(existing.bbt) : "");
    } else {
      setIsPeriodDay(false);
      setFlow("medium");
      setSelectedSymptoms([]);
      setBbt("");
    }
    setModalOpen(true);
  };

  const saveLog = async () => {
    if (!user || !selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const existing = allLogs.find(l => l.logged_date === dateStr);

    const payload = {
      user_id: user.id,
      logged_date: dateStr,
      is_period_day: isPeriodDay,
      flow: isPeriodDay ? flow : null,
      symptoms: selectedSymptoms,
      bbt: bbt ? Number(bbt) : null,
    };

    const { error } = existing
      ? await supabase.from("cycle_logs").update(payload).eq("id", existing.id)
      : await supabase.from("cycle_logs").insert([payload]);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cycle log saved" });
      awardXP(user.id, [{ action: "Logged cycle", xp: 5 }], (window as any).__healthquest_level_up).then(() => refreshProfile());
      setModalOpen(false);
      fetchData();
    }
  };

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  // Phase classification for calendar
  const getPhaseForDate = (date: Date): string | null => {
    const periodDays = allLogs.filter(l => l.is_period_day).map(l => new Date(l.logged_date + "T00:00:00"));
    periodDays.sort((a, b) => a.getTime() - b.getTime());
    const cycleStarts: Date[] = [];
    for (let i = 0; i < periodDays.length; i++) {
      if (i === 0 || differenceInDays(periodDays[i], periodDays[i - 1]) > 5) {
        cycleStarts.push(periodDays[i]);
      }
    }
    if (cycleStarts.length === 0) return null;

    // Check if it's a logged period day
    const dateStr = format(date, "yyyy-MM-dd");
    const log = allLogs.find(l => l.logged_date === dateStr);
    if (log?.is_period_day) return "period";

    // Find which cycle this date belongs to
    const lastStart = cycleStarts[cycleStarts.length - 1];
    const dayInCycle = differenceInDays(date, lastStart) + 1;
    if (dayInCycle < 1) return null;

    // PMS window: last 5 days before predicted next period
    const nextStart = addDays(lastStart, avgCycleLength);
    const daysUntilNext = differenceInDays(nextStart, date);
    if (daysUntilNext >= 0 && daysUntilNext < 5) return "pms";

    // Ovulation day 14
    if (dayInCycle === 14) return "ovulation";

    // Fertile window days 10-14
    if (dayInCycle >= 10 && dayInCycle <= 14) return "fertile";

    // Luteal phase 15+
    if (dayInCycle >= 15) return "luteal";

    return null;
  };

  const getDateBgClass = (date: Date): string => {
    const phase = getPhaseForDate(date);
    switch (phase) {
      case "period": return "bg-red-500/80 text-white";
      case "fertile": return "bg-green-400/30 text-foreground";
      case "ovulation": return "bg-teal-500/60 text-white";
      case "pms": return "bg-amber-400/40 text-foreground";
      default: return "bg-muted/50 text-foreground";
    }
  };

  const hasSymptoms = (date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    const log = allLogs.find(l => l.logged_date === dateStr);
    return (log?.symptoms?.length || 0) > 0;
  };

  const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOffset = startOfMonth(currentMonth).getDay();

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-80 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  if (!moduleEnabled) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card className="border-border bg-card">
          <CardContent className="py-10 text-center space-y-4">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-lg font-heading font-bold text-foreground">Cycle Tracking is turned off.</p>
            <p className="text-sm text-muted-foreground">Enable it in your settings to start tracking.</p>
            <Button onClick={() => navigate("/settings")}>Enable in Settings</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-foreground flex items-center gap-2">
          <Heart className="h-6 w-6 text-secondary" /> Cycle Tracker
        </h1>
        <p className="text-muted-foreground">{format(currentMonth, "MMMM yyyy")}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-3">
        <Card className="border-border bg-card text-center">
          <CardContent className="py-5">
            <p className="text-3xl font-bold text-primary">{avgCycleLength}</p>
            <p className="text-xs text-muted-foreground mt-1">Avg Cycle Length</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card text-center">
          <CardContent className="py-5">
            <p className="text-3xl font-bold text-foreground">{currentCycleDay ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Current Day</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card text-center">
          <CardContent className="py-5">
            <p className="text-lg font-bold text-foreground">{nextPeriodDate ? format(nextPeriodDate, "MMM d") : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Next Period</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`p-${i}`} />)}
            {monthDays.map(day => {
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => openDayModal(day)}
                  className={`relative aspect-square rounded-md text-sm font-medium flex items-center justify-center transition-colors hover:ring-2 hover:ring-primary/40 ${getDateBgClass(day)} ${isToday ? "ring-2 ring-primary" : ""}`}
                >
                  {format(day, "d")}
                  {hasSymptoms(day) && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-foreground/60" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-500/80" /> Period</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-400/30 border border-green-400/50" /> Fertile</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-teal-500/60" /> Ovulation</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-amber-400/40 border border-amber-400/50" /> PMS</div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Cycle Length History</CardTitle>
          </CardHeader>
          <CardContent>
            {cycleLengthHistory.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Log at least 2 complete cycles to see length trends.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={cycleLengthHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="cycle" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} label={{ value: "Cycle #", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Line type="monotone" dataKey="length" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Symptom Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            {symptomFrequency.every(s => s.count === 0) ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Log symptoms to see which are most common.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={symptomFrequency}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="symptom" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} angle={-35} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Day Log Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Log Day"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Period day?</span>
              <Switch checked={isPeriodDay} onCheckedChange={setIsPeriodDay} />
            </div>

            {isPeriodDay && (
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Flow intensity</label>
                <div className="flex gap-2">
                  {FLOW_OPTIONS.map(f => (
                    <Button
                      key={f}
                      variant={flow === f ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFlow(f)}
                      className="capitalize flex-1"
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Symptoms</label>
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map(s => (
                  <Button
                    key={s}
                    variant={selectedSymptoms.includes(s) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSymptom(s)}
                    className="capitalize text-xs"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">BBT (°C/°F, optional)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 36.5"
                value={bbt}
                onChange={(e) => setBbt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={saveLog}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
