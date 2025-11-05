import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

export type SupportedLanguage = "en" | "zh";

type LanguageContextValue = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  user: User | null | undefined;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = "languagePreference";

export function LanguageProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<SupportedLanguage>("en");

  // Initialize from localStorage for guests
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "zh") {
      setLanguageState(stored);
    }
  }, []);

  // Sync with authenticated user preference
  useEffect(() => {
    if (!user?.languagePreference) return;
    const normalized = user.languagePreference === "zh" ? "zh" : "en";
    setLanguageState(normalized);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    }
  }, [user?.languagePreference]);

  const setLanguage = useCallback((next: SupportedLanguage) => {
    setLanguageState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      user,
    }),
    [language, setLanguage, user],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
