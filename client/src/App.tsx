import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/pages/login";
import InfluencerSetup from "@/pages/influencer-setup";
import InfluencerDashboard from "@/pages/influencer-dashboard";
import BusinessInquiry from "@/pages/business-inquiry";
import BusinessChat from "@/pages/business-chat";
import NotFound from "@/pages/not-found";
import OnboardingPage from "@/pages/onboarding";
import type { InfluencerPreferences } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

const preferencesQueryFn = getQueryFn<InfluencerPreferences | null>({ on401: "returnNull" });

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { data: preferences, isLoading: preferencesLoading } = useQuery<InfluencerPreferences | null>({
    queryKey: ["/api/preferences"],
    queryFn: preferencesQueryFn,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  const showLoader = isLoading || (isAuthenticated && preferencesLoading);

  if (showLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const requiresOnboarding = Boolean(isAuthenticated && !preferences);

  return (
    <Switch>
      <Route path="/i/:username/chat/:inquiryId" component={BusinessChat} />
      <Route path="/i/:username" component={BusinessInquiry} />
      <Route path="/login" component={LoginPage} />
      {isAuthenticated ? (
        <>
          <Route path="/dashboard" component={InfluencerDashboard} />
          <Route path="/setup" component={InfluencerSetup} />
          {requiresOnboarding ? (
            <>
              <Route path="/onboarding" component={OnboardingPage} />
              <Route path="/" component={OnboardingPage} />
            </>
          ) : (
            <Route path="/" component={InfluencerDashboard} />
          )}
        </>
      ) : (
        <Route path="/" component={LoginPage} />
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
