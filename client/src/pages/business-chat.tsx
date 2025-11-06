import { useEffect, useState, useRef, useMemo } from "react";
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
import { useLanguage } from "@/providers/language-provider";

const translations = {
  en: {
    loading: "Loading conversation...",
    invalidLink: {
      title: "Invalid Link",
      description: "This conversation link is not valid.",
    },
    toast: {
      sendErrorTitle: "Error",
      sendErrorDescription: "Failed to send message.",
      closeSuccessTitle: "Conversation closed",
      closeSuccessDescription: "Thank you! The influencer will review our conversation and get back to you.",
      closeErrorTitle: "Error",
      closeErrorDescription: "Failed to close conversation",
    },
    confirmClose: "Are you sure you want to close this conversation? The influencer will review it and get back to you.",
    header: {
      title: "AI Agent Conversation",
      descriptionActive: "Chat with the influencer's AI agent to discuss collaboration details",
      descriptionClosed: "This conversation has been closed. The influencer will review it and contact you.",
    },
    chat: {
      avatar: {
        ai: "AI",
        you: "You",
      },
      typing: "Typing...",
    },
    form: {
      placeholder: "Type your message here...",
      buttons: {
        close: "Close Conversation",
        send: "Send Message",
        sending: "Sending...",
      },
    },
    closedCard: {
      title: "Conversation Closed",
      description: "The influencer will review your conversation and contact you at the email address you provided.",
    },
  },
  zh: {
    loading: "正在加载对话…",
    invalidLink: {
      title: "链接无效",
      description: "该对话链接不可用。",
    },
    toast: {
      sendErrorTitle: "错误",
      sendErrorDescription: "消息发送失败。",
      closeSuccessTitle: "对话已关闭",
      closeSuccessDescription: "感谢你的配合！创作者会查看对话内容并与你联系。",
      closeErrorTitle: "错误",
      closeErrorDescription: "关闭对话失败",
    },
    confirmClose: "确定要结束这段对话吗？创作者会查看记录并与你联系。",
    header: {
      title: "AI 代理对话",
      descriptionActive: "与创作者的 AI 代理沟通合作细节",
      descriptionClosed: "该对话已结束，创作者会尽快与你联系。",
    },
    chat: {
      avatar: {
        ai: "AI",
        you: "你",
      },
      typing: "对方正在输入…",
    },
    form: {
      placeholder: "请输入你的消息…",
      buttons: {
        close: "结束对话",
        send: "发送消息",
        sending: "发送中…",
      },
    },
    closedCard: {
      title: "对话已结束",
      description: "创作者会查看对话内容，并通过你提供的邮箱与您联系。",
    },
  },
} as const;

type ChatCopy = (typeof translations)[keyof typeof translations];

export default function BusinessChat() {
  const [, params] = useRoute("/i/:username/chat/:inquiryId");
  const { toast } = useToast();
  const { language } = useLanguage();
  const copy = useMemo<ChatCopy>(() => translations[language], [language]);
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
      const response = await apiRequest("POST", `/api/inquiries/${params?.inquiryId}/messages`, {
        content,
        language,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", params?.inquiryId, "messages"] });
      setMessageText("");
    },
    onError: (error: Error) => {
      toast({
        title: copy.toast.sendErrorTitle,
        description: error.message || copy.toast.sendErrorDescription,
        variant: "destructive",
      });
    },
  });

  const closeChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/inquiries/${params?.inquiryId}/close`, {
        language,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: copy.toast.closeSuccessTitle,
        description: copy.toast.closeSuccessDescription,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", params?.inquiryId] });
    },
    onError: (error: Error) => {
      toast({
        title: copy.toast.closeErrorTitle,
        description: error.message || copy.toast.closeErrorDescription,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !inquiry?.chatActive) return;
    sendMessageMutation.mutate(messageText);
  };

  const handleCloseChat = () => {
    if (window.confirm(copy.confirmClose)) {
      closeChatMutation.mutate();
    }
  };

  if (inquiryLoading || messagesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">{copy.loading}</div>
      </div>
    );
  }

  if (!params?.inquiryId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{copy.invalidLink.title}</CardTitle>
            <CardDescription>{copy.invalidLink.description}</CardDescription>
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
                <CardTitle>{copy.header.title}</CardTitle>
                <CardDescription>
                  {chatClosed ? copy.header.descriptionClosed : copy.header.descriptionActive}
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
                        {copy.chat.avatar.ai}
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
                      <AvatarFallback>{copy.chat.avatar.you}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {sendMessageMutation.isPending && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {copy.chat.avatar.ai}
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-4 py-2 bg-muted">
                    <p className="text-sm text-muted-foreground">{copy.chat.typing}</p>
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
                  placeholder={copy.form.placeholder}
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
                    {copy.form.buttons.close}
                  </Button>
                  <Button
                    type="submit"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendMessageMutation.isPending ? copy.form.buttons.sending : copy.form.buttons.send}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{copy.closedCard.title}</h3>
              <p className="text-muted-foreground">{copy.closedCard.description}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
