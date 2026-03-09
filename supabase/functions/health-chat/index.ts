import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const { message, conversationHistory } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch user context
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const todayStr = today.toISOString().slice(0, 10);
    const thirtyStr = thirtyDaysAgo.toISOString().slice(0, 10);
    const sevenStr = sevenDaysAgo.toISOString().slice(0, 10);

    const [profileRes, targetRes, sleepRes, nutritionRes, waterRes, workoutRes, moodRes, goalsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("targets").select("*").eq("user_id", userId).single(),
      supabase.from("sleep_logs").select("duration_hours, quality, tags").eq("user_id", userId).gte("logged_date", sevenStr),
      supabase.from("nutrition_logs").select("total_calories, total_protein, total_carbs, total_fat").eq("user_id", userId).gte("logged_date", sevenStr),
      supabase.from("water_logs").select("daily_total").eq("user_id", userId).gte("logged_date", sevenStr),
      supabase.from("workout_logs").select("type, duration").eq("user_id", userId).gte("logged_date", sevenStr),
      supabase.from("mood_logs").select("mood, stress").eq("user_id", userId).gte("logged_date", sevenStr),
      supabase.from("goals").select("title, target_value, current_value, status").eq("user_id", userId).eq("status", "active"),
    ]);

    const profile = profileRes.data;
    const targets = targetRes.data;

    // Calculate averages
    const sleepLogs = sleepRes.data || [];
    const avgSleep = sleepLogs.length > 0 ? (sleepLogs.reduce((s: number, l: any) => s + Number(l.duration_hours || 0), 0) / sleepLogs.length).toFixed(1) : "no data";
    const avgSleepQuality = sleepLogs.length > 0 ? (sleepLogs.reduce((s: number, l: any) => s + Number(l.quality || 0), 0) / sleepLogs.length).toFixed(1) : "no data";
    const sleepDisruptors = [...new Set(sleepLogs.flatMap((l: any) => l.tags || []))].join(", ") || "none";

    const nutritionLogs = nutritionRes.data || [];
    const avgCal = nutritionLogs.length > 0 ? Math.round(nutritionLogs.reduce((s: number, l: any) => s + Number(l.total_calories || 0), 0) / nutritionLogs.length) : "no data";
    const avgProtein = nutritionLogs.length > 0 ? Math.round(nutritionLogs.reduce((s: number, l: any) => s + Number(l.total_protein || 0), 0) / nutritionLogs.length) : "no data";

    const waterLogs = waterRes.data || [];
    const avgWater = waterLogs.length > 0 ? Math.round(waterLogs.reduce((s: number, l: any) => s + Number(l.daily_total || 0), 0) / waterLogs.length) : "no data";

    const workoutLogs = workoutRes.data || [];
    const workoutTypes = [...new Set(workoutLogs.map((l: any) => l.type))].join(", ") || "none";

    const moodLogs = moodRes.data || [];
    const avgMood = moodLogs.length > 0 ? (moodLogs.reduce((s: number, l: any) => s + Number(l.mood || 0), 0) / moodLogs.length).toFixed(1) : "no data";
    const avgStress = moodLogs.length > 0 ? (moodLogs.reduce((s: number, l: any) => s + Number(l.stress || 0), 0) / moodLogs.length).toFixed(1) : "no data";

    const goals = goalsRes.data || [];
    const goalsStr = goals.length > 0
      ? goals.map((g: any) => `${g.title} — ${g.current_value} / ${g.target_value}`).join("\n")
      : "No active goals";

    // Calculate age
    let age = "unknown";
    if (profile?.date_of_birth) {
      const dob = new Date(profile.date_of_birth);
      age = String(Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
    }

    const systemPrompt = `You are HealthQuest AI, a personal health coach. You have access to ${profile?.name || "this user"}'s real health data. Be empathetic, specific, and give actionable advice. Always reference the user's actual numbers. Never give generic advice. If data is missing for a module, encourage them to log it.

USER PROFILE:
Age: ${age} | Goal: ${profile?.goal || "not set"} | Activity: ${profile?.activity_level || "not set"} | Units: ${profile?.units || "metric"}

DAILY TARGETS:
Calories: ${targets?.calories || "not set"} kcal | Protein: ${targets?.protein || "not set"}g | Carbs: ${targets?.carbs || "not set"}g | Fat: ${targets?.fat || "not set"}g
Water: ${targets?.water || "not set"}ml | Sleep: ${targets?.sleep || "not set"}h

LAST 7 DAYS:
Sleep: avg ${avgSleep}h (target ${targets?.sleep || "?"}h) | quality avg ${avgSleepQuality}/5 | disruptors: ${sleepDisruptors}
Nutrition: avg ${avgCal} kcal | protein avg ${avgProtein}g (target ${targets?.protein || "?"}g)
Water: avg ${avgWater}ml (target ${targets?.water || "?"}ml)
Workouts: ${workoutLogs.length} sessions | types: ${workoutTypes}
Mood: avg ${avgMood}/5 | stress avg ${avgStress}/10

ACTIVE GOALS:
${goalsStr}`;

    // Build messages for AI
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.error("AI gateway error:", aiResponse.status);
      return new Response(JSON.stringify({ error: "AI is unavailable right now. Try again shortly." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("health-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
