import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chrome, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Add this type definition
type AuthStatus = {
  configured: boolean;
  message: string;
};

export default function LoginPage() {
  const { data: authStatus } = useQuery<AuthStatus>({
    queryKey: ['/api/auth/status'],
  });

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  // Check if Google OAuth is configured (will be true once we set up the API endpoint)
  const isConfigured = authStatus?.configured ?? true;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="flex justify-center mb-2">
            <div className="text-3xl font-bold tracking-tight">
              <span className="text-primary">Mon</span>
              <span className="text-foreground">ad</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
          <CardDescription className="text-base">
            Sign in to manage your business inquiries with AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConfigured && (
            <Alert variant="destructive" data-testid="alert-oauth-not-configured">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Setup Required:</strong> Google OAuth is not configured yet. 
                Please see <code className="px-1.5 py-0.5 rounded bg-muted text-xs">GOOGLE_OAUTH_SETUP.md</code> for instructions.
              </AlertDescription>
            </Alert>
          )}
          
          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 gap-3 text-base font-medium"
            onClick={handleGoogleLogin}
            disabled={!isConfigured}
            data-testid="button-google-login"
          >
            <Chrome className="h-5 w-5" />
            Continue with Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Trusted by influencers worldwide
              </span>
            </div>
          </div>

          <div className="text-center space-y-2 pt-4">
            <p className="text-sm text-muted-foreground">
              New to Monad?{" "}
              <button
                className="text-primary font-medium hover-elevate active-elevate-2 px-1 rounded-sm transition-colors"
                onClick={() => console.log("Learn more clicked")}
                data-testid="link-learn-more"
              >
                Learn more
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}