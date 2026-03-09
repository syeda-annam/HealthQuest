import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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

initTheme();

const queryClient = new QueryClient();

const WrappedPlaceholder = () => (
  <DashboardLayout><PlaceholderPage /></DashboardLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/workouts" element={<WrappedPlaceholder />} />
            <Route path="/nutrition" element={<WrappedPlaceholder />} />
            <Route path="/sleep" element={<DashboardLayout><Sleep /></DashboardLayout>} />
            <Route path="/water" element={<DashboardLayout><Water /></DashboardLayout>} />
            <Route path="/mood" element={<DashboardLayout><Mood /></DashboardLayout>} />
            <Route path="/cycle" element={<WrappedPlaceholder />} />
            <Route path="/goals" element={<WrappedPlaceholder />} />
            <Route path="/insights" element={<WrappedPlaceholder />} />
            <Route path="/settings" element={<WrappedPlaceholder />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
