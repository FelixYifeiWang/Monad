import type { BusinessProfile } from "@shared/schema";

function isFilled(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isBusinessProfileComplete(profile?: BusinessProfile | null): boolean {
  if (!profile) return false;
  return (
    isFilled(profile.companyName) &&
    isFilled(profile.industry) &&
    isFilled(profile.companySize) &&
    isFilled(profile.description)
  );
}
