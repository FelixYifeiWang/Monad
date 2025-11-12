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
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isBusinessProfileComplete } from "@/lib/businessProfile";

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
  const { user } = useAuth();

  const copy = useMemo(
    () =>
      language === "zh"
        ? {
            loading: "加载中…",
            title: "品牌控制台",
            subtitle: "查看品牌资料并跟进所有合作询问。",
            profileCard: "品牌资料",
            profileLabels: {
              company: "公司名称",
              industry: "行业",
              teamSize: "团队规模",
              budgetRange: "预算范围",
              targetRegions: "目标地区",
              brandStory: "品牌故事",
              socials: "社交平台",
              noSocials: "暂未填写社交账号。",
            },
            inquiriesCard: "我的询问",
            inquiriesLabels: {
              influencer: "创作者 ID",
              budget: "预算",
              submitted: "提交时间",
              chatActive: "实时聊天",
              aiSummary: "AI 总结",
              activeYes: "是",
              activeNo: "否",
            },
            emptyProfile: "尚未填写资料。",
            emptyInquiries: "还没有提交任何询问。",
            settings: "设置",
            startInquiry: "浏览创作者",
            completeProfile: "完善资料以提升匹配质量。",
            statusCard: {
              title: "当前状态",
              ready: "你已准备好开展合作",
              reminder: "保持资料更新能帮助创作者更好地了解你。",
              needMore: "需要更多创作者？",
              explore: "在创作者页面发起新的询问。",
            },
          }
        : {
            loading: "Loading...",
            title: "Business dashboard",
            subtitle: "Stay on top of your brand story and every inquiry.",
            profileCard: "Brand profile",
            profileLabels: {
              company: "Company",
              industry: "Industry",
              teamSize: "Team size",
              budgetRange: "Budget range",
              targetRegions: "Target regions",
              brandStory: "Brand story",
              socials: "Socials",
              noSocials: "No social links yet.",
            },
            inquiriesCard: "Your inquiries",
            inquiriesLabels: {
              influencer: "Influencer ID",
              budget: "Budget",
              submitted: "Submitted",
              chatActive: "Chat active",
              aiSummary: "AI summary",
              activeYes: "Yes",
              activeNo: "No",
            },
            emptyProfile: "Profile not completed yet.",
            emptyInquiries: "No inquiries submitted yet.",
            settings: "Settings",
            startInquiry: "Browse creators",
            completeProfile: "Complete your profile to boost matches.",
            statusCard: {
              title: "Status",
              ready: "You're ready to collaborate",
              reminder: "Keep your profile updated so influencers know how to work with you.",
              needMore: "Need more creators?",
              explore: "Explore influencer profiles and submit new briefs anytime.",
            },
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
        <div className="text-muted-foreground">{copy.loading}</div>
      </div>
    );
  }

  const socialLinks = parseSocialLinks(profile?.socialLinks);
  const profileCompleted = isBusinessProfileComplete(profile);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (error) {
      console.error("Business logout failed:", error);
    } finally {
      window.location.href = "/business/login";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/business/onboarding">
              <Button variant="ghost" size="sm">
                {copy.settings}
              </Button>
            </Link>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
            <div className="flex items-center gap-2">
              <LanguageToggle className="h-9" />
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
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
                    <p className="text-sm text-muted-foreground">{copy.profileLabels.company}</p>
                    <p className="text-lg font-medium">{profile.companyName || "—"}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{copy.profileLabels.industry}</p>
                      <p className="font-medium">{profile.industry || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{copy.profileLabels.teamSize}</p>
                      <p className="font-medium">{profile.companySize || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{copy.profileLabels.budgetRange}</p>
                      <p className="font-medium">{profile.budgetRange || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{copy.profileLabels.targetRegions}</p>
                    <p className="font-medium whitespace-pre-line">{profile.targetRegions || "—"}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">{copy.profileLabels.brandStory}</p>
                    <p className="text-sm leading-relaxed text-foreground">
                      {profile.description || copy.emptyProfile}
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{copy.profileLabels.socials}</p>
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
                      <p className="text-sm text-muted-foreground">{copy.profileLabels.noSocials}</p>
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
              <CardTitle>{copy.statusCard.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4">
                <p className="font-medium">
                  {profileCompleted ? copy.statusCard.ready : copy.completeProfile}
                </p>
                <p className="text-sm text-muted-foreground">
                  {copy.statusCard.reminder}
                </p>
                {!profileCompleted && (
                  <Link href="/business/onboarding">
                    <Button className="mt-4" size="sm">
                      {copy.settings}
                    </Button>
                  </Link>
                )}
              </div>
              <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4">
                <p className="font-medium">{copy.statusCard.needMore}</p>
                <p className="text-sm text-muted-foreground">{copy.statusCard.explore}</p>
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
                          {copy.inquiriesLabels.influencer}: {inquiry.influencerId.slice(0, 8)}
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
                      <span>
                        {copy.inquiriesLabels.budget}: {inquiry.price ? `$${inquiry.price}` : "—"}
                      </span>
                      <span>
                        {copy.inquiriesLabels.submitted}: {formatDate(inquiry.createdAt)}
                      </span>
                      <span>
                        {copy.inquiriesLabels.chatActive}:{" "}
                        {inquiry.chatActive ? copy.inquiriesLabels.activeYes : copy.inquiriesLabels.activeNo}
                      </span>
                    </div>
                    {inquiry.aiRecommendation && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {copy.inquiriesLabels.aiSummary}: {inquiry.aiRecommendation}
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
