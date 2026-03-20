import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DemoTypeSelector from "./DemoTypeSelector";
import { Upload, FileCode, FileText } from "lucide-react";
import { useCreateDemo } from "@/hooks/useDemos";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function wrapJsxInHtml(jsxCode: string, fileName: string): string {
  // Strip import statements — libraries will be provided as UMD globals
  const strippedCode = jsxCode
    .replace(/^import\s+.*from\s+['"]react['"];?\s*$/gm, "")
    .replace(/^import\s+\{[^}]*\}\s+from\s+['"]react['"];?\s*$/gm, "")
    .replace(/^import\s+\{([^}]*)\}\s+from\s+['"]recharts['"];?\s*$/gm, 
      (_, imports) => `const { ${imports.trim()} } = Recharts;`)
    .replace(/^import\s+\{([^}]*)\}\s+from\s+['"]lucide-react['"];?\s*$/gm,
      (_, imports) => `const { ${imports.trim()} } = lucideReact;`)
    .replace(/^import\s+.*from\s+['"][^'"]+['"];?\s*$/gm, "// removed import");

  const title = fileName.replace(/\.(jsx|tsx)$/, "");

  // Build HTML parts separately to avoid template literal issues with </script>
  const head = [
    '<!DOCTYPE html>',
    '<html lang="nl">',
    '<head>',
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${title}</title>`,
    '<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>',
    '<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>',
    '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>',
    '<script src="https://unpkg.com/recharts@2/umd/Recharts.min.js"></script>',
    '<script src="https://unpkg.com/lucide-react@0.462.0/dist/umd/lucide-react.min.js"></script>',
    '<script src="https://cdn.tailwindcss.com"></script>',
    '<style>body{margin:0;font-family:system-ui,sans-serif}*{box-sizing:border-box}</style>',
    '</head>',
    '<body>',
    '<div id="root"></div>',
  ].join('\n');

  const scriptContent = [
    strippedCode,
    '',
    '// Auto-render',
    'const _C = typeof App !== "undefined" ? App : typeof Default !== "undefined" ? Default : null;',
    'if (_C) ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(_C));',
  ].join('\n');

  // Use array join to avoid escaping issues with closing script tags
  return head + '\n<script type="text/babel">\n' + scriptContent + '\n<' + '/script>\n</body>\n</html>';
}
export default function UploadDemoDialog({ open, onOpenChange }: Props) {
  const [html, setHtml] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"html" | "jsx">("html");
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [demoType, setDemoType] = useState("website");
  const [password, setPassword] = useState("");
  const createDemo = useCreateDemo();

  const processFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isJsx = ext === "jsx" || ext === "tsx";
    setFileName(file.name);
    setFileType(isJsx ? "jsx" : "html");

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      if (isJsx) {
        setHtml(wrapJsxInHtml(content, file.name));
      } else {
        setHtml(content);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleSubmit = () => {
    if (!html) return;
    createDemo.mutate(
      {
        demo_html: html,
        demo_type: demoType,
        company_name: companyName || undefined,
        title: companyName ? `${companyName} - ${demoType}` : `Upload - ${demoType}`,
        is_public: !!slug,
        public_slug: slug || undefined,
        password_hash: password || undefined,
      },
      { onSuccess: () => { onOpenChange(false); setHtml(""); setFileName(""); setCompanyName(""); setSlug(""); setPassword(""); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader><DialogTitle>Demo uploaden</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/40 transition-colors"
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {html ? (
              <div className="flex items-center justify-center gap-2 text-sm text-foreground mb-2">
                {fileType === "jsx" ? <FileCode className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                <span>{fileName}</span>
                <span className="text-primary">✓</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-2">Sleep een HTML of JSX bestand hierheen</p>
            )}
            <Input type="file" accept=".html,.htm,.jsx,.tsx" onChange={handleFile} className="max-w-xs mx-auto" />
          </div>

          {fileType === "jsx" && html && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              JSX wordt automatisch verpakt met React 18, Babel en Tailwind CSS zodat het als standalone demo werkt.
            </p>
          )}

          <div className="space-y-2">
            <Label>Bedrijfsnaam</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme B.V." />
          </div>

          <div className="space-y-2">
            <Label>Demo type</Label>
            <DemoTypeSelector value={demoType} onChange={setDemoType} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Publieke slug (optioneel)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="acme-demo" />
            </div>
            <div className="space-y-2">
              <Label>Wachtwoord (optioneel)</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={!html || createDemo.isPending} className="w-full">
            {createDemo.isPending ? "Uploaden..." : "Demo opslaan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}