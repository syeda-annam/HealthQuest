import { differenceInYears } from "date-fns";

interface ProfileData {
  date_of_birth: string;
  biological_sex: string;
  height: number;
  weight: number;
  units: string;
  activity_level: string;
  goal: string;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

export function calculateTargets(profile: ProfileData) {
  let weightKg = profile.weight;
  let heightCm = profile.height;

  if (profile.units === "imperial") {
    weightKg = profile.weight * 0.453592;
    heightCm = profile.height * 2.54;
  }

  const age = differenceInYears(new Date(), new Date(profile.date_of_birth));

  // BMR
  let bmr: number;
  if (profile.biological_sex === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  const multiplier = ACTIVITY_MULTIPLIERS[profile.activity_level] || 1.55;
  let tdee = bmr * multiplier;

  // Goal adjustments
  let calories = tdee;
  if (profile.goal === "lose_weight") calories = tdee - 500;
  if (profile.goal === "build_muscle") calories = tdee + 300;
  calories = Math.round(calories);

  // Protein
  let proteinPerKg = 1.4;
  if (profile.goal === "build_muscle") proteinPerKg = 2.2;
  if (profile.goal === "lose_weight") proteinPerKg = 1.8;
  const protein = Math.round(weightKg * proteinPerKg);

  // Fat
  const fat = Math.round((calories * 0.25) / 9);

  // Carbs
  const carbCalories = calories - protein * 4 - fat * 9;
  const carbs = Math.round(carbCalories / 4);

  // Water
  let water = weightKg * 35;
  if (profile.activity_level === "very_active" || profile.activity_level === "athlete") {
    water += 500;
  }
  water = Math.round(water / 50) * 50;

  // Sleep
  let sleep = 7.5;
  if (age >= 18 && age <= 25) sleep = 8;
  if (age >= 65) sleep = 7;

  return { calories, protein, fat, carbs, water, sleep };
}
