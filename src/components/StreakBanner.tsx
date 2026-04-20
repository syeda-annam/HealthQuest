import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStreak, StreakModule } from "@/hooks/useStreaks";
import { Flame } from "lucide-react";

interface Props {
  module: StreakModule;
  /** Bump this number from the parent after a successful log to refetch. */
  refreshKey?: number;
}

export function StreakBanner({ module, refreshKey = 0 }: Props) {
  const { user } = useAuth();
  const [current, setCurrent] = useState(0);
  const [longest, setLongest] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchStreak(user.id, module).then((row) => {
      setCurrent(row?.current_streak || 0);
      setLongest(row?.longest_streak || 0);
    });
  }, [user, module, refreshKey]);

  const active = current >= 2;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        active
          ? "border-primary/30 bg-primary/5 text-primary"
          : "border-border bg-muted/40 text-muted-foreground"
      }`}
    >
      <div className="flex items-center gap-2">
        {active ? (
          <span className="text-xl" aria-hidden>🔥</span>
        ) : (
          <Flame className="h-4 w-4" aria-hidden />
        )}
        <span className="text-sm font-medium">
          {active
            ? `${current} day streak`
            : "Start your streak today!"}
        </span>
      </div>
      {longest > 0 && (
        <span className="text-xs uppercase tracking-wider opacity-70">
          Best · {longest}
        </span>
      )}
    </div>
  );
}
