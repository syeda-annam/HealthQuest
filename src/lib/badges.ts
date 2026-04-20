export interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: "First Steps" | "Consistency" | "Milestones" | "Health";
}

export const BADGES: BadgeDef[] = [
  // First Steps
  { id: "first_drop", name: "First Drop", emoji: "💧", description: "Log water for the first time", category: "First Steps" },
  { id: "first_sleep", name: "First Sleep", emoji: "😴", description: "Log sleep for the first time", category: "First Steps" },
  { id: "first_workout", name: "First Workout", emoji: "💪", description: "Log a workout for the first time", category: "First Steps" },
  { id: "first_meal", name: "First Meal", emoji: "🍽️", description: "Log a meal for the first time", category: "First Steps" },
  { id: "first_mood", name: "First Mood", emoji: "😊", description: "Log mood for the first time", category: "First Steps" },

  // Consistency
  { id: "week_warrior", name: "Week Warrior", emoji: "🔥", description: "Reach a 7-day streak in any module", category: "Consistency" },
  { id: "month_master", name: "Month Master", emoji: "🌟", description: "Reach a 30-day streak in any module", category: "Consistency" },
  { id: "hydration_hero", name: "Hydration Hero", emoji: "💦", description: "Hit your water goal 10 days in a row", category: "Consistency" },
  { id: "sleep_champion", name: "Sleep Champion", emoji: "🏆", description: "Log sleep 14 days in a row", category: "Consistency" },
  { id: "iron_will", name: "Iron Will", emoji: "🦾", description: "Log workouts 20 times total", category: "Consistency" },

  // Milestones
  { id: "century", name: "Century", emoji: "💯", description: "Reach 100 XP total", category: "Milestones" },
  { id: "level_5", name: "Rising Star", emoji: "⭐", description: "Reach level 5", category: "Milestones" },
  { id: "level_10", name: "Shooting Star", emoji: "🌠", description: "Reach level 10", category: "Milestones" },
  { id: "goal_getter", name: "Goal Getter", emoji: "🎯", description: "Complete your first goal", category: "Milestones" },
  { id: "overachiever", name: "Overachiever", emoji: "🏅", description: "Complete 5 goals", category: "Milestones" },

  // Health
  { id: "well_rested", name: "Well Rested", emoji: "😌", description: "Sleep 8+ hours, 5 nights in a row", category: "Health" },
  { id: "protein_pro", name: "Protein Pro", emoji: "🥩", description: "Hit protein target 7 days in a row", category: "Health" },
  { id: "zen_master", name: "Zen Master", emoji: "🧘", description: "Log mood for 14 days straight", category: "Health" },
  { id: "full_house", name: "Full House", emoji: "🌈", description: "Log all 5 modules in one day", category: "Health" },
  { id: "legend", name: "Legend", emoji: "👑", description: "Reach level 16", category: "Health" },
];

export const BADGE_MAP: Record<string, BadgeDef> = BADGES.reduce(
  (acc, b) => ({ ...acc, [b.id]: b }),
  {} as Record<string, BadgeDef>,
);
