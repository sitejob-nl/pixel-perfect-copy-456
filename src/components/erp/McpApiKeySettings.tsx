import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { ErpCard, Dot, Badge, fmt } from "./ErpPrimitives";
import { Icons } from "./ErpIcons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";

const scopeLabels: Record<string, string> = { read: "Lezen", write: "Schrijven", admin: "Admin" };

export default function McpApiKeySettings() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [expiryDays, setExpiryDays] = useState<string>("90");

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["mcp-keys", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mcp_api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["mcp-audit", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mcp_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleKey = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await (supabase as any)
        .from("mcp_api_keys")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-keys"] });
      toast.success("Opgeslagen");
    },
  });

  const deleteKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("mcp_api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-keys"] });
      toast.success("API key verwijderd");
    },
  });

  const generateKey = async () => {
    if (!name.trim() || !orgId) return;
    try {
      const { data, error } = await supabase.rpc("fn_mcp_generate_key" as any, {
        p_org_id: orgId,
        p_name: name.trim(),
        p_scopes: scopes,
        p_expires_days: expiryDays === "never" ? null : parseInt(expiryDays),
      });
      if (error) throw error;
      setGeneratedKey(data as string);
      qc.invalidateQueries({ queryKey: ["mcp-keys"] });
      toast.success("API key aangemaakt");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleScope = (scope: string) => {
    setScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);
  };

  const copyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      toast.success("Gekopieerd naar klembord");
    }
  };

  const getKeyStatus = (key: any) => {
    if (!key.is_active) return { label: "Inactief", color: "#6b7280" };
    if (key.expires_at && new Date(key.expires_at) < new Date()) return { label: "Verlopen", color: "#ef4444" };
    return { label: "Actief", color: "#22c55e" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-erp-text0">MCP / API Keys</h3>
          <p className="text-[12px] text-erp-text3 mt-0.5">Beheer API-sleutels voor externe toegang via het MCP protocol</p>
        </div>
        <button
          onClick={() => { setDialogOpen(true); setGeneratedKey(null); setName(""); setScopes(["read"]); setExpiryDays("90"); }}
          className="flex items-center gap-1.5 bg-erp-blue hover:brightness-110 text-white font-medium text-sm rounded-lg px-4 py-2 transition-colors"
        >
          <Icons.Plus className="w-4 h-4" /> Nieuwe key
        </button>
      </div>

      {/* Key list */}
      {isLoading ? (
        <ErpCard className="p-6 text-center text-erp-text3 text-sm">Laden...</ErpCard>
      ) : keys.length === 0 ? (
        <ErpCard className="p-6 text-center text-erp-text3 text-sm">Geen API keys aangemaakt</ErpCard>
      ) : (
        <div className="space-y-3">
          {keys.map((key: any) => {
            const status = getKeyStatus(key);
            return (
              <ErpCard key={key.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-semibold text-erp-text0">{key.name}</span>
                      <Badge color={status.color}><Dot color={status.color} size={5} />{status.label}</Badge>
                    </div>
                    <div className="text-[12px] text-erp-text3 font-mono mb-2">{key.key_prefix}</div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {(key.scopes as string[])?.map((s: string) => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-erp-bg4 text-erp-text2 font-medium">
                          {scopeLabels[s] ?? s}
                        </span>
                      ))}
                      <span className="text-[11px] text-erp-text3">
                        Aangemaakt: {format(new Date(key.created_at), "d MMM yyyy", { locale: nl })}
                      </span>
                      {key.last_used_at && (
                        <span className="text-[11px] text-erp-text3">
                          Laatst gebruikt: {formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true, locale: nl })}
                        </span>
                      )}
                      {key.usage_count > 0 && (
                        <span className="text-[11px] text-erp-text3">{key.usage_count}× gebruikt</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={key.is_active}
                      onCheckedChange={(checked) => toggleKey.mutate({ id: key.id, isActive: checked })}
                    />
                    <button
                      onClick={() => { if (confirm("API key verwijderen?")) deleteKey.mutate(key.id); }}
                      className="text-erp-text3 hover:text-erp-red transition-colors p-1"
                    >
                      <Icons.Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </ErpCard>
            );
          })}
        </div>
      )}

      {/* Audit log */}
      {auditLogs.length > 0 && (
        <div>
          <h4 className="text-[14px] font-semibold text-erp-text0 mb-3">Audit log</h4>
          <ErpCard className="overflow-hidden">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="text-left text-erp-text3 border-b border-erp-border0">
                  <th className="px-3 py-2 font-medium">Functie</th>
                  <th className="px-3 py-2 font-medium">Parameters</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Datum</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: any) => (
                  <tr key={log.id} className="border-b border-erp-border0 hover:bg-erp-hover/30">
                    <td className="px-3 py-2 font-mono text-erp-text1">{log.function_name}</td>
                    <td className="px-3 py-2 text-erp-text2 max-w-[200px] truncate">
                      {JSON.stringify(log.parameters)?.substring(0, 60)}
                    </td>
                    <td className="px-3 py-2">
                      <Dot color={log.success ? "#22c55e" : "#ef4444"} size={6} />
                    </td>
                    <td className="px-3 py-2 text-erp-text3">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: nl })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ErpCard>
        </div>
      )}

      {/* Generate dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-erp-text0">
              {generatedKey ? "API Key aangemaakt" : "Nieuwe API Key"}
            </DialogTitle>
          </DialogHeader>

          {generatedKey ? (
            <div className="space-y-4">
              <div className="bg-erp-bg4 border border-erp-orange/30 rounded-lg p-3">
                <p className="text-[12px] text-erp-orange font-medium mb-2">
                  ⚠️ Kopieer deze key nu. Hij wordt NOOIT meer getoond.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[12px] text-erp-text0 bg-erp-bg3 px-3 py-2 rounded font-mono break-all">
                    {generatedKey}
                  </code>
                  <button onClick={copyKey} className="shrink-0 bg-erp-blue text-white px-3 py-2 rounded-lg text-sm hover:brightness-110 transition-colors flex items-center gap-1">
                    <Icons.Copy className="w-3.5 h-3.5" /> Kopieer
                  </button>
                </div>
              </div>
              <button
                onClick={() => setDialogOpen(false)}
                className="w-full bg-erp-bg3 border border-erp-border0 text-erp-text0 font-medium text-sm rounded-lg py-2.5 hover:bg-erp-hover transition-colors"
              >
                Sluiten
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-erp-text1 mb-1">Naam</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="bijv. Production API"
                  className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 outline-none focus:border-erp-blue transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-erp-text1 mb-1.5">Rechten</label>
                <div className="flex gap-3">
                  {["read", "write", "admin"].map(scope => (
                    <label key={scope} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                        className="w-4 h-4 rounded border-erp-border1 accent-erp-blue"
                      />
                      <span className="text-[13px] text-erp-text0">{scopeLabels[scope]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-erp-text1 mb-1">Verloopt na</label>
                <Select value={expiryDays} onValueChange={setExpiryDays}>
                  <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-erp-bg3 border-erp-border0">
                    <SelectItem value="30" className="text-erp-text0 text-sm focus:bg-erp-hover">30 dagen</SelectItem>
                    <SelectItem value="90" className="text-erp-text0 text-sm focus:bg-erp-hover">90 dagen</SelectItem>
                    <SelectItem value="365" className="text-erp-text0 text-sm focus:bg-erp-hover">1 jaar</SelectItem>
                    <SelectItem value="never" className="text-erp-text0 text-sm focus:bg-erp-hover">Nooit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button
                onClick={generateKey}
                disabled={!name.trim() || scopes.length === 0}
                className="w-full bg-erp-blue hover:brightness-110 text-white font-medium text-sm rounded-lg py-2.5 transition-colors disabled:opacity-50"
              >
                <Icons.Key className="w-4 h-4 inline mr-1.5" /> Genereer API Key
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
