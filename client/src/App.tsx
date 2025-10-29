import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/pages/login";
import InfluencerSetup from "@/pages/influencer-setup";
import InfluencerDashboard from "@/pages/influencer-dashboard";
import BusinessInquiry from "@/pages/business-inquiry";
import BusinessChat from "@/pages/business-chat";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/i/:username/chat/:inquiryId" component={BusinessChat} />
      <Route path="/i/:username" component={BusinessInquiry} />
      <Route path="/login" component={LoginPage} />
      {!isAuthenticated ? (
        <Route path="/" component={LoginPage} />
      ) : (
        <>
          <Route path="/" component={InfluencerDashboard} />
          <Route path="/dashboard" component={InfluencerDashboard} />
          <Route path="/setup" component={InfluencerSetup} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
