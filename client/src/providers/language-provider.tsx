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
const COOKIE_NAME = "preferred_language";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

function readCookieLanguage(): SupportedLanguage | undefined {
  if (typeof document === "undefined") return undefined;
  const cookieString = document.cookie || "";
  const parts = cookieString.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (part.startsWith(`${COOKIE_NAME}=`)) {
      const value = part.substring(COOKIE_NAME.length + 1).toLowerCase();
      if (value === "zh") return "zh";
      if (value === "en") return "en";
    }
  }
  return undefined;
}

function writeCookieLanguage(language: SupportedLanguage) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${language}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<SupportedLanguage>("en");

  // Initialize from cookie/localStorage for guests
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cookieLanguage = readCookieLanguage();
    if (cookieLanguage) {
      setLanguageState(cookieLanguage);
      window.localStorage.setItem(STORAGE_KEY, cookieLanguage);
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "zh") {
      setLanguageState(stored);
      writeCookieLanguage(stored);
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
    writeCookieLanguage(normalized);
  }, [user?.languagePreference]);

  const setLanguage = useCallback((next: SupportedLanguage) => {
    setLanguageState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    writeCookieLanguage(next);
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
