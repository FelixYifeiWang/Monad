import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { BusinessProfile } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/providers/language-provider";
import LanguageToggle from "@/components/language-toggle";
import { Link } from "wouter";
import { LogOut, Send, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isBusinessProfileComplete } from "@/lib/businessProfile";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function BusinessDashboard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const copy = useMemo(
    () =>
      language === "zh"
        ? {
            loading: "加载中…",
            title: "品牌控制台",
            subtitle: "与 AI 助理对话，并随时查看资料状态。",
            chat: {
              title: "品牌 AI 助理",
              description: "像 ChatGPT 一样与 AI 沟通，获取合作策略、邮件草稿或下一步建议。",
              placeholder: "问问 AI：帮我写一封跟进邮件 / 如何提升转化率？",
              send: "发送",
              sending: "发送中…",
              intro: (companyName?: string | null) =>
                `你好，我是你的品牌 AI 助理。${companyName ? `关于 ${companyName} 的合作想法，我都可以帮你整理。` : "需要什么帮助都可以直接开口。"} `,
              tip: "AI 根据你的品牌资料和上下文提供建议。请输入具体问题以获得更好回复。",
              error: "发送失败，请稍后再试。",
            },
            settings: "设置",
            completeProfile: "完善资料以提升匹配质量。",
            statusCard: {
              title: "当前状态",
              ready: "你已准备好开展合作",
              reminder: "保持资料更新能帮助创作者更好地了解你。",
            },
            labels: {
              company: "公司名称",
              industry: "行业",
              targets: "目标地区",
            },
          }
        : {
            loading: "Loading...",
            title: "Business dashboard",
            subtitle: "Chat with your AI copilot and keep status in view.",
            chat: {
              title: "AI Copilot",
              description: "A ChatGPT-style assistant for strategy, outreach drafts, and next steps.",
              placeholder: "Ask the AI: draft a follow-up email / how to improve conversions?",
              send: "Send",
              sending: "Sending...",
              intro: (companyName?: string | null) =>
                `Hi! I'm your brand AI. ${companyName ? `Tell me what ${companyName} needs and I'll help. ` : "Ask for anything and I'll dive in."}`,
              tip: "The AI uses your brand profile and chat context. Ask specific questions for best results.",
              error: "Message failed. Please try again.",
            },
            settings: "Settings",
            completeProfile: "Complete your profile to boost matches.",
            statusCard: {
              title: "Status",
              ready: "You're ready to collaborate",
              reminder: "Keep your profile updated so influencers know how to work with you.",
            },
            labels: {
              company: "Company",
              industry: "Industry",
              targets: "Target regions",
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

  const chatMutation = useMutation({
    mutationFn: async (payload: { content: string; history: Array<{ role: "user" | "assistant"; content: string }> }) => {
      const response = await apiRequest("POST", "/api/business/ai-chat", {
        language,
        messages: payload.history.concat({ role: "user", content: payload.content }),
      });
      return response.json() as Promise<{ message: { role: "assistant"; content: string } }>;
    },
    onSuccess: (data) => {
      if (data?.message?.content) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: data.message.content },
        ]);
      }
    },
    onError: () => {
      toast({ variant: "destructive", title: copy.chat.error });
    },
  });

  useEffect(() => {
    if (!messages.length && !profileLoading) {
      setMessages([
        {
          id: "intro",
          role: "assistant",
          content: copy.chat.intro(profile?.companyName),
        },
      ]);
    }
  }, [copy.chat, messages.length, profile?.companyName, profileLoading]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">{copy.loading}</div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-background overflow-hidden">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/business/settings">
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

      <main className="mx-auto max-w-6xl px-6 pb-8">
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr] h-[calc(100vh-140px)]">
          <Card className="h-full overflow-hidden flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <CardTitle>{copy.chat.title}</CardTitle>
                  <CardDescription>{copy.chat.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
              <div className="rounded-lg border bg-muted/40 p-4 flex-1 overflow-y-auto space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2 text-sm shadow-sm whitespace-pre-wrap ${
                        message.role === "assistant"
                          ? "bg-white text-foreground border"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="text-xs text-muted-foreground">{copy.chat.sending}</div>
                )}
                <div ref={scrollRef} />
              </div>
              <p className="text-xs text-muted-foreground">{copy.chat.tip}</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const content = input.trim();
                  if (!content || chatMutation.isPending) return;
                  setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content }]);
                  setInput("");
                  const history = messages.slice(-6).map(({ role, content }) => ({ role, content }));
                  chatMutation.mutate({ content, history });
                }}
                className="space-y-3"
              >
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={copy.chat.placeholder}
                  className="min-h-[96px] resize-none"
                  disabled={chatMutation.isPending}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={!input.trim() || chatMutation.isPending} className="gap-2">
                    <Send className="h-4 w-4" />
                    {chatMutation.isPending ? copy.chat.sending : copy.chat.send}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="h-full overflow-hidden">
            <CardHeader>
              <CardTitle>{copy.statusCard.title}</CardTitle>
              <CardDescription>{copy.statusCard.reminder}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto h-full">
              <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4 space-y-2">
                <p className="font-medium">
                  {profileCompleted ? copy.statusCard.ready : copy.completeProfile}
                </p>
                {!profileCompleted && (
                  <Link href="/business/onboarding">
                    <Button className="mt-2" size="sm">
                      {copy.settings}
                    </Button>
                  </Link>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">{copy.labels.company}</p>
                <p className="font-medium">{profile?.companyName || "—"}</p>
                <p className="text-muted-foreground">{copy.labels.industry}</p>
                <p className="font-medium">{profile?.industry || "—"}</p>
                <p className="text-muted-foreground">{copy.labels.targets}</p>
                <p className="font-medium whitespace-pre-wrap">{profile?.targetRegions || "—"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
