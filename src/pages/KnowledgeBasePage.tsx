import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Loader2, Upload, Download, Trash2, Search, FileText, Image, FileSpreadsheet,
  FileArchive, File, FolderOpen, Plus, Pencil, Filter, LayoutGrid, List,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import {
  useKBDocuments, useKBCategories, useUploadKBDocument,
  useUpdateKBDocument, useDeleteKBDocument, getKBSignedUrl,
  type KBDocument,
} from "@/hooks/useKnowledgeBase";

const DEFAULT_CATEGORIES = [
  "Algemeen", "HR & Personeel", "Financieel", "Contracten", "Handleidingen",
  "Marketing", "IT & Technisch", "Beleid & Procedures", "Templates",
];

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return <File className="w-5 h-5" />;
  if (fileType.startsWith("image/")) return <Image className="w-5 h-5 text-pink-400" />;
  if (fileType.includes("pdf")) return <FileText className="w-5 h-5 text-red-400" />;
  if (fileType.includes("spreadsheet") || fileType.includes("excel") || fileType.includes("csv"))
    return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
  if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("archive"))
    return <FileArchive className="w-5 h-5 text-yellow-400" />;
  if (fileType.includes("word") || fileType.includes("document"))
    return <FileText className="w-5 h-5 text-blue-400" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

const categoryColorMap: Record<string, string> = {
  "Algemeen": "bg-zinc-500/15 text-zinc-300 border-zinc-500/20",
  "HR & Personeel": "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "Financieel": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "Contracten": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "Handleidingen": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "Marketing": "bg-pink-500/15 text-pink-400 border-pink-500/20",
  "IT & Technisch": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  "Beleid & Procedures": "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "Templates": "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
};

function getCategoryColor(cat: string) {
  return categoryColorMap[cat] || "bg-muted text-muted-foreground border-border";
}

// ─── Upload Dialog ────────────────────────────────────────
function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const upload = useUploadKBDocument();
  const existingCategories = useKBCategories();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Algemeen");
  const [customCategory, setCustomCategory] = useState("");

  const allCategories = useMemo(() => {
    const set = new Set([...DEFAULT_CATEGORIES, ...existingCategories]);
    return Array.from(set).sort();
  }, [existingCategories]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const finalCategory = category === "__custom__" ? customCategory : category;
    if (!finalCategory.trim()) {
      toast.error("Kies een categorie");
      return;
    }
    try {
      await upload.mutateAsync({ file, title: title || file.name, description, category: finalCategory });
      toast.success("Document geüpload!");
      onOpenChange(false);
      setFile(null);
      setTitle("");
      setDescription("");
      setCategory("Algemeen");
      setCustomCategory("");
    } catch (e: any) {
      toast.error(e.message || "Upload mislukt");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Document uploaden</DialogTitle>
          <DialogDescription>Upload een bestand naar de kennisbank</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                {getFileIcon(file.type)}
                <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Klik om een bestand te kiezen</p>
                <p className="text-xs text-muted-foreground">Max 50 MB</p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Titel</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Document titel" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Beschrijving</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Waar gaat dit document over?"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Categorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allCategories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
                <SelectItem value="__custom__">+ Nieuwe categorie</SelectItem>
              </SelectContent>
            </Select>
            {category === "__custom__" && (
              <Input
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                placeholder="Categorie naam"
                className="mt-2"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button onClick={handleUpload} disabled={!file || upload.isPending}>
            {upload.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Uploaden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────
function EditDialog({ doc, open, onOpenChange }: { doc: KBDocument | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const update = useUpdateKBDocument();
  const existingCategories = useKBCategories();
  const [title, setTitle] = useState(doc?.title || "");
  const [description, setDescription] = useState(doc?.description || "");
  const [category, setCategory] = useState(doc?.category || "Algemeen");

  const allCategories = useMemo(() => {
    const set = new Set([...DEFAULT_CATEGORIES, ...existingCategories]);
    return Array.from(set).sort();
  }, [existingCategories]);

  // Sync state when doc changes
  useState(() => {
    if (doc) {
      setTitle(doc.title);
      setDescription(doc.description || "");
      setCategory(doc.category);
    }
  });

  const handleSave = async () => {
    if (!doc) return;
    try {
      await update.mutateAsync({ id: doc.id, title, description, category });
      toast.success("Document bijgewerkt");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Bijwerken mislukt");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Document bewerken</DialogTitle>
          <DialogDescription>Pas de details van dit document aan</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Titel</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Beschrijving</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Categorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allCategories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function KnowledgeBasePage() {
  const { data: docs, isLoading } = useKBDocuments();
  const deleteDoc = useDeleteKBDocument();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<KBDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KBDocument | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const existingCategories = useKBCategories();

  const filtered = useMemo(() => {
    let list = docs || [];
    if (filterCategory !== "all") {
      list = list.filter(d => d.category === filterCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.file_name.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [docs, filterCategory, search]);

  const handleDownload = async (doc: KBDocument) => {
    try {
      const url = await getKBSignedUrl(doc.file_url);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      a.target = "_blank";
      a.click();
    } catch {
      toast.error("Kon download link niet genereren");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc.mutateAsync({ id: deleteTarget.id, fileUrl: deleteTarget.file_url });
      toast.success("Document verwijderd");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Verwijderen mislukt");
    }
  };

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    (docs || []).forEach(d => {
      map[d.category] = (map[d.category] || 0) + 1;
    });
    return map;
  }, [docs]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Kennisbank</h1>
          <p className="text-sm text-muted-foreground">Bedrijfsdocumenten beheren en delen met je team</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Document uploaden
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{docs?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Totaal documenten</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{Object.keys(categoryCounts).length}</div>
            <div className="text-xs text-muted-foreground">Categorieën</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {formatFileSize((docs || []).reduce((sum, d) => sum + (d.file_size || 0), 0))}
            </div>
            <div className="text-xs text-muted-foreground">Totaal opslag</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {docs?.length ? formatDistanceToNow(new Date(docs[0].created_at), { locale: nl }) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">Laatste upload</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Zoek documenten..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-3.5 h-3.5 mr-2" />
            <SelectValue placeholder="Categorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle categorieën</SelectItem>
            {existingCategories.map(c => (
              <SelectItem key={c} value={c}>{c} ({categoryCounts[c] || 0})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex border rounded-md overflow-hidden">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card">
          <CardContent className="py-16 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {search || filterCategory !== "all"
                ? "Geen documenten gevonden voor deze zoekopdracht"
                : "Nog geen documenten geüpload"}
            </p>
            {!search && filterCategory === "all" && (
              <Button variant="outline" className="mt-4" onClick={() => setUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" /> Eerste document uploaden
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(doc => (
            <Card key={doc.id} className="bg-card hover:border-primary/30 transition-colors group">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate">{doc.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                  </div>
                </div>
                {doc.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{doc.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={getCategoryColor(doc.category)}>
                    {doc.category}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {doc.profiles?.full_name || "Onbekend"} · {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: nl })}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)}>
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditDoc(doc)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(doc)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Document</TableHead>
                <TableHead className="text-xs">Categorie</TableHead>
                <TableHead className="text-xs">Beschrijving</TableHead>
                <TableHead className="text-xs">Grootte</TableHead>
                <TableHead className="text-xs">Geüpload door</TableHead>
                <TableHead className="text-xs">Datum</TableHead>
                <TableHead className="text-xs w-[100px]">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getFileIcon(doc.file_type)}
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate max-w-[200px]">{doc.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{doc.file_name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getCategoryColor(doc.category)}>
                      {doc.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {doc.description || "—"}
                  </TableCell>
                  <TableCell className="text-xs">{formatFileSize(doc.file_size)}</TableCell>
                  <TableCell className="text-xs">{doc.profiles?.full_name || "Onbekend"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: nl })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditDoc(doc)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(doc)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <EditDialog doc={editDoc} open={!!editDoc} onOpenChange={v => { if (!v) setEditDoc(null); }} />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Document verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" wordt permanent verwijderd. Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteDoc.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
