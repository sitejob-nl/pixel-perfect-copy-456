import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePublicDemo, usePublicDemoPages, useSubmitFeedback, callDemoService } from "@/hooks/useDemos";
import DemoPasswordGate from "@/components/demos/DemoPasswordGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Globe, ThumbsUp, ThumbsDown, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PublicDemoPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: demo, isLoading, error } = usePublicDemo(slug);
  const { data: pages } = usePublicDemoPages(demo?.id);
  const submitFeedback = useSubmitFeedback();

  const [unlocked, setUnlocked] = useState(false);
  const [activePage, setActivePage] = useState<string>("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [fbName, setFbName] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbMessage, setFbMessage] = useState("");
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);

  // Set default active page
  useEffect(() => {
    if (pages?.length && !activePage) {
      setActivePage(pages[0].slug);
    }
  }, [pages, activePage]);

  // Track view on mount
  useEffect(() => {
    if (demo?.id) {
      callDemoService("track-view", { demo_id: demo.id, referrer: document.referrer }).catch(() => {});
    }
  }, [demo?.id]);

  // Listen for iframe nav
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "demo-nav") setActivePage(e.data.page);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Laden...</p>
      </div>
    );
  }

  if (error || !demo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Globe className="h-10 w-10 text-slate-400 mx-auto" />
          <p className="text-slate-800 font-medium">Demo niet gevonden</p>
          <p className="text-sm text-slate-500">Deze link is ongeldig of de demo is niet meer beschikbaar.</p>
        </div>
      </div>
    );
  }

  if (!demo.is_public) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Globe className="h-10 w-10 text-slate-400 mx-auto" />
          <p className="text-slate-800 font-medium">Deze demo is niet beschikbaar</p>
        </div>
      </div>
    );
  }

  // Password gate
  if (demo.password_hash && !unlocked) {
    return (
      <DemoPasswordGate
        hint={null}
        onUnlock={(pw) => {
          if (pw === demo.password_hash) {
            setUnlocked(true);
          }
        }}
      />
    );
  }

  const activeHtml = pages?.find((p: any) => p.slug === activePage)?.html_content
    || demo.demo_html || "";
  const allowFeedback = (demo as any).share_settings?.allow_feedback !== false;

  const handleQuickFeedback = (type: string) => {
    if (feedbackSent) return;
    submitFeedback.mutate({
      demo_id: demo.id,
      page_slug: activePage,
      feedback_type: type,
    });
    setFeedbackSent(type);
  };

  const handleCommentSubmit = () => {
    submitFeedback.mutate({
      demo_id: demo.id,
      page_slug: activePage,
      feedback_type: "comment",
      name: fbName || undefined,
      email: fbEmail || undefined,
      message: fbMessage,
    });
    setFeedbackOpen(false);
    setFeedbackSent("comment");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Nav */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-x-auto">
          <span className="text-sm font-semibold text-slate-900 shrink-0">
            {demo.company_name || demo.title || "Demo"}
          </span>
          {pages && pages.length > 1 && (
            <div className="flex gap-1">
              {pages.map((p: any) => (
                <button
                  key={p.slug}
                  onClick={() => setActivePage(p.slug)}
                  className={cn(
                    "text-xs px-3 py-1 rounded-full border transition-colors",
                    activePage === p.slug
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-500 hover:text-slate-700"
                  )}
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </div>
        <a
          href="https://sitejob.nl"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-slate-400 hover:text-slate-600 shrink-0 transition-colors"
        >
          Gebouwd door <span className="font-semibold">SiteJob</span> ↗
        </a>
      </header>

      {/* Iframe */}
      <div className="flex-1 flex items-start justify-center overflow-auto p-4">
        <iframe
          srcDoc={activeHtml}
          className="bg-white rounded-lg shadow-lg w-full"
          style={{ height: "calc(100vh - 120px)", maxWidth: "100%", border: "none" }}
          sandbox="allow-scripts"
          title={demo.title || "Demo"}
        />
      </div>

      {/* Feedback bar */}
      {allowFeedback && (
        <footer className="bg-white border-t border-slate-200 px-4 py-3">
          {feedbackSent ? (
            <p className="text-center text-sm text-slate-500">Bedankt voor je feedback! ✓</p>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-slate-600">Wat vind je van dit ontwerp?</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-slate-200 text-slate-600 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                onClick={() => handleQuickFeedback("like")}
              >
                <ThumbsUp className="h-3.5 w-3.5" /> Mooi
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                onClick={() => handleQuickFeedback("dislike")}
              >
                <ThumbsDown className="h-3.5 w-3.5" /> Kan beter
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                onClick={() => setFeedbackOpen(true)}
              >
                <MessageCircle className="h-3.5 w-3.5" /> Opmerking
              </Button>
            </div>
          )}
        </footer>
      )}

      {/* Comment dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Opmerking plaatsen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={fbName} onChange={(e) => setFbName(e.target.value)} placeholder="Naam (optioneel)" />
            <Input value={fbEmail} onChange={(e) => setFbEmail(e.target.value)} placeholder="Email (optioneel)" type="email" />
            <Textarea value={fbMessage} onChange={(e) => setFbMessage(e.target.value)} placeholder="Je opmerking..." rows={3} />
            <Button onClick={handleCommentSubmit} disabled={!fbMessage.trim()} className="w-full">
              Verstuur
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
