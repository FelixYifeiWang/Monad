import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { InfluencerPreferences } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ContentLength = "short" | "medium" | "long" | "flexible";

const preferencesQueryFn = getQueryFn<InfluencerPreferences | null>({
  on401: "returnNull",
});

const contentLengthOptions: Array<{
  value: ContentLength;
  label: string;
  helper: string;
}> = [
  {
    value: "short",
    label: "Short",
    helper: "Snappy formats like Reels, Shorts, or TikToks.",
  },
  {
    value: "medium",
    label: "Medium",
    helper: "Standard feed posts or videos under 5 minutes.",
  },
  {
    value: "long",
    label: "Long",
    helper: "Deep dives, livestreams, or detailed reviews.",
  },
  {
    value: "flexible",
    label: "Flexible",
    helper: "Open to experimenting with different lengths.",
  },
];

const boardStyle: CSSProperties = {
  backgroundImage: "url(/images/onboard_board.png)",
  backgroundSize: "contain",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  minHeight: "520px",
};

const continueButtonStyle: CSSProperties = {
  backgroundImage: "url(/images/onboard_button.png)",
  backgroundSize: "contain",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  width: "130px",
  height: "48px",
  border: "none",
  cursor: "pointer",
};

const parseMonetaryBaseline = (input: string): number | null => {
  if (!input) return null;
  const matches = input.match(/\d[\d,\.]*/g);
  if (!matches || matches.length === 0) return null;

  const numericValues = matches
    .map((value) => Number.parseFloat(value.replace(/,/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (numericValues.length === 0) return null;
  const baseline = Math.min(...numericValues);
  return Math.round(baseline);
};

export default function OnboardingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [monetaryInput, setMonetaryInput] = useState("");
  const [monetaryBaseline, setMonetaryBaseline] = useState<number | null>(null);
  const [contentLength, setContentLength] = useState<ContentLength | "">("");
  const [personalPreferences, setPersonalPreferences] = useState("");
  const [additionalGuidelines, setAdditionalGuidelines] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: preferences, isLoading: preferencesLoading } =
    useQuery<InfluencerPreferences | null>({
      queryKey: ["/api/preferences"],
      queryFn: preferencesQueryFn,
      enabled: isAuthenticated,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
      return;
    }

    if (!isLoading && !preferencesLoading && preferences) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, preferences, preferencesLoading, setLocation]);

  const parsedBaselinePreview = useMemo(
    () => parseMonetaryBaseline(monetaryInput),
    [monetaryInput],
  );

  const savePreferences = useMutation({
    mutationFn: async (payload: {
      personalContentPreferences: string;
      monetaryBaseline: number;
      contentLength: ContentLength;
      additionalGuidelines?: string;
    }) => {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || "Failed to save preferences");
      }

      return (await response.json()) as InfluencerPreferences;
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      queryClient.setQueryData(["/api/preferences"], saved);
      setLocation("/dashboard");
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to save preferences.";
      toast({
        title: "Something went wrong",
        description: message,
        variant: "destructive",
      });
    },
  });

  if (isLoading || (isAuthenticated && preferencesLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-lg font-medium text-slate-500">Loading…</div>
      </div>
    );
  }

  const handleContinue = () => {
    setError(null);

    if (stepIndex === 0) {
      setStepIndex(1);
      return;
    }

    if (stepIndex === 1) {
      const parsed = parseMonetaryBaseline(monetaryInput);
      if (!parsed) {
        setError("Please enter a valid monetary range (numbers only).");
        return;
      }
      setMonetaryBaseline(parsed);
      setStepIndex(2);
      return;
    }

    if (stepIndex === 2) {
      if (!contentLength) {
        setError("Please select the content length you prefer.");
        return;
      }
      setStepIndex(3);
      return;
    }

    const trimmedPreferences = personalPreferences.trim();
    if (trimmedPreferences.length < 10) {
      setError("Tell us a bit more about your style (at least 10 characters).");
      return;
    }

    if (!monetaryBaseline) {
      setError("Please provide your monetary range before continuing.");
      setStepIndex(0);
      return;
    }

    savePreferences.mutate({
      personalContentPreferences: trimmedPreferences,
      monetaryBaseline,
      contentLength: contentLength as ContentLength,
      additionalGuidelines: additionalGuidelines.trim() || undefined,
    });
  };

  const renderStep = () => {
    switch (stepIndex) {
      case 0:
        return (
          <div className="flex w-full flex-col items-center justify-center gap-6 text-center">
            <h1 className="max-w-xl text-2xl font-semibold text-[#573ccb] md:text-3xl">
              Let’s tailor your experience.
            </h1>
            <p className="text-base text-slate-600">
              Answer a few quick questions so your AI agent can represent you perfectly.
            </p>
          </div>
        );
      case 1:
        return (
          <div className="flex w-full flex-col items-center gap-6 text-center">
            <h1 className="max-w-xl text-2xl font-semibold text-[#573ccb] md:text-3xl">
              What’s your monetary incentive range{" "}
              <span className="text-[#6d28d9]">(lowest-highest)</span>?
            </h1>
            <p className="text-base text-slate-600">
              Help brands understand the budget you typically work within.
            </p>
            <div className="w-full max-w-md space-y-3">
              <input
                type="text"
                value={monetaryInput}
                onChange={(event) => setMonetaryInput(event.target.value)}
                placeholder="e.g. $100 - $1000"
                className="w-full rounded-full border border-transparent bg-white/90 px-6 py-3 text-center text-lg text-slate-700 shadow focus:border-[#a855f7] focus:outline-none focus:ring-2 focus:ring-[#c4b5fd]"
              />
              <p className="text-sm text-slate-500">
                We’ll set your baseline to the lowest value you provide:{" "}
                <span className="font-semibold text-[#6d28d9]">
                  {parsedBaselinePreview ?? "…"}
                </span>{" "}
                from this range.
              </p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="flex w-full flex-col items-center gap-8 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-[#573ccb] md:text-3xl">
                How long is the content you prefer to create?
              </h2>
              <p className="text-base text-slate-600">
                Pick the format that best reflects your usual collaborations.
              </p>
            </div>
            <div className="grid w-full gap-4 px-4 md:grid-cols-2">
              {contentLengthOptions.map((option) => {
                const selected = contentLength === option.value;
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => setContentLength(option.value)}
                    className={`rounded-3xl border px-6 py-5 text-left transition focus:outline-none focus:ring-2 focus:ring-[#a855f7] ${
                      selected
                        ? "border-[#8b5cf6] bg-white shadow-lg shadow-[#a855f7]/25"
                        : "border-transparent bg-white/80 hover:border-[#c4b5fd]"
                    }`}
                  >
                    <span className="text-lg font-semibold text-slate-800">
                      {option.label}
                    </span>
                    <p className="mt-2 text-sm text-slate-500">
                      {option.helper}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 3:
      default:
        return (
          <div className="flex w-full flex-col items-center gap-6 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-[#573ccb] md:text-3xl">
                Share your content style and guidelines
              </h2>
              <p className="text-base text-slate-600">
                Tell us what resonates with you and any guardrails brands should
                know.
              </p>
            </div>
            <div className="w-full max-w-lg space-y-5 text-left">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#573ccb]">
                  Personal content preferences
                </label>
                <textarea
                  value={personalPreferences}
                  onChange={(event) => setPersonalPreferences(event.target.value)}
                  rows={2}
                  className="w-full rounded-3xl border border-transparent bg-white/85 px-5 py-3 text-base text-slate-700 shadow focus:border-[#a855f7] focus:outline-none focus:ring-2 focus:ring-[#c4b5fd]"
                  placeholder="Themes you love, brand values you align with, or types of stories you share."
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#573ccb]">
                  Additional guidelines (optional)
                </label>
                <textarea
                  value={additionalGuidelines}
                  onChange={(event) =>
                    setAdditionalGuidelines(event.target.value)
                  }
                  rows={1}
                  className="w-full rounded-3xl border border-transparent bg-white/85 px-5 py-3 text-base text-slate-700 shadow focus:border-[#a855f7] focus:outline-none focus:ring-2 focus:ring-[#c4b5fd]"
                  placeholder="Any do’s and don’ts, collaboration preferences, or timelines."
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div
        className="relative mx-4 flex w-full max-w-4xl flex-col items-center px-6 py-14"
        style={boardStyle}
      >
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-10">
          {renderStep()}
        </div>

        {error && (
          <p className="mt-6 text-sm font-medium text-rose-500">{error}</p>
        )}

        <button
          onClick={handleContinue}
          disabled={savePreferences.isPending}
          data-testid="button-onboarding-next"
          className="mt-6 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={continueButtonStyle}
        >
          <span className="sr-only">
            {savePreferences.isPending ? "Saving..." : "Continue"}
          </span>
        </button>

        <div className="h-10" />
      </div>
    </div>
  );
}
