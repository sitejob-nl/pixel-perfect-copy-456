import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VERTICALS = [
  { value: "AUTOMOTIVE", label: "Automotive" },
  { value: "BEAUTY", label: "Beauty" },
  { value: "RETAIL", label: "Retail" },
  { value: "FINANCE", label: "Financiën" },
  { value: "EDUCATION", label: "Onderwijs" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "FOOD", label: "Voeding" },
  { value: "GOVT", label: "Overheid" },
  { value: "HOTEL", label: "Hotel" },
  { value: "HEALTH", label: "Gezondheid" },
  { value: "NONPROFIT", label: "Non-profit" },
  { value: "PROF_SERVICES", label: "Professionele diensten" },
  { value: "TRAVEL", label: "Reizen" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "NOT_A_BIZ", label: "Geen bedrijf" },
  { value: "OTHER", label: "Overig" },
];

export default function ProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({
    about: "", address: "", description: "", email: "", websites: [] as string[], vertical: "", profile_picture_url: "",
  });

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-business-profile", {
        body: { action: "get" },
      });
      if (res.data && !res.data.error) {
        const p = res.data;
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
      const body: Record<string, unknown> = { action: "update" };
      if (profile.about) body.about = profile.about;
      if (profile.address) body.address = profile.address;
      if (profile.description) body.description = profile.description;
      if (profile.email) body.email = profile.email;
      if (profile.websites.length > 0) body.websites = profile.websites;
      if (profile.vertical) body.vertical = profile.vertical;

      const res = await supabase.functions.invoke("whatsapp-business-profile", { body });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Profiel bijgewerkt");
    } catch (err: any) { toast.error(err.message || "Bijwerken mislukt"); }
    finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Alleen afbeeldingen toegestaan");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bestand is te groot (max 5MB)");
      return;
    }

    setUploadingPhoto(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const res = await supabase.functions.invoke("whatsapp-business-profile", {
        body: {
          action: "upload_photo",
          file_base64: base64,
          file_type: file.type,
          file_name: file.name,
        },
      });

      if (res.data?.error) throw new Error(res.data.error);

      // Show local preview immediately
      setLocalPreview(URL.createObjectURL(file));
      toast.success("Profielfoto geüpload. Het kan even duren voordat deze overal zichtbaar is.");

      // Delayed reload — Meta needs time to process
      setTimeout(() => loadProfile(), 5000);
    } catch (err: any) {
      toast.error(err.message || "Upload mislukt");
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) return <div className="text-[13px] text-erp-text3 py-4">Profiel laden...</div>;

  return (
    <div className="space-y-4">
      {/* Profile Photo */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          {profile.profile_picture_url ? (
            <img src={profile.profile_picture_url} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-erp-bg3 flex items-center justify-center">
              <Camera className="w-6 h-6 text-erp-text3" />
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {uploadingPhoto ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Upload className="w-4 h-4 text-white" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>
        <div>
          <p className="text-[12px] text-erp-text1 font-medium">Profielfoto</p>
          <p className="text-[10px] text-erp-text3">
            {uploadingPhoto ? "Uploaden..." : "JPEG of PNG, min 192×192px, max 5MB"}
          </p>
        </div>
      </div>

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
            {VERTICALS.map(v => <SelectItem key={v.value} value={v.value} className="text-[13px]">{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <button onClick={handleSave} disabled={saving} className="px-4 h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40 bg-primary">
        {saving ? "Opslaan..." : "Profiel bijwerken"}
      </button>
    </div>
  );
}
