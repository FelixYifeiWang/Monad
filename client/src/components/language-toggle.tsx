import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Toggle } from "@/components/ui/toggle";

type SupportedLanguage = "en" | "zh";

const languageLabels: Record<SupportedLanguage, string> = {
  en: "English",
  zh: "中文",
};

export function LanguageToggle() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [localLanguage, setLocalLanguage] = useState<SupportedLanguage>("en");

  useEffect(() => {
    if (user?.languagePreference === "zh") {
      setLocalLanguage("zh");
    } else {
      setLocalLanguage("en");
    }
  }, [user?.languagePreference]);

  const mutation = useMutation({
    mutationFn: async (language: SupportedLanguage) => {
      const response = await fetch("/api/auth/language", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ language }),
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

  const nextLanguage = useMemo<SupportedLanguage>(
    () => (localLanguage === "en" ? "zh" : "en"),
    [localLanguage],
  );

  const handleToggle = () => {
    const previousLanguage = localLanguage;
    const targetLanguage = nextLanguage;

    setLocalLanguage(targetLanguage);

    if (!isAuthenticated) {
      return;
    }

    mutation.mutate(targetLanguage, {
      onError: () => {
        setLocalLanguage(previousLanguage);
      },
    });
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="fixed right-6 top-6 z-40">
      <Toggle
        pressed={localLanguage === "zh"}
        onPressedChange={handleToggle}
        disabled={mutation.isPending}
        aria-label="Toggle language"
        className="rounded-full border bg-background px-3 py-1 text-xs font-medium shadow-sm"
        data-testid="button-language-toggle"
      >
        <span className="flex items-center gap-1">
          <span className={localLanguage === "en" ? "text-primary" : "text-muted-foreground"}>
            EN
          </span>
          <span className="text-muted-foreground">/</span>
          <span className={localLanguage === "zh" ? "text-primary" : "text-muted-foreground"}>
            中文
          </span>
        </span>
      </Toggle>
    </div>
  );
}

export default LanguageToggle;
