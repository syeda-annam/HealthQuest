import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ChallengeDef,
  daysRemainingInWeek,
  getChallengesForWeek,
  weekStartFor,
  ensureWeeklyChallengeRow,
} from "@/hooks/useChallenges";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Check, X, Clock } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";

interface ProgressRow {
  challenge_id: string;
  current_value: number;
  completed: boolean;
}

function ChallengeList({
  defs,
  progress,
  status,
}: {
  defs: ChallengeDef[];
  progress: Record<string, ProgressRow>;
  status: "current" | "past";
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {defs.map((def) => {
        const row = progress[def.id];
        const cur = Math.min(row?.current_value || 0, def.target_value);
        const pct = Math.round((cur / def.target_value) * 100);
        const done = !!row?.completed;
        const failed = status === "past" && !done;
        return (
          <Card
            key={def.id}
            className={
              done
                ? "border-primary/40 bg-primary/5"
                : failed
                  ? "border-border opacity-70"
                  : "border-border"
            }
          >
            <CardContent className="py-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  {done && <Check className="h-4 w-4 text-primary shrink-0" />}
                  {failed && <X className="h-4 w-4 text-muted-foreground shrink-0" />}
                  {def.title}
                </p>
                <Badge variant="secondary" className="shrink-0">+{def.xp_reward} XP</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{def.description}</p>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      done ? "bg-primary" : failed ? "bg-muted-foreground/40" : "bg-secondary"
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
              {failed && (
                <p className="text-xs text-muted-foreground italic">Didn't make it this time</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function Challenges() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [thisWeekProgress, setThisWeekProgress] = useState<Record<string, ProgressRow>>({});
  const [lastWeekProgress, setLastWeekProgress] = useState<Record<string, ProgressRow>>({});

  const thisWeek = weekStartFor();
  const lastWeek = format(subDays(parseISO(thisWeek), 7), "yyyy-MM-dd");
  const thisWeekDefs = getChallengesForWeek(thisWeek);
  const lastWeekDefs = getChallengesForWeek(lastWeek);
  const daysLeft = daysRemainingInWeek(thisWeek);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    ensureWeeklyChallengeRow(thisWeek);

    Promise.all([
      supabase
        .from("user_challenges")
        .select("challenge_id, current_value, completed")
        .eq("user_id", user.id)
        .eq("week_start", thisWeek),
      supabase
        .from("user_challenges")
        .select("challenge_id, current_value, completed")
        .eq("user_id", user.id)
        .eq("week_start", lastWeek),
    ]).then(([curRes, prevRes]) => {
      const curMap: Record<string, ProgressRow> = {};
      (curRes.data || []).forEach((r) => (curMap[r.challenge_id as string] = r as ProgressRow));
      setThisWeekProgress(curMap);

      const prevMap: Record<string, ProgressRow> = {};
      (prevRes.data || []).forEach((r) => (prevMap[r.challenge_id as string] = r as ProgressRow));
      setLastWeekProgress(prevMap);
      setLoading(false);
    });
  }, [user, thisWeek, lastWeek]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary flex items-center gap-2">
          <Trophy className="h-6 w-6" /> Weekly Challenges
        </h1>
        <p className="text-muted-foreground mt-1">
          Three fresh challenges every Monday. Complete them to earn bonus XP.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.08em] text-muted-foreground font-semibold">
            This week
          </h2>
          <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> {daysLeft} day{daysLeft === 1 ? "" : "s"} left
          </span>
        </div>
        <ChallengeList defs={thisWeekDefs} progress={thisWeekProgress} status="current" />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-[0.08em] text-muted-foreground font-semibold">
          Last week's results
        </h2>
        <ChallengeList defs={lastWeekDefs} progress={lastWeekProgress} status="past" />
      </section>
    </div>
  );
}
