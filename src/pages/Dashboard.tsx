import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ProgressRing } from "@/components/ProgressRing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets, Moon, Smile, Lightbulb, Target } from "lucide-react";
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
  const [name, setName] = useState("");
  const [targets, setTargets] = useState<Targets | null>(null);

  useEffect(() => {
    if (!user) return;

    supabase.from("profiles").select("name").eq("id", user.id).single()
      .then(({ data }) => setName(data?.name || ""));

    supabase.from("targets").select("*").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) setTargets({
          calories: data.calories || 2000,
          protein: data.protein || 120,
          fat: data.fat || 65,
          carbs: data.carbs || 250,
          water: data.water || 2500,
          sleep: data.sleep || 7.5,
        });
      });
  }, [user]);

  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
          Hello, {name || "there"} 👋
        </h1>
        <p className="text-muted-foreground">{today}</p>
      </div>

      {/* Progress Rings */}
      <Card className="border-border bg-card">
        <CardContent className="flex flex-wrap justify-around gap-4 py-6">
          <ProgressRing value={0} max={targets?.calories || 2000} label="Calories" unit="kcal" />
          <ProgressRing value={0} max={targets?.water || 2500} label="Water" unit="ml" color="hsl(200, 80%, 50%)" />
          <ProgressRing value={0} max={targets?.sleep || 7.5} label="Sleep" unit="hrs" color="hsl(260, 60%, 55%)" />
          <ProgressRing value={0} max={1} label="Workout" unit="" color="hsl(30, 90%, 55%)" />
          <ProgressRing value={0} max={10} label="Mood" unit="/10" color="hsl(340, 70%, 55%)" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Active Goals */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">No goal set yet</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary/30" style={{ width: "0%" }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Insight */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                AI-powered insights will appear here once you start logging your daily activities.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Log */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading">Quick Log</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2">
            <Droplets className="h-4 w-4 text-primary" /> Log Water
          </Button>
          <Button variant="outline" className="gap-2">
            <Smile className="h-4 w-4 text-primary" /> Log Mood
          </Button>
          <Button variant="outline" className="gap-2">
            <Moon className="h-4 w-4 text-primary" /> Log Sleep
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">No activity logged yet. Use the quick log buttons above to get started!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
