import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type XPSource = {
  action: string;
  xp: number;
};

export function getLevelFromXP(totalXP: number): number {
  return Math.floor(totalXP / 100) + 1;
}

export function getLevelName(level: number): string {
  if (level >= 16) return "Legend";
  if (level >= 11) return "Elite";
  if (level >= 7) return "Dedicated";
  if (level >= 4) return "Consistent";
  return "Beginner";
}

export function getXPForCurrentLevel(totalXP: number): { current: number; needed: number } {
  const xpInLevel = totalXP % 100;
  return { current: xpInLevel, needed: 100 };
}

export async function awardXP(
  userId: string,
  sources: XPSource[],
  onLevelUp?: (newLevel: number) => void
) {
  const totalAwarded = sources.reduce((sum, s) => sum + s.xp, 0);
  if (totalAwarded <= 0) return;

  // Fetch current XP
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, level, total_xp_earned")
    .eq("id", userId)
    .single();

  if (!profile) return;

  const currentXP = Number(profile.xp) || 0;
  const currentTotalXP = Number(profile.total_xp_earned) || 0;
  const currentLevel = Number(profile.level) || 1;

  const newTotalXP = currentTotalXP + totalAwarded;
  const newLevel = getLevelFromXP(newTotalXP);
  const newXP = currentXP + totalAwarded;

  await supabase
    .from("profiles")
    .update({
      xp: newXP,
      total_xp_earned: newTotalXP,
      level: newLevel,
    })
    .eq("id", userId);

  // Show XP toast
  const sourceText = sources.map(s => `${s.action} +${s.xp}`).join(", ");
  toast({
    title: `+${totalAwarded} XP earned!`,
    description: sourceText,
  });

  // Check for level up
  if (newLevel > currentLevel && onLevelUp) {
    onLevelUp(newLevel);
  }
}
