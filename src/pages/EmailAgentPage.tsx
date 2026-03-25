import { useState } from "react";
import { useEmailInbox, useEmailInboxStats, useSendDraft, useRejectDraft, useProcessManual } from "@/hooks/useEmailAgent";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/erp/ErpIcons";
import type { EmailInboxItem } from "@/hooks/useEmailAgent";

const CATEGORIES = [
  { key: "all", label: "Alles", icon: "Mail" as const },
  { key: "urgent", label: "Urgent", icon: "Zap" as const },
  { key: "drafts", label: "Drafts", icon: "Send" as const },
  { key: "klant", label: "Klant", icon: "Building" as const },
  { key: "lead", label: "Lead", icon: "Users" as const },
  { key: "reclame", label: "Reclame", icon: "Mail" as const },
  { key: "intern", label: "Intern", icon: "Users" as const },
];

const sentimentColors: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive",
  negatief: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  positief: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  neutraal: "bg-muted text-muted-foreground",
};

const actionLabels: Record<string, string> = {
  reply_needed: "Reply nodig",
  fyi_only: "FYI",
  ignore: "Negeren",
  urgent: "Urgent",
  payment_related: "Betaling",
};

export default function EmailAgentPage() {
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<EmailInboxItem | null>(null);
  const { data: emails = [], isLoading } = useEmailInbox(tab);
  const { data: stats } = useEmailInboxStats();
  const sendDraft = useSendDraft();
  const rejectDraft = useRejectDraft();
  const processManual = useProcessManual();

  const handleSend = async (id: string) => {
    try {
      await sendDraft.mutateAsync(id);
      toast.success("Draft verstuurd!");
      setSelected(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectDraft.mutateAsync(id);
      toast.success("Draft afgewezen");
      setSelected(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSync = async () => {
    try {
      const result = await processManual.mutateAsync(undefined);
      toast.success(`${result.processed} nieuwe mails verwerkt`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Email Agent</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inkomende mails automatisch geclassificeerd en beantwoord door AI
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={processManual.isPending}
          variant="outline"
          className="gap-2"
        >
          <Icons.Search className="w-4 h-4" />
          {processManual.isPending ? "Syncing..." : "Sync nu"}
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Totaal" value={stats.total} />
          <StatCard label="Urgent" value={stats.urgent} color="text-destructive" />
          <StatCard label="Drafts wachtend" value={stats.pending_drafts} color="text-primary" />
          <StatCard label="Reply nodig" value={stats.reply_needed} color="text-orange-500" />
        </div>
      )}

      {/* Tabs + List */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {CATEGORIES.map((cat) => {
            const Icon = Icons[cat.icon];
            return (
              <TabsTrigger key={cat.key} value={cat.key} className="gap-1.5 text-xs">
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
                {cat.key === "urgent" && stats?.urgent ? (
                  <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                    {stats.urgent}
                  </Badge>
                ) : null}
                {cat.key === "drafts" && stats?.pending_drafts ? (
                  <Badge className="ml-1 h-4 px-1 text-[10px]">{stats.pending_drafts}</Badge>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Laden...</div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Geen emails in deze categorie
            </div>
          ) : (
            <div className="space-y-1">
              {emails.map((email) => (
                <EmailRow key={email.id} email={email} onClick={() => setSelected(email)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">{selected.subject}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="text-sm space-y-2">
                  <p>
                    <span className="text-muted-foreground">Van:</span>{" "}
                    {selected.from_name || selected.from_email}
                    {selected.from_name && (
                      <span className="text-muted-foreground ml-1">
                        &lt;{selected.from_email}&gt;
                      </span>
                    )}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Datum:</span>{" "}
                    {selected.gmail_date
                      ? new Date(selected.gmail_date).toLocaleString("nl-NL")
                      : "—"}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">{selected.category}</Badge>
                    {selected.ai_action && (
                      <Badge
                        className={cn(
                          sentimentColors[selected.ai_sentiment || "neutraal"]
                        )}
                        variant="outline"
                      >
                        {actionLabels[selected.ai_action] || selected.ai_action}
                      </Badge>
                    )}
                    {selected.companies?.name && (
                      <Badge variant="outline">
                        <Icons.Building className="w-3 h-3 mr-1" />
                        {selected.companies.name}
                      </Badge>
                    )}
                    {selected.projects?.name && (
                      <Badge variant="outline">
                        <Icons.Folder className="w-3 h-3 mr-1" />
                        {selected.projects.name}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* AI Summary */}
                {selected.ai_summary && (
                  <Card className="p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Icons.Bot className="w-3 h-3" /> AI Samenvatting
                    </p>
                    <p className="text-sm">{selected.ai_summary}</p>
                  </Card>
                )}

                {/* Body */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Inhoud</p>
                  <div className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3 max-h-60 overflow-y-auto">
                    {selected.body_snippet || selected.body_text?.slice(0, 500) || "—"}
                  </div>
                </div>

                {/* Draft */}
                {selected.draft_body && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Icons.Send className="w-3 h-3" /> AI Concept-antwoord
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        {selected.draft_status}
                      </Badge>
                    </p>
                    <div className="text-sm whitespace-pre-wrap bg-primary/5 border border-primary/10 rounded-lg p-3">
                      {selected.draft_body}
                    </div>
                    {selected.draft_status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleSend(selected.id)}
                          disabled={sendDraft.isPending}
                        >
                          <Icons.Send className="w-3.5 h-3.5 mr-1" />
                          Goedkeuren & Versturen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(selected.id)}
                          disabled={rejectDraft.isPending}
                        >
                          Afwijzen
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                        >
                          <a
                            href={`https://mail.google.com/mail/u/0/#drafts`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Aanpassen in Gmail
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
    </Card>
  );
}

function EmailRow({
  email,
  onClick,
}: {
  email: EmailInboxItem;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {email.from_name || email.from_email}
          </span>
          <span className="text-xs text-muted-foreground">
            {email.gmail_date
              ? new Date(email.gmail_date).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </span>
        </div>
        <p className="text-sm truncate">{email.subject}</p>
        {email.ai_summary && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {email.ai_summary}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Badge variant="secondary" className="text-[10px]">
          {email.category}
        </Badge>
        {email.draft_status === "pending" && (
          <Badge className="text-[10px]">Draft</Badge>
        )}
        {(email.ai_sentiment === "urgent" || email.ai_action === "urgent") && (
          <Badge variant="destructive" className="text-[10px]">
            Urgent
          </Badge>
        )}
        {email.companies?.name && (
          <span className="text-[10px] text-muted-foreground hidden md:inline">
            {email.companies.name}
          </span>
        )}
      </div>
    </div>
  );
}
