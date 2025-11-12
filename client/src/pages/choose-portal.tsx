import LanguageToggle from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/providers/language-provider";
import { useMemo } from "react";

export default function ChoosePortalPage() {
  const { language } = useLanguage();

  const copy = useMemo(
    () =>
      language === "zh"
        ? {
            title: "你是哪一方？",
            subtitle: "请选择你的身份以继续",
            influencer: {
              title: "我是创作者",
              description: "配置 AI 代理、接收合作询问、管理报价与工作流。",
              action: "前往创作者入口",
            },
            business: {
              title: "我是品牌方",
              description: "提交合作需求、与 AI 助理对话、追踪洽谈进度。",
              action: "前往品牌入口",
            },
          }
        : {
            title: "Who are you?",
            subtitle: "Pick the experience that fits you best.",
            influencer: {
              title: "I’m an influencer",
              description: "Configure your AI agent, review inquiries, and finalize deals.",
              action: "Go to influencer portal",
            },
            business: {
              title: "I’m a business",
              description: "Submit proposals, chat with AI reps, and track negotiations.",
              action: "Go to business portal",
            },
          },
    [language],
  );

  return (
    <div className="relative flex h-screen overflow-hidden">
      <div className="absolute right-6 top-6 z-10">
        <LanguageToggle />
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative">
        <img src="/images/login.png" alt="portal selection" className="object-cover w-full h-full" />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 bg-white">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">{copy.title}</h1>
            <p className="text-gray-600">{copy.subtitle}</p>
          </div>

          <div className="grid gap-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-gray-900">{copy.influencer.title}</h2>
                <p className="text-base text-muted-foreground">{copy.influencer.description}</p>
              </div>
              <Button className="mt-6 w-full" onClick={() => (window.location.href = "/influencer")}>
                {copy.influencer.action}
              </Button>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-gray-900">{copy.business.title}</h2>
                <p className="text-base text-muted-foreground">{copy.business.description}</p>
              </div>
              <Button
                variant="secondary"
                className="mt-6 w-full"
                onClick={() => (window.location.href = "/business")}
              >
                {copy.business.action}
              </Button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
