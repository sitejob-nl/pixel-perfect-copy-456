import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useClientPortal,
  usePortalContracts,
  usePortalInvoices,
  usePortalQuotes,
  usePortalMessagesClient,
  usePortalOnboardingClient,
  usePortalFileRequestsClient,
  getInvoiceDetail,
  getQuoteDetail,
  respondToQuote,
  verifyPortalPassword,
} from "@/hooks/useClientPortal";
import PortalChat from "@/components/portal/PortalChat";
import OnboardingForm from "@/components/portal/OnboardingForm";
import FileUploader from "@/components/portal/FileUploader";

// ─── Main Page ───

export default function ClientPortalPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { portal, loading, error } = useClientPortal(token || null);
  const [passwordOk, setPasswordOk] = useState(false);

  if (!token) return <PortalError msg="Geen portal token gevonden. Gebruik de link die u heeft ontvangen." />;
  if (loading) return <PortalLoader />;
  if (error) return <PortalError msg={error} />;
  if (!portal) return <PortalError msg="Portaal niet gevonden" />;

  // Password gate
  if (portal.portal.password_required && !passwordOk) {
    return <PasswordGate token={token} onSuccess={() => setPasswordOk(true)} />;
  }

  return <PortalShell token={token} portal={portal} />;
}

// ─── Password Gate ───

function PasswordGate({ token, onSuccess }: { token: string; onSuccess: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await verifyPortalPassword(token, pw);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Onjuist wachtwoord");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Beveiligd portaal</h1>
          <p className="text-sm text-gray-500 mt-1">Voer het wachtwoord in om toegang te krijgen</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            placeholder="Wachtwoord"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !pw}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Controleren..." : "Toegang"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Portal Shell ───

function PortalShell({ token, portal }: { token: string; portal: any }) {
  const enabledSections: string[] = portal.portal.enabled_sections || [];
  const sectionItems = [
    { key: "overview", label: "Overzicht", icon: "📊" },
    { key: "contracts", label: "Contracten", icon: "📝" },
    { key: "invoices", label: "Facturen", icon: "📄" },
    { key: "quotes", label: "Offertes", icon: "📋" },
    { key: "files", label: "Bestanden", icon: "📁" },
    { key: "onboarding", label: "Onboarding", icon: "✅" },
    { key: "messages", label: "Berichten", icon: "💬" },
  ].filter(s => enabledSections.includes(s.key));

  const [activeSection, setActiveSection] = useState(sectionItems[0]?.key || "overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const org = portal.organization;
  const contact = portal.portal.contact;
  const contactName = contact ? `${contact.first_name} ${contact.last_name || ""}`.trim() : "";
  const primaryColor = org?.primary_color || "#2563EB";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 h-16 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {org?.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: primaryColor }}>
              {(org?.name || "P").slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-gray-900 text-sm hidden sm:inline">{portal.portal.portal_name || org?.name || "Portaal"}</span>
        </div>
        <div className="flex items-center gap-2">
          {portal.summary.unread_messages > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {portal.summary.unread_messages}
            </span>
          )}
          <span className="text-sm text-gray-600">{contactName ? `Welkom, ${contact.first_name}! 👋` : ""}</span>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex w-56 min-h-[calc(100vh-4rem)] bg-white border-r border-gray-200 flex-col pt-4">
          <nav className="flex-1 px-3 space-y-1">
            {sectionItems.map(s => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === s.key
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="text-base">{s.icon}</span>
                {s.label}
                {s.key === "messages" && portal.summary.unread_messages > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {portal.summary.unread_messages}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile nav overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="fixed inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
            <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 z-50 pt-4">
              <nav className="px-3 space-y-1">
                {sectionItems.map(s => (
                  <button
                    key={s.key}
                    onClick={() => { setActiveSection(s.key); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === s.key
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-base">{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-8 max-w-5xl">
          {activeSection === "overview" && <OverviewSection portal={portal} />}
          {activeSection === "contracts" && <ContractsSection token={token} />}
          {activeSection === "invoices" && <InvoicesSection token={token} />}
          {activeSection === "quotes" && <QuotesSection token={token} />}
          {activeSection === "files" && <FilesSection token={token} />}
          {activeSection === "onboarding" && <OnboardingSection token={token} />}
          {activeSection === "messages" && <MessagesSection token={token} />}
        </main>
      </div>
    </div>
  );
}

// ─── Overview ───

function OverviewSection({ portal }: { portal: any }) {
  const summary = portal.summary;
  const customLinks = portal.portal.custom_links || [];

  return (
    <div className="space-y-6">
      {portal.portal.welcome_message && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{portal.portal.welcome_message}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon="📝" label="Contracten" value={summary.contracts} />
        <SummaryCard icon="📄" label="Facturen" value={summary.invoices} sub={summary.unpaid_invoices > 0 ? `${summary.unpaid_invoices} onbetaald` : undefined} />
        <SummaryCard icon="📋" label="Offertes" value={summary.quotes} />
        <SummaryCard icon="💬" label="Berichten" value={summary.unread_messages} sub={summary.unread_messages > 0 ? "ongelezen" : undefined} />
      </div>

      {customLinks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Handige links</h3>
          <div className="space-y-2">
            {customLinks.map((link: any, i: number) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                {link.label || link.url} →
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, sub }: { icon: string; label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-orange-500 mt-1">{sub}</div>}
    </div>
  );
}

// ─── Contracts ───

function ContractsSection({ token }: { token: string }) {
  const { data: contracts, loading } = usePortalContracts(token);
  const [selected, setSelected] = useState<any>(null);

  if (loading) return <SectionLoader />;

  if (selected) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)} className="text-sm text-blue-600 hover:underline">← Terug naar overzicht</button>
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{selected.title}</h2>
          <div className="flex gap-2 mb-4">
            <StatusBadge status={selected.status} />
            <span className="text-xs text-gray-500">{selected.contract_number}</span>
          </div>
          {selected.rendered_html ? (
            <div className="prose prose-sm max-w-none border-t border-gray-100 pt-4" dangerouslySetInnerHTML={{ __html: selected.rendered_html }} />
          ) : selected.content ? (
            <div className="text-sm text-gray-700 whitespace-pre-wrap border-t border-gray-100 pt-4">{selected.content}</div>
          ) : (
            <p className="text-gray-400 text-sm">Geen inhoud beschikbaar</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionHeader title="Contracten" count={contracts.length} />
      {contracts.length === 0 && <EmptyState msg="Geen contracten gevonden" />}
      {contracts.map((c: any) => (
        <div
          key={c.id}
          onClick={() => setSelected(c)}
          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 cursor-pointer transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-semibold text-gray-900">{c.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{c.contract_number} · {formatDate(c.created_at)}</div>
            </div>
            <StatusBadge status={c.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Invoices ───

function InvoicesSection({ token }: { token: string }) {
  const { data: invoices, loading } = usePortalInvoices(token);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await getInvoiceDetail(token, id);
      setDetail(res.invoice);
    } catch { /* ignore */ }
    setDetailLoading(false);
  };

  if (loading) return <SectionLoader />;

  if (detail) {
    const lines = detail.invoice_lines || [];
    return (
      <div className="space-y-4">
        <button onClick={() => setDetail(null)} className="text-sm text-blue-600 hover:underline">← Terug</button>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{detail.invoice_number}</h2>
              <p className="text-sm text-gray-500">{detail.customer_name}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">€{fmtNum(detail.total_amount)}</div>
              <PaymentBadge status={detail.payment_status} />
            </div>
          </div>
          {detail.payment_url && detail.payment_status !== "paid" && (
            <button
              onClick={() => window.open(detail.payment_url, "_blank")}
              className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
            >
              💳 Nu betalen
            </button>
          )}
          {lines.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs text-gray-500 font-medium">Omschrijving</th>
                  <th className="text-right py-2 text-xs text-gray-500 font-medium">Aantal</th>
                  <th className="text-right py-2 text-xs text-gray-500 font-medium">Prijs</th>
                  <th className="text-right py-2 text-xs text-gray-500 font-medium">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l: any) => (
                  <tr key={l.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{l.description}</td>
                    <td className="py-2 text-right text-gray-600">{l.quantity}</td>
                    <td className="py-2 text-right text-gray-600">€{fmtNum(l.unit_price)}</td>
                    <td className="py-2 text-right font-medium text-gray-900">€{fmtNum(l.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionHeader title="Facturen" count={invoices.length} />
      {invoices.length === 0 && <EmptyState msg="Geen facturen gevonden" />}
      {invoices.map((inv: any) => (
        <div
          key={inv.id}
          onClick={() => loadDetail(inv.id)}
          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 cursor-pointer transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-semibold text-gray-900">{inv.invoice_number}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {inv.customer_name} · {formatDate(inv.created_at)}
                {inv.due_date && <span> · Vervalt {formatDate(inv.due_date)}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-gray-900">€{fmtNum(inv.total_amount)}</div>
              <PaymentBadge status={inv.payment_status} />
            </div>
          </div>
          {inv.payment_url && inv.payment_status !== "paid" && (
            <button
              onClick={e => { e.stopPropagation(); window.open(inv.payment_url, "_blank"); }}
              className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
            >
              💳 Betalen
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Quotes ───

function QuotesSection({ token }: { token: string }) {
  const { data: quotes, loading, reload } = usePortalQuotes(token);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [respondDialog, setRespondDialog] = useState<{ quoteId: string; accept: boolean } | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [responding, setResponding] = useState(false);

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await getQuoteDetail(token, id);
      setDetail(res.quote);
    } catch { /* ignore */ }
    setDetailLoading(false);
  };

  const handleRespond = async () => {
    if (!respondDialog) return;
    setResponding(true);
    try {
      await respondToQuote(token, respondDialog.quoteId, respondDialog.accept, declineReason);
      setRespondDialog(null);
      setDeclineReason("");
      setDetail(null);
      reload();
    } catch { /* ignore */ }
    setResponding(false);
  };

  if (loading) return <SectionLoader />;

  if (detail) {
    const lines = detail.quote_lines || [];
    const canRespond = detail.status === "sent" && !detail.accepted_at && !detail.declined_at;
    return (
      <div className="space-y-4">
        <button onClick={() => setDetail(null)} className="text-sm text-blue-600 hover:underline">← Terug</button>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{detail.quote_number}</h2>
              {detail.valid_until && <p className="text-xs text-gray-500 mt-0.5">Geldig tot {formatDate(detail.valid_until)}</p>}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">€{fmtNum(detail.total_amount)}</div>
              <StatusBadge status={detail.status} />
            </div>
          </div>
          {lines.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs text-gray-500 font-medium">Omschrijving</th>
                  <th className="text-right py-2 text-xs text-gray-500 font-medium">Aantal</th>
                  <th className="text-right py-2 text-xs text-gray-500 font-medium">Prijs</th>
                  <th className="text-right py-2 text-xs text-gray-500 font-medium">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l: any) => (
                  <tr key={l.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{l.description}</td>
                    <td className="py-2 text-right text-gray-600">{l.quantity}</td>
                    <td className="py-2 text-right text-gray-600">€{fmtNum(l.unit_price)}</td>
                    <td className="py-2 text-right font-medium text-gray-900">€{fmtNum(l.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {canRespond && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRespondDialog({ quoteId: detail.id, accept: true })}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
              >
                ✓ Akkoord
              </button>
              <button
                onClick={() => setRespondDialog({ quoteId: detail.id, accept: false })}
                className="flex-1 py-3 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
              >
                ✗ Afwijzen
              </button>
            </div>
          )}
          {detail.accepted_at && <div className="text-green-600 text-sm font-medium">✓ Geaccepteerd op {formatDate(detail.accepted_at)}</div>}
          {detail.declined_at && <div className="text-red-600 text-sm font-medium">✗ Afgewezen op {formatDate(detail.declined_at)}{detail.decline_reason && ` — ${detail.decline_reason}`}</div>}
        </div>

        {/* Respond dialog */}
        {respondDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                {respondDialog.accept ? "Offerte akkoord" : "Offerte afwijzen"}
              </h3>
              {respondDialog.accept ? (
                <p className="text-sm text-gray-600">Weet u zeker dat u deze offerte wilt accepteren?</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Geef optioneel een reden op:</p>
                  <textarea
                    value={declineReason}
                    onChange={e => setDeclineReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Reden voor afwijzing..."
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setRespondDialog(null); setDeclineReason(""); }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleRespond}
                  disabled={responding}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                    respondDialog.accept ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {responding ? "Bezig..." : respondDialog.accept ? "Bevestigen" : "Afwijzen"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionHeader title="Offertes" count={quotes.length} />
      {quotes.length === 0 && <EmptyState msg="Geen offertes gevonden" />}
      {quotes.map((q: any) => (
        <div
          key={q.id}
          onClick={() => loadDetail(q.id)}
          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 cursor-pointer transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-semibold text-gray-900">{q.quote_number}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {formatDate(q.created_at)}
                {q.valid_until && <span> · Geldig tot {formatDate(q.valid_until)}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-gray-900">€{fmtNum(q.total_amount)}</div>
              <StatusBadge status={q.status} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Files ───

function FilesSection({ token }: { token: string }) {
  const { data: fileRequests, loading, reload } = usePortalFileRequestsClient(token);

  if (loading) return <SectionLoader />;

  const statusLabels: Record<string, [string, string]> = {
    pending: ["Wachtend", "bg-yellow-100 text-yellow-700"],
    uploaded: ["Geüpload", "bg-blue-100 text-blue-700"],
    approved: ["Goedgekeurd", "bg-green-100 text-green-700"],
    rejected: ["Afgewezen", "bg-red-100 text-red-700"],
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Bestanden" count={fileRequests.length} />
      {fileRequests.length === 0 && <EmptyState msg="Geen bestandsaanvragen" />}
      {fileRequests.map((fr: any) => {
        const [label, cls] = statusLabels[fr.status] || ["Onbekend", "bg-gray-100 text-gray-600"];
        return (
          <div key={fr.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold text-gray-900">{fr.title}</div>
                {fr.description && <p className="text-xs text-gray-500 mt-0.5">{fr.description}</p>}
                {fr.required && <span className="text-[10px] text-red-500 font-medium">Verplicht</span>}
              </div>
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
            </div>
            {fr.status === "pending" && (
              <FileUploader
                token={token}
                fileRequestId={fr.id}
                acceptedTypes={fr.accepted_types}
                onUploaded={reload}
              />
            )}
            {fr.status === "uploaded" && (
              <div className="text-sm text-blue-600">✓ Bestand geüpload — wacht op beoordeling</div>
            )}
            {fr.status === "approved" && (
              <div className="text-sm text-green-600">✓ Goedgekeurd</div>
            )}
            {fr.status === "rejected" && fr.review_notes && (
              <div className="text-sm text-red-600">Opmerking: {fr.review_notes}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Onboarding ───

function OnboardingSection({ token }: { token: string }) {
  const { data: questions, loading, reload } = usePortalOnboardingClient(token);

  if (loading) return <SectionLoader />;
  if (questions.length === 0) return <EmptyState msg="Geen onboarding vragen gevonden" />;

  return (
    <div className="space-y-4">
      <SectionHeader title="Onboarding" />
      <OnboardingForm token={token} questions={questions} onReload={reload} />
    </div>
  );
}

// ─── Messages ───

function MessagesSection({ token }: { token: string }) {
  const { data: messages, reload } = usePortalMessagesClient(token);

  return (
    <div className="space-y-4">
      <SectionHeader title="Berichten" />
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden h-[500px]">
        <PortalChat token={token} messages={messages} onReload={reload} variant="client" />
      </div>
    </div>
  );
}

// ─── Shared UI ───

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {count !== undefined && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>}
    </div>
  );
}

function SectionLoader() {
  return <div className="text-center py-12 text-gray-400 text-sm">Laden...</div>;
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
      {msg}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    draft: ["Concept", "bg-gray-100 text-gray-600"],
    sent: ["Verstuurd", "bg-blue-100 text-blue-700"],
    signed: ["Ondertekend", "bg-green-100 text-green-700"],
    completed: ["Voltooid", "bg-green-100 text-green-700"],
    accepted: ["Geaccepteerd", "bg-green-100 text-green-700"],
    declined: ["Afgewezen", "bg-red-100 text-red-700"],
    expired: ["Verlopen", "bg-red-100 text-red-700"],
    cancelled: ["Geannuleerd", "bg-gray-100 text-gray-600"],
    active: ["Actief", "bg-green-100 text-green-700"],
    pending: ["In afwachting", "bg-yellow-100 text-yellow-700"],
    paid: ["Betaald", "bg-green-100 text-green-700"],
    overdue: ["Te laat", "bg-red-100 text-red-700"],
  };
  const [label, cls] = map[status] || [status, "bg-gray-100 text-gray-600"];
  return <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    unpaid: ["Onbetaald", "bg-orange-100 text-orange-700"],
    pending: ["In behandeling", "bg-yellow-100 text-yellow-700"],
    paid: ["Betaald", "bg-green-100 text-green-700"],
    overdue: ["Verlopen", "bg-red-100 text-red-700"],
  };
  const [label, cls] = map[status] || [status, "bg-gray-100 text-gray-600"];
  return <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

function PortalError({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">Fout</h1>
        <p className="text-sm text-gray-500">{msg}</p>
      </div>
    </div>
  );
}

function PortalLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Portaal laden...</p>
      </div>
    </div>
  );
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  } catch { return d; }
}

function fmtNum(v: number) {
  return new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
}
