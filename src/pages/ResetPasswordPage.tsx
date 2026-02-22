import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Icons } from "@/components/erp/ErpIcons";
import { useEffect } from "react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      toast.error("Ongeldige reset link");
      navigate("/auth");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Wachtwoord moet minimaal 6 tekens zijn");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Wachtwoord succesvol gewijzigd!");
      navigate("/");
    }
  };

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
          <p className="text-erp-text3 text-sm">Stel een nieuw wachtwoord in</p>
        </div>
        <div className="bg-erp-bg2 border border-erp-border0 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-erp-text2 text-xs font-medium">Nieuw wachtwoord</label>
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
              {loading ? "Opslaan..." : "Wachtwoord opslaan"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
