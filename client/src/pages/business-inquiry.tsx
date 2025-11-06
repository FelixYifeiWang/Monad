import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { useLanguage } from "@/providers/language-provider";

const translations = {
  en: {
    loading: "Loading...",
    fetchError: "Influencer not found",
    notFound: {
      title: "Influencer Not Found",
      description: "The influencer you're looking for doesn't exist or hasn't set up their profile yet.",
    },
    submitted: {
      title: "Inquiry Submitted!",
      aiResponse: (name: string) => `AI Response from ${name}`,
      button: "Submit Another Inquiry",
    },
    toast: {
      successTitle: "Inquiry submitted",
      successDescription: "Redirecting to chat with the AI agent...",
      errorTitle: "Error",
      errorDescription: "Failed to submit inquiry. Please try again.",
    },
    form: {
      heading: {
        title: "Business Inquiry",
        description: "Submit your collaboration proposal",
      },
      fields: {
        businessEmail: {
          label: "Business Email *",
          placeholder: "contact@company.com",
        },
        message: {
          label: "Message *",
          placeholder:
            "Describe your collaboration proposal, campaign details, timeline, and any specific requirements...",
        },
        price: {
          label: "Budget / Offer ($)",
          placeholder: "5000",
        },
        companyInfo: {
          label: "Company Info",
          placeholder: "Tell us about your company, products, or services...",
        },
      },
      buttons: {
        submit: "Submit Inquiry",
        submitting: "Submitting...",
        reset: "Reset",
      },
    },
    validation: {
      influencerId: "Influencer ID is required",
      businessEmail: "Please enter a valid email",
      message: "Please provide more details about your inquiry (at least 20 characters)",
    },
  },
  zh: {
    loading: "加载中…",
    fetchError: "找不到该创作者",
    notFound: {
      title: "未找到创作者",
      description: "该创作者不存在或尚未完成资料设置。",
    },
    submitted: {
      title: "提交成功！",
      aiResponse: (name: string) => `来自 ${name} 的 AI 回复`,
      button: "再提交一个询问",
    },
    toast: {
      successTitle: "询问已提交",
      successDescription: "正在跳转到与你的 AI 代理的对话…",
      errorTitle: "错误",
      errorDescription: "提交失败，请稍后再试。",
    },
    form: {
      heading: {
        title: "商务合作询问",
        description: "提交你的合作提案",
      },
      fields: {
        businessEmail: {
          label: "商务邮箱 *",
          placeholder: "contact@company.com",
        },
        message: {
          label: "留言内容 *",
          placeholder: "请描述你的合作提案、活动细节、时间规划以及具体需求…",
        },
        price: {
          label: "预算 / 报价（美元）",
          placeholder: "5000",
        },
        companyInfo: {
          label: "公司信息",
          placeholder: "介绍一下你的公司、产品或服务…",
        },
      },
      buttons: {
        submit: "提交询问",
        submitting: "提交中…",
        reset: "重置",
      },
    },
    validation: {
      influencerId: "创作者信息缺失",
      businessEmail: "请输入有效的邮箱地址",
      message: "请详细描述你的询问（至少 20 个字符）",
    },
  },
} as const;

type InquiryCopy = (typeof translations)[keyof typeof translations];

const createInquirySchema = (validation: InquiryCopy["validation"]) =>
  z.object({
    influencerId: z.string().min(1, validation.influencerId),
    businessEmail: z.string().email(validation.businessEmail),
    message: z.string().min(20, validation.message),
    price: z.coerce.number().optional(),
    companyInfo: z.string().optional(),
  });

type InquiryFormData = z.infer<ReturnType<typeof createInquirySchema>>;

export default function BusinessInquiry() {
  const { username } = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language } = useLanguage();
  const copy = useMemo(() => translations[language], [language]);
  const inquirySchema = useMemo(() => createInquirySchema(copy.validation), [copy]);
  const [submitted, setSubmitted] = useState(false);
  const [aiResponse, setAiResponse] = useState("");

  const { data: influencer, isLoading: loadingInfluencer } = useQuery<{
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  }>({
    queryKey: ["/api/users", username],
    queryFn: async () => {
      const response = await fetch(`/api/users/${username}`);
      if (!response.ok) {
        throw new Error(copy.fetchError);
      }
      return response.json();
    },
    enabled: !!username,
    retry: false,
  });

  const defaultValues = useMemo<InquiryFormData>(
    () => ({
      influencerId: "",
      businessEmail: "",
      message: "",
      price: undefined,
      companyInfo: "",
    }),
    [],
  );

  const form = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    defaultValues,
  });

  useEffect(() => {
    if (influencer?.id) {
      form.setValue("influencerId", influencer.id);
    }
  }, [influencer, form]);

  const submitMutation = useMutation({
    mutationFn: async (data: InquiryFormData) => {
      // ✅ Send as JSON instead of FormData
      const payload = {
        influencerId: data.influencerId,
        businessEmail: data.businessEmail,
        message: data.message,
        price: data.price,
        companyInfo: data.companyInfo,
        language,
      };

      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || copy.toast.errorDescription);
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: copy.toast.successTitle,
        description: copy.toast.successDescription,
      });
      // Redirect to chat page
      setTimeout(() => {
        setLocation(`/i/${username}/chat/${data.id}`);
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: copy.toast.errorTitle,
        description: error.message || copy.toast.errorDescription,
        variant: "destructive",
      });
    },
  });

  if (loadingInfluencer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">{copy.loading}</div>
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{copy.notFound.title}</CardTitle>
            <CardDescription>{copy.notFound.description}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="text-2xl font-bold tracking-tight">
              <span className="text-primary">Peri.</span>
              <span className="text-foreground">ai</span>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-16">
          <Card>
            <CardHeader className="text-center pb-8">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">{copy.submitted.title}</CardTitle>
              <CardDescription className="text-base pt-2">
                {copy.submitted.aiResponse(influencer.firstName || influencer.username)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-6">
                <p className="text-foreground leading-relaxed">{aiResponse}</p>
              </div>
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    setAiResponse("");
                    form.reset({
                      ...defaultValues,
                      influencerId: influencer.id,
                    });
                  }}
                  data-testid="button-submit-another"
                >
                  {copy.submitted.button}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const displayName = influencer.firstName
    ? `${influencer.firstName}${influencer.lastName ? ` ${influencer.lastName}` : ""}`
    : influencer.username;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="text-2xl font-bold tracking-tight">
            <span className="text-primary">Peri.</span>
            <span className="text-foreground">ai</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Avatar className="h-16 w-16">
            <AvatarImage src={influencer.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
              {displayName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-muted-foreground">@{influencer.username}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">{copy.form.heading.title}</CardTitle>
            </div>
            <CardDescription className="text-base">{copy.form.heading.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))} className="space-y-6">
                <FormField
                  control={form.control}
                  name="businessEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.form.fields.businessEmail.label}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={copy.form.fields.businessEmail.placeholder}
                          {...field}
                          data-testid="input-business-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.form.fields.message.label}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={copy.form.fields.message.placeholder}
                          className="min-h-40 resize-none"
                          {...field}
                          data-testid="input-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.form.fields.price.label}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={copy.form.fields.price.placeholder}
                          {...field}
                          data-testid="input-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.form.fields.companyInfo.label}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={copy.form.fields.companyInfo.placeholder}
                          className="min-h-24 resize-none"
                          {...field}
                          data-testid="input-company-info"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending || !influencer?.id}
                    data-testid="button-submit-inquiry"
                  >
                    {submitMutation.isPending
                      ? copy.form.buttons.submitting
                      : copy.form.buttons.submit}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                  onClick={() => {
                    form.reset({
                      ...defaultValues,
                      influencerId: influencer.id,
                    });
                  }}
                    disabled={submitMutation.isPending}
                    data-testid="button-reset-form"
                  >
                    {copy.form.buttons.reset}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
