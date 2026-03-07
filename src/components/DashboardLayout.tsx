import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Activity, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profileLoading, setProfileLoading] = useState(true);
  const [moduleCycle, setModuleCycle] = useState(false);
  const [moduleMood, setModuleMood] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    supabase.from("profiles").select("profile_complete, module_cycle, module_mood").eq("id", user.id).single()
      .then(({ data }) => {
        if (!data?.profile_complete) {
          navigate("/onboarding");
          return;
        }
        setModuleCycle(data.module_cycle || false);
        setModuleMood(data.module_mood || false);
        setProfileLoading(false);
      });
  }, [user, loading, navigate]);

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Activity className="h-8 w-8 text-primary animate-pulse-ring" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <AppSidebar moduleCycle={moduleCycle} moduleMood={moduleMood} />
        </div>
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hidden md:flex" />
              <Activity className="h-5 w-5 text-primary md:hidden" />
              <span className="font-heading font-bold text-foreground">HealthQuest</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
            {children}
          </main>
        </div>
        <MobileNav moduleCycle={moduleCycle} moduleMood={moduleMood} />
      </div>
    </SidebarProvider>
  );
}
