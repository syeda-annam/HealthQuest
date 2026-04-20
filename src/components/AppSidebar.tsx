import {
  LayoutDashboard, Dumbbell, UtensilsCrossed, Moon, Droplets,
  Smile, Heart, Target, Lightbulb, Settings, Award, Trophy,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { XPBar } from "@/components/XPBar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  moduleCycle: boolean;
  moduleMood: boolean;
  level: number;
  totalXP: number;
  name: string;
}

export function AppSidebar({ moduleCycle, moduleMood, level, totalXP, name }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const items = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Workouts", url: "/workouts", icon: Dumbbell },
    { title: "Nutrition", url: "/nutrition", icon: UtensilsCrossed },
    { title: "Sleep", url: "/sleep", icon: Moon },
    { title: "Water", url: "/water", icon: Droplets },
    ...(moduleMood ? [{ title: "Mood", url: "/mood", icon: Smile }] : []),
    ...(moduleCycle ? [{ title: "Cycle", url: "/cycle", icon: Heart }] : []),
    { title: "Goals", url: "/goals", icon: Target },
    { title: "Challenges", url: "/challenges", icon: Trophy },
    { title: "Badges", url: "/badges", icon: Award },
    { title: "Insights", url: "/insights", icon: Lightbulb },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-sidebar" style={{ width: collapsed ? undefined : "240px" }}>
      <SidebarContent className="pt-6">
        {!collapsed && (
          <div className="px-5 pb-4 mb-2 border-b border-sidebar-border">
            <span className="font-heading text-[1.3rem] text-sidebar-foreground tracking-tight">
              HealthQuest
            </span>
          </div>
        )}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = item.url === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={`relative transition-colors text-sidebar-foreground/85 hover:text-sidebar-foreground hover:bg-[rgba(193,230,229,0.15)] font-body text-[0.9rem] ${
                          isActive ? "bg-[rgba(193,230,229,0.2)] text-sidebar-foreground font-semibold" : ""
                        }`}
                        activeClassName="bg-[rgba(193,230,229,0.2)] text-sidebar-foreground font-semibold"
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent" />
                        )}
                        <item.icon className="mr-2 h-[18px] w-[18px] shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!collapsed && (
        <SidebarFooter className="p-4 border-t border-sidebar-border">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground">
                {(name || "A").charAt(0).toUpperCase()}
              </div>
              <p className="text-sm font-medium text-sidebar-foreground truncate">{name || "Adventurer"}</p>
            </div>
            <XPBar level={level} totalXP={totalXP} compact />
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
