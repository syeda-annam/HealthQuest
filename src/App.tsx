import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { initTheme } from "@/lib/theme";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import { DashboardLayout } from "@/components/DashboardLayout";
import PlaceholderPage from "./pages/PlaceholderPage";
import Water from "./pages/Water";
import Sleep from "./pages/Sleep";
import Mood from "./pages/Mood";
import Nutrition from "./pages/Nutrition";
import Workouts from "./pages/Workouts";
import Cycle from "./pages/Cycle";
import Insights from "./pages/Insights";
import Settings from "./pages/Settings";
import Badges from "./pages/Badges";
import Challenges from "./pages/Challenges";
import Leaderboard from "./pages/Leaderboard";

initTheme();

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ProfileProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/workouts" element={<DashboardLayout><Workouts /></DashboardLayout>} />
            <Route path="/nutrition" element={<DashboardLayout><Nutrition /></DashboardLayout>} />
            <Route path="/sleep" element={<DashboardLayout><Sleep /></DashboardLayout>} />
            <Route path="/water" element={<DashboardLayout><Water /></DashboardLayout>} />
            <Route path="/mood" element={<DashboardLayout><Mood /></DashboardLayout>} />
            <Route path="/cycle" element={<DashboardLayout><Cycle /></DashboardLayout>} />
            <Route path="/insights" element={<DashboardLayout><Insights /></DashboardLayout>} />
            <Route path="/badges" element={<DashboardLayout><Badges /></DashboardLayout>} />
            <Route path="/challenges" element={<DashboardLayout><Challenges /></DashboardLayout>} />
            <Route path="/leaderboard" element={<DashboardLayout><Leaderboard /></DashboardLayout>} />
            <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </ProfileProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
