import { Button } from "@/components/ui/button";
import { Chrome, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LanguageToggle from "@/components/language-toggle";
import { useLanguage } from "@/providers/language-provider";

// Add this type definition
type AuthStatus = {
  configured: boolean;
  message: string;
};

export default function LoginPage() {
  const { language } = useLanguage();
  const { data: authStatus } = useQuery<AuthStatus>({
    queryKey: ['/api/auth/status'],
  });

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  // Check if Google OAuth is configured (will be true once we set up the API endpoint)
  const isConfigured = authStatus?.configured ?? true;

  const copy = language === "zh"
    ? {
        title: "欢迎回来",
        subtitle: "登录以获得个性化内容",
        googleButton: "使用 Google 登录",
        divider: "深受全球创作者信赖",
        alertTitle: "需要配置：",
        alertMessageBeforeLink: "尚未配置 Google OAuth。请查看",
        alertMessageAfterLink: "获取配置说明。",
        imageAlt: "抽象艺术作品",
      }
    : {
        title: "Welcome Back",
        subtitle: "Log in to get personalized content",
        googleButton: "Continue with Google",
        divider: "Trusted by influencers worldwide",
        alertTitle: "Setup Required:",
        alertMessageBeforeLink: "Google OAuth is not configured yet. Please see ",
        alertMessageAfterLink: " for instructions.",
        imageAlt: "Abstract artwork",
      };

  return (
  <div className="relative flex h-screen overflow-hidden">
    <div className="absolute right-6 top-6 z-10">
      <LanguageToggle />
    </div>
    {/* Left side - Image */}
    <div className="hidden lg:flex lg:w-1/2 relative">
      <img 
        src="/images/login.png" 
        alt={copy.imageAlt}
        className="object-cover w-full h-full"
      />
    </div>

    {/* Right side - Login form */}
    <div className="flex flex-1 items-center justify-center px-4 bg-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            {copy.title}
          </h1>
          <p className="text-gray-600">
            {copy.subtitle}
          </p>
        </div>

        <div className="space-y-6">
          {!isConfigured && (
            <Alert variant="destructive" data-testid="alert-oauth-not-configured">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>{copy.alertTitle}</strong>{" "}
                {copy.alertMessageBeforeLink}
                <code className="px-1.5 py-0.5 rounded bg-muted text-xs">GOOGLE_OAUTH_SETUP.md</code>
                {copy.alertMessageAfterLink}
              </AlertDescription>
            </Alert>
          )}
          
          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 gap-3 text-base font-medium bg-white"
            onClick={handleGoogleLogin}
            disabled={!isConfigured}
            data-testid="button-google-login"
          >
            <Chrome className="h-5 w-5" />
            {copy.googleButton}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {copy.divider}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
  );
}
