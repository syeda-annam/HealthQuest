import { getLevelName, getXPForCurrentLevel } from "@/hooks/useXP";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface XPBarProps {
  level: number;
  totalXP: number;
  compact?: boolean;
}

export function XPBar({ level, totalXP, compact }: XPBarProps) {
  const { current, needed } = getXPForCurrentLevel(totalXP);
  const pct = (current / needed) * 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2 w-full">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 rounded-sm">
          Lv.{level}
        </Badge>
        <div className="flex-1 min-w-0">
          <Progress value={pct} className="h-1.5" />
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
          {current}/{needed}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="text-xs rounded-sm">Lv.{level}</Badge>
          <span className="text-sm font-medium text-foreground">{getLevelName(level)}</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {current} / {needed} XP
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
