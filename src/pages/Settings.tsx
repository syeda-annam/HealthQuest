import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, RefreshCw, Trash2, KeyRound } from "lucide-react";
import { calculateTargets } from "@/lib/targets";

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary" },
  { value: "lightly_active", label: "Lightly Active" },
  { value: "moderately_active", label: "Moderately Active" },
  { value: "very_active", label: "Very Active" },
  { value: "athlete", label: "Athlete" },
];

const GOALS = [
  { value: "maintain", label: "Maintain Weight" },
  { value: "lose_weight", label: "Lose Weight" },
  { value: "build_muscle", label: "Build Muscle" },
];

interface Profile {
  name: string;
  weight: number;
  height: number;
  activity_level: string;
  goal: string;
  units: string;
  date_of_birth: string;
  biological_sex: string;
  module_mood: boolean;
  module_cycle: boolean;
}

interface Targets {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  water: number;
  sleep: number;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<Profile>({
    name: "", weight: 0, height: 0, activity_level: "moderately_active",
    goal: "maintain", units: "metric", date_of_birth: "", biological_sex: "female",
    module_mood: false, module_cycle: false,
  });

  const [targets, setTargets] = useState<Targets>({
    calories: 2000, protein: 120, fat: 65, carbs: 250, water: 2500, sleep: 7.5,
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [profileRes, targetRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("targets").select("*").eq("user_id", user.id).single(),
      ]);

      if (profileRes.data) {
        setProfile({
          name: profileRes.data.name || "",
          weight: Number(profileRes.data.weight) || 0,
          height: Number(profileRes.data.height) || 0,
          activity_level: profileRes.data.activity_level || "moderately_active",
          goal: profileRes.data.goal || "maintain",
          units: profileRes.data.units || "metric",
          date_of_birth: profileRes.data.date_of_birth || "",
          biological_sex: profileRes.data.biological_sex || "female",
          module_mood: profileRes.data.module_mood || false,
          module_cycle: profileRes.data.module_cycle || false,
        });
      }

      if (targetRes.data) {
        setTargets({
          calories: Number(targetRes.data.calories) || 2000,
          protein: Number(targetRes.data.protein) || 120,
          fat: Number(targetRes.data.fat) || 65,
          carbs: Number(targetRes.data.carbs) || 250,
          water: Number(targetRes.data.water) || 2500,
          sleep: Number(targetRes.data.sleep) || 7.5,
        });
      }
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        name: profile.name,
        weight: profile.weight,
        height: profile.height,
        activity_level: profile.activity_level,
        goal: profile.goal,
        units: profile.units,
      }).eq("id", user.id);

      if (error) throw error;
      toast({ title: "Profile updated ✓" });
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    }
    setSaving(false);
  };

  const recalculateTargets = async () => {
    if (!user || !profile.date_of_birth || !profile.biological_sex) {
      toast({ title: "Missing profile data for calculation.", variant: "destructive" });
      return;
    }
    try {
      const calculated = calculateTargets({
        date_of_birth: profile.date_of_birth,
        biological_sex: profile.biological_sex,
        height: profile.height,
        weight: profile.weight,
        units: profile.units,
        activity_level: profile.activity_level,
        goal: profile.goal,
      });

      const { error } = await supabase.from("targets").update(calculated).eq("user_id", user.id);
      if (error) throw error;

      setTargets(calculated);
      toast({ title: "Targets recalculated ✓" });
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  const saveTargets = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("targets").update(targets).eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Targets saved ✓" });
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    }
    setSaving(false);
  };

  const { setModuleCycle, setModuleMood } = useProfile();

  const toggleModule = async (module: "module_mood" | "module_cycle", value: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("profiles").update({ [module]: value }).eq("id", user.id);
      if (error) throw error;
      setProfile(prev => ({ ...prev, [module]: value }));
      if (module === "module_mood") setModuleMood(value);
      if (module === "module_cycle") setModuleCycle(value);
      toast({ title: `${module === "module_mood" ? "Mental Health" : "Cycle"} Tracking ${value ? "enabled" : "disabled"} ✓` });
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  const switchUnits = async (newUnits: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("profiles").update({ units: newUnits }).eq("id", user.id);
      if (error) throw error;
      setProfile(prev => ({ ...prev, units: newUnits }));
      toast({ title: `Units switched to ${newUnits} ✓` });
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  const changePassword = async () => {
    setPasswordError("");
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed ✓" });
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      // Delete all user data from each table
      const tables = ["water_logs", "sleep_logs", "mood_logs", "nutrition_logs", "workout_logs", "workout_templates", "cycle_logs", "goals", "chat_messages", "targets"] as const;
      for (const table of tables) {
        await supabase.from(table).delete().eq("user_id", user.id);
      }
      await supabase.from("profiles").delete().eq("id", user.id);
      await signOut();
      navigate("/auth");
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-primary" /> Settings
      </h1>

      {/* Profile Section */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Weight ({profile.units === "metric" ? "kg" : "lbs"})
              </label>
              <Input type="number" value={profile.weight || ""} onChange={e => setProfile(p => ({ ...p, weight: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Height ({profile.units === "metric" ? "cm" : "in"})
              </label>
              <Input type="number" value={profile.height || ""} onChange={e => setProfile(p => ({ ...p, height: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Activity Level</label>
              <Select value={profile.activity_level} onValueChange={v => setProfile(p => ({ ...p, activity_level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVELS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Goal</label>
              <Select value={profile.goal} onValueChange={v => setProfile(p => ({ ...p, goal: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOALS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={saveProfile} disabled={saving}>Save Profile</Button>
            <Button variant="outline" className="gap-2" onClick={recalculateTargets}>
              <RefreshCw className="h-4 w-4" /> Recalculate Targets
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Targets Section */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading">Daily Targets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {([
              { key: "calories", label: "Calories (kcal)" },
              { key: "protein", label: "Protein (g)" },
              { key: "carbs", label: "Carbs (g)" },
              { key: "fat", label: "Fat (g)" },
              { key: "water", label: "Water (ml)" },
              { key: "sleep", label: "Sleep (hours)" },
            ] as const).map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">{label}</label>
                <Input
                  type="number"
                  value={targets[key] || ""}
                  onChange={e => setTargets(t => ({ ...t, [key]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={saveTargets} disabled={saving}>Save Targets</Button>
            <Button variant="outline" className="gap-2" onClick={recalculateTargets}>
              <RefreshCw className="h-4 w-4" /> Reset to Calculated
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modules Section */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading">Modules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Mental Health Tracking</p>
              <p className="text-xs text-muted-foreground">Mood check-ins, stress tracking, journaling</p>
            </div>
            <Switch checked={profile.module_mood} onCheckedChange={v => toggleModule("module_mood", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Cycle Tracking</p>
              <p className="text-xs text-muted-foreground">Period logging, phase predictions, symptoms</p>
            </div>
            <Switch checked={profile.module_cycle} onCheckedChange={v => toggleModule("module_cycle", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Units Section */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading">Units</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={profile.units === "metric" ? "default" : "outline"}
              onClick={() => switchUnits("metric")}
            >
              Metric (kg, cm)
            </Button>
            <Button
              variant={profile.units === "imperial" ? "default" : "outline"}
              onClick={() => switchUnits("imperial")}
            >
              Imperial (lbs, in)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Change Password */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Change Password
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            <Button variant="outline" onClick={changePassword}>Update Password</Button>
          </div>

          {/* Delete Account */}
          <div className="border-t border-border pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" /> Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your data including logs, goals, and settings. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
