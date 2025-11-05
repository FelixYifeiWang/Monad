import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, Mail, DollarSign, Building2, CheckCircle, XCircle, Clock, Copy, ExternalLink, MessageSquare, Sparkles, ChevronDown, HelpCircle, Trash2 } from "lucide-react";
import { Link } from "wouter";
import type { Inquiry, Message } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import LanguageToggle from "@/components/language-toggle";

function AIRecommendation({ recommendation }: { recommendation: string }) {
  // Parse the recommendation to extract decision and content
  const lines = recommendation.split('\n');
  let decision = '';
  let content = '';
  
  // Extract decision (first line with APPROVE/REJECT/NEEDS INFO)
  const decisionLine = lines[0]?.replace(/\*\*/g, '').trim();
  if (decisionLine && (decisionLine === 'APPROVE' || decisionLine === 'REJECT' || decisionLine === 'NEEDS INFO')) {
    decision = decisionLine;
    content = lines.slice(1).join('\n').trim();
  } else {
    // Fallback: try to find decision in the text
    if (recommendation.includes('APPROVE')) decision = 'APPROVE';
    else if (recommendation.includes('REJECT')) decision = 'REJECT';
    else if (recommendation.includes('NEEDS INFO')) decision = 'NEEDS INFO';
    content = recommendation.replace(/\*\*/g, '');
  }

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'APPROVE':
        return (
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 text-base px-3 py-1">
            ✓ APPROVE
          </Badge>
        );
      case 'REJECT':
        return (
          <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 text-base px-3 py-1">
            ✗ REJECT
          </Badge>
        );
      case 'NEEDS INFO':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 text-base px-3 py-1">
            ? NEEDS INFO
          </Badge>
        );
      default:
        return null;
    }
  };

  // Format content: replace **text** with bold
  const formatContent = (text: string) => {
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) => 
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );
  };

  return (
    <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
      <div className="flex items-center gap-3 mb-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <h4 className="font-semibold text-primary">AI Recommendation</h4>
        {decision && getDecisionBadge(decision)}
      </div>
      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
        {formatContent(content)}
      </div>
    </div>
  );
}

function ChatHistory({ inquiryId }: { inquiryId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/inquiries", inquiryId, "messages"],
    enabled: isOpen,
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between"
          data-testid={`button-view-chat-${inquiryId}`}
        >
          <span className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            View Chat History
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground p-4 text-center">
            Loading chat history...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center">
            No messages yet
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg p-4 border space-y-3 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted border'
                  }`}
                >
                  <div className="text-xs opacity-70 mb-1">
                    {message.role === 'user' ? 'Business' : 'AI Agent'}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function InfluencerDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("pending");
  const [isCopied, setIsCopied] = useState(false);
  const [openChatHistories, setOpenChatHistories] = useState<Record<string, boolean>>({});
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusDialogData, setStatusDialogData] = useState<{ id: string; status: string } | null>(null);
  const [customMessage, setCustomMessage] = useState("");

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

  const { data: inquiries = [], isLoading: inquiriesLoading } = useQuery<Inquiry[]>({
    queryKey: ["/api/inquiries"],
    enabled: isAuthenticated,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, message }: { id: string; status: string; message?: string }) => {
      const response = await fetch(`/api/inquiries/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, message }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      setStatusDialogOpen(false);
      setStatusDialogData(null);
      setCustomMessage("");
      toast({
        title: "Status updated",
        description: "The inquiry status has been updated and the business has been notified.",
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
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteInquiryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/inquiries/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete inquiry");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      toast({
        title: "Deleted",
        description: "The inquiry has been deleted.",
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
        description: "Failed to delete inquiry. Please try again.",
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

  const copyPublicUrl = () => {
    const url = `${window.location.origin}/i/${(user as any)?.username}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Your public URL has been copied to clipboard.",
    });
  };

  const openStatusDialog = (id: string, status: string) => {
    setStatusDialogData({ id, status });
    setCustomMessage("");
    setStatusDialogOpen(true);
  };

  const handleStatusConfirm = () => {
    if (!statusDialogData) return;
    updateStatusMutation.mutate({
      id: statusDialogData.id,
      status: statusDialogData.status,
      message: customMessage || undefined,
    });
  };

  const filteredInquiries = inquiries.filter(inquiry => {
    if (selectedTab === "all") return true;
    return inquiry.status === selectedTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">Pending</Badge>;
    }
  };

  if (isLoading || inquiriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight">
            <span className="text-primary">Peri.</span>
            <span className="text-foreground">ai</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/setup">
              <Button variant="ghost" size="sm" data-testid="link-settings">
                Settings
              </Button>
            </Link>
            <div className="text-sm text-muted-foreground">{(user as any)?.email}</div>
            <div className="flex items-center gap-2">
              <LanguageToggle className="h-9" />
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {(user as any)?.username && (
          <Alert className="mb-8 bg-primary/5 border-primary/20">
            <AlertDescription className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Your Public Inquiry Form</p>
                <a
                  href={`${window.location.origin}/i/${(user as any)?.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  {window.location.origin}/i/{(user as any)?.username}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyPublicUrl}
                data-testid="button-copy-url-dashboard"
              >
                {isCopied ? "Copied!" : <><Copy className="h-4 w-4 mr-2" />Copy</>}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!(user as any)?.username && (
          <Alert className="mb-8">
            <AlertDescription>
              <Link href="/setup" className="text-primary hover:underline font-medium">
                Set up your username
              </Link>
              {" "}to create a public inquiry form that businesses can use to contact you.
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Business Inquiries</h1>
          <p className="text-muted-foreground">
            Manage collaboration requests processed by your AI agent
          </p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">
              All ({inquiries.length})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({inquiries.filter(i => i.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approved ({inquiries.filter(i => i.status === "approved").length})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              Rejected ({inquiries.filter(i => i.status === "rejected").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredInquiries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No inquiries yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                When businesses submit collaboration requests, they'll appear here with AI-generated responses.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInquiries.map((inquiry) => (
              <Card key={inquiry.id} data-testid={`inquiry-card-${inquiry.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{inquiry.businessEmail}</CardTitle>
                        {getStatusBadge(inquiry.status)}
                      </div>
                      <CardDescription>
                        {inquiry.createdAt && formatDistanceToNow(new Date(inquiry.createdAt), { addSuffix: true })}
                      </CardDescription>
                    </div>
                    {inquiry.price && (
                      <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                        <DollarSign className="h-5 w-5" />
                        {inquiry.price.toLocaleString()}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {inquiry.companyInfo && (
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground">{inquiry.companyInfo}</p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium mb-2">Business Message:</h4>
                    <p className="text-sm text-foreground leading-relaxed">{inquiry.message}</p>
                  </div>

                  {inquiry.chatActive ? (
                    <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <h4 className="font-medium text-blue-700 dark:text-blue-400">Active Chat Conversation</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        The business is currently chatting with your AI agent to discuss details and negotiate terms.
                      </p>
                    </div>
                  ) : (
                    <>
                      {inquiry.aiRecommendation && (
                        <AIRecommendation recommendation={inquiry.aiRecommendation} />
                      )}
                      
                      <ChatHistory inquiryId={inquiry.id} />
                    </>
                  )}

                  {inquiry.attachmentUrl && (
                    <div>
                      <a
                        href={inquiry.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        View Attachment
                      </a>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 flex-wrap items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant={inquiry.status === "approved" ? "default" : "outline"}
                        onClick={() => openStatusDialog(inquiry.id, "approved")}
                        disabled={updateStatusMutation.isPending || inquiry.status === "approved"}
                        data-testid={`button-approve-${inquiry.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant={inquiry.status === "needs_info" ? "secondary" : "outline"}
                        onClick={() => openStatusDialog(inquiry.id, "needs_info")}
                        disabled={updateStatusMutation.isPending || inquiry.status === "needs_info"}
                        data-testid={`button-needs-info-${inquiry.id}`}
                      >
                        <HelpCircle className="h-4 w-4 mr-1" />
                        Needs Info
                      </Button>
                      <Button
                        size="sm"
                        variant={inquiry.status === "rejected" ? "destructive" : "outline"}
                        onClick={() => openStatusDialog(inquiry.id, "rejected")}
                        disabled={updateStatusMutation.isPending || inquiry.status === "rejected"}
                        data-testid={`button-reject-${inquiry.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      {inquiry.status !== "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: "pending" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-pending-${inquiry.id}`}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Mark Pending
                        </Button>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteInquiryMutation.mutate(inquiry.id)}
                      disabled={deleteInquiryMutation.isPending}
                      data-testid={`button-delete-${inquiry.id}`}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent data-testid="dialog-status-message">
          <DialogHeader>
            <DialogTitle>
              {statusDialogData?.status === "approved" && "Approve Inquiry"}
              {statusDialogData?.status === "rejected" && "Reject Inquiry"}
              {statusDialogData?.status === "needs_info" && "Request More Information"}
            </DialogTitle>
            <DialogDescription>
              {statusDialogData?.status === "approved" && "Add an optional message to send with your approval (e.g., next steps, contact details)."}
              {statusDialogData?.status === "rejected" && "Add an optional message to explain why you're declining (e.g., doesn't align with brand values)."}
              {statusDialogData?.status === "needs_info" && "Add a message explaining what additional information you need."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Your message to the business (optional)"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="min-h-[100px]"
            data-testid="textarea-custom-message"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              disabled={updateStatusMutation.isPending}
              data-testid="button-cancel-status"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusConfirm}
              disabled={updateStatusMutation.isPending}
              data-testid="button-confirm-status"
              variant={statusDialogData?.status === "rejected" ? "destructive" : "default"}
            >
              {updateStatusMutation.isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
