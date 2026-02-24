import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErpButton } from "@/components/erp/ErpPrimitives";
import { useCreateActivity } from "@/hooks/useActivities";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultContactId?: string;
    defaultCompanyId?: string;
    defaultDealId?: string;
}

const activityTypes = [
    { value: "call", label: "📞 Belafspraak", icon: "📞" },
    { value: "email", label: "📧 E-mail", icon: "📧" },
    { value: "meeting", label: "🤝 Vergadering", icon: "🤝" },
    { value: "note", label: "📝 Notitie", icon: "📝" },
    { value: "task", label: "✅ Taak", icon: "✅" },
    { value: "follow_up", label: "🔄 Follow-up", icon: "🔄" },
    { value: "demo", label: "🖥️ Demo", icon: "🖥️" },
    { value: "proposal", label: "📄 Voorstel", icon: "📄" },
    { value: "whatsapp", label: "💬 WhatsApp", icon: "💬" },
];

const statusOptions = [
    { value: "completed", label: "Afgerond" },
    { value: "scheduled", label: "Gepland" },
    { value: "in_progress", label: "Bezig" },
    { value: "cancelled", label: "Geannuleerd" },
];

const priorityOptions = [
    { value: "low", label: "Laag" },
    { value: "medium", label: "Gemiddeld" },
    { value: "high", label: "Hoog" },
    { value: "urgent", label: "Urgent" },
];

export default function CreateActivityDialog({ open, onOpenChange, defaultContactId, defaultCompanyId, defaultDealId }: Props) {
    const [activityType, setActivityType] = useState("call");
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("completed");
    const [priority, setPriority] = useState("medium");
    const [scheduledAt, setScheduledAt] = useState("");
    const [durationMinutes, setDurationMinutes] = useState("");
    const [contactId, setContactId] = useState(defaultContactId ?? "");
    const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");

    const createActivity = useCreateActivity();
    const { data: contacts = [] } = useContacts();
    const { data: companies = [] } = useCompanies();

    const { data: orgMembership } = useQuery({
        queryKey: ["user-org"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            const { data, error } = await supabase
                .from("organization_members")
                .select("organization_id, user_id")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .limit(1)
                .single();
            if (error) throw error;
            return data;
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim()) {
            toast.error("Onderwerp is verplicht");
            return;
        }
        if (!orgMembership?.organization_id) {
            toast.error("Geen organisatie gevonden");
            return;
        }

        createActivity.mutate(
            {
                activity_type: activityType,
                subject: subject.trim(),
                description: description.trim() || null,
                status,
                priority,
                scheduled_at: scheduledAt || null,
                duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
                contact_id: contactId || null,
                company_id: companyId || null,
                deal_id: defaultDealId || null,
                organization_id: orgMembership.organization_id,
                user_id: orgMembership.user_id,
                completed_at: status === "completed" ? new Date().toISOString() : null,
            },
            {
                onSuccess: () => {
                    toast.success("Activiteit aangemaakt!");
                    onOpenChange(false);
                    resetForm();
                },
                onError: (err) => {
                    toast.error(`Fout: ${err.message}`);
                },
            }
        );
    };

    const resetForm = () => {
        setActivityType("call");
        setSubject("");
        setDescription("");
        setStatus("completed");
        setPriority("medium");
        setScheduledAt("");
        setDurationMinutes("");
        setContactId(defaultContactId ?? "");
        setCompanyId(defaultCompanyId ?? "");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-erp-text0">Activiteit loggen</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type + Priority row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-erp-text2 text-xs">Type *</Label>
                            <Select value={activityType} onValueChange={setActivityType}>
                                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-erp-bg2 border-erp-border0">
                                    {activityTypes.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-erp-text2 text-xs">Prioriteit</Label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-erp-bg2 border-erp-border0">
                                    {priorityOptions.map(p => (
                                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                        <Label className="text-erp-text2 text-xs">Onderwerp *</Label>
                        <Input
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"
                            placeholder="Bv. Intake gesprek met klant"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label className="text-erp-text2 text-xs">Beschrijving</Label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm min-h-[70px]"
                            placeholder="Notities over deze activiteit..."
                        />
                    </div>

                    {/* Status + Scheduled */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-erp-text2 text-xs">Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-erp-bg2 border-erp-border0">
                                    {statusOptions.map(s => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-erp-text2 text-xs">Gepland op</Label>
                            <Input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={e => setScheduledAt(e.target.value)}
                                className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"
                            />
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-1.5">
                        <Label className="text-erp-text2 text-xs">Duur (minuten)</Label>
                        <Input
                            type="number"
                            min="0"
                            value={durationMinutes}
                            onChange={e => setDurationMinutes(e.target.value)}
                            className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"
                            placeholder="30"
                        />
                    </div>

                    {/* Contact + Company selects */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-erp-text2 text-xs">Gekoppeld contact</Label>
                            <Select value={contactId} onValueChange={setContactId}>
                                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm">
                                    <SelectValue placeholder="Selecteer contact" />
                                </SelectTrigger>
                                <SelectContent className="bg-erp-bg2 border-erp-border0 max-h-[200px]">
                                    <SelectItem value="none">— Geen —</SelectItem>
                                    {contacts.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.first_name} {c.last_name ?? ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-erp-text2 text-xs">Gekoppeld bedrijf</Label>
                            <Select value={companyId} onValueChange={setCompanyId}>
                                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm">
                                    <SelectValue placeholder="Selecteer bedrijf" />
                                </SelectTrigger>
                                <SelectContent className="bg-erp-bg2 border-erp-border0 max-h-[200px]">
                                    <SelectItem value="none">— Geen —</SelectItem>
                                    {companies.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-2 pt-2">
                        <ErpButton onClick={() => onOpenChange(false)}>Annuleren</ErpButton>
                        <ErpButton primary>{createActivity.isPending ? "Opslaan..." : "Activiteit opslaan"}</ErpButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
