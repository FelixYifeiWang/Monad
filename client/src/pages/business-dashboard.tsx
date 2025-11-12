import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BusinessProfile, Inquiry } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/providers/language-provider";
import LanguageToggle from "@/components/language-toggle";
import { Link } from "wouter";

function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value instanceof Date ? value.toLocaleDateString() : String(value);
  }
}

function parseSocialLinks(links: unknown) {
  if (!links || typeof links !== "object") {
    return [];
  }
  return Object.entries(links as Record<string, string>).filter(([, url]) => !!url);
}

export default function BusinessDashboard() {
  const { language } = useLanguage();

  const copy = useMemo(
    () =>
      language === "zh"
        ? {
            title: "品牌控制台",
            subtitle: "查看品牌资料并跟进所有合作询问。",
            profileCard: "品牌资料",
            inquiriesCard: "我的询问",
            emptyProfile: "尚未填写资料。",
            emptyInquiries: "还没有提交任何询问。",
            editProfile: "编辑资料",
            startInquiry: "浏览创作者",
            completeProfile: "完善资料以提升匹配质量。",
          }
        : {
            title: "Business dashboard",
            subtitle: "Stay on top of your brand story and every inquiry.",
            profileCard: "Brand profile",
            inquiriesCard: "Your inquiries",
            emptyProfile: "Profile not completed yet.",
            emptyInquiries: "No inquiries submitted yet.",
            editProfile: "Edit profile",
            startInquiry: "Browse creators",
            completeProfile: "Complete your profile to boost matches.",
          },
    [language],
  );

  const { data: profile, isLoading: profileLoading } = useQuery<BusinessProfile | null>({
    queryKey: ["/api/business/profile"],
    queryFn: async () => {
      const res = await fetch("/api/business/profile", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: inquiries, isLoading: inquiriesLoading } = useQuery<Inquiry[]>({
    queryKey: ["/api/business/inquiries"],
    queryFn: async () => {
      const res = await fetch("/api/business/inquiries", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load inquiries");
      return res.json();
    },
  });

  if (profileLoading || inquiriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const socialLinks = parseSocialLinks(profile?.socialLinks);
  const profileCompleted = Boolean(profile?.description && profile?.budgetRange && profile?.targetRegions);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link href="/business/onboarding">
              <Button variant="outline">{copy.editProfile}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{copy.profileCard}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="text-lg font-medium">{profile.companyName || "—"}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">{profile.industry || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Team size</p>
                      <p className="font-medium">{profile.companySize || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Headquarters</p>
                      <p className="font-medium">{profile.headquarters || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Budget range</p>
                      <p className="font-medium">{profile.budgetRange || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Target regions</p>
                    <p className="font-medium whitespace-pre-line">{profile.targetRegions || "—"}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Brand story</p>
                    <p className="text-sm leading-relaxed text-foreground">
                      {profile.description || copy.emptyProfile}
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Socials</p>
                    {socialLinks.length ? (
                      <ul className="space-y-1 text-sm">
                        {socialLinks.map(([platform, url]) => (
                          <li key={platform} className="text-primary underline-offset-2 hover:underline">
                            <a href={url} target="_blank" rel="noreferrer">
                              {platform}: {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No social links yet.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{copy.emptyProfile}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4">
                <p className="font-medium">
                  {profileCompleted ? "You're ready to collaborate" : copy.completeProfile}
                </p>
                <p className="text-sm text-muted-foreground">
                  Keep your profile updated so influencers know how to work with you.
                </p>
                {!profileCompleted && (
                  <Link href="/business/onboarding">
                    <Button className="mt-4" size="sm">
                      {copy.editProfile}
                    </Button>
                  </Link>
                )}
              </div>
              <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4">
                <p className="font-medium">Need more creators?</p>
                <p className="text-sm text-muted-foreground">
                  Explore influencer profiles and submit new briefs directly from their inquiry pages.
                </p>
                <Link href="/influencer">
                  <Button className="mt-4" size="sm" variant="outline">
                    {copy.startInquiry}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{copy.inquiriesCard}</CardTitle>
          </CardHeader>
          <CardContent>
            {inquiries && inquiries.length > 0 ? (
              <div className="space-y-4">
                {inquiries.map((inquiry) => (
                  <div key={inquiry.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Influencer ID: {inquiry.influencerId.slice(0, 8)}
                        </p>
                        <p className="font-semibold">
                          {inquiry.message.length > 80
                            ? `${inquiry.message.slice(0, 80)}…`
                            : inquiry.message}
                        </p>
                      </div>
                      <Badge
                        variant={
                          inquiry.status === "approved"
                            ? "default"
                            : inquiry.status === "rejected"
                              ? "destructive"
                              : inquiry.status === "needs_info"
                                ? "secondary"
                                : "outline"
                        }
                      >
                        {inquiry.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span>Budget: {inquiry.price ? `$${inquiry.price}` : "—"}</span>
                      <span>Submitted: {formatDate(inquiry.createdAt)}</span>
                      <span>Chat active: {inquiry.chatActive ? "Yes" : "No"}</span>
                    </div>
                    {inquiry.aiRecommendation && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        AI summary: {inquiry.aiRecommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{copy.emptyInquiries}</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
