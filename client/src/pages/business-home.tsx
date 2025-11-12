import { useState } from "react";
import { useLanguage } from "@/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Chrome, AlertTriangle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LanguageToggle from "@/components/language-toggle";
import { useToast } from "@/hooks/use-toast";

type AuthStatus = {
  configured: boolean;
  message: string;
};

export default function BusinessLoginPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const MIN_PASSWORD_LENGTH = 8;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { data: authStatus } = useQuery<AuthStatus>({
    queryKey: ["/api/auth/status"],
  });

  const isRegisterMode = mode === "register";
  const isConfigured = authStatus?.configured ?? true;

  const copy = language === "zh"
    ? {
        title: "品牌入口",
        subtitle: "登录以提交、跟进合作询问",
        googleButton: "使用 Google 登录",
        divider: "或使用邮箱登入",
        alertTitle: "需要配置：",
        alertMessageBeforeLink: "尚未配置 Google OAuth。请查看",
        alertMessageAfterLink: "获取配置说明。",
        imageAlt: "抽象艺术作品",
        emailAuth: {
          heading: "邮箱登录",
          emailLabel: "商务邮箱",
          passwordLabel: "密码",
          confirmPasswordLabel: "确认密码",
          passwordHint: "至少 8 个字符。",
          loginButton: "登录",
          loginButtonLoading: "正在登录…",
          registerButton: "创建品牌账号",
          registerButtonLoading: "创建中…",
          toggleToRegister: "没有账号？立即注册",
          toggleToLogin: "已有账号？点击登录",
          errors: {
            missingFields: "请填写邮箱和密码。",
            passwordLength: "密码长度至少 8 个字符。",
            passwordMismatch: "两次输入的密码不一致。",
          },
          toast: {
            loginErrorTitle: "登录失败",
            registerErrorTitle: "注册失败",
          },
        },
      }
    : {
        title: "Business Portal",
        subtitle: "Log in to submit and track collaboration requests",
        googleButton: "Continue with Google",
        divider: "or sign in with email",
        alertTitle: "Setup Required:",
        alertMessageBeforeLink: "Google OAuth isn’t configured yet. See ",
        alertMessageAfterLink: " for details.",
        imageAlt: "Abstract artwork",
        emailAuth: {
          heading: "Email Access",
          emailLabel: "Business Email",
          passwordLabel: "Password",
          confirmPasswordLabel: "Confirm password",
          passwordHint: "Use at least 8 characters.",
          loginButton: "Log in",
          loginButtonLoading: "Logging in...",
          registerButton: "Create business account",
          registerButtonLoading: "Creating account...",
          toggleToRegister: "Need an account? Sign up",
          toggleToLogin: "Already have an account? Log in",
          errors: {
            missingFields: "Email and password are required.",
            passwordLength: "Password must be at least 8 characters.",
            passwordMismatch: "Passwords do not match.",
          },
          toast: {
            loginErrorTitle: "Login failed",
            registerErrorTitle: "Registration failed",
          },
        },
      };

  const handleGoogleLogin = () => {
    const params = new URLSearchParams({
      userType: "business",
      next: "/business/dashboard",
    });
    window.location.href = `/api/auth/google?${params.toString()}`;
  };

  const handleResponse = async (response: Response, fallbackMessage: string) => {
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error((errorBody as { message?: string }).message || fallbackMessage);
    }
    return response.json();
  };

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, userType: "business" }),
      });
      return handleResponse(response, copy.emailAuth.toast.loginErrorTitle);
    },
    onSuccess: () => {
      window.location.href = "/business/dashboard";
    },
    onError: (error: unknown) => {
      const description = error instanceof Error ? error.message : undefined;
      toast({
        title: copy.emailAuth.toast.loginErrorTitle,
        description,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, userType: "business" }),
      });
      return handleResponse(response, copy.emailAuth.toast.registerErrorTitle);
    },
    onSuccess: () => {
      window.location.href = "/business/dashboard";
    },
    onError: (error: unknown) => {
      const description = error instanceof Error ? error.message : undefined;
      toast({
        title: copy.emailAuth.toast.registerErrorTitle,
        description,
        variant: "destructive",
      });
    },
  });

  const isSubmitting = isRegisterMode ? registerMutation.isPending : loginMutation.isPending;

  const handleEmailSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setFormError(copy.emailAuth.errors.missingFields);
      return;
    }

    if (isRegisterMode && password.length < MIN_PASSWORD_LENGTH) {
      setFormError(copy.emailAuth.errors.passwordLength);
      return;
    }

    if (isRegisterMode && password !== confirmPassword) {
      setFormError(copy.emailAuth.errors.passwordMismatch);
      return;
    }

    const payload = { email: trimmedEmail, password, userType: "business" };

    if (isRegisterMode) {
      registerMutation.mutate(payload);
    } else {
      loginMutation.mutate(payload);
    }
  };

  const handleToggleMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setFormError(null);
    setPassword("");
    setConfirmPassword("");
  };

  const submitLabel = isRegisterMode
    ? isSubmitting
      ? copy.emailAuth.registerButtonLoading
      : copy.emailAuth.registerButton
    : isSubmitting
      ? copy.emailAuth.loginButtonLoading
      : copy.emailAuth.loginButton;

  const toggleLabel = isRegisterMode ? copy.emailAuth.toggleToLogin : copy.emailAuth.toggleToRegister;

  return (
    <div className="relative flex h-screen overflow-hidden">
      <div className="absolute right-6 top-6 z-10">
        <LanguageToggle />
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="/images/login.png"
          alt={copy.imageAlt}
          className="object-cover w-full h-full"
        />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">{copy.title}</h1>
            <p className="text-gray-600">{copy.subtitle}</p>
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
                <span className="bg-card px-2 text-muted-foreground">{copy.divider}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground text-center uppercase tracking-wide">
                {copy.emailAuth.heading}
              </h2>

              {formError && (
                <p className="text-sm text-rose-500 text-center" role="alert">
                  {formError}
                </p>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-gray-700" htmlFor="email">
                    {copy.emailAuth.emailLabel}
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#a855f7] focus:outline-none focus:ring-2 focus:ring-[#c4b5fd]"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-sm font-medium text-gray-700" htmlFor="password">
                    {copy.emailAuth.passwordLabel}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={isRegisterMode ? "new-password" : "current-password"}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#a855f7] focus:outline-none focus:ring-2 focus:ring-[#c4b5fd]"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                {isRegisterMode && (
                  <div className="space-y-2 text-left">
                    <label className="text-sm font-medium text-gray-700" htmlFor="confirm-password">
                      {copy.emailAuth.confirmPasswordLabel}
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#a855f7] focus:outline-none focus:ring-2 focus:ring-[#c4b5fd]"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                )}

                <p className="text-xs text-muted-foreground">{copy.emailAuth.passwordHint}</p>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="button-email-submit"
                >
                  {submitLabel}
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={handleToggleMode}
                  disabled={isSubmitting}
                >
                  {toggleLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
