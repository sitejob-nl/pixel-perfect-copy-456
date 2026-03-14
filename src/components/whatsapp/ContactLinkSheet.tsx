import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useLinkContactToMessages } from "@/hooks/useWhatsApp";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
}

export default function ContactLinkSheet({ open, onOpenChange, phoneNumber }: Props) {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const linkMutation = useLinkContactToMessages();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"search" | "create">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [newContact, setNewContact] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: phoneNumber,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["contact-search", orgId, searchQuery],
    enabled: !!orgId && searchQuery.length >= 2,
    queryFn: async () => {
      const q = searchQuery.trim();
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, phone, mobile, email, company_id, companies(name)")
        .eq("organization_id", orgId!)
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,mobile.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const handleLink = async (contactId: string) => {
    try {
      await linkMutation.mutateAsync({ phoneNumber, contactId });
      toast.success("Contact gekoppeld aan alle berichten van dit nummer");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Koppelen mislukt");
    }
  };

  const handleCreate = async () => {
    if (!newContact.first_name.trim() || !orgId) return;
    try {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          organization_id: orgId,
          first_name: newContact.first_name.trim(),
          last_name: newContact.last_name.trim() || null,
          email: newContact.email.trim() || null,
          phone: newContact.phone.trim() || null,
          whatsapp_opt_in: true,
        })
        .select("id")
        .single();

      if (error) throw error;
      
      await linkMutation.mutateAsync({ phoneNumber, contactId: data.id });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact aangemaakt en gekoppeld");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Aanmaken mislukt");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-erp-bg2 border-erp-border0 w-[400px]">
        <SheetHeader>
          <SheetTitle className="text-erp-text0 text-[15px]">Contact koppelen</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Mode tabs */}
          <div className="flex gap-1 bg-erp-bg3 p-1 rounded-lg">
            <button
              onClick={() => setMode("search")}
              className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                mode === "search" ? "bg-erp-bg1 text-erp-text0 shadow-sm" : "text-erp-text3"
              }`}
            >
              Bestaand contact
            </button>
            <button
              onClick={() => setMode("create")}
              className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                mode === "create" ? "bg-erp-bg1 text-erp-text0 shadow-sm" : "text-erp-text3"
              }`}
            >
              Nieuw contact
            </button>
          </div>

          {mode === "search" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-erp-text3" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Zoek op naam, nummer of email..."
                  className="pl-8 text-[13px] bg-erp-bg3 border-erp-border0"
                />
              </div>
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {searchQuery.length < 2 ? (
                  <p className="text-[12px] text-erp-text3 text-center py-4">Typ minimaal 2 tekens om te zoeken</p>
                ) : searchResults.length === 0 ? (
                  <p className="text-[12px] text-erp-text3 text-center py-4">Geen resultaten</p>
                ) : (
                  searchResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleLink(c.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-erp-bg3 transition-colors flex items-center gap-3"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-[12px]"
                        style={{
                          background: `hsl(${(c.id.charCodeAt(0) * 47) % 360}, 35%, 20%)`,
                          color: `hsl(${(c.id.charCodeAt(0) * 47) % 360}, 55%, 65%)`,
                        }}
                      >
                        {(c.first_name[0] + (c.last_name?.[0] || "")).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-erp-text0 truncate">
                          {c.first_name} {c.last_name}
                        </div>
                        <div className="text-[11px] text-erp-text3 truncate">
                          {(c.companies as any)?.name && `${(c.companies as any).name} · `}
                          {c.phone || c.mobile || c.email || ""}
                        </div>
                      </div>
                      <Check className="w-4 h-4 text-erp-text3" />
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-erp-text2 text-[12px]">Voornaam *</Label>
                <Input
                  value={newContact.first_name}
                  onChange={(e) => setNewContact((p) => ({ ...p, first_name: e.target.value }))}
                  className="text-[13px] bg-erp-bg3 border-erp-border0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-erp-text2 text-[12px]">Achternaam</Label>
                <Input
                  value={newContact.last_name}
                  onChange={(e) => setNewContact((p) => ({ ...p, last_name: e.target.value }))}
                  className="text-[13px] bg-erp-bg3 border-erp-border0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-erp-text2 text-[12px]">Email</Label>
                <Input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                  className="text-[13px] bg-erp-bg3 border-erp-border0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-erp-text2 text-[12px]">Telefoonnummer</Label>
                <Input
                  value={newContact.phone}
                  onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
                  className="text-[13px] bg-erp-bg3 border-erp-border0"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={!newContact.first_name.trim() || linkMutation.isPending}
                className="w-full h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                style={{ background: "hsl(var(--primary))" }}
              >
                <UserPlus className="w-4 h-4" />
                Contact aanmaken & koppelen
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
