import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Icons } from "@/components/erp/ErpIcons";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account aangemaakt! Controleer je e-mail om te bevestigen.");
      setMode("login");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Wachtwoord reset e-mail verstuurd!");
      setMode("login");
    }
  };

  return (
    <div className="min-h-screen bg-erp-bg0 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-erp-blue flex items-center justify-center">
              <Icons.Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-erp-text0">SiteJob</span>
          </div>
          <p className="text-erp-text3 text-sm">
            {mode === "login" && "Log in op je account"}
            {mode === "register" && "Maak een nieuw account aan"}
            {mode === "forgot" && "Wachtwoord vergeten"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-erp-bg2 border border-erp-border0 rounded-xl p-6">
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-erp-text2 text-xs font-medium">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-erp-bg3 border border-erp-border1 rounded-lg px-3 py-2.5 text-sm text-erp-text0 outline-none focus:border-erp-blue transition-colors"
                  placeholder="jan@bedrijf.nl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-erp-text2 text-xs font-medium">Wachtwoord</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-erp-bg3 border border-erp-border1 rounded-lg px-3 py-2.5 text-sm text-erp-text0 outline-none focus:border-erp-blue transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-erp-blue text-white rounded-lg py-2.5 text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading ? "Inloggen..." : "Inloggen"}
              </button>
              <div className="flex justify-between text-xs">
                <button type="button" onClick={() => setMode("forgot")} className="text-erp-blue hover:underline bg-transparent border-none cursor-pointer">
                  Wachtwoord vergeten?
                </button>
                <button type="button" onClick={() => setMode("register")} className="text-erp-blue hover:underline bg-transparent border-none cursor-pointer">
                  Account aanmaken
                </button>
              </div>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-erp-text2 text-xs font-medium">Volledige naam</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-erp-bg3 border border-erp-border1 rounded-lg px-3 py-2.5 text-sm text-erp-text0 outline-none focus:border-erp-blue transition-colors"
                  placeholder="Jan de Vries"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-erp-text2 text-xs font-medium">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-erp-bg3 border border-erp-border1 rounded-lg px-3 py-2.5 text-sm text-erp-text0 outline-none focus:border-erp-blue transition-colors"
                  placeholder="jan@bedrijf.nl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-erp-text2 text-xs font-medium">Wachtwoord</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-erp-bg3 border border-erp-border1 rounded-lg px-3 py-2.5 text-sm text-erp-text0 outline-none focus:border-erp-blue transition-colors"
                  placeholder="Min. 6 tekens"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-erp-blue text-white rounded-lg py-2.5 text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading ? "Aanmaken..." : "Account aanmaken"}
              </button>
              <div className="text-center text-xs">
                <button type="button" onClick={() => setMode("login")} className="text-erp-blue hover:underline bg-transparent border-none cursor-pointer">
                  Al een account? Log in
                </button>
              </div>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-erp-text2 text-xs font-medium">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-erp-bg3 border border-erp-border1 rounded-lg px-3 py-2.5 text-sm text-erp-text0 outline-none focus:border-erp-blue transition-colors"
                  placeholder="jan@bedrijf.nl"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-erp-blue text-white rounded-lg py-2.5 text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading ? "Versturen..." : "Reset link versturen"}
              </button>
              <div className="text-center text-xs">
                <button type="button" onClick={() => setMode("login")} className="text-erp-blue hover:underline bg-transparent border-none cursor-pointer">
                  Terug naar inloggen
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
