import { useState } from "react";
import { useGoogleConnections, useGoogleEmails, useGoogleApi, useSyncGoogle } from "@/hooks/useGoogle";
import { ErpCard, PageHeader } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function GmailPage() {
  const { data: connections = [] } = useGoogleConnections();
  const allConns = connections.filter((c) => c.is_active);
  const [activeConnId, setActiveConnId] = useState<string | null>(null);
  const selectedConn = activeConnId || allConns[0]?.id || null;
  const { data: emails = [], isLoading } = useGoogleEmails(selectedConn);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [emailDetail, setEmailDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const { callApi } = useGoogleApi();
  const sync = useSyncGoogle();

  // Compose dialog
  const [composing, setComposing] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleViewEmail = async (email: any) => {
    setSelectedEmail(email);
    setLoadingDetail(true);
    try {
      const detail = await callApi(selectedConn!, "get_message", { message_id: email.id });
      setEmailDetail(detail);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSend = async () => {
    if (!selectedConn || !composeTo || !composeSubject) return;
    setSending(true);
    try {
      await callApi(selectedConn, "send_email", {
        to: composeTo,
        subject: composeSubject,
        body_html: composeBody.replace(/\n/g, "<br>"),
      });
      toast.success("E-mail verzonden!");
      setComposing(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleSync = async () => {
    if (!selectedConn) return;
    try {
      const result = await sync.mutateAsync({ connectionId: selectedConn, type: "emails" });
      toast.success(`${result.synced} e-mails gesynchroniseerd`);
    } catch (err: any) {
      toast.error(err.message);
    }
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Gmail" />
        <div className="flex items-center gap-2">
          {allConns.length > 1 && (
            <select
              value={selectedConn || ""}
              onChange={(e) => setActiveConnId(e.target.value)}
              className="bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-1.5 text-[13px] text-erp-text0"
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
            {sync.isPending ? "Syncing..." : "Synchroniseren"}
          </button>
          <button
            onClick={() => setComposing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-erp-blue text-white rounded-lg hover:bg-erp-blue/90 transition"
          >
            <Icons.Plus className="w-3.5 h-3.5" />
            Nieuwe e-mail
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-erp-text3 text-[13px]">E-mails laden...</div>
      ) : emails.length === 0 ? (
        <ErpCard>
          <div className="text-center py-8 text-erp-text3 text-[13px]">Geen e-mails gevonden</div>
        </ErpCard>
      ) : (
        <div className="space-y-1">
          {emails.map((email: any) => (
            <div
              key={email.id}
              onClick={() => handleViewEmail(email)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition border ${
                email.isRead
                  ? "bg-erp-bg2 border-erp-border0 hover:bg-erp-hover"
                  : "bg-erp-bg3 border-erp-blue/30 hover:bg-erp-hover"
              }`}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${email.isRead ? "bg-transparent" : "bg-erp-blue"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-[13px] truncate ${email.isRead ? "text-erp-text2" : "text-erp-text0 font-medium"}`}>
                    {email.from?.replace(/<.*>/, "").trim() || "Onbekend"}
                  </span>
                  <span className="text-[11px] text-erp-text3 flex-shrink-0 ml-2">
                    {email.date ? formatDistanceToNow(new Date(email.date), { locale: nl, addSuffix: true }) : ""}
                  </span>
                </div>
                <div className={`text-[12px] truncate ${email.isRead ? "text-erp-text3" : "text-erp-text1"}`}>
                  {email.subject || "(geen onderwerp)"}
                </div>
                <div className="text-[11px] text-erp-text3 truncate mt-0.5">{email.snippet}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Email detail dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={() => { setSelectedEmail(null); setEmailDetail(null); }}>
        <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[15px]">{emailDetail?.subject || "Laden..."}</DialogTitle>
            <DialogDescription className="text-[12px] text-erp-text3">
              {emailDetail?.from && `Van: ${emailDetail.from}`}
              {emailDetail?.to && ` • Aan: ${emailDetail.to}`}
            </DialogDescription>
          </DialogHeader>
          {loadingDetail ? (
            <div className="py-8 text-center text-erp-text3 text-[13px]">E-mail laden...</div>
          ) : emailDetail?.bodyHtml ? (
            <div
              className="mt-3 text-[13px] text-erp-text1 [&_a]:text-erp-blue [&_img]:max-w-full"
              dangerouslySetInnerHTML={{ __html: emailDetail.bodyHtml }}
            />
          ) : (
            <div className="mt-3 text-[13px] text-erp-text1 whitespace-pre-wrap">
              {emailDetail?.bodyText || emailDetail?.snippet || ""}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Compose dialog */}
      <Dialog open={composing} onOpenChange={setComposing}>
        <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Nieuwe e-mail</DialogTitle>
            <DialogDescription className="text-[12px] text-erp-text3">Verstuur via {allConns.find(c => c.id === selectedConn)?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <input
              placeholder="Aan..."
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value)}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
            <input
              placeholder="Onderwerp"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
            <textarea
              placeholder="Bericht..."
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={8}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue resize-none"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSend}
                disabled={sending || !composeTo || !composeSubject}
                className="flex items-center gap-2 px-4 py-2 bg-erp-blue text-white text-[13px] font-medium rounded-lg hover:bg-erp-blue/90 transition disabled:opacity-50"
              >
                <Icons.Send className="w-3.5 h-3.5" />
                {sending ? "Verzenden..." : "Versturen"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
