import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Target, Plus, Trophy, Ban, Dumbbell, UtensilsCrossed, Moon, Droplets, Smile, Heart, Scale } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import confetti from "canvas-confetti";

const MODULES = [
  { value: "Workout", icon: Dumbbell, color: "hsl(30, 90%, 55%)" },
  { value: "Nutrition", icon: UtensilsCrossed, color: "hsl(168, 100%, 38%)" },
  { value: "Sleep", icon: Moon, color: "hsl(260, 60%, 55%)" },
  { value: "Water", icon: Droplets, color: "hsl(200, 80%, 50%)" },
  { value: "Mood", icon: Smile, color: "hsl(340, 70%, 55%)" },
  { value: "Cycle", icon: Heart, color: "hsl(350, 80%, 60%)" },
  { value: "Weight", icon: Scale, color: "hsl(40, 80%, 50%)" },
];

const GOAL_TYPES = [
  { value: "numeric", label: "Numeric Target", desc: "Reach a specific number (e.g. 70kg body weight)" },
  { value: "streak", label: "Streak Goal", desc: "Maintain consistency over weeks (e.g. 4 workouts/week for 8 weeks)" },
  { value: "habit", label: "Habit Goal", desc: "Hit a daily target for X consecutive days" },
  { value: "milestone", label: "Milestone Goal", desc: "Accumulate a total count (e.g. 50 total workouts)" },
];

interface Goal {
  id: string;
  user_id: string;
  title: string;
  type: string;
  module: string;
  target_value: number;
  current_value: number;
  status: string;
  milestones: Record<string, boolean>;
  start_date: string;
  target_date: string | null;
  created_at: string;
}

export default function Goals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Creation form state
  const [step, setStep] = useState(1);
  const [formModule, setFormModule] = useState("");
  const [formType, setFormType] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formDate, setFormDate] = useState("");

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setGoals((data as unknown as Goal[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const resetForm = () => {
    setStep(1);
    setFormModule("");
    setFormType("");
    setFormTitle("");
    setFormTarget("");
    setFormDate("");
  };

  const createGoal = async () => {
    if (!user || !formTitle.trim() || !formTarget) return;
    const { error } = await supabase.from("goals").insert([{
      user_id: user.id,
      title: formTitle.trim(),
      type: formType,
      module: formModule,
      target_value: Number(formTarget),
      current_value: 0,
      status: "active",
      milestones: { "25": false, "50": false, "75": false, "100": false } as unknown as Json,
      start_date: format(new Date(), "yyyy-MM-dd"),
      target_date: formDate || null,
    }]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Goal created!" });
      setModalOpen(false);
      resetForm();
      fetchGoals();
    }
  };

  const abandonGoal = async (id: string) => {
    const { error } = await supabase.from("goals").update({ status: "abandoned" }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Goal abandoned" });
      fetchGoals();
    }
  };

  const activeGoals = goals.filter(g => g.status === "active");
  const completedGoals = goals.filter(g => g.status === "completed");

  const getModuleConfig = (mod: string) => MODULES.find(m => m.value === mod) || MODULES[0];

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-foreground flex items-center gap-2">
            <Target className="h-6 w-6 text-secondary" /> Goals
          </h1>
          <p className="text-muted-foreground">{activeGoals.length} active goal{activeGoals.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Create Goal
        </Button>
      </div>

      {/* Active Goals */}
      {activeGoals.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No active goals yet. Set your first goal and give your tracking purpose!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activeGoals.map(goal => {
            const modConfig = getModuleConfig(goal.module);
            const Icon = modConfig.icon;
            const pct = goal.target_value > 0 ? Math.min(Math.round((goal.current_value / goal.target_value) * 100), 100) : 0;
            const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null;

            return (
              <Card key={goal.id} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-heading flex items-center gap-2">
                    <Icon className="h-5 w-5" style={{ color: modConfig.color }} />
                    <span className="flex-1 truncate">{goal.title}</span>
                    <span className="text-xs text-muted-foreground font-normal capitalize">{goal.type}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {goal.current_value} / {goal.target_value}
                      </span>
                      <span className="font-medium text-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2.5" />
                  </div>

                  <div className="flex items-center justify-between">
                    {daysLeft !== null && (
                      <span className={`text-xs ${daysLeft < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                      </span>
                    )}
                    {daysLeft === null && <span />}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1">
                          <Ban className="h-3.5 w-3.5" /> Abandon
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Abandon this goal?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will mark "{goal.title}" as abandoned. This action can't be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => abandonGoal(goal.id)}>Abandon</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* Milestone dots */}
                  <div className="flex items-center gap-2 pt-1">
                    {["25", "50", "75", "100"].map(m => (
                      <div key={m} className="flex flex-col items-center gap-0.5">
                        <div className={`w-3 h-3 rounded-full ${goal.milestones?.[m] ? "bg-primary" : "bg-muted"}`} />
                        <span className="text-[9px] text-muted-foreground">{m}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Hall of Fame */}
      {completedGoals.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> Hall of Fame
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedGoals.map(goal => {
              const modConfig = getModuleConfig(goal.module);
              const Icon = modConfig.icon;
              return (
                <div key={goal.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <span className="text-xl">🏆</span>
                  <Icon className="h-4 w-4 shrink-0" style={{ color: modConfig.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{goal.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {goal.target_value} reached · {goal.type}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Create Goal Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Goal — Step {step} of 3</DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Pick a module:</p>
              <div className="grid grid-cols-2 gap-2">
                {MODULES.map(mod => (
                  <Button
                    key={mod.value}
                    variant={formModule === mod.value ? "default" : "outline"}
                    className="justify-start gap-2"
                    onClick={() => setFormModule(mod.value)}
                  >
                    <mod.icon className="h-4 w-4" /> {mod.value}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Pick a goal type:</p>
              {GOAL_TYPES.map(gt => (
                <Button
                  key={gt.value}
                  variant={formType === gt.value ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => setFormType(gt.value)}
                >
                  <div>
                    <p className="font-medium">{gt.label}</p>
                    <p className="text-xs text-muted-foreground font-normal">{gt.desc}</p>
                  </div>
                </Button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Goal title</label>
                <Input placeholder="e.g. Log 50 total workouts" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Target value</label>
                <Input type="number" placeholder="e.g. 50" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Target date (optional)</label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={(step === 1 && !formModule) || (step === 2 && !formType)}
              >
                Next
              </Button>
            ) : (
              <Button onClick={createGoal} disabled={!formTitle.trim() || !formTarget}>
                Create Goal
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
