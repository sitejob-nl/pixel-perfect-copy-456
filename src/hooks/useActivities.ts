import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type ActivityInsert = Database["public"]["Tables"]["activities"]["Insert"];
type ActivityUpdate = Database["public"]["Tables"]["activities"]["Update"];

export interface ActivityWithRelations extends ActivityRow {
    contacts: { first_name: string; last_name: string | null } | null;
    companies: { name: string } | null;
    deals: { title: string } | null;
}

interface ActivityFilters {
    contactId?: string;
    companyId?: string;
    dealId?: string;
    type?: string;
    status?: string;
    limit?: number;
}

export function useActivities(filters?: ActivityFilters) {
    return useQuery({
        queryKey: ["activities", filters],
        queryFn: async () => {
            let query = supabase
                .from("activities")
                .select("*, contacts(first_name, last_name), companies(name), deals(title)")
                .order("created_at", { ascending: false });

            if (filters?.contactId) query = query.eq("contact_id", filters.contactId);
            if (filters?.companyId) query = query.eq("company_id", filters.companyId);
            if (filters?.dealId) query = query.eq("deal_id", filters.dealId);
            if (filters?.type) query = query.eq("activity_type", filters.type);
            if (filters?.status) query = query.eq("status", filters.status);
            if (filters?.limit) query = query.limit(filters.limit);

            const { data, error } = await query;
            if (error) throw error;
            return data as ActivityWithRelations[];
        },
    });
}

export function useCreateActivity() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (activity: ActivityInsert) => {
            const { data, error } = await supabase
                .from("activities")
                .insert(activity)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["activities"] });
            qc.invalidateQueries({ queryKey: ["dashboard-activities"] });
        },
    });
}

export function useUpdateActivity() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: ActivityUpdate & { id: string }) => {
            const { error } = await supabase
                .from("activities")
                .update(updates)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["activities"] });
            qc.invalidateQueries({ queryKey: ["dashboard-activities"] });
        },
    });
}

export function useDeleteActivity() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("activities")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["activities"] });
            qc.invalidateQueries({ queryKey: ["dashboard-activities"] });
        },
    });
}
