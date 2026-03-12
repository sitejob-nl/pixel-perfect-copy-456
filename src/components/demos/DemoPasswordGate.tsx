import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface Props {
  hint?: string | null;
  onUnlock: (password: string) => void;
}

export default function DemoPasswordGate({ hint, onUnlock }: Props) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.trim()) { setError(true); return; }
    onUnlock(pw);
  };

  return (
    <div className="min-h-screen bg-erp-bg0 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Beveiligde demo</h2>
          <p className="text-sm text-muted-foreground text-center">
            Voer het wachtwoord in om deze demo te bekijken.
          </p>
          {hint && <p className="text-xs text-muted-foreground">Hint: {hint}</p>}
        </div>
        <Input
          type="password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setError(false); }}
          placeholder="Wachtwoord"
          className={error ? "border-destructive" : ""}
        />
        {error && <p className="text-xs text-destructive">Vul een wachtwoord in</p>}
        <Button type="submit" className="w-full">Bekijken</Button>
      </form>
    </div>
  );
}
