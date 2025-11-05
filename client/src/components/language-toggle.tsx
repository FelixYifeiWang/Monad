import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/language-provider";
import type { SupportedLanguage } from "@/providers/language-provider";

type LanguageToggleProps = {
  className?: string;
};

export function LanguageToggle({ className }: LanguageToggleProps) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { language, setLanguage, user } = useLanguage();

  const mutation = useMutation({
    mutationFn: async (newLanguage: SupportedLanguage) => {
      const response = await fetch("/api/auth/language", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ language: newLanguage }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || "Failed to update language preference");
      }

      return (await response.json()) as User;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/auth/user"], updatedUser);
    },
  });

  const handleToggle = (pressed: boolean) => {
    const targetLanguage: SupportedLanguage = pressed ? "zh" : "en";
    if (targetLanguage === language) {
      return;
    }

    const previousLanguage = language;
    setLanguage(targetLanguage);

    if (!isAuthenticated || !user) {
      return;
    }

    mutation.mutate(targetLanguage, {
      onError: () => {
        setLanguage(previousLanguage);
      },
    });
  };

  return (
    <Toggle
      pressed={language === "zh"}
      onPressedChange={handleToggle}
      disabled={mutation.isPending}
      aria-label="Toggle language"
      className={cn(
        "rounded-full border bg-background px-3 py-1 text-xs font-medium shadow-sm",
        className,
      )}
      data-testid="button-language-toggle"
    >
      <span className="flex items-center gap-1">
        <span className={language === "en" ? "text-primary" : "text-muted-foreground"}>
          EN
        </span>
        <span className="text-muted-foreground">/</span>
        <span className={language === "zh" ? "text-primary" : "text-muted-foreground"}>
          中文
        </span>
      </span>
    </Toggle>
  );
}

export default LanguageToggle;
