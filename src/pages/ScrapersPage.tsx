import { useState, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Play, ArrowLeft, Download, Save, ExternalLink, Clock, DollarSign, Hash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import {
  useApifyActors,
  useApifyActor,
  useStartApifyRun,
  useApifyRunPoller,
  useGetRunResults,
  useSaveToCRM,
  useApifyRuns,
} from "@/hooks/useApifyDirect";

const categoryColors: Record<string, string> = {
  lead_generation: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  research: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  social_media: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  advanced: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const statusColors: Record<string, string> = {
  running: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  starting: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  succeeded: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/15 text-red-400 border-red-500/20",
  aborted: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

// ─── Actor Grid ──────────────────────────────────────────────
function ActorGrid({ actors, onSelect }: { actors: any[]; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {actors.map((actor: any) => (
        <Card
          key={actor.id}
          className="cursor-pointer hover:border-primary/50 transition-colors bg-card"
          onClick={() => onSelect(actor.id)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <span className="text-2xl">{actor.icon || "🔍"}</span>
              <Badge variant="outline" className={categoryColors[actor.category] || categoryColors.advanced}>
                {actor.category?.replace("_", " ")}
              </Badge>
            </div>
            <CardTitle className="text-sm mt-2">{actor.display_name}</CardTitle>
            <CardDescription className="text-xs line-clamp-2">{actor.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{actor.avg_duration_seconds || 60}s</span>
              {actor.estimated_cost_per_1k && (
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {actor.estimated_cost_per_1k}/1k</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Dynamic Form Field ─────────────────────────────────────
function DynamicField({ field, value, onChange }: { field: any; value: any; onChange: (v: any) => void }) {
  switch (field.type) {
    case "text":
    case "url":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
          <Input
            type={field.type === "url" ? "url" : "text"}
            placeholder={field.placeholder || ""}
            value={value || ""}
            onChange={e => onChange(e.target.value)}
          />
          {field.description && <p className="text-[11px] text-muted-foreground">{field.description}</p>}
        </div>
      );
    case "number":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
          <Input
            type="number"
            placeholder={field.placeholder || ""}
            min={field.min}
            max={field.max}
            value={value ?? ""}
            onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
          />
          {field.description && <p className="text-[11px] text-muted-foreground">{field.description}</p>}
        </div>
      );
    case "select":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
          <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder={field.placeholder || "Kies..."} /></SelectTrigger>
            <SelectContent>
              {(field.options || []).filter((opt: any) => {
                const v = typeof opt === "string" ? opt : opt.value;
                return v !== "" && v != null;
              }).map((opt: any) => (
                <SelectItem key={typeof opt === "string" ? opt : opt.value} value={typeof opt === "string" ? opt : opt.value}>
                  {typeof opt === "string" ? opt : opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.description && <p className="text-[11px] text-muted-foreground">{field.description}</p>}
        </div>
      );
    case "boolean":
      return (
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-xs">{field.label}</Label>
            {field.description && <p className="text-[11px] text-muted-foreground">{field.description}</p>}
          </div>
          <Switch checked={!!value} onCheckedChange={onChange} />
        </div>
      );
    case "multi_text":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
          <Textarea
            placeholder={field.placeholder || "Eén per regel"}
            value={Array.isArray(value) ? value.join("\n") : value || ""}
            onChange={e => onChange(e.target.value)}
            rows={4}
          />
          {field.description && <p className="text-[11px] text-muted-foreground">{field.description}</p>}
        </div>
      );
    case "textarea":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
          <Textarea
            placeholder={field.placeholder || ""}
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            rows={6}
          />
          {field.description && <p className="text-[11px] text-muted-foreground">{field.description}</p>}
        </div>
      );
    default:
      return null;
  }
}

// ─── Results Table ──────────────────────────────────────────
function ResultsTable({ results, outputFields, runId }: { results: any[]; outputFields: any[]; runId: string }) {
  const saveToCRM = useSaveToCRM();
  const visibleFields = useMemo(
    () => (outputFields || []).filter((f: any) => f.display !== false),
    [outputFields]
  );

  const exportCSV = useCallback(() => {
    if (!results.length) return;
    const headers = visibleFields.map((f: any) => f.label || f.key);
    const rows = results.map(row =>
      visibleFields.map((f: any) => {
        const val = row[f.key];
        return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val ?? "";
      })
    );
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scraper-results-${runId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results, visibleFields, runId]);

  const handleSaveToCRM = async () => {
    try {
      const result = await saveToCRM.mutateAsync({ runId, source: "apify_scraper", temperature: "cold" });
      toast.success(`${result.contacts_created || 0} contacten en ${result.companies_created || 0} bedrijven opgeslagen`);
    } catch (e: any) {
      toast.error(e.message || "Fout bij opslaan");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{results.length} resultaten</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
          </Button>
          <Button size="sm" onClick={handleSaveToCRM} disabled={saveToCRM.isPending}>
            {saveToCRM.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Opslaan in CRM
          </Button>
        </div>
      </div>
      <div className="border rounded-lg overflow-auto max-h-[420px]">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleFields.map((f: any) => (
                <TableHead key={f.key} className="text-xs whitespace-nowrap">{f.label || f.key}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((row: any, i: number) => (
              <TableRow key={i}>
                {visibleFields.map((f: any) => {
                  const val = row[f.key];
                  const isUrl = typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://"));
                  return (
                    <TableCell key={f.key} className="text-xs max-w-[200px] truncate">
                      {isUrl ? (
                        <a href={val} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          {new URL(val).hostname} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        String(val ?? "—")
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Scraper Tab (actors + form + run) ──────────────────────
function ScraperTab() {
  const { data: actors, isLoading: loadingActors } = useApifyActors();
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const { data: actorDetail } = useApifyActor(selectedActorId);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const startRun = useStartApifyRun();
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const pollerStatus = useApifyRunPoller(activeRunId);
  const getResults = useGetRunResults();
  const [results, setResults] = useState<any[] | null>(null);

  // Initialize defaults when actor loads
  const inputFields = actorDetail?.input_fields || [];
  const outputFields = actorDetail?.output_fields || [];

  const handleSelectActor = (id: string) => {
    setSelectedActorId(id);
    setFormValues({});
    setActiveRunId(null);
    setResults(null);
  };

  const handleStart = async () => {
    if (!selectedActorId) return;
    try {
      const res = await startRun.mutateAsync({ actorId: selectedActorId, input: formValues });
      setActiveRunId(res.run_id);
      setResults(null);
      toast.success("Scraper gestart!");
    } catch (e: any) {
      toast.error(e.message || "Kon scraper niet starten");
    }
  };

  // Load results when run succeeds
  const runFinished = pollerStatus?.status === "succeeded";
  const runFailed = pollerStatus?.status === "failed" || pollerStatus?.status === "aborted";

  const loadResults = async () => {
    if (!activeRunId) return;
    try {
      const data = await getResults.mutateAsync({ runId: activeRunId });
      setResults(data.items || data.results || []);
    } catch {
      toast.error("Kon resultaten niet laden");
    }
  };

  // Auto-load results on success
  useState(() => {
    // handled via effect below
  });

  if (runFinished && !results && !getResults.isPending) {
    loadResults();
  }

  if (loadingActors) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  // If no actor selected → show grid
  if (!selectedActorId) {
    return <ActorGrid actors={actors || []} onSelect={handleSelectActor} />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedActorId(null); setActiveRunId(null); setResults(null); }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Terug
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xl">{actorDetail?.icon || "🔍"}</span>
          <h2 className="text-base font-semibold">{actorDetail?.display_name || "Scraper"}</h2>
        </div>
      </div>

      {/* Form */}
      {!activeRunId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Configuratie</CardTitle>
            {actorDetail?.description && <CardDescription className="text-xs">{actorDetail.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {inputFields.map((field: any) => (
              <DynamicField
                key={field.key}
                field={field}
                value={formValues[field.key] ?? field.default ?? null}
                onChange={v => setFormValues(prev => ({ ...prev, [field.key]: v }))}
              />
            ))}
            <Button onClick={handleStart} disabled={startRun.isPending} className="w-full">
              {startRun.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Start Scraper
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Polling status */}
      {activeRunId && !runFinished && !runFailed && (
        <Card>
          <CardContent className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Scraper is bezig...</p>
            {pollerStatus?.items_so_far != null && (
              <p className="text-xs text-muted-foreground">
                <Hash className="w-3 h-3 inline mr-1" />{pollerStatus.items_so_far} items gevonden
              </p>
            )}
            <p className="text-xs text-muted-foreground">Status: {pollerStatus?.status || "starting"}</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {runFailed && (
        <Card className="border-destructive/50">
          <CardContent className="py-6">
            <p className="text-sm text-destructive font-medium">Scraper mislukt</p>
            <p className="text-xs text-muted-foreground mt-1">{pollerStatus?.error_message || "Onbekende fout"}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setActiveRunId(null); setResults(null); }}>
              Opnieuw proberen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {runFinished && results && (
        <ResultsTable results={results} outputFields={outputFields} runId={activeRunId!} />
      )}
      {runFinished && getResults.isPending && (
        <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      )}
    </div>
  );
}

// ─── Runs Tab ───────────────────────────────────────────────
function RunsTab() {
  const { data: runs, isLoading } = useApifyRuns();
  const getResults = useGetRunResults();
  const [viewRunId, setViewRunId] = useState<string | null>(null);
  const [viewResults, setViewResults] = useState<any[] | null>(null);
  const [viewOutputFields, setViewOutputFields] = useState<any[]>([]);

  const handleViewRun = async (run: any) => {
    setViewRunId(run.id);
    setViewOutputFields(run.apify_actor_configs?.output_fields || run.output_fields || []);
    if (run.status === "succeeded") {
      try {
        const data = await getResults.mutateAsync({ runId: run.id });
        setViewResults(data.items || data.results || []);
      } catch {
        toast.error("Kon resultaten niet laden");
      }
    }
  };

  if (viewRunId && viewResults) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setViewRunId(null); setViewResults(null); }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Terug naar overzicht
        </Button>
        <ResultsTable results={viewResults} outputFields={viewOutputFields} runId={viewRunId} />
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Actor</TableHead>
            <TableHead className="text-xs">Input</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Resultaten</TableHead>
            <TableHead className="text-xs">Duur</TableHead>
            <TableHead className="text-xs">Kosten</TableHead>
            <TableHead className="text-xs">CRM</TableHead>
            <TableHead className="text-xs">Gestart</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(!runs || runs.length === 0) ? (
            <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">Nog geen runs</TableCell></TableRow>
          ) : runs.map((run: any) => {
            const actorName = run.apify_actor_configs?.display_name || run.actor_id;
            const actorIcon = run.apify_actor_configs?.icon || "🔍";
            const inputSummary = run.user_input ? Object.values(run.user_input)[0] : "—";
            return (
              <TableRow
                key={run.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleViewRun(run)}
              >
                <TableCell className="text-xs">
                  <span className="mr-1.5">{actorIcon}</span>{actorName}
                </TableCell>
                <TableCell className="text-xs max-w-[150px] truncate text-muted-foreground">
                  {typeof inputSummary === "string" ? inputSummary : JSON.stringify(inputSummary)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[run.status] || statusColors.aborted}>
                    {run.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{run.results_count ?? "—"}</TableCell>
                <TableCell className="text-xs">{formatDuration(run.duration_seconds)}</TableCell>
                <TableCell className="text-xs">{run.cost_usd != null ? `$${Number(run.cost_usd).toFixed(2)}` : "—"}</TableCell>
                <TableCell className="text-xs">
                  {run.saved_to_crm ? (
                    <span className="text-emerald-400">✅ {run.saved_contacts_count || 0}C / {run.saved_companies_count || 0}B</span>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {run.created_at ? formatDistanceToNow(new Date(run.created_at), { addSuffix: true, locale: nl }) : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function ScrapersPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Scrapers</h1>
        <p className="text-sm text-muted-foreground">Start scrapers en bekijk resultaten</p>
      </div>
      <Tabs defaultValue="scrapers">
        <TabsList>
          <TabsTrigger value="scrapers">Scrapers</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
        </TabsList>
        <TabsContent value="scrapers" className="mt-4">
          <ScraperTab />
        </TabsContent>
        <TabsContent value="runs" className="mt-4">
          <RunsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
