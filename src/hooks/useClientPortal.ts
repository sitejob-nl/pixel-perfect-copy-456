import { useState, useCallback, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/client-portal`;

interface PortalData {
  portal: any;
  organization: any;
  summary: any;
}

async function portalFetch(token: string, action: string, body: any = {}) {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-portal-token": token,
    },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Fout bij laden");
  return data;
}

export function useClientPortal(token: string | null) {
  const [portal, setPortal] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const data = await portalFetch(token, "get_portal");
      setPortal(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return { portal, loading, error, reload: load };
}

export function usePortalContracts(token: string | null) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await portalFetch(token, "get_contracts");
      setData(res.contracts || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

export function usePortalInvoices(token: string | null) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await portalFetch(token, "get_invoices");
      setData(res.invoices || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

export async function getInvoiceDetail(token: string, invoiceId: string) {
  return portalFetch(token, "get_invoice_detail", { invoice_id: invoiceId });
}

export function usePortalQuotes(token: string | null) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await portalFetch(token, "get_quotes");
      setData(res.quotes || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

export async function getQuoteDetail(token: string, quoteId: string) {
  return portalFetch(token, "get_quote_detail", { quote_id: quoteId });
}

export async function respondToQuote(token: string, quoteId: string, accepted: boolean, reason?: string) {
  return portalFetch(token, "respond_quote", { quote_id: quoteId, accepted, reason });
}

export function usePortalMessagesClient(token: string | null) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await portalFetch(token, "get_messages");
      setData(res.messages || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [token, load]);

  return { data, loading, reload: load };
}

export async function sendPortalMessage(token: string, message: string) {
  return portalFetch(token, "send_message", { message });
}

export function usePortalOnboardingClient(token: string | null) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await portalFetch(token, "get_onboarding");
      setData(res.questions || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

export async function submitOnboarding(token: string, answers: { question_id: string; response_text: string }[]) {
  return portalFetch(token, "submit_onboarding", { answers });
}

export function usePortalFileRequestsClient(token: string | null) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await portalFetch(token, "get_file_requests");
      setData(res.file_requests || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

export async function getUploadUrl(token: string, fileName: string, fileType: string) {
  return portalFetch(token, "upload_url", { file_name: fileName, file_type: fileType });
}

export async function confirmUpload(token: string, fileRequestId: string, path: string) {
  return portalFetch(token, "confirm_upload", { file_request_id: fileRequestId, path });
}

export async function verifyPortalPassword(token: string, password: string) {
  return portalFetch(token, "verify_password", { password });
}
