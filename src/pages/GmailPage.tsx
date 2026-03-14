import { useState, useMemo } from "react";
import { useGoogleConnections, useSyncGoogle } from "@/hooks/useGoogle";
import { useEmailThreads, useThreadEmails, usePendingSuggestionsByThread } from "@/hooks/useGmailThreads";
import { useOrganization } from "@/hooks/useOrganization";
import { PageHeader, ErpCard } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import ThreadList from "@/components/gmail/ThreadList";
import EmailDetail from "@/components/gmail/EmailDetail";
import CrmContextPanel from "@/components/gmail/CrmContextPanel";
import ComposeEmailDialog from "@/components/gmail/ComposeEmailDialog";
import type { EmailThread, ThreadEmail } from "@/hooks/useGmailThreads";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GmailPage() {
  const { data: connections = [] } = useGoogleConnections();
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const allConns = connections.filter((c) => c.is_active);
  const [activeConnId, setActiveConnId] = useState<string | null>(null);
  const selectedConn = activeConnId || allConns[0]?.id || null;
  const isMobile = useIsMobile();

  const [category, setCategory] = useState("alle");
  const [search, setSearch] = useState("");
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [showContext, setShowContext] = useState(true);
  const [composing, setComposing] = useState(false);
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [replySubject, setReplySubject] = useState<string | undefined>();

  const { data: threads = [], isLoading: threadsLoading } = useEmailThreads(category);
  const { data: threadEmails = [], isLoading: emailsLoading } = useThreadEmails(selectedThread?.thread_id || null);
  const { data: pendingEmailIds = new Set() } = usePendingSuggestionsByThread(orgId);
  const sync = useSyncGoogle();

  const emailIds = useMemo(() => threadEmails.map(e => e.id), [threadEmails]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    threads.forEach(t => {
      if (t.category) counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [threads]);

  const handleSync = async () => {
    if (!selectedConn) return;
    try {
      const result = await sync.mutateAsync({ connectionId: selectedConn, type: "emails" });
      toast.success(`${result.synced} e-mails gesynchroniseerd`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReply = (email: ThreadEmail) => {
    setReplyTo(email.from_address);
    setReplySubject(email.subject);
    setComposing(true);
  };

  const handleCompose = () => {
    setReplyTo(undefined);
    setReplySubject(undefined);
    setComposing(true);
  };

  // Mobile: show detail as full page
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const handleSelectThread = (thread: EmailThread) => {
    setSelectedThread(thread);
    if (isMobile) setMobileView("detail");
  };

  if (allConns.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <PageHeader title="Gmail" />
        <ErpCard>
          <div className="text-center py-12">
            <Icons.Mail className="w-10 h-10 text-erp-text3 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-erp-text0 mb-1">Geen Google account gekoppeld</p>
            <p className="text-[12px] text-erp-text3 mb-4">
              Ga naar Instellingen → Google om een account te koppelen
            </p>
          </div>
        </ErpCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-erp-border0 flex-shrink-0">
        <div className="flex items-center gap-3">
          {isMobile && mobileView === "detail" && (
            <button onClick={() => setMobileView("list")} className="text-erp-text2 hover:text-erp-text0">
              ←
            </button>
          )}
          <h1 className="text-[18px] font-bold text-erp-text0">Gmail</h1>
          {sync.isPending && <span className="text-[11px] text-erp-text3">Synchroniseren...</span>}
        </div>
        <div className="flex items-center gap-2">
          {allConns.length > 1 && (
            <select
              value={selectedConn || ""}
              onChange={(e) => setActiveConnId(e.target.value)}
              className="bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-1.5 text-[12px] text-erp-text0"
            >
              {allConns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.email} ({c.connection_level === "organization" ? "Org" : "Persoonlijk"})
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleSync}
            disabled={sync.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-erp-bg3 border border-erp-border0 rounded-lg text-erp-text1 hover:bg-erp-hover transition"
          >
            <Icons.Search className="w-3.5 h-3.5" />
            Sync
          </button>
          <button
            onClick={() => setShowContext(!showContext)}
            className={cn(
              "p-1.5 rounded-lg border transition",
              showContext
                ? "bg-erp-blue/10 border-erp-blue/20 text-erp-blue"
                : "bg-erp-bg3 border-erp-border0 text-erp-text3"
            )}
            title="CRM context tonen/verbergen"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={handleCompose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-erp-blue text-white rounded-lg hover:bg-erp-blue/90 transition"
          >
            <Icons.Plus className="w-3.5 h-3.5" />
            Nieuwe e-mail
          </button>
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Panel 1: Thread list */}
        {(!isMobile || mobileView === "list") && (
          <ThreadList
            threads={threads}
            isLoading={threadsLoading}
            selectedThreadId={selectedThread?.thread_id || null}
            onSelect={handleSelectThread}
            category={category}
            onCategoryChange={setCategory}
            search={search}
            onSearchChange={setSearch}
            pendingEmailIds={pendingEmailIds as Set<string>}
            categoryCounts={categoryCounts}
          />
        )}

        {/* Panel 2: Email detail */}
        {(!isMobile || mobileView === "detail") && (
          <EmailDetail
            thread={selectedThread}
            emails={threadEmails}
            isLoading={emailsLoading}
            connectionId={selectedConn}
            onReply={handleReply}
            onCompose={handleCompose}
          />
        )}

        {/* Panel 3: CRM Context + AI Suggestions */}
        {showContext && !isMobile && (
          <CrmContextPanel
            thread={selectedThread}
            emailIds={emailIds}
          />
        )}
      </div>

      {/* Compose dialog */}
      <ComposeEmailDialog
        open={composing}
        onOpenChange={setComposing}
        connectionId={selectedConn}
        replyTo={replyTo}
        replySubject={replySubject}
      />
    </div>
  );
}
