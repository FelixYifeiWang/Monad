import { Switch, Route, Redirect } from "wouter";
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
import { LanguageProvider } from "@/providers/language-provider";
import BusinessHome from "@/pages/business-home";
import BusinessDashboard from "@/pages/business-dashboard";
import ChoosePortalPage from "@/pages/choose-portal";

const preferencesQueryFn = getQueryFn<InfluencerPreferences | null>({ on401: "returnNull" });

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const isInfluencer = user?.userType === "influencer";
  const isBusiness = user?.userType === "business";

  const { data: preferences, isLoading: preferencesLoading } = useQuery<InfluencerPreferences | null>({
    queryKey: ["/api/preferences"],
    queryFn: preferencesQueryFn,
    enabled: isAuthenticated && isInfluencer,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  const showLoader = isLoading || (isInfluencer && isAuthenticated && preferencesLoading);

  if (showLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const requiresOnboarding = Boolean(isAuthenticated && isInfluencer && !preferences);

  const renderInfluencer = (element: JSX.Element) => {
    if (!isAuthenticated || !isInfluencer) {
      return <Redirect to="/influencer/login" />;
    }
    return element;
  };

  const renderBusiness = (element: JSX.Element) => {
    if (!isAuthenticated || !isBusiness) {
      return <Redirect to="/business/login" />;
    }
    return element;
  };

  return (
    <Switch>
      <Route path="/i/:username/chat/:inquiryId" component={BusinessChat} />
      <Route path="/i/:username" component={BusinessInquiry} />
      <Route path="/business/login" component={BusinessHome} />
      <Route path="/influencer/login" component={LoginPage} />
      <Route path="/login">{() => <Redirect to="/influencer/login" />}</Route>
      <Route path="/business/dashboard">{() => <Redirect to="/business" />}</Route>
      <Route path="/dashboard">{() => <Redirect to="/influencer" />}</Route>
      <Route path="/setup">{() => <Redirect to="/influencer/setup" />}</Route>
      <Route path="/onboarding">{() => <Redirect to="/influencer/onboarding" />}</Route>

      <Route path="/influencer/setup">{() => renderInfluencer(<InfluencerSetup />)}</Route>
      <Route path="/influencer/onboarding">{() => renderInfluencer(<OnboardingPage />)}</Route>
      <Route path="/influencer">
        {() =>
          renderInfluencer(requiresOnboarding ? <OnboardingPage /> : <InfluencerDashboard />)
        }
      </Route>

      <Route path="/business">{() => renderBusiness(<BusinessDashboard />)}</Route>

      <Route path="/" component={ChoosePortalPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <Toaster />
          <Router />
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
