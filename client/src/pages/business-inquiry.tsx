import { useState, useEffect } from "react";
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
import { Building2, CheckCircle2, Upload, X } from "lucide-react";
import { z } from "zod";

const inquirySchema = z.object({
  influencerId: z.string().min(1, "Influencer ID is required"),
  businessEmail: z.string().email("Please enter a valid email"),
  message: z.string().min(20, "Please provide more details about your inquiry"),
  price: z.coerce.number().optional(),
  companyInfo: z.string().optional(),
});

type InquiryFormData = z.infer<typeof inquirySchema>;

export default function BusinessInquiry() {
  const { username } = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
        throw new Error("Influencer not found");
      }
      return response.json();
    },
    enabled: !!username,
    retry: false,
  });

  const form = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      influencerId: "",
      businessEmail: "",
      message: "",
      price: undefined,
      companyInfo: "",
    },
  });

  useEffect(() => {
    if (influencer?.id) {
      form.setValue("influencerId", influencer.id);
    }
  }, [influencer, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const submitMutation = useMutation({
    mutationFn: async (data: InquiryFormData) => {
      // ✅ Send as JSON instead of FormData
      const payload = {
        influencerId: data.influencerId,
        businessEmail: data.businessEmail,
        message: data.message,
        price: data.price,
        companyInfo: data.companyInfo,
        // File uploads disabled for now - will add with Vercel Blob later
      };

      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit inquiry");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Inquiry submitted",
        description: "Redirecting to chat with the AI agent...",
      });
      // Redirect to chat page
      setTimeout(() => {
        setLocation(`/i/${username}/chat/${data.id}`);
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit inquiry. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (loadingInfluencer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Influencer Not Found</CardTitle>
            <CardDescription>
              The influencer you're looking for doesn't exist or hasn't set up their profile yet.
            </CardDescription>
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
              <span className="text-primary">Mon</span>
              <span className="text-foreground">ad</span>
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
              <CardTitle className="text-2xl">Inquiry Submitted!</CardTitle>
              <CardDescription className="text-base pt-2">
                AI Response from {influencer.firstName || influencer.username}
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
                    setSelectedFile(null);
                    form.reset({
                      influencerId: influencer.id,
                      businessEmail: "",
                      message: "",
                      price: undefined,
                      companyInfo: "",
                    });
                  }}
                  data-testid="button-submit-another"
                >
                  Submit Another Inquiry
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
            <span className="text-primary">Mon</span>
            <span className="text-foreground">ad</span>
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
              <CardTitle className="text-2xl">Business Inquiry</CardTitle>
            </div>
            <CardDescription className="text-base">
              Submit your collaboration proposal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))} className="space-y-6">
                <FormField
                  control={form.control}
                  name="businessEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contact@company.com"
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
                      <FormLabel>Message *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your collaboration proposal, campaign details, timeline, and any specific requirements..."
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
                      <FormLabel>Budget / Offer ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="5000"
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
                      <FormLabel>Company Info</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about your company, products, or services..."
                          className="min-h-24 resize-none"
                          {...field}
                          data-testid="input-company-info"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Attachment (Optional)</FormLabel>
                  <div className="mt-2">
                    {selectedFile ? (
                      <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                        <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeFile}
                          data-testid="button-remove-file"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover-elevate transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PDF, DOC, DOCX, TXT, PNG, JPG, GIF (max 10MB)
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
                          data-testid="input-file"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending || !influencer?.id}
                    data-testid="button-submit-inquiry"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit Inquiry"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.reset({
                        influencerId: influencer.id,
                        businessEmail: "",
                        message: "",
                        price: undefined,
                        companyInfo: "",
                      });
                      setSelectedFile(null);
                    }}
                    disabled={submitMutation.isPending}
                    data-testid="button-reset-form"
                  >
                    Reset
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
