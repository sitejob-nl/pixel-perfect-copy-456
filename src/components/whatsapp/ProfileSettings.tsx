import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VERTICALS = ["RETAIL", "FOOD", "TRAVEL", "ENTERTAINMENT", "FINANCE", "TECH", "OTHER"];

export default function ProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    about: "", address: "", description: "", email: "", websites: [] as string[], vertical: "", profile_picture_url: "",
  });

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-send", { body: { action: "get_profile" } });
      if (res.data?.profile) {
        const p = res.data.profile;
        setProfile({
          about: p.about || "",
          address: p.address || "",
          description: p.description || "",
          email: p.email || "",
          websites: p.websites || [],
          vertical: p.vertical || "",
          profile_picture_url: p.profile_picture_url || "",
        });
      }
    } catch {} finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: any = { action: "update_profile" };
      if (profile.about) body.about = profile.about;
      if (profile.address) body.address = profile.address;
      if (profile.description) body.description = profile.description;
      if (profile.email) body.email = profile.email;
      if (profile.websites.length > 0) body.websites = profile.websites;
      if (profile.vertical) body.vertical = profile.vertical;
      
      const res = await supabase.functions.invoke("whatsapp-send", { body });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Profiel bijgewerkt");
    } catch (err: any) { toast.error(err.message || "Bijwerken mislukt"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-[13px] text-erp-text3 py-4">Profiel laden...</div>;

  return (
    <div className="space-y-4">
      {profile.profile_picture_url && (
        <div className="flex items-center gap-3">
          <img src={profile.profile_picture_url} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
          <span className="text-[11px] text-erp-text3">Profielfoto kan alleen via WhatsApp Manager worden gewijzigd</span>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-erp-text2 text-[12px]">Over ons (max 139 tekens)</Label>
        <Input value={profile.about} onChange={(e) => setProfile(p => ({ ...p, about: e.target.value }))} maxLength={139} className="text-[13px] bg-erp-bg3 border-erp-border0" />
      </div>
      <div className="space-y-1">
        <Label className="text-erp-text2 text-[12px]">Adres</Label>
        <Input value={profile.address} onChange={(e) => setProfile(p => ({ ...p, address: e.target.value }))} className="text-[13px] bg-erp-bg3 border-erp-border0" />
      </div>
      <div className="space-y-1">
        <Label className="text-erp-text2 text-[12px]">Beschrijving (max 512 tekens)</Label>
        <Textarea value={profile.description} onChange={(e) => setProfile(p => ({ ...p, description: e.target.value }))} maxLength={512} rows={3} className="text-[13px] bg-erp-bg3 border-erp-border0" />
      </div>
      <div className="space-y-1">
        <Label className="text-erp-text2 text-[12px]">Email</Label>
        <Input type="email" value={profile.email} onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))} className="text-[13px] bg-erp-bg3 border-erp-border0" />
      </div>
      <div className="space-y-1">
        <Label className="text-erp-text2 text-[12px]">Website</Label>
        <Input value={profile.websites[0] || ""} onChange={(e) => setProfile(p => ({ ...p, websites: [e.target.value] }))} className="text-[13px] bg-erp-bg3 border-erp-border0" />
      </div>
      <div className="space-y-1">
        <Label className="text-erp-text2 text-[12px]">Branche</Label>
        <Select value={profile.vertical} onValueChange={(v) => setProfile(p => ({ ...p, vertical: v }))}>
          <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-[13px]"><SelectValue placeholder="Selecteer branche" /></SelectTrigger>
          <SelectContent className="bg-erp-bg2 border-erp-border0">
            {VERTICALS.map(v => <SelectItem key={v} value={v} className="text-[13px]">{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <button onClick={handleSave} disabled={saving} className="px-4 h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40" style={{ background: "hsl(142, 50%, 30%)" }}>
        {saving ? "Opslaan..." : "Profiel bijwerken"}
      </button>
    </div>
  );
}
