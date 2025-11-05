import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

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
    <div className="fixed right-4 top-4 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={!isAuthenticated || mutation.isPending}
        className="min-w-[140px] justify-between"
        data-testid="button-language-toggle"
      >
        <span>{languageLabels[localLanguage]}</span>
        <span className="text-muted-foreground">/ {languageLabels[nextLanguage]}</span>
      </Button>
    </div>
  );
}

export default LanguageToggle;
