import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Dumbbell, UtensilsCrossed, Moon, Droplets,
  Smile, Heart, Target, Lightbulb, Settings,
} from "lucide-react";

interface MobileNavProps {
  moduleCycle: boolean;
  moduleMood: boolean;
}

export function MobileNav({ moduleCycle, moduleMood }: MobileNavProps) {
  const items = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Workouts", url: "/workouts", icon: Dumbbell },
    { title: "Nutrition", url: "/nutrition", icon: UtensilsCrossed },
    { title: "Sleep", url: "/sleep", icon: Moon },
    { title: "Water", url: "/water", icon: Droplets },
    ...(moduleMood ? [{ title: "Mood", url: "/mood", icon: Smile }] : []),
    ...(moduleCycle ? [{ title: "Cycle", url: "/cycle", icon: Heart }] : []),
    { title: "Goals", url: "/goals", icon: Target },
    { title: "Insights", url: "/insights", icon: Lightbulb },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card md:hidden overflow-x-auto">
      {items.map((item) => (
        <NavLink
          key={item.title}
          to={item.url}
          end={item.url === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] min-w-[60px] ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{item.title}</span>
        </NavLink>
      ))}
    </nav>
  );
}
