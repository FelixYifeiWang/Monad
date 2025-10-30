import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Sparkles, Link as LinkIcon, Copy, CheckCircle } from "lucide-react";
import { z } from "zod";
import type { InfluencerPreferences } from "@shared/schema";

const preferencesSchema = z.object({
  personalContentPreferences: z.string().min(10, "Please provide more details about your content preferences"),
  monetaryBaseline: z.coerce.number().min(1, "Please set a minimum rate"),
  contentLength: z.string().min(1, "Please select a content length"),
  additionalGuidelines: z.string().optional(),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

export default function InfluencerSetup() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [username, setUsername] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  useEffect(() => {
    if (user) {
      setUsername((user as any).username || "");
    }
  }, [user]);

  const { data: preferences, isLoading: prefsLoading } = useQuery<InfluencerPreferences | null>({
    queryKey: ["/api/preferences"],
    enabled: isAuthenticated,
  });

  const defaultTemplateText = `I create lifestyle and wellness content focused on sustainable living and mindful consumption. I'm passionate about authentic partnerships with brands that align with my values.

I will consider collaborations that:
- Promote eco-friendly or sustainable products
- Support small businesses and ethical brands
- Align with wellness, health, or personal development

I will not promote:
- Fast fashion or unsustainable products
- Products tested on animals
- Multi-level marketing schemes
- Content that conflicts with my values`;

  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      personalContentPreferences: defaultTemplateText,
      monetaryBaseline: 2000,
      contentLength: "flexible",
      additionalGuidelines: "I prefer creative freedom in how I present collaborations. Typical turnaround time is 2-3 weeks.",
    },
  });

  useEffect(() => {
    if (preferences) {
      form.reset({
        personalContentPreferences: preferences.personalContentPreferences,
        monetaryBaseline: preferences.monetaryBaseline,
        contentLength: preferences.contentLength,
        additionalGuidelines: preferences.additionalGuidelines || "",
      });
    }
  }, [preferences, form]);

  const updateUsernameMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      const response = await fetch("/api/auth/username", {
        method: "PATCH",
        body: JSON.stringify({ username: newUsername }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update username");
      }
      return response.json();
    },
    onSuccess: async () => {
      // Refresh the user context to update the username in real-time
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Username updated",
        description: "Your unique URL has been updated.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update username. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PreferencesFormData) => {
      const response = await fetch("/api/preferences", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save preferences");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({
        title: "Preferences saved",
        description: "Your AI agent has been updated with your preferences.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/login";
    }
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && username !== (user as any)?.username) {
      updateUsernameMutation.mutate(username);
    }
  };

  const copyPublicUrl = () => {
    const url = `${window.location.origin}/i/${(user as any)?.username || username}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Your public URL has been copied to clipboard.",
    });
  };

  if (isLoading || prefsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const hasUsername = !!(user as any)?.username;
  const publicUrl = hasUsername ? `${window.location.origin}/i/${(user as any)?.username}` : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight">
            <span className="text-primary">Peri.</span>
            <span className="text-foreground">ai</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">{(user as any)?.email}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Public Profile URL</CardTitle>
            </div>
            <CardDescription className="text-base">
              Set your unique username to create a shareable inquiry form link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleUsernameSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 border rounded-lg px-3">
                    <span className="text-sm text-muted-foreground">{window.location.origin}/i/</span>
                    <Input
                      className="border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="your-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      data-testid="input-username"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={updateUsernameMutation.isPending || !username || username === (user as any)?.username}
                    data-testid="button-save-username"
                  >
                    {updateUsernameMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  3-30 characters, letters, numbers, hyphens and underscores only
                </p>
              </div>
            </form>

            {publicUrl && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Your Public Inquiry Form</p>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {publicUrl}
                    </a>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyPublicUrl}
                    data-testid="button-copy-url"
                  >
                    {isCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link with businesses who want to collaborate with you
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">AI Agent Instructions</CardTitle>
            </div>
            <CardDescription className="text-base">
              Configure how your AI agent should handle business inquiries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
                <FormField
                  control={form.control}
                  name="personalContentPreferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content Preferences</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the type of content you create, what you will and won't promote, your values, etc."
                          className="min-h-32 resize-none"
                          {...field}
                          data-testid="input-content-preferences"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monetaryBaseline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Rate ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="5000"
                          {...field}
                          data-testid="input-monetary-baseline"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contentLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Content Length</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-content-length">
                            <SelectValue placeholder="Select content length" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="short">Short (30-60 seconds)</SelectItem>
                          <SelectItem value="medium">Medium (1-3 minutes)</SelectItem>
                          <SelectItem value="long">Long (3+ minutes)</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalGuidelines"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Guidelines (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any other guidelines or requirements for collaborations..."
                          className="min-h-24 resize-none"
                          {...field}
                          data-testid="input-additional-guidelines"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    data-testid="button-save-preferences"
                  >
                    {saveMutation.isPending ? "Saving..." : "Save Preferences"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    disabled={saveMutation.isPending}
                    data-testid="button-reset"
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
