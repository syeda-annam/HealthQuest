import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Dumbbell, Plus, Trash2, Save, FolderOpen, Clock, Heart, Route, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subWeeks, addMonths, subMonths } from "date-fns";
import { updateGoalsForModule } from "@/hooks/useGoalProgress";
import { recordLog } from "@/hooks/useBadges";
import { StreakBanner } from "@/components/StreakBanner";
import { awardXP } from "@/hooks/useXP";
import { useProfile } from "@/contexts/ProfileContext";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

const WORKOUT_TYPES = ["Strength", "Cardio", "HIIT", "Yoga", "Sports", "Custom"];
const MUSCLE_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];

interface SetData {
  reps: number;
  weight: number;
}

interface Exercise {
  name: string;
  sets: SetData[];
  muscle_group?: string;
}

interface WorkoutLog {
  id: string;
  logged_date: string;
  type: string;
  exercises: Exercise[];
  total_volume: number;
  duration: number | null;
  notes: string | null;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: Exercise[];
}

export default function Workouts() {
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [workoutType, setWorkoutType] = useState("Strength");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseName, setExerciseName] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [notes, setNotes] = useState("");
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLog[]>([]);

  // Chart data
  const [heatmapData, setHeatmapData] = useState<{ date: Date; logged: boolean }[]>([]);
  const [heatmapMonth, setHeatmapMonth] = useState<Date>(new Date());
  const [radarData, setRadarData] = useState<{ muscle: string; volume: number }[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(heatmapMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(heatmapMonth), "yyyy-MM-dd");
    const fourWeeksAgo = format(subWeeks(new Date(), 4), "yyyy-MM-dd");

    const [profileRes, templateRes, logsMonthRes, allLogsRes] = await Promise.all([
      supabase.from("profiles").select("units").eq("id", user.id).single(),
      supabase.from("workout_templates").select("*").eq("user_id", user.id),
      supabase.from("workout_logs").select("logged_date").eq("user_id", user.id).gte("logged_date", monthStart).lte("logged_date", monthEnd),
      supabase.from("workout_logs").select("*").eq("user_id", user.id).order("logged_date", { ascending: false }),
    ]);

    setUnits(profileRes.data?.units === "imperial" ? "imperial" : "metric");
    setTemplates((templateRes.data as unknown as WorkoutTemplate[]) || []);

    // All logs for history
    const allLogs = (allLogsRes.data || []) as unknown as WorkoutLog[];
    setWorkoutHistory(allLogs);

    // Build heatmap
    const monthDays = eachDayOfInterval({ start: startOfMonth(heatmapMonth), end: endOfMonth(heatmapMonth) });
    const loggedDates = (logsMonthRes.data || []).map((l) => l.logged_date);
    setHeatmapData(monthDays.map((d) => ({ date: d, logged: loggedDates.includes(format(d, "yyyy-MM-dd")) })));

    // Compute radar volumes from recent logs
    const fourWeeksAgoLogs = allLogs.filter(l => l.logged_date >= fourWeeksAgo);
    const muscleVolumes: Record<string, number> = {};
    MUSCLE_GROUPS.forEach((m) => (muscleVolumes[m] = 0));

    fourWeeksAgoLogs.forEach((log) => {
      const exercisesArr = Array.isArray(log.exercises) ? log.exercises : [];
      exercisesArr.forEach((ex: Exercise) => {
        if (ex.muscle_group && MUSCLE_GROUPS.includes(ex.muscle_group)) {
          const vol = (ex.sets || []).reduce((sum, s) => sum + (s.reps || 0) * (s.weight || 0), 0);
          muscleVolumes[ex.muscle_group] += vol;
        }
      });
    });

    setRadarData(MUSCLE_GROUPS.map((m) => ({ muscle: m, volume: muscleVolumes[m] })));
    setLoading(false);
  }, [user, heatmapMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addExercise = () => {
    if (!exerciseName.trim()) return;
    setExercises([...exercises, { name: exerciseName.trim(), sets: [{ reps: 10, weight: 0 }], muscle_group: selectedMuscle || undefined }]);
    setExerciseName("");
    setSelectedMuscle("");
  };

  const removeExercise = (idx: number) => setExercises(exercises.filter((_, i) => i !== idx));

  const addSet = (exIdx: number) => {
    const updated = [...exercises];
    const lastSet = updated[exIdx].sets[updated[exIdx].sets.length - 1] || { reps: 10, weight: 0 };
    updated[exIdx].sets.push({ ...lastSet });
    setExercises(updated);
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    const updated = [...exercises];
    updated[exIdx].sets = updated[exIdx].sets.filter((_, i) => i !== setIdx);
    setExercises(updated);
  };

  const updateSet = (exIdx: number, setIdx: number, field: "reps" | "weight", value: number) => {
    const updated = [...exercises];
    updated[exIdx].sets[setIdx][field] = value;
    setExercises(updated);
  };

  const exerciseVolume = (ex: Exercise) => ex.sets.reduce((sum, s) => sum + s.reps * s.weight, 0);
  const totalVolume = exercises.reduce((sum, ex) => sum + exerciseVolume(ex), 0);

  const logWorkout = async () => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");

    let logExercises: Exercise[] = exercises;
    if (workoutType === "Cardio") {
      logExercises = [{ name: "Cardio Session", sets: [], muscle_group: undefined }];
    }

    const { error } = await supabase.from("workout_logs").insert([{
      user_id: user.id,
      logged_date: today,
      type: workoutType,
      exercises: JSON.parse(JSON.stringify(logExercises)) as Json,
      total_volume: workoutType === "Strength" ? totalVolume : 0,
      duration: duration ? parseInt(duration) : null,
      notes: notes || null,
    }]);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Workout logged!" });
      updateGoalsForModule(user.id, "Workout");
      awardXP(user.id, [{ action: "Logged workout", xp: 15 }], (window as any).__healthquest_level_up).then(() => refreshProfile());
      recordLog(user.id, "workout");
      setExercises([]);
      setDuration("");
      setDistance("");
      setHeartRate("");
      setNotes("");
      fetchData();
    }
  };

  const saveTemplate = async () => {
    if (!user || !templateName.trim() || exercises.length === 0) return;
    const { error } = await supabase.from("workout_templates").insert([{
      user_id: user.id,
      name: templateName.trim(),
      exercises: JSON.parse(JSON.stringify(exercises)) as Json,
    }]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template saved!" });
      setTemplateModalOpen(false);
      setTemplateName("");
      fetchData();
    }
  };

  const deleteWorkout = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("workout_logs").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Workout deleted" });
      fetchData();
    }
  };

  const loadTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setExercises(tpl.exercises.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) })));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <StreakBanner module="workout" refreshKey={workoutHistory.length} />
      <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-extrabold flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-secondary" /> Workout Tracker
        </h1>
        {workoutHistory.some(w => w.logged_date === format(new Date(), "yyyy-MM-dd")) && <span className="text-sm text-primary font-medium">✓ Logged today</span>}
      </div>

      {/* Log Form */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Log Workout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Workout Type</label>
              <Select value={workoutType} onValueChange={setWorkoutType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {templates.length > 0 && (
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Load Template</label>
                <Select onValueChange={loadTemplate}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {workoutType === "Strength" && (
            <>
              <div className="flex flex-wrap gap-2 items-end">
                <Input placeholder="Exercise name" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} className="w-48" />
                <Select value={selectedMuscle} onValueChange={setSelectedMuscle}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Muscle group" />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addExercise} size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> Add Exercise
                </Button>
              </div>

              {exercises.map((ex, exIdx) => (
                <div key={exIdx} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{ex.name} {ex.muscle_group && <span className="text-xs text-muted-foreground">({ex.muscle_group})</span>}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Vol: {exerciseVolume(ex).toLocaleString()}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeExercise(exIdx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Set</TableHead>
                        <TableHead>Reps</TableHead>
                        <TableHead>Weight ({units === "metric" ? "kg" : "lbs"})</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ex.sets.map((set, setIdx) => (
                        <TableRow key={setIdx}>
                          <TableCell>{setIdx + 1}</TableCell>
                          <TableCell>
                            <Input type="number" value={set.reps} onChange={(e) => updateSet(exIdx, setIdx, "reps", parseInt(e.target.value) || 0)} className="w-20" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" value={set.weight} onChange={(e) => updateSet(exIdx, setIdx, "weight", parseFloat(e.target.value) || 0)} className="w-24" />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => removeSet(exIdx, setIdx)} disabled={ex.sets.length === 1}>
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button variant="outline" size="sm" onClick={() => addSet(exIdx)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Set
                  </Button>
                </div>
              ))}

              {exercises.length > 0 && (
                <div className="text-right font-medium">Total Session Volume: {totalVolume.toLocaleString()}</div>
              )}
            </>
          )}

          {workoutType === "Cardio" && (
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4" /> Duration (min)</label>
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-28" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground flex items-center gap-1"><Route className="h-4 w-4" /> Distance ({units === "metric" ? "km" : "mi"})</label>
                <Input type="number" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} className="w-28" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground flex items-center gap-1"><Heart className="h-4 w-4" /> Avg HR (opt)</label>
                <Input type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} className="w-28" />
              </div>
            </div>
          )}

          {!["Strength", "Cardio"].includes(workoutType) && (
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Duration (min)</label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-28" />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Notes (optional)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={logWorkout} disabled={workoutType === "Strength" && exercises.length === 0}>
              <Save className="h-4 w-4 mr-2" /> Log Workout
            </Button>
            {workoutType === "Strength" && exercises.length > 0 && (
              <Button variant="outline" onClick={() => setTemplateModalOpen(true)}>
                <FolderOpen className="h-4 w-4 mr-2" /> Save as Template
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workout History */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Workout History</CardTitle>
        </CardHeader>
        <CardContent>
          {workoutHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Nothing logged yet today. Even a short walk counts. Want me to suggest something light?</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {workoutHistory.slice(0, 20).map((log) => {
                const logExercises = Array.isArray(log.exercises) ? log.exercises : [];
                return (
                  <div key={log.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{log.type}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(log.logged_date + "T00:00:00"), "MMM d, yyyy")}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {logExercises.length > 0 && logExercises.map(e => e.name).join(", ")}
                        {log.total_volume > 0 && ` · Vol: ${log.total_volume.toLocaleString()}`}
                        {log.duration && ` · ${log.duration} min`}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteWorkout(log.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Heatmap */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Monthly Consistency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-center text-xs text-muted-foreground font-medium">{d}</div>
              ))}
              {/* Padding for first day */}
              {Array.from({ length: startOfMonth(new Date()).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {heatmapData.map((day, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-sm ${day.logged ? "bg-primary" : "bg-muted"}`}
                  title={format(day.date, "MMM d")}
                />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-muted" /> No workout</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-primary" /> Workout logged</div>
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Muscle Balance (4 weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            {radarData.every((d) => d.volume === 0) ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Log strength workouts with muscle groups to see your balance.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="muscle" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <PolarRadiusAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <Radar dataKey="volume" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PR Progression */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-heading">PR Progression</CardTitle>
        </CardHeader>
        <CardContent>
          {allExerciseNames.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Log strength exercises to track your personal records over time.
            </div>
          ) : (
            <>
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger className="w-64 mb-4">
                  <SelectValue placeholder="Select exercise" />
                </SelectTrigger>
                <SelectContent>
                  {allExerciseNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {prData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {selectedExercise ? "No data for this exercise yet." : "Select an exercise to see PR progression."}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={prData}>
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Line type="monotone" dataKey="maxWeight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Template Modal */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Template Name</label>
            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Push Day" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
            <Button onClick={saveTemplate} disabled={!templateName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
