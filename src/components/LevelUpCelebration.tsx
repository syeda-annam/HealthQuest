import { useEffect } from "react";
import confetti from "canvas-confetti";
import { getLevelName } from "@/hooks/useXP";

interface LevelUpCelebrationProps {
  level: number;
  onDismiss: () => void;
}

export function LevelUpCelebration({ level, onDismiss }: LevelUpCelebrationProps) {
  useEffect(() => {
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div className="text-center space-y-4 animate-in zoom-in-50 duration-500">
        <p className="text-6xl md:text-8xl font-heading font-extrabold text-accent drop-shadow-lg">
          LEVEL UP!
        </p>
        <p className="text-4xl md:text-6xl font-heading font-extrabold text-foreground">
          Level {level}
        </p>
        <p className="text-xl md:text-2xl text-accent font-semibold">
          {getLevelName(level)}
        </p>
      </div>
    </div>
  );
}
