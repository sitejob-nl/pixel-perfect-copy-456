import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function OnboardingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  const generateSlug = (val: string) =>
    val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(generateSlug(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-organization", {
        body: { name: name.trim(), slug: slug.trim() },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast({ title: "Organisatie aangemaakt!", description: `${name} is klaar.` });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-erp-bg0 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-up">
        <div className="bg-erp-bg1 border border-erp-border0 rounded-xl p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-erp-text0 mb-1">Welkom bij SiteJob</h1>
            <p className="text-sm text-erp-text2">
              Maak je organisatie aan om te beginnen.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-erp-text1 mb-1.5">
                Organisatie naam
              </label>
              <input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Bijv. Mijn Bedrijf B.V."
                className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2.5 text-sm text-erp-text0 placeholder:text-erp-text3 outline-none focus:border-erp-blue transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-erp-text1 mb-1.5">
                Slug (URL)
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                placeholder="mijn-bedrijf"
                className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2.5 text-sm text-erp-text0 placeholder:text-erp-text3 outline-none focus:border-erp-blue transition-colors font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim() || !slug.trim()}
              className="w-full bg-erp-blue hover:bg-erp-blueLight text-white font-medium text-sm rounded-lg py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Aanmaken..." : "Organisatie aanmaken"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
