import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import AppLayout from "./pages/app/AppLayout.tsx";
import Dashboard from "./pages/app/Dashboard.tsx";
import Sessions from "./pages/app/Sessions.tsx";
import SessionDetail from "./pages/app/SessionDetail.tsx";
import Knowledge from "./pages/app/Knowledge.tsx";

const queryClient = new QueryClient();

const LocationTracker = () => {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname !== "/") {
      localStorage.setItem("stemind_last_route", location.pathname);
    }
  }, [location.pathname]);
  return null;
};

const InitialRedirect = () => {
  const lastRoute = localStorage.getItem("stemind_last_route");
  if (lastRoute && lastRoute !== "/") {
    return <Navigate to={lastRoute} replace />;
  }
  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LocationTracker />
        <Routes>
          <Route path="/" element={<InitialRedirect />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="sessions/:id" element={<SessionDetail />} />
            <Route path="knowledge" element={<Knowledge />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
