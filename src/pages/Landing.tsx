import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Activity, Dumbbell, UtensilsCrossed, Moon, Droplets, Smile, Heart,
} from "lucide-react";

const MODULES = [
  { name: "Workouts", icon: Dumbbell, desc: "Strength, cardio & Muscle Balance" },
  { name: "Nutrition", icon: UtensilsCrossed, desc: "Macros & meals" },
  { name: "Sleep", icon: Moon, desc: "Duration & quality" },
  { name: "Water", icon: Droplets, desc: "Hydration goals" },
  { name: "Mental Health", icon: Smile, desc: "Mood & journaling" },
  { name: "Cycle", icon: Heart, desc: "Phases & symptoms" },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="font-heading font-extrabold text-lg">HealthQuest</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/auth">Log In</Link>
            </Button>
            <Button asChild>
              <Link to="/auth?mode=signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Your personal wellness companion
        </div>
        <h1 className="text-5xl md:text-7xl font-heading font-extrabold tracking-tight">
          Track. <span className="text-primary">Adapt.</span> Thrive.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The only wellness platform that learns your body, not just tracks your health.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild className="px-8">
            <Link to="/auth?mode=signup">Sign Up</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="px-8">
            <Link to="/auth">Log In</Link>
          </Button>
        </div>
      </section>

      {/* Modules */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-heading font-bold">Everything you need, in one place</h2>
          <p className="text-muted-foreground mt-2">Six tracking modules, deeply connected.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ name, icon: Icon, desc }) => (
            <Card key={name} className="p-6 hover:border-primary/40 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg">{name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-muted-foreground flex items-center justify-between">
          <span>© {new Date().getFullYear()} HealthQuest</span>
          <span>Track. Adapt. Thrive.</span>
        </div>
      </footer>
    </div>
  );
}
