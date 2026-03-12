import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Icons } from "@/components/erp/ErpIcons";

export default function AcceptInvitePage() {
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inviteToken = searchParams.get("invite_token");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const providers = user.app_metadata?.providers || [];
        const hasPassword = providers.includes("email");
        const confirmedAt = user.confirmed_at;
        const createdAt = user.created_at;
        if (hasPassword && confirmedAt && createdAt) {
          const confirmedTime = new Date(confirmedAt).getTime();
          const createdTime = new Date(createdAt).getTime();
          if (confirmedTime - createdTime > 5000) {
            setIsExistingUser(true);
          }
        }
      }
      setCheckingUser(false);
    };
    checkUser();
  }, []);

  const acceptViaEdgeFunction = async () => {
    if (!inviteToken) throw new Error("Geen invite token gevonden");

    const { data, error } = await supabase.functions.invoke("accept-invite", {
      body: { invite_token: inviteToken },
    });

    if (error) throw new Error(error.message || "Accepteren mislukt");
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleExistingUserAccept = async () => {
    setLoading(true);
    try {
      setAccepting(true);
      await acceptViaEdgeFunction();
      setDone(true);
      toast.success("Uitnodiging geaccepteerd! Je wordt doorgestuurd...");
      await queryClient.invalidateQueries({ queryKey: ["organization"] });
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err: any) {
      toast.error(err.message || "Er ging iets mis");
    } finally {
      setLoading(false);
      setAccepting(false);
    }
  };

  const handleNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Wachtwoord moet minimaal 6 tekens zijn");
      return;
    }

    setLoading(true);
    try {
      const { error: pwErr } = await supabase.auth.updateUser({
        password,
        data: fullName ? { full_name: fullName } : undefined,
      });
      if (pwErr) throw pwErr;

      if (fullName) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
        }
      }

      setAccepting(true);
      await acceptViaEdgeFunction();
      setDone(true);
      toast.success("Account ingesteld! Je wordt doorgestuurd...");
      await queryClient.invalidateQueries({ queryKey: ["organization"] });
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err: any) {
      toast.error(err.message || "Er ging iets mis");
    } finally {
      setLoading(false);
      setAccepting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-erp-bg0 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-erp-green/20 flex items-center justify-center mx-auto">
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="text-lg font-semibold text-erp-text0">Welkom bij het team!</h2>
          <p className="text-sm text-erp-text3">Je wordt doorgestuurd naar het dashboard...</p>
        </div>
      </div>
    );
  }

  if (checkingUser) {
    return (
      <div className="min-h-screen bg-erp-bg0 flex items-center justify-center p-4">
        <p className="text-sm text-erp-text3">Laden...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-erp-bg0 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-erp-blue flex items-center justify-center">
              <Icons.Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-erp-text0">SiteJob</span>
          </div>
          <p className="text-erp-text3 text-sm">
            {isExistingUser
              ? "Je bent uitgenodigd voor een organisatie"
              : "Stel je account in om te beginnen"}
          </p>
        </div>

        <div className="bg-erp-bg2 border border-erp-border0 rounded-xl p-6">
          {isExistingUser ? (
            <div className="space-y-4">
              <p className="text-sm text-erp-text2">
                Je hebt al een account. Klik hieronder om de uitnodiging te accepteren en toegang te krijgen tot de organisatie.
              </p>
              <button
                onClick={handleExistingUserAccept}
                disabled={loading}
                className="w-full bg-erp-blue text-white rounded-lg py-2.5 text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
              >
                {accepting ? "Uitnodiging accepteren..." : loading ? "Bezig..." : "Uitnodiging accepteren"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleNewUserSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-erp-text2 text-xs font-medium">Volledige naam</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-erp-bg3 border border-erp-border1 rounded-lg px-3 py-2.5 text-sm text-erp-text0 outline-none focus:border-erp-blue transition-colors"
                  placeholder="Jan de Vries"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-erp-text2 text-xs font-medium">Wachtwoord instellen *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-erp-bg3 border border-erp-border1 rounded-lg px-3 py-2.5 text-sm text-erp-text0 outline-none focus:border-erp-blue transition-colors"
                  placeholder="Min. 6 tekens"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-erp-blue text-white rounded-lg py-2.5 text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
              >
                {accepting ? "Uitnodiging accepteren..." : loading ? "Account instellen..." : "Account instellen & starten"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-erp-text3 mt-4">
          Al een account?{" "}
          <a href="/auth" className="text-erp-blue hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
