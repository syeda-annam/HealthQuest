import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BADGES, BadgeDef } from "@/lib/badges";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Award } from "lucide-react";
import { format } from "date-fns";

interface EarnedBadge {
  badge_id: string;
  earned_at: string;
}

export default function Badges() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [earned, setEarned] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("badges")
        .select("badge_id, earned_at")
        .eq("user_id", user.id);
      const map: Record<string, string> = {};
      (data || []).forEach((b: EarnedBadge) => {
        map[b.badge_id] = b.earned_at;
      });
      setEarned(map);
      setLoading(false);
    })();
  }, [user]);

  const earnedCount = Object.keys(earned).length;
  const total = BADGES.length;
  const pct = Math.round((earnedCount / total) * 100);

  const grouped = BADGES.reduce<Record<string, BadgeDef[]>>((acc, b) => {
    (acc[b.category] ||= []).push(b);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-full" />
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary flex items-center gap-2">
          <Award className="h-6 w-6" /> Badges
        </h1>
        <p className="text-muted-foreground mt-1">
          Unlock achievements as you build healthier habits.
        </p>
      </div>

      <Card>
        <CardContent className="py-5 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium text-foreground">
              {earnedCount} / {total} badges earned
            </span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {pct}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.08em] text-muted-foreground font-semibold">
            {category}
          </h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {items.map((b) => {
              const isEarned = !!earned[b.id];
              const earnedAt = earned[b.id];
              return (
                <Card
                  key={b.id}
                  className={`transition-all ${
                    isEarned
                      ? "border-primary/30 shadow-md"
                      : "opacity-60 grayscale hover:opacity-80"
                  }`}
                >
                  <CardContent className="py-5 flex flex-col items-center text-center gap-2">
                    <div
                      className={`text-4xl mb-1 ${
                        isEarned ? "" : "filter blur-[1px]"
                      }`}
                      aria-hidden
                    >
                      {isEarned ? b.emoji : "🔒"}
                    </div>
                    <p
                      className={`font-heading font-semibold text-sm ${
                        isEarned ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {b.name}
                    </p>
                    {isEarned ? (
                      <>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {b.description}
                        </p>
                        <p className="text-[0.65rem] uppercase tracking-wider text-primary mt-1">
                          {format(new Date(earnedAt), "MMM d, yyyy")}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground italic">???</p>
                        <Lock className="h-3 w-3 text-muted-foreground mt-1" />
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
