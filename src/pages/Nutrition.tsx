import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Trash2, UtensilsCrossed, X, Edit3, Loader2 } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { updateGoalsForModule } from "@/hooks/useGoalProgress";
import { recordLog } from "@/hooks/useBadges";
import { StreakBanner } from "@/components/StreakBanner";
import { awardXP, XPSource } from "@/hooks/useXP";
import { useProfile } from "@/contexts/ProfileContext";
import {
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, ReferenceLine, Legend
} from "recharts";

interface MealItem {
  meal_type: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface NutritionLog {
  id: string;
  user_id: string;
  logged_date: string;
  meals: MealItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

interface FoodResult {
  product_name: string;
  nutriments: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
  };
}

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

export default function Nutrition() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [todayLog, setTodayLog] = useState<NutritionLog | null>(null);
  const [targets, setTargets] = useState({ calories: 2000, protein: 120, carbs: 250, fat: 65 });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);

  // Form state
  const [foodName, setFoodName] = useState("");
  const [portion, setPortion] = useState(100);
  const [mealType, setMealType] = useState<string>("Breakfast");
  const [formCalories, setFormCalories] = useState(0);
  const [formProtein, setFormProtein] = useState(0);
  const [formCarbs, setFormCarbs] = useState(0);
  const [formFat, setFormFat] = useState(0);
  const [formFiber, setFormFiber] = useState(0);
  const [per100, setPer100] = useState({ cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  // Chart data
  const [calorieHistory, setCalorieHistory] = useState<{ date: string; calories: number }[]>([]);
  const [weeklyMacros, setWeeklyMacros] = useState<{ name: string; protein: number; carbs: number; fat: number }[]>([]);
  const [consistencyScore, setConsistencyScore] = useState(0);

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [targetRes, todayRes, historyRes] = await Promise.all([
      supabase.from("targets").select("calories, protein, carbs, fat").eq("user_id", user.id).single(),
      supabase.from("nutrition_logs").select("*").eq("user_id", user.id).eq("logged_date", today).single(),
      supabase.from("nutrition_logs").select("*").eq("user_id", user.id)
        .gte("logged_date", format(subDays(new Date(), 29), "yyyy-MM-dd"))
        .order("logged_date", { ascending: true }),
    ]);

    if (targetRes.data) {
      setTargets({
        calories: Number(targetRes.data.calories) || 2000,
        protein: Number(targetRes.data.protein) || 120,
        carbs: Number(targetRes.data.carbs) || 250,
        fat: Number(targetRes.data.fat) || 65,
      });
    }

    if (todayRes.data) {
      const meals = Array.isArray(todayRes.data.meals) ? todayRes.data.meals as unknown as MealItem[] : [];
      setTodayLog({ ...todayRes.data, meals } as NutritionLog);
    } else {
      setTodayLog(null);
    }

    // Calorie history (14 days)
    const last14 = format(subDays(new Date(), 13), "yyyy-MM-dd");
    const historyData = (historyRes.data || []) as unknown as NutritionLog[];
    const calHistory: { date: string; calories: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const entry = historyData.find(h => h.logged_date === d);
      calHistory.push({ date: format(subDays(new Date(), i), "MMM d"), calories: Number(entry?.total_calories || 0) });
    }
    setCalorieHistory(calHistory);

    // Weekly macros (this week vs last week)
    const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });

    const thisWeekLogs = historyData.filter(h => h.logged_date >= format(thisWeekStart, "yyyy-MM-dd"));
    const lastWeekLogs = historyData.filter(h => h.logged_date >= format(lastWeekStart, "yyyy-MM-dd") && h.logged_date <= format(lastWeekEnd, "yyyy-MM-dd"));

    const avg = (logs: NutritionLog[], field: keyof NutritionLog) => {
      if (logs.length === 0) return 0;
      return Math.round(logs.reduce((s, l) => s + Number(l[field] || 0), 0) / logs.length);
    };

    setWeeklyMacros([
      { name: "Last Week", protein: avg(lastWeekLogs, "total_protein"), carbs: avg(lastWeekLogs, "total_carbs"), fat: avg(lastWeekLogs, "total_fat") },
      { name: "This Week", protein: avg(thisWeekLogs, "total_protein"), carbs: avg(thisWeekLogs, "total_carbs"), fat: avg(thisWeekLogs, "total_fat") },
    ]);

    // Consistency score
    const calTarget = Number(targetRes.data?.calories) || 2000;
    const daysWithin = historyData.filter(h => {
      const cal = Number(h.total_calories);
      return cal > 0 && Math.abs(cal - calTarget) / calTarget <= 0.1;
    }).length;
    setConsistencyScore(historyData.length > 0 ? Math.round((daysWithin / 30) * 100) : 0);

    setLoading(false);
  }, [user, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Food search
  const searchFood = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const q = encodeURIComponent(searchQuery);

    // Fetch helper with 15s timeout + up to 3 retries (500ms delay between attempts)
    const fetchWithRetry = async (url: string, retries = 3): Promise<Response> => {
      let lastErr: unknown;
      for (let attempt = 1; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res;
        } catch (err) {
          clearTimeout(timeoutId);
          lastErr = err;
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 500));
          }
        }
      }
      throw lastErr;
    };

    try {
      // Primary: world DB sorted by popularity (most-scanned first)
      const primaryUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=20&sort_by=unique_scans_n`;
      const res = await fetchWithRetry(primaryUrl);
      const data = await res.json();
      let products: FoodResult[] = data.products || [];

      // Fallback 1: widen world search (no sort) if too few results
      if (products.length < 3) {
        try {
          const wideRes = await fetchWithRetry(
            `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=20`
          );
          const wideData = await wideRes.json();
          const extra: FoodResult[] = wideData.products || [];
          const seen = new Set(products.map((p) => p.product_name));
          for (const p of extra) {
            if (!seen.has(p.product_name)) products.push(p);
          }
        } catch { /* ignore fallback errors */ }
      }

      // Fallback 2: try the India-specific DB if still nothing (great for Indian foods)
      if (products.length === 0) {
        try {
          const inRes = await fetchWithRetry(
            `https://in.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=20`
          );
          const inData = await inRes.json();
          products = inData.products || [];
        } catch { /* ignore fallback errors */ }
      }

      setSearchResults(products);
    } catch {
      toast({
        title: "Search failed",
        description: "Food database is slow right now. Please try again in a moment.",
        variant: "destructive",
      });
    }
    setSearching(false);
  };

  const selectFood = (food: FoodResult) => {
    const n = food.nutriments;
    setPer100({
      cal: n["energy-kcal_100g"] || 0,
      protein: n.proteins_100g || 0,
      carbs: n.carbohydrates_100g || 0,
      fat: n.fat_100g || 0,
      fiber: n.fiber_100g || 0,
    });
    setFoodName(food.product_name || "Unknown food");
    setPortion(100);
    updateMacros(100, n["energy-kcal_100g"] || 0, n.proteins_100g || 0, n.carbohydrates_100g || 0, n.fat_100g || 0, n.fiber_100g || 0);
    setShowSearch(false);
    setSearchResults([]);
    setSearchQuery("");
    setManualEntry(false);
  };

  const updateMacros = (grams: number, cal100: number, p100: number, c100: number, f100: number, fi100: number) => {
    const ratio = grams / 100;
    setFormCalories(Math.round(cal100 * ratio));
    setFormProtein(Math.round(p100 * ratio * 10) / 10);
    setFormCarbs(Math.round(c100 * ratio * 10) / 10);
    setFormFat(Math.round(f100 * ratio * 10) / 10);
    setFormFiber(Math.round(fi100 * ratio * 10) / 10);
  };

  const handlePortionChange = (grams: number) => {
    setPortion(grams);
    if (!manualEntry) {
      updateMacros(grams, per100.cal, per100.protein, per100.carbs, per100.fat, per100.fiber);
    }
  };

  const addMealItem = async () => {
    if (!user || !foodName.trim()) return;

    const newItem: MealItem = {
      meal_type: mealType,
      food_name: foodName,
      calories: formCalories,
      protein: formProtein,
      carbs: formCarbs,
      fat: formFat,
      fiber: formFiber,
    };

    const existingMeals = todayLog?.meals || [];
    const updatedMeals = [...existingMeals, newItem];
    const totals = updatedMeals.reduce(
      (acc, m) => ({
        cal: acc.cal + m.calories,
        p: acc.p + m.protein,
        c: acc.c + m.carbs,
        f: acc.f + m.fat,
      }),
      { cal: 0, p: 0, c: 0, f: 0 }
    );

    const { error } = todayLog
      ? await supabase.from("nutrition_logs").update({
          meals: updatedMeals as unknown as Json,
          total_calories: totals.cal,
          total_protein: totals.p,
          total_carbs: totals.c,
          total_fat: totals.f,
        }).eq("id", todayLog.id)
      : await supabase.from("nutrition_logs").insert({
          user_id: user.id,
          logged_date: today,
          meals: updatedMeals as unknown as Json,
          total_calories: totals.cal,
          total_protein: totals.p,
          total_carbs: totals.c,
          total_fat: totals.f,
        });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Reset form
    setFoodName("");
    setPortion(100);
    setFormCalories(0);
    setFormProtein(0);
    setFormCarbs(0);
    setFormFat(0);
    setFormFiber(0);
    setPer100({ cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    setManualEntry(false);
    toast({ title: "Added!", description: `${foodName} logged to ${mealType}.` });
    updateGoalsForModule(user.id, "Nutrition");
    const xpSources: XPSource[] = [{ action: "Logged meal", xp: 5 }];
    const calTarget = targets.calories;
    if (totals.cal > 0 && Math.abs(totals.cal - calTarget) / calTarget <= 0.1) {
      xpSources.push({ action: "Hit calorie target", xp: 10 });
    }
    awardXP(user.id, xpSources, (window as any).__healthquest_level_up).then(() => refreshProfile());
    recordLog(user.id, "nutrition");
    fetchData();
  };

  const removeMealItem = async (index: number) => {
    if (!user || !todayLog) return;
    const updatedMeals = todayLog.meals.filter((_, i) => i !== index);
    const totals = updatedMeals.reduce(
      (acc, m) => ({ cal: acc.cal + m.calories, p: acc.p + m.protein, c: acc.c + m.carbs, f: acc.f + m.fat }),
      { cal: 0, p: 0, c: 0, f: 0 }
    );

    const { error } = await supabase.from("nutrition_logs").update({
      meals: updatedMeals as unknown as Json,
      total_calories: totals.cal,
      total_protein: totals.p,
      total_carbs: totals.c,
      total_fat: totals.f,
    }).eq("id", todayLog.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Removed" });
    fetchData();
  };

  const getProgressColor = (current: number, target: number) => {
    if (target === 0) return "bg-muted";
    const ratio = current / target;
    if (ratio >= 0.9 && ratio <= 1.1) return "bg-green-500";
    if ((ratio >= 0.75 && ratio < 0.9) || (ratio > 1.1 && ratio <= 1.25)) return "bg-amber-500";
    return "bg-red-500";
  };

  const meals = todayLog?.meals || [];
  const totalCal = Number(todayLog?.total_calories || 0);
  const totalP = Number(todayLog?.total_protein || 0);
  const totalC = Number(todayLog?.total_carbs || 0);
  const totalF = Number(todayLog?.total_fat || 0);

  // Donut chart data
  const proteinCals = totalP * 4;
  const carbsCals = totalC * 4;
  const fatCals = totalF * 9;
  const macroTotal = proteinCals + carbsCals + fatCals;
  const donutData = macroTotal > 0
    ? [
        { name: "Protein", value: Math.round((proteinCals / macroTotal) * 100), color: "hsl(168, 100%, 38%)" },
        { name: "Carbs", value: Math.round((carbsCals / macroTotal) * 100), color: "hsl(200, 80%, 50%)" },
        { name: "Fat", value: Math.round((fatCals / macroTotal) * 100), color: "hsl(30, 90%, 55%)" },
      ]
    : [];

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <StreakBanner module="nutrition" refreshKey={todayLog?.meals.length || 0} />
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-foreground">Nutrition Tracker</h1>
        <p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
      </div>

      {/* Targets progress */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading">Daily Targets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Calories", current: totalCal, target: targets.calories, unit: "kcal" },
            { label: "Protein", current: totalP, target: targets.protein, unit: "g" },
            { label: "Carbs", current: totalC, target: targets.carbs, unit: "g" },
            { label: "Fat", current: totalF, target: targets.fat, unit: "g" },
          ].map(({ label, current, target, unit }) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">{label}</span>
                <span className="text-muted-foreground">
                  {Math.round(current)} / {target} {unit}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getProgressColor(current, target)}`}
                  style={{ width: `${Math.min((current / target) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add food */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Add Food
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showSearch && !manualEntry && !foodName && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => setShowSearch(true)}>
                <Search className="h-4 w-4" /> Search Food Database
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => { setManualEntry(true); setFoodName(""); }}>
                <Edit3 className="h-4 w-4" /> Manual Entry
              </Button>
            </div>
          )}

          {showSearch && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Search foods (e.g. banana, chicken breast)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchFood()}
                />
                <Button onClick={searchFood} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(""); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {searching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching food database...</span>
                </div>
              )}
              {!searching && searchResults.length > 0 && (
                <div className="border border-border rounded-lg max-h-60 overflow-y-auto divide-y divide-border">
                  {searchResults
                    .filter((food) => food.nutriments && food.product_name)
                    .map((food, i) => {
                      const n = food.nutriments;
                      return (
                        <button
                          key={i}
                          className="w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors"
                          onClick={() => selectFood(food)}
                        >
                          <p className="text-sm font-medium text-foreground truncate">{food.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(n["energy-kcal_100g"] || 0)} kcal · P {Math.round(n.proteins_100g || 0)}g · C {Math.round(n.carbohydrates_100g || 0)}g · F {Math.round(n.fat_100g || 0)}g per 100g
                          </p>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {(foodName || manualEntry) && (
            <div className="space-y-3 border border-border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">{foodName || "Manual Entry"}</span>
                <Button variant="ghost" size="icon" onClick={() => { setFoodName(""); setManualEntry(false); setPer100({ cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {manualEntry && (
                <Input placeholder="Food name" value={foodName} onChange={(e) => setFoodName(e.target.value)} />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Portion (g)</label>
                  <Input type="number" value={portion} onChange={(e) => handlePortionChange(Number(e.target.value))} min={1} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Meal</label>
                  <Select value={mealType} onValueChange={setMealType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEAL_TYPES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { label: "Calories", val: formCalories, set: setFormCalories, unit: "kcal" },
                  { label: "Protein", val: formProtein, set: setFormProtein, unit: "g" },
                  { label: "Carbs", val: formCarbs, set: setFormCarbs, unit: "g" },
                  { label: "Fat", val: formFat, set: setFormFat, unit: "g" },
                  { label: "Fiber", val: formFiber, set: setFormFiber, unit: "g" },
                ].map(({ label, val, set, unit }) => (
                  <div key={label}>
                    <label className="text-xs text-muted-foreground">{label} ({unit})</label>
                    <Input
                      type="number"
                      value={val}
                      onChange={(e) => set(Number(e.target.value))}
                      readOnly={!manualEntry}
                      className={!manualEntry ? "bg-muted" : ""}
                    />
                  </div>
                ))}
              </div>

              <Button className="w-full" onClick={addMealItem} disabled={!foodName.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Add to {mealType}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily meal sections */}
      {MEAL_TYPES.map((type) => {
        const items = meals.filter((m) => m.meal_type === type);
        return (
          <Card key={type} className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-primary" /> {type}
                <span className="text-xs text-muted-foreground font-normal ml-auto">
                  {items.reduce((s, i) => s + i.calories, 0)} kcal
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">No foods logged</p>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((item, idx) => {
                    const globalIdx = meals.indexOf(item);
                    return (
                      <div key={idx} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.food_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.calories} kcal · P {item.protein}g · C {item.carbs}g · F {item.fat}g
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeMealItem(globalIdx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Daily totals */}
      <Card className="border-border bg-card">
        <CardContent className="py-4">
          <div className="grid grid-cols-4 text-center gap-2">
            {[
              { label: "Calories", val: `${Math.round(totalCal)} kcal` },
              { label: "Protein", val: `${Math.round(totalP)}g` },
              { label: "Carbs", val: `${Math.round(totalC)}g` },
              { label: "Fat", val: `${Math.round(totalF)}g` },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-lg font-bold text-foreground">{val}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Macro donut */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Today's Macro Split</CardTitle>
          </CardHeader>
          <CardContent>
            {donutData.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Log food to see your macro breakdown</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Consistency score */}
        <Card className="border-border bg-card flex flex-col items-center justify-center">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading text-center">Consistency Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <p className="text-5xl font-bold text-primary">{consistencyScore}%</p>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Days within 10% of calorie target (last 30 days)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calorie trend */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">Calorie Intake (Last 14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {calorieHistory.every((d) => d.calories === 0) ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No data yet — start logging meals</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={calorieHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                <ReferenceLine y={targets.calories} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: `Target ${targets.calories}`, fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Line type="monotone" dataKey="calories" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Weekly macros comparison */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">Weekly Average Macros</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyMacros.every((w) => w.protein === 0 && w.carbs === 0 && w.fat === 0) ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Need at least a few days of data</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyMacros}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
                <Bar dataKey="protein" fill="hsl(168, 100%, 38%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="carbs" fill="hsl(200, 80%, 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fat" fill="hsl(30, 90%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
