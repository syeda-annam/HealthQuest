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

export function AppSidebar({ moduleCycle, moduleMood }: AppSidebarProps) {
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
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-accent/10"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
