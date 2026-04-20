import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ChallengeDef,
  daysRemainingInWeek,
  ensureWeeklyChallengeRow,
  getChallengesForWeek,
  weekStartFor,
} from "@/hooks/useChallenges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Check, Clock } from "lucide-react";

interface UserChallengeRow {
  challenge_id: string;
  current_value: number;
  completed: boolean;
}

interface Props {
  /** Bump from parent to refetch progress after a log save. */
  refreshKey?: number;
  compact?: boolean;
}

export function ChallengesCard({ refreshKey = 0, compact = false }: Props) {
  const { user } = useAuth();
  const [defs, setDefs] = useState<ChallengeDef[]>([]);
  const [progress, setProgress] = useState<Record<string, UserChallengeRow>>({});
  const weekStart = weekStartFor();
  const daysLeft = daysRemainingInWeek(weekStart);

  useEffect(() => {
    if (!user) return;
    const weekDefs = getChallengesForWeek(weekStart);
    setDefs(weekDefs);
    ensureWeeklyChallengeRow(weekStart);

    supabase
      .from("user_challenges")
      .select("challenge_id, current_value, completed")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .then(({ data }) => {
        const map: Record<string, UserChallengeRow> = {};
        (data || []).forEach((r) => {
          map[r.challenge_id as string] = r as UserChallengeRow;
        });
        setProgress(map);
      });
  }, [user, weekStart, refreshKey]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading font-semibold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-highlight" />
            Weekly Challenges
          </span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-normal flex items-center gap-1">
            <Clock className="h-3 w-3" /> {daysLeft}d left
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {defs.map((def) => {
          const row = progress[def.id];
          const cur = Math.min(row?.current_value || 0, def.target_value);
          const pct = Math.round((cur / def.target_value) * 100);
          const done = row?.completed;
          return (
            <div
              key={def.id}
              className={`rounded-lg border p-3 space-y-2 transition-colors ${
                done ? "border-primary/40 bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    {done && <Check className="h-4 w-4 text-primary shrink-0" />}
                    {def.title}
                  </p>
                  {!compact && (
                    <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0">+{def.xp_reward} XP</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      done ? "bg-primary" : "bg-secondary"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {cur}/{def.target_value}
                </span>
              </div>
              {done && (
                <p className="text-xs font-medium text-primary">Complete! 🎉</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
