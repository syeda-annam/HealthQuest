import {
  LayoutDashboard, Dumbbell, UtensilsCrossed, Moon, Droplets,
  Smile, Heart, Target, Lightbulb, Settings,
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
    { title: "Insights", url: "/insights", icon: Lightbulb },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-sidebar">
      <SidebarContent className="pt-6">
        {/* Logo */}
        {!collapsed && (
          <div className="px-5 pb-4 mb-2 border-b border-sidebar-border">
            <span className="font-heading font-extrabold text-lg text-sidebar-foreground tracking-tight">
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
                        className={`relative transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 ${
                          isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : ""
                        }`}
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent" />
                        )}
                        <item.icon className="mr-2 h-[18px] w-[18px] shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
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
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-accent-foreground">
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
