import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/erp/ErpIcons";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import {
  useWebhookEndpoints, useWebhookTemplates, useWebhookTargetFields, useWebhookLogs,
  useCreateEndpoint, useUpdateEndpoint, useDeleteEndpoint, useGenerateApiKey, useTestWebhook,
} from "@/hooks/useWebhooks";

const TARGET_LABELS: Record<string, string> = {
  contacts: "Contacten",
  companies: "Bedrijven",
  deals: "Deals",
  raw_leads: "Raw Leads",
};

const TRANSFORMS = [
  { value: "", label: "Geen" },
  { value: "lowercase", label: "Kleine letters" },
  { value: "uppercase", label: "Hoofdletters" },
  { value: "trim", label: "Trim" },
  { value: "split_first", label: "Eerste naam" },
  { value: "split_last", label: "Achternaam" },
  { value: "phone_nl", label: "NL telefoon" },
  { value: "to_number", label: "Naar nummer" },
  { value: "to_boolean", label: "Naar boolean" },
  { value: "extract_email", label: "E-mail extractie" },
];

const DEDUP_ACTIONS = [
  { value: "update", label: "Bijwerken" },
  { value: "skip", label: "Overslaan" },
  { value: "create_duplicate", label: "Duplicaat aanmaken" },
];

const SUPABASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;

// --- Helper: extract all JSON paths from an object ---
function extractPaths(obj: any, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [];
  const paths: string[] = [];
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      paths.push(...extractPaths(obj[key], path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

// ===================== MAIN PAGE =====================
export default function WebhooksPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [apiKeyDialog, setApiKeyDialog] = useState<{ open: boolean; endpointId?: string; key?: string }>({ open: false });
  const [testDialog, setTestDialog] = useState<{ open: boolean; endpointId?: string; result?: any }>({ open: false });
  const [logDetail, setLogDetail] = useState<any>(null);
  const [logFilter, setLogFilter] = useState<string>("all");

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-erp-text0">Webhooks</h1>
          <p className="text-sm text-erp-text3 mt-1">Beheer inbound webhooks en API endpoints</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Icons.Plus className="w-4 h-4 mr-1" /> Nieuw endpoint
        </Button>
      </div>

      <Tabs defaultValue="endpoints">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints">
          <EndpointsTable
            onApiKey={(id) => setApiKeyDialog({ open: true, endpointId: id })}
            onTest={(id) => setTestDialog({ open: true, endpointId: id })}
          />
        </TabsContent>

        <TabsContent value="logs">
          <LogsTable filter={logFilter} onFilterChange={setLogFilter} onSelect={setLogDetail} />
        </TabsContent>
      </Tabs>

      <CreateEndpointDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ApiKeyDialog state={apiKeyDialog} onClose={() => setApiKeyDialog({ open: false })} />
      <TestDialog state={testDialog} onClose={() => setTestDialog({ open: false })} />
      <LogDetailDialog log={logDetail} onClose={() => setLogDetail(null)} />
    </div>
  );
}

// ===================== ENDPOINTS TABLE =====================
function EndpointsTable({ onApiKey, onTest }: { onApiKey: (id: string) => void; onTest: (id: string) => void }) {
  const { data: endpoints, isLoading } = useWebhookEndpoints();
  const { data: templates } = useWebhookTemplates();
  const updateEndpoint = useUpdateEndpoint();
  const deleteEndpoint = useDeleteEndpoint();

  const getTemplate = (platform: string) => templates?.find((t: any) => t.platform_key === platform);

  if (isLoading) return <div className="text-sm text-erp-text3 py-8 text-center">Laden...</div>;
  if (!endpoints?.length) return <div className="text-sm text-erp-text3 py-8 text-center">Geen endpoints. Maak een nieuw endpoint aan.</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Naam</TableHead>
          <TableHead>Platform</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>API Key</TableHead>
          <TableHead>Actief</TableHead>
          <TableHead>Test</TableHead>
          <TableHead className="text-right">Ontvangen</TableHead>
          <TableHead className="text-right">Verwerkt</TableHead>
          <TableHead className="text-right">Mislukt</TableHead>
          <TableHead>Laatste</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {endpoints.map((ep: any) => {
          const tmpl = getTemplate(ep.source_platform);
          return (
            <TableRow key={ep.id}>
              <TableCell className="font-medium">{ep.name}</TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5">
                  {tmpl?.icon && <span>{tmpl.icon}</span>}
                  <span className="text-sm">{tmpl?.display_name || ep.source_platform}</span>
                </span>
              </TableCell>
              <TableCell>{TARGET_LABELS[ep.target_table] || ep.target_table}</TableCell>
              <TableCell>
                <span className="text-xs text-erp-text3 font-mono">
                  {ep.api_key_prefix ? `${ep.api_key_prefix}...` : "Niet ingesteld"}
                </span>
              </TableCell>
              <TableCell>
                <Switch
                  checked={ep.is_active}
                  onCheckedChange={(v) => updateEndpoint.mutate({ id: ep.id, is_active: v })}
                />
              </TableCell>
              <TableCell>
                {ep.test_mode && <Badge variant="outline" className="text-xs">Test</Badge>}
              </TableCell>
              <TableCell className="text-right tabular-nums">{ep.total_received ?? 0}</TableCell>
              <TableCell className="text-right tabular-nums">{ep.total_processed ?? 0}</TableCell>
              <TableCell className="text-right tabular-nums">{ep.total_failed ?? 0}</TableCell>
              <TableCell className="text-xs text-erp-text3">
                {ep.last_received_at
                  ? formatDistanceToNow(new Date(ep.last_received_at), { addSuffix: true, locale: nl })
                  : "—"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onApiKey(ep.id)} title="API Key">
                    <Icons.Settings className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onTest(ep.id)} title="Testen">
                    <Icons.Zap className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => {
                      if (confirm("Endpoint verwijderen?")) deleteEndpoint.mutate(ep.id);
                    }}
                  >
                    <Icons.Trash className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ===================== CREATE ENDPOINT DIALOG =====================
function CreateEndpointDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [config, setConfig] = useState({
    name: "", description: "", target_table: "contacts",
    dedup_field: "none", dedup_action: "update",
    default_source: "", default_temperature: "warm",
  });
  const [mappings, setMappings] = useState<{ source_path: string; target_field: string; transform: string }[]>([]);

  const { data: templates } = useWebhookTemplates();
  const { data: targetFields } = useWebhookTargetFields(config.target_table);
  const createEndpoint = useCreateEndpoint();

  const reset = () => {
    setStep(1);
    setSelectedTemplate(null);
    setConfig({ name: "", description: "", target_table: "contacts", dedup_field: "", dedup_action: "update", default_source: "", default_temperature: "warm" });
    setMappings([]);
  };

  const selectTemplate = (tmpl: any) => {
    setSelectedTemplate(tmpl);
    setConfig((c) => ({ ...c, name: tmpl.display_name + " Webhook" }));
    // Preload default mappings
    if (tmpl.default_field_mappings?.length) {
      setMappings(tmpl.default_field_mappings.map((m: any) => ({
        source_path: m.source_path || "",
        target_field: m.target_field || "",
        transform: m.transform || "",
      })));
    }
    setStep(2);
  };

  const handleCreate = async () => {
    try {
      const defaultValues: Record<string, string> = {};
      if (config.default_source) defaultValues.source = config.default_source;
      if (config.default_temperature) defaultValues.temperature = config.default_temperature;

      await createEndpoint.mutateAsync({
        name: config.name,
        description: config.description || null,
        source_platform: selectedTemplate?.platform_key || "custom",
        target_table: config.target_table,
        field_mappings: mappings.filter((m) => m.source_path && m.target_field),
        dedup_field: config.dedup_field || null,
        dedup_action: config.dedup_action,
        default_values: Object.keys(defaultValues).length ? defaultValues : null,
        sample_payload: selectedTemplate?.payload_example || null,
      });
      toast.success("Endpoint aangemaakt");
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast.error(e.message || "Fout bij aanmaken");
    }
  };

  const sourcePaths = selectedTemplate?.payload_example ? extractPaths(selectedTemplate.payload_example) : [];

  const addMapping = () => setMappings((m) => [...m, { source_path: "", target_field: "", transform: "" }]);
  const removeMapping = (i: number) => setMappings((m) => m.filter((_, idx) => idx !== i));
  const updateMapping = (i: number, field: string, value: string) =>
    setMappings((m) => m.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Kies platform"}
            {step === 2 && "Configuratie"}
            {step === 3 && "Field Mapping"}
          </DialogTitle>
          <DialogDescription>
            Stap {step} van 3
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Template selection */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            {templates?.map((tmpl: any) => (
              <button
                key={tmpl.id}
                onClick={() => selectTemplate(tmpl)}
                className="flex items-start gap-3 p-3 rounded-lg border border-erp-border0 hover:bg-erp-hover text-left transition-colors"
              >
                <span className="text-2xl">{tmpl.icon}</span>
                <div>
                  <div className="text-sm font-medium text-erp-text0">{tmpl.display_name}</div>
                  <div className="text-xs text-erp-text3 mt-0.5">{tmpl.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Naam</Label>
              <Input value={config.name} onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value }))} />
            </div>
            <div>
              <Label>Beschrijving</Label>
              <Textarea value={config.description} onChange={(e) => setConfig((c) => ({ ...c, description: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Target tabel</Label>
              <Select value={config.target_table} onValueChange={(v) => setConfig((c) => ({ ...c, target_table: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TARGET_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dedup veld</Label>
                <Select value={config.dedup_field} onValueChange={(v) => setConfig((c) => ({ ...c, dedup_field: v }))}>
                  <SelectTrigger><SelectValue placeholder="Geen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="phone">Telefoon</SelectItem>
                    <SelectItem value="name">Naam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dedup actie</Label>
                <Select value={config.dedup_action} onValueChange={(v) => setConfig((c) => ({ ...c, dedup_action: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEDUP_ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Default bron</Label>
                <Input value={config.default_source} onChange={(e) => setConfig((c) => ({ ...c, default_source: e.target.value }))} placeholder="bijv. meta_lead_ad" />
              </div>
              <div>
                <Label>Default temperatuur</Label>
                <Select value={config.default_temperature} onValueChange={(v) => setConfig((c) => ({ ...c, default_temperature: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">Cold</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Vorige</Button>
              <Button onClick={() => setStep(3)} disabled={!config.name}>Volgende</Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Field Mapping */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-sm text-erp-text3 mb-2">
              Koppel bronvelden aan doelvelden. Default mappings zijn voorgeladen.
            </div>
            <div className="space-y-2">
              {mappings.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_140px_32px] gap-2 items-center">
                  {sourcePaths.length > 0 ? (
                    <Select value={m.source_path} onValueChange={(v) => updateMapping(i, "source_path", v)}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Bronveld" /></SelectTrigger>
                      <SelectContent>
                        {sourcePaths.map((p) => (
                          <SelectItem key={p} value={p}>
                            <span className="font-mono text-xs">{p}</span>
                            <span className="text-erp-text3 ml-1 text-xs">
                              ({String(getNestedValue(selectedTemplate?.payload_example, p)).slice(0, 20)})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={m.source_path} placeholder="bronpad"
                      onChange={(e) => updateMapping(i, "source_path", e.target.value)}
                      className="text-xs font-mono"
                    />
                  )}
                  <Select value={m.target_field} onValueChange={(v) => updateMapping(i, "target_field", v)}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Doelveld" /></SelectTrigger>
                    <SelectContent>
                      {targetFields?.map((f: any) => (
                        <SelectItem key={f.field_name} value={f.field_name}>
                          {f.display_label}{f.is_required && " *"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={m.transform} onValueChange={(v) => updateMapping(i, "transform", v)}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Transform" /></SelectTrigger>
                    <SelectContent>
                      {TRANSFORMS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMapping(i)}>
                    <Icons.Trash className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addMapping}>
              <Icons.Plus className="w-3.5 h-3.5 mr-1" /> Mapping toevoegen
            </Button>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Vorige</Button>
              <Button onClick={handleCreate} disabled={createEndpoint.isPending}>
                {createEndpoint.isPending ? "Aanmaken..." : "Endpoint aanmaken"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ===================== API KEY DIALOG =====================
function ApiKeyDialog({ state, onClose }: { state: { open: boolean; endpointId?: string; key?: string }; onClose: () => void }) {
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const generateApiKey = useGenerateApiKey();

  const handleGenerate = async () => {
    if (!state.endpointId) return;
    try {
      const res = await generateApiKey.mutateAsync(state.endpointId);
      setGeneratedKey(res.api_key);
    } catch (e: any) {
      toast.error(e.message || "Fout bij genereren API key");
    }
  };

  const handleClose = () => {
    setGeneratedKey(null);
    setConfirmed(false);
    onClose();
  };

  const webhookUrl = `${SUPABASE_URL}/functions/v1/webhook-receiver`;
  const curlExample = generatedKey
    ? `curl -X POST \\\n  ${webhookUrl} \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: ${generatedKey}" \\\n  -d '{"name":"Test","email":"test@example.com"}'`
    : "";

  return (
    <Dialog open={state.open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>API Key</DialogTitle>
          <DialogDescription>Genereer een nieuwe API key voor dit endpoint</DialogDescription>
        </DialogHeader>

        {!generatedKey && !confirmed && (
          <div className="space-y-4">
            <p className="text-sm text-erp-text2">
              Er wordt een nieuwe API key gegenereerd. Een eventuele bestaande key wordt ongeldig.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Annuleren</Button>
              <Button onClick={() => { setConfirmed(true); handleGenerate(); }} disabled={generateApiKey.isPending}>
                Genereer key
              </Button>
            </DialogFooter>
          </div>
        )}

        {confirmed && !generatedKey && (
          <div className="py-6 text-center text-sm text-erp-text3">Genereren...</div>
        )}

        {generatedKey && (
          <div className="space-y-4">
            <div className="bg-erp-bg3 rounded-lg p-3">
              <Label className="text-xs text-erp-text3">API Key</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs font-mono text-erp-text0 break-all flex-1">{generatedKey}</code>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(generatedKey); toast.success("Gekopieerd"); }}>
                  Kopieer
                </Button>
              </div>
            </div>
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-xs font-medium">
              ⚠️ Bewaar deze key veilig. Hij wordt maar één keer getoond!
            </div>
            <div>
              <Label className="text-xs text-erp-text3">Webhook URL</Label>
              <pre className="text-xs font-mono bg-erp-bg3 p-2 rounded mt-1 break-all">
                POST {webhookUrl}{"\n"}Header: X-API-Key: {generatedKey}
              </pre>
            </div>
            <div>
              <Label className="text-xs text-erp-text3">cURL voorbeeld</Label>
              <pre className="text-xs font-mono bg-erp-bg3 p-2 rounded mt-1 whitespace-pre-wrap break-all">{curlExample}</pre>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Sluiten</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ===================== TEST DIALOG =====================
function TestDialog({ state, onClose }: { state: { open: boolean; endpointId?: string; result?: any }; onClose: () => void }) {
  const [result, setResult] = useState<any>(null);
  const testWebhook = useTestWebhook();

  const handleTest = async () => {
    if (!state.endpointId) return;
    try {
      const res = await testWebhook.mutateAsync(state.endpointId);
      setResult(res);
    } catch (e: any) {
      toast.error(e.message || "Test mislukt");
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={state.open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Webhook Testen</DialogTitle>
          <DialogDescription>Test de mapping met een voorbeeldpayload</DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-4">
            <p className="text-sm text-erp-text2">Klik op "Testen" om een test-mapping uit te voeren met de sample payload.</p>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Annuleren</Button>
              <Button onClick={handleTest} disabled={testWebhook.isPending}>
                {testWebhook.isPending ? "Testen..." : "Testen"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="text-sm font-medium text-erp-text0">
              Target: <Badge variant="outline">{TARGET_LABELS[result.target_table] || result.target_table}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-erp-text3">Test Payload</Label>
                <pre className="text-xs font-mono bg-erp-bg3 p-3 rounded-lg mt-1 max-h-64 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(result.test_payload, null, 2)}
                </pre>
              </div>
              <div>
                <Label className="text-xs text-erp-text3">Mapping Resultaat</Label>
                <pre className="text-xs font-mono bg-erp-bg3 p-3 rounded-lg mt-1 max-h-64 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(result.mapped_result, null, 2)}
                </pre>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Sluiten</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ===================== LOGS TABLE =====================
function LogsTable({ filter, onFilterChange, onSelect }: { filter: string; onFilterChange: (v: string) => void; onSelect: (log: any) => void }) {
  const { data: endpoints } = useWebhookEndpoints();
  const { data: logs, isLoading } = useWebhookLogs(filter === "all" ? undefined : filter || undefined);

  const statusColor: Record<string, string> = {
    processed: "bg-green-500/10 text-green-600",
    received: "bg-blue-500/10 text-blue-600",
    failed: "bg-destructive/10 text-destructive",
    ignored: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[240px]"><SelectValue placeholder="Alle endpoints" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle endpoints</SelectItem>
            {endpoints?.map((ep: any) => (
              <SelectItem key={ep.id} value={ep.id}>{ep.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-sm text-erp-text3 py-8 text-center">Laden...</div>
      ) : !logs?.length ? (
        <div className="text-sm text-erp-text3 py-8 text-center">Geen logs gevonden.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tijd</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead className="text-right">Tijd (ms)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log: any) => (
              <TableRow key={log.id} className="cursor-pointer" onClick={() => onSelect(log)}>
                <TableCell className="text-xs text-erp-text3">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: nl })}
                </TableCell>
                <TableCell className="text-sm">{log.source_platform || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColor[log.status] || ""}>
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{TARGET_LABELS[log.mapped_to_table] || log.mapped_to_table || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {log.is_duplicate && <Badge variant="outline" className="text-xs">Dup</Badge>}
                    {log.is_test && <Badge variant="outline" className="text-xs">Test</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">{log.processing_time_ms ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ===================== LOG DETAIL DIALOG =====================
function LogDetailDialog({ log, onClose }: { log: any; onClose: () => void }) {
  if (!log) return null;
  return (
    <Dialog open={!!log} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Detail</DialogTitle>
          <DialogDescription>
            {log.source_platform} — {log.status}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {log.error_message && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              {log.error_message}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-erp-text3">Inkomende Payload</Label>
              <pre className="text-xs font-mono bg-erp-bg3 p-3 rounded-lg mt-1 max-h-72 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
            <div>
              <Label className="text-xs text-erp-text3">Gemapte Data</Label>
              <pre className="text-xs font-mono bg-erp-bg3 p-3 rounded-lg mt-1 max-h-72 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(log.mapped_data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
