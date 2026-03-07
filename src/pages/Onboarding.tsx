import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { calculateTargets } from "@/lib/targets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Activity, ArrowLeft, ArrowRight, Check } from "lucide-react";

const STEPS = ["Personal Info", "Activity & Goals", "Modules", "Your Targets"];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("prefer_not_to_say");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [units, setUnits] = useState("metric");

  // Step 2
  const [activityLevel, setActivityLevel] = useState("moderately_active");
  const [goal, setGoal] = useState("general_wellness");

  // Step 3
  const [moduleCycle, setModuleCycle] = useState(false);
  const [moduleMood, setModuleMood] = useState(false);

  // Step 4
  const [targets, setTargets] = useState({
    calories: 0, protein: 0, fat: 0, carbs: 0, water: 0, sleep: 7.5,
  });

  useEffect(() => {
    if (step === 3 && dob && height && weight) {
      const calc = calculateTargets({
        date_of_birth: dob,
        biological_sex: sex,
        height: parseFloat(height),
        weight: parseFloat(weight),
        units,
        activity_level: activityLevel,
        goal,
      });
      setTargets(calc);
    }
  }, [step, dob, sex, height, weight, units, activityLevel, goal]);

  const canNext = () => {
    if (step === 0) return name && dob && height && weight;
    return true;
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error: profileError } = await supabase.from("profiles").update({
        name,
        date_of_birth: dob,
        biological_sex: sex,
        height: parseFloat(height),
        weight: parseFloat(weight),
        units,
        activity_level: activityLevel,
        goal,
        module_cycle: moduleCycle,
        module_mood: moduleMood,
        profile_complete: true,
      }).eq("id", user.id);

      if (profileError) throw profileError;

      const { error: targetError } = await supabase.from("targets").upsert({
        user_id: user.id,
        ...targets,
      }, { onConflict: "user_id" });

      // If upsert fails due to no unique constraint on user_id, try insert
      if (targetError) {
        const { error: insertError } = await supabase.from("targets").insert({
          user_id: user.id,
          ...targets,
        });
        if (insertError) throw insertError;
      }

      toast.success("Welcome to HealthQuest!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-lg border-border bg-card">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xl font-heading text-foreground">HealthQuest</span>
          </div>
          <CardTitle className="text-2xl font-heading">{STEPS[step]}</CardTitle>
          {/* Progress */}
          <div className="flex gap-2 mt-4 justify-center">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-12 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Biological Sex</Label>
                <Select value={sex} onValueChange={setSex}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Height ({units === "metric" ? "cm" : "inches"})</Label>
                  <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Weight ({units === "metric" ? "kg" : "lbs"})</Label>
                  <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Units</Label>
                <RadioGroup value={units} onValueChange={setUnits} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="metric" id="metric" />
                    <Label htmlFor="metric">Metric</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="imperial" id="imperial" />
                    <Label htmlFor="imperial">Imperial</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Activity Level</Label>
                <Select value={activityLevel} onValueChange={setActivityLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary</SelectItem>
                    <SelectItem value="lightly_active">Lightly Active</SelectItem>
                    <SelectItem value="moderately_active">Moderately Active</SelectItem>
                    <SelectItem value="very_active">Very Active</SelectItem>
                    <SelectItem value="athlete">Athlete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Primary Goal</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lose_weight">Lose Weight</SelectItem>
                    <SelectItem value="build_muscle">Build Muscle</SelectItem>
                    <SelectItem value="maintain_weight">Maintain Weight</SelectItem>
                    <SelectItem value="improve_sleep">Improve Sleep</SelectItem>
                    <SelectItem value="general_wellness">General Wellness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Menstrual Cycle Tracking</p>
                  <p className="text-sm text-muted-foreground">Track your cycle and symptoms</p>
                </div>
                <Switch checked={moduleCycle} onCheckedChange={setModuleCycle} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Mental Health Tracking</p>
                  <p className="text-sm text-muted-foreground">Log mood and mental wellness</p>
                </div>
                <Switch checked={moduleMood} onCheckedChange={setModuleMood} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">These are your personalized daily targets. Feel free to adjust them.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Calories (kcal)</Label>
                  <Input type="number" value={targets.calories} onChange={(e) => setTargets(t => ({ ...t, calories: +e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Protein (g)</Label>
                  <Input type="number" value={targets.protein} onChange={(e) => setTargets(t => ({ ...t, protein: +e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Fat (g)</Label>
                  <Input type="number" value={targets.fat} onChange={(e) => setTargets(t => ({ ...t, fat: +e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Carbs (g)</Label>
                  <Input type="number" value={targets.carbs} onChange={(e) => setTargets(t => ({ ...t, carbs: +e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Water (ml)</Label>
                  <Input type="number" value={targets.water} onChange={(e) => setTargets(t => ({ ...t, water: +e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Sleep (hours)</Label>
                  <Input type="number" step="0.5" value={targets.sleep} onChange={(e) => setTargets(t => ({ ...t, sleep: +e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={loading}>
                <Check className="mr-2 h-4 w-4" /> {loading ? "Saving..." : "Finish"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
