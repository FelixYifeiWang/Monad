import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLanguage } from "@/providers/language-provider";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import LanguageToggle from "@/components/language-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { BusinessProfile } from "@shared/schema";

const urlField = z
  .string()
  .url("Enter a valid URL (https://...)")
  .or(z.literal(""))
  .optional();

const socialLinksSchema = z.object({
  instagram: urlField,
  tiktok: urlField,
  youtube: urlField,
  linkedin: urlField,
});

const businessProfileFormSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  industry: z.string().min(2, "Industry is required"),
  companySize: z.string().min(1, "Select a company size"),
  website: urlField,
  headquarters: z.string().optional(),
  contactName: z.string().min(2, "Primary contact is required"),
  contactPhone: z.string().optional(),
  targetRegions: z.string().min(2, "Let us know the markets you care about"),
  budgetRange: z.string().min(1, "Add a typical budget range"),
  description: z.string().min(30, "Share at least 30 characters about your brand"),
  socialLinks: socialLinksSchema,
});

type BusinessProfileFormValues = z.infer<typeof businessProfileFormSchema>;

const companySizeOptions = [
  { value: "1-10", label: "1-10" },
  { value: "11-50", label: "11-50" },
  { value: "51-200", label: "51-200" },
  { value: "201-500", label: "201-500" },
  { value: "500+", label: "500+" },
];

const budgetOptions = [
  { value: "<$5k", label: "< $5k per campaign" },
  { value: "$5k-$20k", label: "$5k – $20k" },
  { value: "$20k-$50k", label: "$20k – $50k" },
  { value: "$50k+", label: "$50k+" },
];

function parseSocialLinks(links: unknown) {
  if (!links || typeof links !== "object") {
    return {};
  }
  return links as Record<string, string>;
}

export default function BusinessOnboardingPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const copy = useMemo(
    () =>
      language === "zh"
        ? {
            title: "完善品牌资料",
            subtitle: "创建品牌档案后即可开始提交合作请求。",
            save: "保存资料",
            saving: "保存中…",
            profileCard: {
              heading: "品牌信息",
              description: "这些信息将帮助 AI 更好地理解你的品牌。",
            },
            storyLabel: "品牌简介",
            storyPlaceholder: "介绍品牌定位、产品线、过往合作经验等…",
            regionsLabel: "目标市场 / 地区",
            budgetLabel: "常规预算范围",
            socialLabel: "社交账号",
            contactLabel: "主要联系人",
          }
        : {
            title: "Complete your brand profile",
            subtitle: "Share context so the AI agent can pitch you accurately.",
            save: "Save profile",
            saving: "Saving...",
            profileCard: {
              heading: "Brand details",
              description: "Tell us who you are and what kind of campaigns you run.",
            },
            storyLabel: "Brand story",
            storyPlaceholder: "Describe your positioning, product lines, and past collabs...",
            regionsLabel: "Target markets / regions",
            budgetLabel: "Typical budget range",
            socialLabel: "Social channels",
            contactLabel: "Main point of contact",
          },
    [language],
  );

  const { data: profile, isLoading } = useQuery<BusinessProfile | null>({
    queryKey: ["/api/business/profile"],
    queryFn: async () => {
      const res = await fetch("/api/business/profile", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileFormSchema),
    defaultValues: {
      companyName: "",
      industry: "",
      companySize: "",
      website: "",
      headquarters: "",
      contactName: "",
      contactPhone: "",
      targetRegions: "",
      budgetRange: "",
      description: "",
      socialLinks: {
        instagram: "",
        tiktok: "",
        youtube: "",
        linkedin: "",
      },
    },
  });

  useEffect(() => {
    if (profile) {
      const links = parseSocialLinks(profile.socialLinks);
      form.reset({
        companyName: profile.companyName ?? "",
        industry: profile.industry ?? "",
        companySize: profile.companySize ?? "",
        website: profile.website ?? "",
        headquarters: profile.headquarters ?? "",
        contactName: profile.contactName ?? "",
        contactPhone: profile.contactPhone ?? "",
        targetRegions: profile.targetRegions ?? "",
        budgetRange: profile.budgetRange ?? "",
        description: profile.description ?? "",
        socialLinks: {
          instagram: links.instagram ?? "",
          tiktok: links.tiktok ?? "",
          youtube: links.youtube ?? "",
          linkedin: links.linkedin ?? "",
        },
      });
    }
  }, [profile, form]);

  const mutation = useMutation({
    mutationFn: async (values: BusinessProfileFormValues) => {
      const payload = {
        ...values,
        socialLinks: Object.fromEntries(
          Object.entries(values.socialLinks || {}).filter(([, value]) => value && value.trim().length > 0),
        ),
      };

      const res = await fetch("/api/business/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error((errorBody as { message?: string }).message || "Failed to save profile");
      }

      return res.json() as Promise<BusinessProfile>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/business/profile"] });
      toast({
        title: "Profile saved",
        description: "You can now start collaborating with influencers.",
      });
      setLocation("/business");
    },
    onError: (error: unknown) => {
      toast({
        title: "Unable to save",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: BusinessProfileFormValues) => {
    mutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
          </div>
          <LanguageToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>{copy.profileCard.heading}</CardTitle>
            <p className="text-sm text-muted-foreground">{copy.profileCard.description}</p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Studios" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input placeholder="Beauty / Tech / Lifestyle..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companySize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company size</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            {...field}
                          >
                            <option value="">Select team size...</option>
                            {companySizeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://www.example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="headquarters"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Headquarters</FormLabel>
                        <FormControl>
                          <Input placeholder="City, Country" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{copy.contactLabel}</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone / WhatsApp</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 555 111 2233" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="budgetRange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{copy.budgetLabel}</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            {...field}
                          >
                            <option value="">Select...</option>
                            {budgetOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="targetRegions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.regionsLabel}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g. US, Canada, SEA, Tier-1 cities in China..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.storyLabel}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={copy.storyPlaceholder}
                          className="min-h-[140px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  {(["instagram", "tiktok", "youtube", "linkedin"] as const).map((platform) => (
                    <FormField
                      key={platform}
                      control={form.control}
                      name={`socialLinks.${platform}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="capitalize">{platform}</FormLabel>
                          <FormControl>
                            <Input placeholder={`https://www.${platform}.com/...`} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                <Button type="submit" disabled={mutation.isPending} className="w-full md:w-auto">
                  {mutation.isPending ? copy.saving : copy.save}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
