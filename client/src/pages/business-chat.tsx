import { useEffect, useState, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Sparkles, CheckCircle } from "lucide-react";
import type { Message, Inquiry } from "@shared/schema";

export default function BusinessChat() {
  const [, params] = useRoute("/i/:username/chat/:inquiryId");
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: inquiry, isLoading: inquiryLoading } = useQuery<Inquiry>({
    queryKey: ["/api/inquiries", params?.inquiryId],
    enabled: !!params?.inquiryId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/inquiries", params?.inquiryId, "messages"],
    enabled: !!params?.inquiryId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return 3000;
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/inquiries/${params?.inquiryId}/messages`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", params?.inquiryId, "messages"] });
      setMessageText("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const closeChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/inquiries/${params?.inquiryId}/close`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conversation closed",
        description: "Thank you! The influencer will review our conversation and get back to you.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", params?.inquiryId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to close conversation",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-close chat when user closes the page or navigates away
  useEffect(() => {
    if (!params?.inquiryId || !inquiry?.chatActive) return;

    const closeChat = () => {
      // Use sendBeacon for reliable request during page unload
      const blob = new Blob([JSON.stringify({})], { type: 'application/json' });
      navigator.sendBeacon(`/api/inquiries/${params.inquiryId}/close`, blob);
    };

    // Handle full page close/refresh
    const handleBeforeUnload = () => {
      closeChat();
    };

    // Handle visibility changes (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        closeChat();
      }
    };

    // Handle page hide (covers more cases than beforeunload)
    const handlePageHide = () => {
      closeChat();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    // Cleanup: close chat when component unmounts (SPA navigation)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      
      // Close chat on component unmount (e.g., navigating away in SPA)
      if (inquiry?.chatActive) {
        closeChat();
      }
    };
  }, [params?.inquiryId, inquiry?.chatActive]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !inquiry?.chatActive) return;
    sendMessageMutation.mutate(messageText);
  };

  const handleCloseChat = () => {
    if (window.confirm("Are you sure you want to close this conversation? The influencer will review it and get back to you.")) {
      closeChatMutation.mutate();
    }
  };

  if (inquiryLoading || messagesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading conversation...</div>
      </div>
    );
  }

  if (!params?.inquiryId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>This conversation link is not valid.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const chatClosed = inquiry && !inquiry.chatActive;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="text-2xl font-bold tracking-tight">
            <span className="text-primary">Peri.</span>
            <span className="text-foreground">ai</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <CardTitle>AI Agent Conversation</CardTitle>
                <CardDescription>
                  {chatClosed
                    ? "This conversation has been closed. The influencer will review it and contact you."
                    : "Chat with the influencer's AI agent to discuss collaboration details"
                  }
                </CardDescription>
              </div>
              {chatClosed && <CheckCircle className="h-6 w-6 text-green-500" />}
            </div>
          </CardHeader>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto" data-testid="chat-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                  data-testid={`message-${message.role}`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 max-w-md ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback>You</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {sendMessageMutation.isPending && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-4 py-2 bg-muted">
                    <p className="text-sm text-muted-foreground">Typing...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
        </Card>

        {!chatClosed ? (
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSendMessage} className="space-y-4">
                <Textarea
                  placeholder="Type your message here..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="min-h-24 resize-none"
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-message"
                />
                <div className="flex gap-3 justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseChat}
                    disabled={closeChatMutation.isPending}
                    data-testid="button-close-chat"
                  >
                    Close Conversation
                  </Button>
                  <Button
                    type="submit"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Conversation Closed</h3>
              <p className="text-muted-foreground">
                The influencer will review your conversation and contact you at the email address you provided.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
