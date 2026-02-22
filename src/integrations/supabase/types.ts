export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          company_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          metadata: Json | null
          organization_id: string
          outcome: string | null
          priority: string | null
          project_id: string | null
          scheduled_at: string | null
          status: string | null
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          metadata?: Json | null
          organization_id: string
          outcome?: string | null
          priority?: string | null
          project_id?: string | null
          scheduled_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          outcome?: string | null
          priority?: string | null
          project_id?: string | null
          scheduled_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_activities_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string
          id: string
          messages: Json
          organization_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          organization_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          organization_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          organization_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          annual_revenue: string | null
          city: string | null
          company_size: string | null
          country: string | null
          created_at: string
          email: string | null
          google_place_id: string | null
          google_rating: number | null
          google_review_count: number | null
          id: string
          industry: string | null
          kvk_number: string | null
          latitude: number | null
          linkedin_url: string | null
          longitude: number | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          postal_code: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          annual_revenue?: string | null
          city?: string | null
          company_size?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          id?: string
          industry?: string | null
          kvk_number?: string | null
          latitude?: number | null
          linkedin_url?: string | null
          longitude?: number | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          annual_revenue?: string | null
          city?: string | null
          company_size?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          id?: string
          industry?: string | null
          kvk_number?: string | null
          latitude?: number | null
          linkedin_url?: string | null
          longitude?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          assigned_to: string | null
          avatar_url: string | null
          company_id: string | null
          created_at: string
          custom_fields: Json | null
          customer_since: string | null
          data_source_id: string | null
          email: string | null
          email_opt_out: boolean | null
          enrichment_status: string | null
          first_name: string
          id: string
          job_title: string | null
          last_activity_at: string | null
          last_contacted_at: string | null
          last_name: string | null
          lead_score: number | null
          lead_status: string | null
          lifecycle_stage: string
          linkedin_url: string | null
          mobile: string | null
          next_follow_up_at: string | null
          organization_id: string
          phone: string | null
          score_tier: string | null
          source: string | null
          tags: string[] | null
          temperature: string | null
          unsubscribe_token: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp_opt_in: boolean | null
        }
        Insert: {
          assigned_to?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          customer_since?: string | null
          data_source_id?: string | null
          email?: string | null
          email_opt_out?: boolean | null
          enrichment_status?: string | null
          first_name: string
          id?: string
          job_title?: string | null
          last_activity_at?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          lead_score?: number | null
          lead_status?: string | null
          lifecycle_stage?: string
          linkedin_url?: string | null
          mobile?: string | null
          next_follow_up_at?: string | null
          organization_id: string
          phone?: string | null
          score_tier?: string | null
          source?: string | null
          tags?: string[] | null
          temperature?: string | null
          unsubscribe_token?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_opt_in?: boolean | null
        }
        Update: {
          assigned_to?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          customer_since?: string | null
          data_source_id?: string | null
          email?: string | null
          email_opt_out?: boolean | null
          enrichment_status?: string | null
          first_name?: string
          id?: string
          job_title?: string | null
          last_activity_at?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          lead_score?: number | null
          lead_status?: string | null
          lifecycle_stage?: string
          linkedin_url?: string | null
          mobile?: string | null
          next_follow_up_at?: string | null
          organization_id?: string
          phone?: string | null
          score_tier?: string | null
          source?: string | null
          tags?: string[] | null
          temperature?: string | null
          unsubscribe_token?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_opt_in?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contacts_data_source"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      content_calendar: {
        Row: {
          ai_generated: boolean | null
          ai_prompt: string | null
          contact_id: string | null
          content: string | null
          content_type: string | null
          created_at: string
          created_by: string | null
          id: string
          media_urls: string[] | null
          organization_id: string
          performance_data: Json | null
          platform: string
          project_id: string | null
          published_at: string | null
          published_url: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          ai_prompt?: string | null
          contact_id?: string | null
          content?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          media_urls?: string[] | null
          organization_id: string
          performance_data?: Json | null
          platform: string
          project_id?: string | null
          published_at?: string | null
          published_url?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          ai_prompt?: string | null
          contact_id?: string | null
          content?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          media_urls?: string[] | null
          organization_id?: string
          performance_data?: Json | null
          platform?: string
          project_id?: string | null
          published_at?: string | null
          published_url?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_calendar_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_calendar_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_calendar_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_calendar_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          created_at: string
          entity_type: string
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          options: Json | null
          organization_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          entity_type: string
          field_label: string
          field_name: string
          field_type: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json | null
          organization_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          entity_type?: string
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json | null
          organization_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          avg_cost_per_run: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          organization_id: string
          provider: string
          provider_config: Json
          schedule_active: boolean | null
          schedule_cron: string | null
          target_criteria: Json | null
          target_industries: string[] | null
          target_regions: string[] | null
          total_leads_found: number | null
          total_leads_imported: number | null
          total_runs: number | null
          updated_at: string
        }
        Insert: {
          avg_cost_per_run?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          organization_id: string
          provider: string
          provider_config?: Json
          schedule_active?: boolean | null
          schedule_cron?: string | null
          target_criteria?: Json | null
          target_industries?: string[] | null
          target_regions?: string[] | null
          total_leads_found?: number | null
          total_leads_imported?: number | null
          total_runs?: number | null
          updated_at?: string
        }
        Update: {
          avg_cost_per_run?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          organization_id?: string
          provider?: string
          provider_config?: Json
          schedule_active?: boolean | null
          schedule_cron?: string | null
          target_criteria?: Json | null
          target_industries?: string[] | null
          target_regions?: string[] | null
          total_leads_found?: number | null
          total_leads_imported?: number | null
          total_runs?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          currency: string | null
          description: string | null
          expected_close: string | null
          id: string
          lost_reason: string | null
          organization_id: string
          probability: number | null
          project_id: string | null
          quote_id: string | null
          stage_id: string
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          expected_close?: string | null
          id?: string
          lost_reason?: string | null
          organization_id: string
          probability?: number | null
          project_id?: string | null
          quote_id?: string | null
          stage_id: string
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          expected_close?: string | null
          id?: string
          lost_reason?: string | null
          organization_id?: string
          probability?: number | null
          project_id?: string | null
          quote_id?: string | null
          stage_id?: string
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deals_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deals_quote"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total: number | null
          quantity: number
          sort_order: number | null
          unit_price: number
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total?: number | null
          quantity?: number
          sort_order?: number | null
          unit_price?: number
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number | null
          quantity?: number
          sort_order?: number | null
          unit_price?: number
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          accounting_id: string | null
          accounting_synced_at: string | null
          contact_id: string | null
          created_at: string
          customer_address: string | null
          customer_email: string | null
          customer_kvk: string | null
          customer_name: string | null
          customer_vat: string | null
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_type: string | null
          project_id: string | null
          quote_id: string | null
          status: string
          subtotal: number | null
          total_amount: number | null
          updated_at: string
          vat_amount: number | null
          vat_rate: number | null
          visible_in_portal: boolean | null
        }
        Insert: {
          accounting_id?: string | null
          accounting_synced_at?: string | null
          contact_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_kvk?: string | null
          customer_name?: string | null
          customer_vat?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_type?: string | null
          project_id?: string | null
          quote_id?: string | null
          status?: string
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number | null
          visible_in_portal?: boolean | null
        }
        Update: {
          accounting_id?: string | null
          accounting_synced_at?: string | null
          contact_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_kvk?: string | null
          customer_name?: string | null
          customer_vat?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_type?: string | null
          project_id?: string | null
          quote_id?: string | null
          status?: string
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number | null
          visible_in_portal?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_enrichment: {
        Row: {
          ai_analyzed_at: string | null
          ai_company_summary: string | null
          ai_opportunity_notes: string | null
          ai_pain_points: string[] | null
          ai_pitch_brief: string | null
          cms_platform: string | null
          company_size: string | null
          contact_id: string
          created_at: string
          decision_makers: Json | null
          estimated_revenue: string | null
          founding_year: number | null
          google_categories: string[] | null
          google_maps_url: string | null
          google_place_id: string | null
          google_rating: number | null
          google_review_count: number | null
          has_crm: boolean | null
          has_erp: boolean | null
          id: string
          kvk_legal_form: string | null
          kvk_number: string | null
          kvk_registration_date: string | null
          kvk_sbi_codes: string[] | null
          kvk_trade_name: string | null
          last_audit_at: string | null
          lead_score: number | null
          linkedin_followers: number | null
          linkedin_url: string | null
          mobile_friendly: boolean | null
          organization_id: string
          page_load_speed_ms: number | null
          score_breakdown: Json | null
          score_tier: string | null
          scored_at: string | null
          sources: string[] | null
          ssl_enabled: boolean | null
          tech_stack: string[] | null
          updated_at: string
          website_screenshots: Json | null
        }
        Insert: {
          ai_analyzed_at?: string | null
          ai_company_summary?: string | null
          ai_opportunity_notes?: string | null
          ai_pain_points?: string[] | null
          ai_pitch_brief?: string | null
          cms_platform?: string | null
          company_size?: string | null
          contact_id: string
          created_at?: string
          decision_makers?: Json | null
          estimated_revenue?: string | null
          founding_year?: number | null
          google_categories?: string[] | null
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          has_crm?: boolean | null
          has_erp?: boolean | null
          id?: string
          kvk_legal_form?: string | null
          kvk_number?: string | null
          kvk_registration_date?: string | null
          kvk_sbi_codes?: string[] | null
          kvk_trade_name?: string | null
          last_audit_at?: string | null
          lead_score?: number | null
          linkedin_followers?: number | null
          linkedin_url?: string | null
          mobile_friendly?: boolean | null
          organization_id: string
          page_load_speed_ms?: number | null
          score_breakdown?: Json | null
          score_tier?: string | null
          scored_at?: string | null
          sources?: string[] | null
          ssl_enabled?: boolean | null
          tech_stack?: string[] | null
          updated_at?: string
          website_screenshots?: Json | null
        }
        Update: {
          ai_analyzed_at?: string | null
          ai_company_summary?: string | null
          ai_opportunity_notes?: string | null
          ai_pain_points?: string[] | null
          ai_pitch_brief?: string | null
          cms_platform?: string | null
          company_size?: string | null
          contact_id?: string
          created_at?: string
          decision_makers?: Json | null
          estimated_revenue?: string | null
          founding_year?: number | null
          google_categories?: string[] | null
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          has_crm?: boolean | null
          has_erp?: boolean | null
          id?: string
          kvk_legal_form?: string | null
          kvk_number?: string | null
          kvk_registration_date?: string | null
          kvk_sbi_codes?: string[] | null
          kvk_trade_name?: string | null
          last_audit_at?: string | null
          lead_score?: number | null
          linkedin_followers?: number | null
          linkedin_url?: string | null
          mobile_friendly?: boolean | null
          organization_id?: string
          page_load_speed_ms?: number | null
          score_breakdown?: Json | null
          score_tier?: string | null
          scored_at?: string | null
          sources?: string[] | null
          ssl_enabled?: boolean | null
          tech_stack?: string[] | null
          updated_at?: string
          website_screenshots?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_enrichment_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_enrichment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          is_active: boolean | null
          joined_at: string | null
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          default_currency: string | null
          default_vat_rate: number | null
          email: string | null
          fiscal_year_start: number | null
          font_family: string | null
          iban: string | null
          id: string
          invoice_prefix: string | null
          kvk_number: string | null
          logo_url: string | null
          max_contacts: number | null
          max_users: number | null
          name: string
          phone: string | null
          plan: string | null
          postal_code: string | null
          primary_color: string | null
          project_prefix: string | null
          quote_prefix: string | null
          secondary_color: string | null
          slug: string
          updated_at: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          default_currency?: string | null
          default_vat_rate?: number | null
          email?: string | null
          fiscal_year_start?: number | null
          font_family?: string | null
          iban?: string | null
          id?: string
          invoice_prefix?: string | null
          kvk_number?: string | null
          logo_url?: string | null
          max_contacts?: number | null
          max_users?: number | null
          name: string
          phone?: string | null
          plan?: string | null
          postal_code?: string | null
          primary_color?: string | null
          project_prefix?: string | null
          quote_prefix?: string | null
          secondary_color?: string | null
          slug: string
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          default_currency?: string | null
          default_vat_rate?: number | null
          email?: string | null
          fiscal_year_start?: number | null
          font_family?: string | null
          iban?: string | null
          id?: string
          invoice_prefix?: string | null
          kvk_number?: string | null
          logo_url?: string | null
          max_contacts?: number | null
          max_users?: number | null
          name?: string
          phone?: string | null
          plan?: string | null
          postal_code?: string | null
          primary_color?: string | null
          project_prefix?: string | null
          quote_prefix?: string | null
          secondary_color?: string | null
          slug?: string
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      outreach_enrollments: {
        Row: {
          completed_at: string | null
          contact_id: string
          conversion_deal_id: string | null
          converted_at: string | null
          created_at: string
          current_step: number | null
          enrolled_at: string
          enrolled_by: string | null
          id: string
          last_action_at: string | null
          next_action_at: string | null
          organization_id: string
          sequence_id: string
          status: string
          step_results: Json | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          conversion_deal_id?: string | null
          converted_at?: string | null
          created_at?: string
          current_step?: number | null
          enrolled_at?: string
          enrolled_by?: string | null
          id?: string
          last_action_at?: string | null
          next_action_at?: string | null
          organization_id: string
          sequence_id: string
          status?: string
          step_results?: Json | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          conversion_deal_id?: string | null
          converted_at?: string | null
          created_at?: string
          current_step?: number | null
          enrolled_at?: string
          enrolled_by?: string | null
          id?: string
          last_action_at?: string | null
          next_action_at?: string | null
          organization_id?: string
          sequence_id?: string
          status?: string
          step_results?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_enrollments_conversion_deal_id_fkey"
            columns: ["conversion_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_enrollments_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "outreach_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_sequences: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          steps: Json
          target_industries: string[] | null
          target_tier: string | null
          total_completed: number | null
          total_converted: number | null
          total_enrolled: number | null
          total_replied: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          steps?: Json
          target_industries?: string[] | null
          target_tier?: string | null
          total_completed?: number | null
          total_converted?: number | null
          total_enrolled?: number | null
          total_replied?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          steps?: Json
          target_industries?: string[] | null
          target_tier?: string | null
          total_completed?: number | null
          total_converted?: number | null
          total_enrolled?: number | null
          total_replied?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_lost: boolean | null
          is_won: boolean | null
          name: string
          organization_id: string
          probability: number | null
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean | null
          is_won?: boolean | null
          name: string
          organization_id: string
          probability?: number | null
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean | null
          is_won?: boolean | null
          name?: string
          organization_id?: string
          probability?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          language: string | null
          phone: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          language?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          organization_id: string
          project_id: string
          uploaded_by: string | null
          uploaded_by_client: boolean | null
          visible_in_portal: boolean | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          organization_id: string
          project_id: string
          uploaded_by?: string | null
          uploaded_by_client?: boolean | null
          visible_in_portal?: boolean | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          organization_id?: string
          project_id?: string
          uploaded_by?: string | null
          uploaded_by_client?: boolean | null
          visible_in_portal?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_value: number | null
          assigned_to: string | null
          budget_range: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          deadline: string | null
          deal_id: string | null
          description: string | null
          end_date: string | null
          estimated_value: number | null
          id: string
          logo_url: string | null
          name: string
          notes: string | null
          organization_id: string
          preview_url: string | null
          primary_color: string | null
          priority: string | null
          project_number: string
          service_type: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_value?: number | null
          assigned_to?: string | null
          budget_range?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          deadline?: string | null
          deal_id?: string | null
          description?: string | null
          end_date?: string | null
          estimated_value?: number | null
          id?: string
          logo_url?: string | null
          name: string
          notes?: string | null
          organization_id: string
          preview_url?: string | null
          primary_color?: string | null
          priority?: string | null
          project_number: string
          service_type?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_value?: number | null
          assigned_to?: string | null
          budget_range?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          deadline?: string | null
          deal_id?: string | null
          description?: string | null
          end_date?: string | null
          estimated_value?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          preview_url?: string | null
          primary_color?: string | null
          priority?: string | null
          project_number?: string
          service_type?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          line_total: number | null
          quantity: number
          quote_id: string
          sort_order: number | null
          unit_price: number
          vat_rate: number | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          line_total?: number | null
          quantity?: number
          quote_id: string
          sort_order?: number | null
          unit_price?: number
          vat_rate?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          line_total?: number | null
          quantity?: number
          quote_id?: string
          sort_order?: number | null
          unit_price?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          contact_id: string | null
          created_at: string
          deal_id: string | null
          discount_amount: number | null
          discount_type: string | null
          id: string
          notes: string | null
          organization_id: string
          payment_terms: string | null
          payment_type: string | null
          project_id: string | null
          quote_number: string
          signature_url: string | null
          signed_at: string | null
          signed_by: string | null
          status: string
          subtotal: number | null
          total_amount: number | null
          updated_at: string
          valid_until: string | null
          vat_amount: number | null
          vat_rate: number | null
          visible_in_portal: boolean | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          payment_type?: string | null
          project_id?: string | null
          quote_number: string
          signature_url?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
          visible_in_portal?: boolean | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          payment_type?: string | null
          project_id?: string | null
          quote_number?: string
          signature_url?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
          visible_in_portal?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_leads: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          contact_name: string | null
          created_at: string
          data_source_id: string
          duplicate_match_type: string | null
          duplicate_of_contact_id: string | null
          email: string | null
          expires_at: string | null
          google_categories: string[] | null
          google_place_id: string | null
          google_rating: number | null
          google_review_count: number | null
          id: string
          imported_as_contact_id: string | null
          industry: string | null
          kvk_number: string | null
          latitude: number | null
          lead_score: number | null
          longitude: number | null
          organization_id: string
          phone: string | null
          postal_code: string | null
          processing_error: string | null
          processing_status: string
          raw_data: Json
          scrape_run_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          data_source_id: string
          duplicate_match_type?: string | null
          duplicate_of_contact_id?: string | null
          email?: string | null
          expires_at?: string | null
          google_categories?: string[] | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          id?: string
          imported_as_contact_id?: string | null
          industry?: string | null
          kvk_number?: string | null
          latitude?: number | null
          lead_score?: number | null
          longitude?: number | null
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          processing_error?: string | null
          processing_status?: string
          raw_data?: Json
          scrape_run_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          data_source_id?: string
          duplicate_match_type?: string | null
          duplicate_of_contact_id?: string | null
          email?: string | null
          expires_at?: string | null
          google_categories?: string[] | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          id?: string
          imported_as_contact_id?: string | null
          industry?: string | null
          kvk_number?: string | null
          latitude?: number | null
          lead_score?: number | null
          longitude?: number | null
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          processing_error?: string | null
          processing_status?: string
          raw_data?: Json
          scrape_run_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_leads_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_leads_duplicate_of_contact_id_fkey"
            columns: ["duplicate_of_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_leads_imported_as_contact_id_fkey"
            columns: ["imported_as_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_leads_scrape_run_id_fkey"
            columns: ["scrape_run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_rules: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          field_path: string
          id: string
          is_active: boolean | null
          name: string
          operator: string
          organization_id: string
          score_delta: number
          sort_order: number | null
          value: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          field_path: string
          id?: string
          is_active?: boolean | null
          name: string
          operator: string
          organization_id: string
          score_delta?: number
          sort_order?: number | null
          value?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          field_path?: string
          id?: string
          is_active?: boolean | null
          name?: string
          operator?: string
          organization_id?: string
          score_delta?: number
          sort_order?: number | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scoring_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_runs: {
        Row: {
          after_dedup_count: number | null
          completed_at: string | null
          cost_credits: number | null
          cost_euros: number | null
          created_at: string
          data_source_id: string
          enriched_count: number | null
          error_message: string | null
          high_score_count: number | null
          id: string
          new_contacts_count: number | null
          organization_id: string
          provider_dataset_id: string | null
          provider_run_id: string | null
          raw_results_count: number | null
          started_at: string | null
          status: string
          trigger_type: string
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          after_dedup_count?: number | null
          completed_at?: string | null
          cost_credits?: number | null
          cost_euros?: number | null
          created_at?: string
          data_source_id: string
          enriched_count?: number | null
          error_message?: string | null
          high_score_count?: number | null
          id?: string
          new_contacts_count?: number | null
          organization_id: string
          provider_dataset_id?: string | null
          provider_run_id?: string | null
          raw_results_count?: number | null
          started_at?: string | null
          status?: string
          trigger_type?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          after_dedup_count?: number | null
          completed_at?: string | null
          cost_credits?: number | null
          cost_euros?: number | null
          created_at?: string
          data_source_id?: string
          enriched_count?: number | null
          error_message?: string | null
          high_score_count?: number | null
          id?: string
          new_contacts_count?: number | null
          organization_id?: string
          provider_dataset_id?: string | null
          provider_run_id?: string | null
          raw_results_count?: number | null
          started_at?: string | null
          status?: string
          trigger_type?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_runs_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          contact_id: string | null
          created_at: string
          currency: string | null
          description: string | null
          end_date: string | null
          id: string
          min_term_months: number | null
          monthly_amount: number
          name: string
          organization_id: string
          payment_day: number | null
          project_id: string
          start_date: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          min_term_months?: number | null
          monthly_amount: number
          name: string
          organization_id: string
          payment_day?: number | null
          project_id: string
          start_date: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          min_term_months?: number | null
          monthly_amount?: number
          name?: string
          organization_id?: string
          payment_day?: number | null
          project_id?: string
          start_date?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          entity_type: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string | null
          entity_type: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string | null
          entity_type?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_document_number: {
        Args: { p_entity: string; p_org_id: string; p_prefix: string }
        Returns: string
      }
      user_organization_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
