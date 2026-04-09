import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";

interface Props {
  hint?: string | null;
  onUnlock: (password: string) => Promise<void> | void;
}

export default function DemoPasswordGate({ hint, onUnlock }: Props) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [wrongPw, setWrongPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.trim()) { setError(true); return; }
    setWrongPw(false);
    setLoading(true);
    try {
      await onUnlock(pw);
      // If onUnlock doesn't throw or redirect, the password was wrong
      // (the parent sets unlocked=true on success, which unmounts this component)
      // Give a brief moment for the parent to update state
      setTimeout(() => {
        setLoading(false);
        setWrongPw(true);
      }, 300);
    } catch {
      setLoading(false);
      setWrongPw(true);
    }
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
          onChange={(e) => { setPw(e.target.value); setError(false); setWrongPw(false); }}
          placeholder="Wachtwoord"
          className={error || wrongPw ? "border-destructive" : ""}
        />
        {error && <p className="text-xs text-destructive">Vul een wachtwoord in</p>}
        {wrongPw && <p className="text-xs text-destructive">Onjuist wachtwoord</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Bekijken
        </Button>
      </form>
    </div>
  );
}
