import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAllStreaks, StreakRow } from "@/hooks/useStreaks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, Moon, Smile, UtensilsCrossed, Dumbbell, Heart } from "lucide-react";

const MODULES: { key: string; label: string; icon: typeof Droplets }[] = [
  { key: "water", label: "Water", icon: Droplets },
  { key: "sleep", label: "Sleep", icon: Moon },
  { key: "mood", label: "Mood", icon: Smile },
  { key: "nutrition", label: "Nutrition", icon: UtensilsCrossed },
  { key: "workout", label: "Workout", icon: Dumbbell },
  { key: "cycle", label: "Cycle", icon: Heart },
];

interface Props {
  showCycle?: boolean;
  showMood?: boolean;
}

export function DashboardStreaksRow({ showCycle = true, showMood = true }: Props) {
  const { user } = useAuth();
  const [streaks, setStreaks] = useState<Record<string, StreakRow>>({});

  useEffect(() => {
    if (!user) return;
    fetchAllStreaks(user.id).then(setStreaks);
  }, [user]);

  const visible = MODULES.filter((m) => {
    if (m.key === "cycle" && !showCycle) return false;
    if (m.key === "mood" && !showMood) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading font-semibold flex items-center gap-2">
          <span aria-hidden>🔥</span> Streaks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {visible.map(({ key, label, icon: Icon }) => {
            const s = streaks[key];
            const current = s?.current_streak || 0;
            const active = current >= 2;
            return (
              <div
                key={key}
                className={`rounded-lg border p-3 flex flex-col items-center text-center transition-colors ${
                  active
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/30"
                }`}
              >
                <Icon className={`h-4 w-4 mb-1 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <p className={`text-lg font-heading font-bold ${active ? "text-primary" : "text-foreground/60"}`}>
                  {current}
                </p>
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
