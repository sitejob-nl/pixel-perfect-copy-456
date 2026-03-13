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
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
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
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
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
            referencedRelation: "admin_users"
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
          {
            foreignKeyName: "fk_activities_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_overview"
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
      ai_models: {
        Row: {
          context_window: number
          description: string | null
          display_name: string
          id: string
          input_price_per_mtok: number
          is_available: boolean
          max_output_tokens: number
          output_price_per_mtok: number
          sort_order: number
          supports_tools: boolean
          tier: string
        }
        Insert: {
          context_window?: number
          description?: string | null
          display_name: string
          id: string
          input_price_per_mtok: number
          is_available?: boolean
          max_output_tokens?: number
          output_price_per_mtok: number
          sort_order?: number
          supports_tools?: boolean
          tier?: string
        }
        Update: {
          context_window?: number
          description?: string | null
          display_name?: string
          id?: string
          input_price_per_mtok?: number
          is_available?: boolean
          max_output_tokens?: number
          output_price_per_mtok?: number
          sort_order?: number
          supports_tools?: boolean
          tier?: string
        }
        Relationships: []
      }
      apify_actor_configs: {
        Row: {
          avg_duration_seconds: number | null
          category: string
          created_at: string
          default_input: Json | null
          description: string | null
          display_name: string
          estimated_cost_per_1k: string | null
          icon: string | null
          id: string
          input_fields: Json
          is_active: boolean
          max_results_limit: number | null
          output_fields: Json
          sort_order: number | null
        }
        Insert: {
          avg_duration_seconds?: number | null
          category?: string
          created_at?: string
          default_input?: Json | null
          description?: string | null
          display_name: string
          estimated_cost_per_1k?: string | null
          icon?: string | null
          id: string
          input_fields?: Json
          is_active?: boolean
          max_results_limit?: number | null
          output_fields?: Json
          sort_order?: number | null
        }
        Update: {
          avg_duration_seconds?: number | null
          category?: string
          created_at?: string
          default_input?: Json | null
          description?: string | null
          display_name?: string
          estimated_cost_per_1k?: string | null
          icon?: string | null
          id?: string
          input_fields?: Json
          is_active?: boolean
          max_results_limit?: number | null
          output_fields?: Json
          sort_order?: number | null
        }
        Relationships: []
      }
      apify_direct_runs: {
        Row: {
          actor_id: string
          apify_dataset_id: string | null
          apify_input: Json
          apify_run_id: string | null
          completed_at: string | null
          cost_usd: number | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          id: string
          organization_id: string
          results_count: number | null
          results_preview: Json | null
          saved_companies_count: number | null
          saved_contacts_count: number | null
          saved_to_crm: boolean | null
          started_at: string
          status: string
          triggered_by: string | null
          user_input: Json
        }
        Insert: {
          actor_id: string
          apify_dataset_id?: string | null
          apify_input?: Json
          apify_run_id?: string | null
          completed_at?: string | null
          cost_usd?: number | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          organization_id: string
          results_count?: number | null
          results_preview?: Json | null
          saved_companies_count?: number | null
          saved_contacts_count?: number | null
          saved_to_crm?: boolean | null
          started_at?: string
          status?: string
          triggered_by?: string | null
          user_input?: Json
        }
        Update: {
          actor_id?: string
          apify_dataset_id?: string | null
          apify_input?: Json
          apify_run_id?: string | null
          completed_at?: string | null
          cost_usd?: number | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          organization_id?: string
          results_count?: number | null
          results_preview?: Json | null
          saved_companies_count?: number | null
          saved_contacts_count?: number | null
          saved_to_crm?: boolean | null
          started_at?: string
          status?: string
          triggered_by?: string | null
          user_input?: Json
        }
        Relationships: [
          {
            foreignKeyName: "apify_direct_runs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "apify_actor_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apify_direct_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apify_direct_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apify_direct_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apify_direct_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "admin_users"
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
      communications: {
        Row: {
          channel: string
          company_id: string | null
          contact_id: string | null
          content: string | null
          created_at: string
          deal_id: string | null
          direction: string
          email_account_id: string | null
          email_message_id: string | null
          email_thread_id: string | null
          from_address: string | null
          id: string
          metadata: Json | null
          organization_id: string
          read_at: string | null
          replied_at: string | null
          subject: string | null
          to_address: string | null
          user_id: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          channel: string
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          deal_id?: string | null
          direction: string
          email_account_id?: string | null
          email_message_id?: string | null
          email_thread_id?: string | null
          from_address?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          read_at?: string | null
          replied_at?: string | null
          subject?: string | null
          to_address?: string | null
          user_id?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          channel?: string
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          deal_id?: string | null
          direction?: string
          email_account_id?: string | null
          email_message_id?: string | null
          email_thread_id?: string | null
          from_address?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          read_at?: string | null
          replied_at?: string | null
          subject?: string | null
          to_address?: string | null
          user_id?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_whatsapp_message_id_fkey"
            columns: ["whatsapp_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          annual_revenue: string | null
          btw_number: string | null
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
          snelstart_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          annual_revenue?: string | null
          btw_number?: string | null
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
          snelstart_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          annual_revenue?: string | null
          btw_number?: string | null
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
          snelstart_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          contact_id: string
          content: string
          created_at: string
          id: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id: string
          content: string
          created_at?: string
          id?: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "admin_organizations"
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
            foreignKeyName: "content_calendar_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_calendar_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_calendar_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
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
            referencedRelation: "admin_organizations"
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
          {
            foreignKeyName: "content_calendar_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_audit_logs: {
        Row: {
          action: string
          contract_id: string
          created_at: string
          document_hash: string | null
          event_type: string | null
          geolocation: Json | null
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string | null
          session_id: string | null
          signer_email: string | null
          signer_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          contract_id: string
          created_at?: string
          document_hash?: string | null
          event_type?: string | null
          geolocation?: Json | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          session_id?: string | null
          signer_email?: string | null
          signer_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          contract_id?: string
          created_at?: string
          document_hash?: string | null
          event_type?: string | null
          geolocation?: Json | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          session_id?: string | null
          signer_email?: string | null
          signer_name?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_audit_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_audit_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "contract_signing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signing_sessions: {
        Row: {
          browser_fingerprint: string | null
          consent_accepted_at: string | null
          consent_text: string | null
          contract_id: string
          created_at: string
          expires_at: string
          geolocation: Json | null
          id: string
          ip_address: string | null
          organization_id: string | null
          session_token: string
          signature_data: string | null
          signature_image_url: string | null
          signature_type: string | null
          signed_at: string | null
          signed_document_hash: string | null
          signer_email: string
          signer_name: string
          signer_phone: string
          signer_role: string | null
          signing_order: number | null
          sms_code_hash: string
          sms_sent_at: string | null
          sms_verified_at: string | null
          status: string
          user_agent: string | null
          verification_attempts: number | null
        }
        Insert: {
          browser_fingerprint?: string | null
          consent_accepted_at?: string | null
          consent_text?: string | null
          contract_id: string
          created_at?: string
          expires_at?: string
          geolocation?: Json | null
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          session_token?: string
          signature_data?: string | null
          signature_image_url?: string | null
          signature_type?: string | null
          signed_at?: string | null
          signed_document_hash?: string | null
          signer_email: string
          signer_name: string
          signer_phone: string
          signer_role?: string | null
          signing_order?: number | null
          sms_code_hash: string
          sms_sent_at?: string | null
          sms_verified_at?: string | null
          status?: string
          user_agent?: string | null
          verification_attempts?: number | null
        }
        Update: {
          browser_fingerprint?: string | null
          consent_accepted_at?: string | null
          consent_text?: string | null
          contract_id?: string
          created_at?: string
          expires_at?: string
          geolocation?: Json | null
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          session_token?: string
          signature_data?: string | null
          signature_image_url?: string | null
          signature_type?: string | null
          signed_at?: string | null
          signed_document_hash?: string | null
          signer_email?: string
          signer_name?: string
          signer_phone?: string
          signer_role?: string | null
          signing_order?: number | null
          sms_code_hash?: string
          sms_sent_at?: string | null
          sms_verified_at?: string | null
          status?: string
          user_agent?: string | null
          verification_attempts?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signing_sessions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signing_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signing_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          category: string | null
          content_html: string
          created_at: string
          created_by: string | null
          custom_css: string | null
          default_expiry_days: number | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean | null
          name: string
          organization_id: string
          require_id_upload: boolean | null
          require_sms_verification: boolean | null
          signers: Json
          updated_at: string
          variables: Json
        }
        Insert: {
          category?: string | null
          content_html: string
          created_at?: string
          created_by?: string | null
          custom_css?: string | null
          default_expiry_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name: string
          organization_id: string
          require_id_upload?: boolean | null
          require_sms_verification?: boolean | null
          signers?: Json
          updated_at?: string
          variables?: Json
        }
        Update: {
          category?: string | null
          content_html?: string
          created_at?: string
          created_by?: string | null
          custom_css?: string | null
          default_expiry_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name?: string
          organization_id?: string
          require_id_upload?: boolean | null
          require_sms_verification?: boolean | null
          signers?: Json
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_variable_sources: {
        Row: {
          category: string
          data_type: string
          display_label: string
          field_path: string
          id: string
          source_table: string
        }
        Insert: {
          category?: string
          data_type?: string
          display_label: string
          field_path: string
          id?: string
          source_table: string
        }
        Update: {
          category?: string
          data_type?: string
          display_label?: string
          field_path?: string
          id?: string
          source_table?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          audit_trail_pdf_url: string | null
          cancelled_at: string | null
          cancelled_reason: string | null
          certificate_fingerprint: string | null
          company_id: string | null
          completed_at: string | null
          contact_id: string | null
          content: string | null
          contract_number: string | null
          contract_type: string
          created_at: string
          deal_id: string | null
          expires_at: string | null
          id: string
          organization_id: string
          original_document_hash: string | null
          original_hash: string | null
          pdf_url: string | null
          project_id: string | null
          quote_id: string | null
          reminder_sent_at: string | null
          rendered_html: string | null
          sent_at: string | null
          signature_fields: Json | null
          signature_url: string | null
          signed_at: string | null
          signed_by: string | null
          signed_hash: string | null
          signed_pdf_url: string | null
          signing_message: string | null
          signing_order: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
          variable_values: Json | null
          visible_in_portal: boolean | null
        }
        Insert: {
          audit_trail_pdf_url?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          certificate_fingerprint?: string | null
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          content?: string | null
          contract_number?: string | null
          contract_type?: string
          created_at?: string
          deal_id?: string | null
          expires_at?: string | null
          id?: string
          organization_id: string
          original_document_hash?: string | null
          original_hash?: string | null
          pdf_url?: string | null
          project_id?: string | null
          quote_id?: string | null
          reminder_sent_at?: string | null
          rendered_html?: string | null
          sent_at?: string | null
          signature_fields?: Json | null
          signature_url?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signed_hash?: string | null
          signed_pdf_url?: string | null
          signing_message?: string | null
          signing_order?: string | null
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
          variable_values?: Json | null
          visible_in_portal?: boolean | null
        }
        Update: {
          audit_trail_pdf_url?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          certificate_fingerprint?: string | null
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          content?: string | null
          contract_number?: string | null
          contract_type?: string
          created_at?: string
          deal_id?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string
          original_document_hash?: string | null
          original_hash?: string | null
          pdf_url?: string | null
          project_id?: string | null
          quote_id?: string | null
          reminder_sent_at?: string | null
          rendered_html?: string | null
          sent_at?: string | null
          signature_fields?: Json | null
          signature_url?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signed_hash?: string | null
          signed_pdf_url?: string | null
          signing_message?: string | null
          signing_order?: string | null
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          variable_values?: Json | null
          visible_in_portal?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
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
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
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
            foreignKeyName: "fk_deals_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_overview"
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
      demo_dashboard_modules: {
        Row: {
          acties: string[] | null
          beschrijving: string
          id: string
          integraties: string[] | null
          kpis: string[] | null
          naam: string
        }
        Insert: {
          acties?: string[] | null
          beschrijving: string
          id: string
          integraties?: string[] | null
          kpis?: string[] | null
          naam: string
        }
        Update: {
          acties?: string[] | null
          beschrijving?: string
          id?: string
          integraties?: string[] | null
          kpis?: string[] | null
          naam?: string
        }
        Relationships: []
      }
      demo_industry_modules: {
        Row: {
          demo_type: string
          industry: string
          module_ids: string[]
        }
        Insert: {
          demo_type: string
          industry: string
          module_ids?: string[]
        }
        Update: {
          demo_type?: string
          industry?: string
          module_ids?: string[]
        }
        Relationships: []
      }
      demo_versions: {
        Row: {
          change_description: string | null
          chat_history: Json | null
          created_at: string
          demo_id: string
          html_content: string
          id: string
          model_used: string | null
          organization_id: string | null
          version_number: number
        }
        Insert: {
          change_description?: string | null
          chat_history?: Json | null
          created_at?: string
          demo_id: string
          html_content: string
          id?: string
          model_used?: string | null
          organization_id?: string | null
          version_number?: number
        }
        Update: {
          change_description?: string | null
          chat_history?: Json | null
          created_at?: string
          demo_id?: string
          html_content?: string
          id?: string
          model_used?: string | null
          organization_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "demo_versions_demo_id_fkey"
            columns: ["demo_id"]
            isOneToOne: false
            referencedRelation: "demos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_website_types: {
        Row: {
          beschrijving: string | null
          conversion_elements: string[]
          id: string
          must_have: string[]
          naam: string
          secties: string[]
          sort_order: number | null
          ui_patterns: string[]
        }
        Insert: {
          beschrijving?: string | null
          conversion_elements?: string[]
          id: string
          must_have?: string[]
          naam: string
          secties?: string[]
          sort_order?: number | null
          ui_patterns?: string[]
        }
        Update: {
          beschrijving?: string | null
          conversion_elements?: string[]
          id?: string
          must_have?: string[]
          naam?: string
          secties?: string[]
          sort_order?: number | null
          ui_patterns?: string[]
        }
        Relationships: []
      }
      demos: {
        Row: {
          active_page: string | null
          company_name: string | null
          company_research: Json | null
          contact_id: string | null
          created_at: string
          demo_html: string
          demo_type: string
          email_sent_at: string | null
          feedback: Json | null
          generation_duration_seconds: number | null
          generation_error: string | null
          generation_started_at: string | null
          generation_status: string | null
          id: string
          is_multipage: boolean | null
          is_public: boolean | null
          last_viewed_at: string | null
          model_used: string | null
          organization_id: string
          pages: Json | null
          password_hash: string | null
          password_hint: string | null
          public_slug: string | null
          scrape_id: string | null
          shared_via_email: boolean | null
          title: string | null
          updated_at: string
          views: number | null
        }
        Insert: {
          active_page?: string | null
          company_name?: string | null
          company_research?: Json | null
          contact_id?: string | null
          created_at?: string
          demo_html: string
          demo_type: string
          email_sent_at?: string | null
          feedback?: Json | null
          generation_duration_seconds?: number | null
          generation_error?: string | null
          generation_started_at?: string | null
          generation_status?: string | null
          id?: string
          is_multipage?: boolean | null
          is_public?: boolean | null
          last_viewed_at?: string | null
          model_used?: string | null
          organization_id: string
          pages?: Json | null
          password_hash?: string | null
          password_hint?: string | null
          public_slug?: string | null
          scrape_id?: string | null
          shared_via_email?: boolean | null
          title?: string | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          active_page?: string | null
          company_name?: string | null
          company_research?: Json | null
          contact_id?: string | null
          created_at?: string
          demo_html?: string
          demo_type?: string
          email_sent_at?: string | null
          feedback?: Json | null
          generation_duration_seconds?: number | null
          generation_error?: string | null
          generation_started_at?: string | null
          generation_status?: string | null
          id?: string
          is_multipage?: boolean | null
          is_public?: boolean | null
          last_viewed_at?: string | null
          model_used?: string | null
          organization_id?: string
          pages?: Json | null
          password_hash?: string | null
          password_hint?: string | null
          public_slug?: string | null
          scrape_id?: string | null
          shared_via_email?: boolean | null
          title?: string | null
          updated_at?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "demos_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demos_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demos_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demos_scrape_id_fkey"
            columns: ["scrape_id"]
            isOneToOne: false
            referencedRelation: "website_scrapes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          access_token: string | null
          created_at: string
          display_name: string | null
          domain: string | null
          domain_records: Json | null
          domain_verified: boolean | null
          email: string
          id: string
          is_shared: boolean | null
          organization_id: string
          owner_user_id: string | null
          provider: string | null
          refresh_token: string | null
          resend_domain_id: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          display_name?: string | null
          domain?: string | null
          domain_records?: Json | null
          domain_verified?: boolean | null
          email: string
          id?: string
          is_shared?: boolean | null
          organization_id: string
          owner_user_id?: string | null
          provider?: string | null
          refresh_token?: string | null
          resend_domain_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          display_name?: string | null
          domain?: string | null
          domain_records?: Json | null
          domain_verified?: boolean | null
          email?: string
          id?: string
          is_shared?: boolean | null
          organization_id?: string
          owner_user_id?: string | null
          provider?: string | null
          refresh_token?: string | null
          resend_domain_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_accounts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_accounts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_link_clicks: {
        Row: {
          clicked_at: string
          email_send_id: string
          id: string
          ip_address: string | null
          original_url: string
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          email_send_id: string
          id?: string
          ip_address?: string | null
          original_url: string
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          email_send_id?: string
          id?: string
          ip_address?: string | null
          original_url?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_link_clicks_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          bounce_type: string | null
          bounced_at: string | null
          clicked_at: string | null
          clicked_count: number | null
          contact_id: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          from_address: string
          html_content: string
          id: string
          metadata: Json | null
          opened_at: string | null
          opened_count: number | null
          organization_id: string
          reply_to: string | null
          resend_id: string | null
          scheduled_for: string | null
          send_type: string | null
          sent_at: string | null
          sequence_id: string | null
          status: string
          subject: string
          template_id: string | null
          to_address: string
        }
        Insert: {
          bounce_type?: string | null
          bounced_at?: string | null
          clicked_at?: string | null
          clicked_count?: number | null
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          from_address: string
          html_content: string
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          opened_count?: number | null
          organization_id: string
          reply_to?: string | null
          resend_id?: string | null
          scheduled_for?: string | null
          send_type?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          subject: string
          template_id?: string | null
          to_address: string
        }
        Update: {
          bounce_type?: string | null
          bounced_at?: string | null
          clicked_at?: string | null
          clicked_count?: number | null
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          from_address?: string
          html_content?: string
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          opened_count?: number | null
          organization_id?: string
          reply_to?: string | null
          resend_id?: string | null
          scheduled_for?: string | null
          send_type?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          to_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          available_merge_fields: string[] | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          design_json: Json | null
          folder: string | null
          html_content: string
          id: string
          is_active: boolean | null
          is_starter: boolean | null
          name: string
          organization_id: string
          subject: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          available_merge_fields?: string[] | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          design_json?: Json | null
          folder?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          is_starter?: boolean | null
          name: string
          organization_id: string
          subject: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          available_merge_fields?: string[] | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          design_json?: Json | null
          folder?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          is_starter?: boolean | null
          name?: string
          organization_id?: string
          subject?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "invoice_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          payment_type: string | null
          payment_url: string | null
          project_id: string | null
          quote_id: string | null
          reminder_sent_at: string | null
          snelstart_id: string | null
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
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          payment_type?: string | null
          payment_url?: string | null
          project_id?: string | null
          quote_id?: string | null
          reminder_sent_at?: string | null
          snelstart_id?: string | null
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
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          payment_type?: string | null
          payment_url?: string | null
          project_id?: string | null
          quote_id?: string | null
          reminder_sent_at?: string | null
          snelstart_id?: string | null
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
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
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
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_overview"
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
      knowledge_base_documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          organization_id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          organization_id: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          raw_lead_id: string | null
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
          raw_lead_id?: string | null
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
          raw_lead_id?: string | null
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
            foreignKeyName: "lead_enrichment_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_enrichment_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_enrichment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_enrichment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_enrichment_raw_lead_id_fkey"
            columns: ["raw_lead_id"]
            isOneToOne: false
            referencedRelation: "raw_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_connections: {
        Row: {
          access_token_encrypted: string
          created_at: string | null
          id: string
          linkedin_avatar_url: string | null
          linkedin_name: string | null
          linkedin_user_id: string
          organization_id: string
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string | null
          id?: string
          linkedin_avatar_url?: string | null
          linkedin_name?: string | null
          linkedin_user_id: string
          organization_id: string
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string | null
          id?: string
          linkedin_avatar_url?: string | null
          linkedin_name?: string | null
          linkedin_user_id?: string
          organization_id?: string
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_webhook_events: {
        Row: {
          contact_id: string | null
          created_at: string
          event_type: string
          id: string
          linkedin_user_id: string | null
          notification_id: string
          organization_id: string | null
          payload: Json
          processed: boolean
          resource_type: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          linkedin_user_id?: string | null
          notification_id: string
          organization_id?: string | null
          payload?: Json
          processed?: boolean
          resource_type?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          linkedin_user_id?: string | null
          notification_id?: string
          organization_id?: string | null
          payload?: Json
          processed?: boolean
          resource_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_webhook_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_webhook_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_webhook_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_webhook_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_webhook_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_module_overrides: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          module_key: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_key: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_key?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_module_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_module_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          contract_signed: string | null
          created_at: string
          deal_won: string | null
          feedback_received: string | null
          id: string
          invoice_paid: string | null
          new_lead: string | null
          organization_id: string
          outreach_reply: string | null
          task_due: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_signed?: string | null
          created_at?: string
          deal_won?: string | null
          feedback_received?: string | null
          id?: string
          invoice_paid?: string | null
          new_lead?: string | null
          organization_id: string
          outreach_reply?: string | null
          task_due?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_signed?: string | null
          created_at?: string
          deal_won?: string | null
          feedback_received?: string | null
          id?: string
          invoice_paid?: string | null
          new_lead?: string | null
          organization_id?: string
          outreach_reply?: string | null
          task_due?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_questions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_required: boolean | null
          is_template: boolean | null
          options: Json | null
          organization_id: string
          placeholder: string | null
          portal_session_id: string | null
          project_id: string | null
          question: string
          question_type: string | null
          section_title: string | null
          sort_order: number | null
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean | null
          is_template?: boolean | null
          options?: Json | null
          organization_id: string
          placeholder?: string | null
          portal_session_id?: string | null
          project_id?: string | null
          question: string
          question_type?: string | null
          section_title?: string | null
          sort_order?: number | null
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean | null
          is_template?: boolean | null
          options?: Json | null
          organization_id?: string
          placeholder?: string | null
          portal_session_id?: string | null
          project_id?: string | null
          question?: string
          question_type?: string | null
          section_title?: string | null
          sort_order?: number | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_questions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_questions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_questions_portal_session_id_fkey"
            columns: ["portal_session_id"]
            isOneToOne: false
            referencedRelation: "portal_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_responses: {
        Row: {
          id: string
          organization_id: string | null
          project_id: string
          question_id: string
          response_files: string[] | null
          response_text: string | null
          session_id: string | null
          submitted_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          project_id: string
          question_id: string
          response_files?: string[] | null
          response_text?: string | null
          session_id?: string | null
          submitted_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          project_id?: string
          question_id?: string
          response_files?: string[] | null
          response_text?: string | null
          session_id?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_responses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_responses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "onboarding_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "portal_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          questions: Json
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          questions?: Json
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          questions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_api_keys: {
        Row: {
          anthropic_api_key_encrypted: string | null
          anthropic_key_hint: string | null
          anthropic_key_set: boolean
          anthropic_key_verified_at: string | null
          apify_api_key_encrypted: string | null
          apify_key_hint: string | null
          apify_key_set: boolean
          apify_key_verified_at: string | null
          created_at: string
          id: string
          organization_id: string
          resend_api_key_encrypted: string | null
          resend_key_hint: string | null
          resend_key_set: boolean | null
          resend_key_verified_at: string | null
          selected_model: string
          updated_at: string
        }
        Insert: {
          anthropic_api_key_encrypted?: string | null
          anthropic_key_hint?: string | null
          anthropic_key_set?: boolean
          anthropic_key_verified_at?: string | null
          apify_api_key_encrypted?: string | null
          apify_key_hint?: string | null
          apify_key_set?: boolean
          apify_key_verified_at?: string | null
          created_at?: string
          id?: string
          organization_id: string
          resend_api_key_encrypted?: string | null
          resend_key_hint?: string | null
          resend_key_set?: boolean | null
          resend_key_verified_at?: string | null
          selected_model?: string
          updated_at?: string
        }
        Update: {
          anthropic_api_key_encrypted?: string | null
          anthropic_key_hint?: string | null
          anthropic_key_set?: boolean
          anthropic_key_verified_at?: string | null
          apify_api_key_encrypted?: string | null
          apify_key_hint?: string | null
          apify_key_set?: boolean
          apify_key_verified_at?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          resend_api_key_encrypted?: string | null
          resend_key_hint?: string | null
          resend_key_set?: boolean | null
          resend_key_verified_at?: string | null
          selected_model?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
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
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "admin_organizations"
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
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "admin_users"
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
      organization_modules: {
        Row: {
          created_at: string
          id: string
          mod_ai_agent: boolean
          mod_content_calendar: boolean
          mod_contracts: boolean
          mod_data_sources: boolean
          mod_demos: boolean
          mod_email_accounts: boolean
          mod_invoices: boolean
          mod_lead_scoring: boolean
          mod_outreach: boolean
          mod_portal: boolean
          mod_projects: boolean
          mod_quotes: boolean
          mod_snelstart: boolean
          mod_subscriptions: boolean
          mod_webhooks: boolean
          mod_website_scraping: boolean
          mod_whatsapp: boolean
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mod_ai_agent?: boolean
          mod_content_calendar?: boolean
          mod_contracts?: boolean
          mod_data_sources?: boolean
          mod_demos?: boolean
          mod_email_accounts?: boolean
          mod_invoices?: boolean
          mod_lead_scoring?: boolean
          mod_outreach?: boolean
          mod_portal?: boolean
          mod_projects?: boolean
          mod_quotes?: boolean
          mod_snelstart?: boolean
          mod_subscriptions?: boolean
          mod_webhooks?: boolean
          mod_website_scraping?: boolean
          mod_whatsapp?: boolean
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mod_ai_agent?: boolean
          mod_content_calendar?: boolean
          mod_contracts?: boolean
          mod_data_sources?: boolean
          mod_demos?: boolean
          mod_email_accounts?: boolean
          mod_invoices?: boolean
          mod_lead_scoring?: boolean
          mod_outreach?: boolean
          mod_portal?: boolean
          mod_projects?: boolean
          mod_quotes?: boolean
          mod_snelstart?: boolean
          mod_subscriptions?: boolean
          mod_webhooks?: boolean
          mod_website_scraping?: boolean
          mod_whatsapp?: boolean
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bg_color: string | null
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
          bg_color?: string | null
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
          bg_color?: string | null
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
            foreignKeyName: "outreach_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
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
            foreignKeyName: "outreach_enrollments_conversion_deal_id_fkey"
            columns: ["conversion_deal_id"]
            isOneToOne: false
            referencedRelation: "v_deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_enrollments_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
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
            referencedRelation: "admin_organizations"
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
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          organization_id: string
          portal_session_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          organization_id: string
          portal_session_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          organization_id?: string
          portal_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_activity_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_activity_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_activity_log_portal_session_id_fkey"
            columns: ["portal_session_id"]
            isOneToOne: false
            referencedRelation: "portal_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_file_requests: {
        Row: {
          accepted_types: string[] | null
          created_at: string
          description: string | null
          id: string
          max_file_size_mb: number | null
          organization_id: string
          portal_session_id: string
          required: boolean | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sort_order: number | null
          status: string | null
          title: string
          uploaded_file_id: string | null
        }
        Insert: {
          accepted_types?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          max_file_size_mb?: number | null
          organization_id: string
          portal_session_id: string
          required?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number | null
          status?: string | null
          title: string
          uploaded_file_id?: string | null
        }
        Update: {
          accepted_types?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          max_file_size_mb?: number | null
          organization_id?: string
          portal_session_id?: string
          required?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number | null
          status?: string | null
          title?: string
          uploaded_file_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_file_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_file_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_file_requests_portal_session_id_fkey"
            columns: ["portal_session_id"]
            isOneToOne: false
            referencedRelation: "portal_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_file_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_file_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_file_requests_uploaded_file_id_fkey"
            columns: ["uploaded_file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          organization_id: string
          portal_session_id: string
          read_at: string | null
          sender_name: string
          sender_type: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          organization_id: string
          portal_session_id: string
          read_at?: string | null
          sender_name: string
          sender_type?: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          organization_id?: string
          portal_session_id?: string
          read_at?: string | null
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_messages_portal_session_id_fkey"
            columns: ["portal_session_id"]
            isOneToOne: false
            referencedRelation: "portal_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_sessions: {
        Row: {
          access_token: string
          branding: Json | null
          client_email: string | null
          client_name: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          custom_links: Json | null
          enabled_sections: Json | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          organization_id: string
          password_hash: string | null
          password_required: boolean | null
          portal_name: string | null
          project_id: string | null
          session_type: string
          welcome_message: string | null
        }
        Insert: {
          access_token?: string
          branding?: Json | null
          client_email?: string | null
          client_name?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          custom_links?: Json | null
          enabled_sections?: Json | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          organization_id: string
          password_hash?: string | null
          password_required?: boolean | null
          portal_name?: string | null
          project_id?: string | null
          session_type?: string
          welcome_message?: string | null
        }
        Update: {
          access_token?: string
          branding?: Json | null
          client_email?: string | null
          client_name?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          custom_links?: Json | null
          enabled_sections?: Json | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          organization_id?: string
          password_hash?: string | null
          password_required?: boolean | null
          portal_name?: string | null
          project_id?: string | null
          session_type?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_super_admin: boolean
          language: string | null
          phone: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_super_admin?: boolean
          language?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          language?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_feedback: {
        Row: {
          admin_notes: string | null
          client_notes: string | null
          created_at: string
          current_content: string | null
          element_screenshot: string | null
          element_selector: string | null
          feedback_type: string | null
          id: string
          organization_id: string
          page_url: string
          project_id: string
          requested_change: string | null
          session_id: string | null
          status: string | null
          updated_at: string
          uploaded_image_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          client_notes?: string | null
          created_at?: string
          current_content?: string | null
          element_screenshot?: string | null
          element_selector?: string | null
          feedback_type?: string | null
          id?: string
          organization_id: string
          page_url: string
          project_id: string
          requested_change?: string | null
          session_id?: string | null
          status?: string | null
          updated_at?: string
          uploaded_image_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          client_notes?: string | null
          created_at?: string
          current_content?: string | null
          element_screenshot?: string | null
          element_selector?: string | null
          feedback_type?: string | null
          id?: string
          organization_id?: string
          page_url?: string
          project_id?: string
          requested_change?: string | null
          session_id?: string | null
          status?: string | null
          updated_at?: string
          uploaded_image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "portal_sessions"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
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
      project_status_updates: {
        Row: {
          created_at: string
          id: string
          is_sent: boolean | null
          message: string
          organization_id: string
          project_id: string
          sent_at: string | null
          sent_by: string | null
          title: string
          update_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_sent?: boolean | null
          message: string
          organization_id: string
          project_id: string
          sent_at?: string | null
          sent_by?: string | null
          title: string
          update_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_sent?: boolean | null
          message?: string
          organization_id?: string
          project_id?: string
          sent_at?: string | null
          sent_by?: string | null
          title?: string
          update_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_status_updates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_status_updates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_status_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_status_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_status_updates_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_status_updates_sent_by_fkey"
            columns: ["sent_by"]
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
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "projects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
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
            foreignKeyName: "projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          quantity?: number
          quote_id?: string
          sort_order?: number | null
          unit_price?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          accepted_at: string | null
          accepted_by: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          decline_reason: string | null
          declined_at: string | null
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
          snelstart_id: string | null
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
          accepted_at?: string | null
          accepted_by?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          decline_reason?: string | null
          declined_at?: string | null
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
          snelstart_id?: string | null
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
          accepted_at?: string | null
          accepted_by?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          decline_reason?: string | null
          declined_at?: string | null
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
          snelstart_id?: string | null
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
            foreignKeyName: "quotes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
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
            foreignKeyName: "quotes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
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
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_overview"
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
            foreignKeyName: "raw_leads_duplicate_of_contact_id_fkey"
            columns: ["duplicate_of_contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_leads_duplicate_of_contact_id_fkey"
            columns: ["duplicate_of_contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
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
            foreignKeyName: "raw_leads_imported_as_contact_id_fkey"
            columns: ["imported_as_contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_leads_imported_as_contact_id_fkey"
            columns: ["imported_as_contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
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
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_pages: {
        Row: {
          branding: Json | null
          created_at: string
          html: string | null
          id: string
          markdown: string | null
          metadata: Json | null
          organization_id: string | null
          page_type: string | null
          scrape_id: string
          summary: string | null
          url: string
        }
        Insert: {
          branding?: Json | null
          created_at?: string
          html?: string | null
          id?: string
          markdown?: string | null
          metadata?: Json | null
          organization_id?: string | null
          page_type?: string | null
          scrape_id: string
          summary?: string | null
          url: string
        }
        Update: {
          branding?: Json | null
          created_at?: string
          html?: string | null
          id?: string
          markdown?: string | null
          metadata?: Json | null
          organization_id?: string | null
          page_type?: string | null
          scrape_id?: string
          summary?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_pages_scrape_id_fkey"
            columns: ["scrape_id"]
            isOneToOne: false
            referencedRelation: "website_scrapes"
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
            referencedRelation: "admin_organizations"
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
            referencedRelation: "admin_users"
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
      snelstart_config: {
        Row: {
          app_short_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          koppel_sleutel: string | null
          last_sync_at: string | null
          organization_id: string
          subscription_key: string | null
          sync_interval: string | null
          updated_at: string | null
        }
        Insert: {
          app_short_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          koppel_sleutel?: string | null
          last_sync_at?: string | null
          organization_id: string
          subscription_key?: string | null
          sync_interval?: string | null
          updated_at?: string | null
        }
        Update: {
          app_short_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          koppel_sleutel?: string | null
          last_sync_at?: string | null
          organization_id?: string
          subscription_key?: string | null
          sync_interval?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snelstart_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snelstart_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      snelstart_entity_map: {
        Row: {
          entity_type: string
          id: string
          last_synced_at: string | null
          organization_id: string
          sitejob_id: string
          snelstart_id: string
        }
        Insert: {
          entity_type: string
          id?: string
          last_synced_at?: string | null
          organization_id: string
          sitejob_id: string
          snelstart_id: string
        }
        Update: {
          entity_type?: string
          id?: string
          last_synced_at?: string | null
          organization_id?: string
          sitejob_id?: string
          snelstart_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snelstart_entity_map_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snelstart_entity_map_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      snelstart_sync_log: {
        Row: {
          completed_at: string | null
          direction: string
          entity_type: string
          error_details: Json | null
          id: string
          organization_id: string
          records_failed: number | null
          records_synced: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          direction?: string
          entity_type: string
          error_details?: Json | null
          id?: string
          organization_id: string
          records_failed?: number | null
          records_synced?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          direction?: string
          entity_type?: string
          error_details?: Json | null
          id?: string
          organization_id?: string
          records_failed?: number | null
          records_synced?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snelstart_sync_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snelstart_sync_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "subscriptions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
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
          {
            foreignKeyName: "subscriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_overview"
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
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          api_key_hash: string | null
          api_key_prefix: string | null
          auto_assign_to: string | null
          created_at: string
          dedup_action: string | null
          dedup_field: string | null
          default_source: string | null
          default_status: string | null
          default_temperature: string | null
          default_values: Json | null
          description: string | null
          endpoint_key: string
          field_mapping: Json | null
          field_mappings: Json | null
          id: string
          is_active: boolean | null
          last_received_at: string | null
          name: string
          organization_id: string
          sample_payload: Json | null
          source_platform: string | null
          target_action: string
          target_table: string | null
          test_mode: boolean | null
          total_failed: number | null
          total_processed: number | null
          total_received: number | null
          transform_rules: Json | null
          updated_at: string
          verify_token: string | null
        }
        Insert: {
          api_key_hash?: string | null
          api_key_prefix?: string | null
          auto_assign_to?: string | null
          created_at?: string
          dedup_action?: string | null
          dedup_field?: string | null
          default_source?: string | null
          default_status?: string | null
          default_temperature?: string | null
          default_values?: Json | null
          description?: string | null
          endpoint_key?: string
          field_mapping?: Json | null
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          last_received_at?: string | null
          name: string
          organization_id: string
          sample_payload?: Json | null
          source_platform?: string | null
          target_action: string
          target_table?: string | null
          test_mode?: boolean | null
          total_failed?: number | null
          total_processed?: number | null
          total_received?: number | null
          transform_rules?: Json | null
          updated_at?: string
          verify_token?: string | null
        }
        Update: {
          api_key_hash?: string | null
          api_key_prefix?: string | null
          auto_assign_to?: string | null
          created_at?: string
          dedup_action?: string | null
          dedup_field?: string | null
          default_source?: string | null
          default_status?: string | null
          default_temperature?: string | null
          default_values?: Json | null
          description?: string | null
          endpoint_key?: string
          field_mapping?: Json | null
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          last_received_at?: string | null
          name?: string
          organization_id?: string
          sample_payload?: Json | null
          source_platform?: string | null
          target_action?: string
          target_table?: string | null
          test_mode?: boolean | null
          total_failed?: number | null
          total_processed?: number | null
          total_received?: number | null
          transform_rules?: Json | null
          updated_at?: string
          verify_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_auto_assign_to_fkey"
            columns: ["auto_assign_to"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_endpoints_auto_assign_to_fkey"
            columns: ["auto_assign_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_endpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_endpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          endpoint_id: string
          error_message: string | null
          headers: Json | null
          id: string
          ip_address: string | null
          is_duplicate: boolean | null
          is_test: boolean | null
          mapped_data: Json | null
          mapped_to_id: string | null
          mapped_to_table: string | null
          organization_id: string
          payload: Json
          processing_time_ms: number | null
          source_platform: string | null
          status: string | null
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          endpoint_id: string
          error_message?: string | null
          headers?: Json | null
          id?: string
          ip_address?: string | null
          is_duplicate?: boolean | null
          is_test?: boolean | null
          mapped_data?: Json | null
          mapped_to_id?: string | null
          mapped_to_table?: string | null
          organization_id: string
          payload: Json
          processing_time_ms?: number | null
          source_platform?: string | null
          status?: string | null
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          endpoint_id?: string
          error_message?: string | null
          headers?: Json | null
          id?: string
          ip_address?: string | null
          is_duplicate?: boolean | null
          is_test?: boolean | null
          mapped_data?: Json | null
          mapped_to_id?: string | null
          mapped_to_table?: string | null
          organization_id?: string
          payload?: Json
          processing_time_ms?: number | null
          source_platform?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_source_templates: {
        Row: {
          created_at: string
          default_field_mappings: Json
          default_transform_rules: Json
          description: string | null
          display_name: string
          documentation_url: string | null
          icon: string | null
          id: string
          payload_example: Json | null
          platform: string
          supports_verification: boolean | null
          verification_method: string | null
        }
        Insert: {
          created_at?: string
          default_field_mappings?: Json
          default_transform_rules?: Json
          description?: string | null
          display_name: string
          documentation_url?: string | null
          icon?: string | null
          id?: string
          payload_example?: Json | null
          platform: string
          supports_verification?: boolean | null
          verification_method?: string | null
        }
        Update: {
          created_at?: string
          default_field_mappings?: Json
          default_transform_rules?: Json
          description?: string | null
          display_name?: string
          documentation_url?: string | null
          icon?: string | null
          id?: string
          payload_example?: Json | null
          platform?: string
          supports_verification?: boolean | null
          verification_method?: string | null
        }
        Relationships: []
      }
      webhook_target_fields: {
        Row: {
          description: string | null
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_common: boolean | null
          is_required: boolean | null
          target_table: string
        }
        Insert: {
          description?: string | null
          field_label: string
          field_name: string
          field_type?: string
          id?: string
          is_common?: boolean | null
          is_required?: boolean | null
          target_table: string
        }
        Update: {
          description?: string | null
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_common?: boolean | null
          is_required?: boolean | null
          target_table?: string
        }
        Relationships: []
      }
      website_scrapes: {
        Row: {
          ai_analysis: Json | null
          branding: Json | null
          company_id: string | null
          company_research: Json | null
          contact_id: string | null
          created_at: string
          discovered_urls: string[] | null
          error_message: string | null
          html: string | null
          id: string
          intelligence_status: string | null
          interesting_pages: Json | null
          lead_intelligence: Json | null
          markdown: string | null
          metadata: Json | null
          organization_id: string
          research_status: string | null
          scan_mode: string | null
          scraped_pages_count: number | null
          screenshot_url: string | null
          status: string | null
          summary: string | null
          updated_at: string
          url: string
        }
        Insert: {
          ai_analysis?: Json | null
          branding?: Json | null
          company_id?: string | null
          company_research?: Json | null
          contact_id?: string | null
          created_at?: string
          discovered_urls?: string[] | null
          error_message?: string | null
          html?: string | null
          id?: string
          intelligence_status?: string | null
          interesting_pages?: Json | null
          lead_intelligence?: Json | null
          markdown?: string | null
          metadata?: Json | null
          organization_id: string
          research_status?: string | null
          scan_mode?: string | null
          scraped_pages_count?: number | null
          screenshot_url?: string | null
          status?: string | null
          summary?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          ai_analysis?: Json | null
          branding?: Json | null
          company_id?: string | null
          company_research?: Json | null
          contact_id?: string | null
          created_at?: string
          discovered_urls?: string[] | null
          error_message?: string | null
          html?: string | null
          id?: string
          intelligence_status?: string | null
          interesting_pages?: Json | null
          lead_intelligence?: Json | null
          markdown?: string | null
          metadata?: Json | null
          organization_id?: string
          research_status?: string | null
          scan_mode?: string | null
          scraped_pages_count?: number | null
          screenshot_url?: string | null
          status?: string | null
          summary?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_scrapes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_scrapes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_scrapes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_scrapes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_scrapes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_scrapes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_accounts: {
        Row: {
          access_token: string
          business_name: string | null
          created_at: string
          display_phone: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          phone_number_id: string
          updated_at: string
          waba_id: string
          webhook_verify_token: string
        }
        Insert: {
          access_token: string
          business_name?: string | null
          created_at?: string
          display_phone?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          phone_number_id: string
          updated_at?: string
          waba_id: string
          webhook_verify_token?: string
        }
        Update: {
          access_token?: string
          business_name?: string | null
          created_at?: string
          display_phone?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          phone_number_id?: string
          updated_at?: string
          waba_id?: string
          webhook_verify_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          account_id: string
          contact_id: string | null
          content: string | null
          created_at: string
          direction: string
          error_message: string | null
          id: string
          media_url: string | null
          message_type: string
          metadata: Json | null
          organization_id: string
          phone_number: string
          status: string | null
          template_name: string | null
          whatsapp_msg_id: string | null
        }
        Insert: {
          account_id: string
          contact_id?: string | null
          content?: string | null
          created_at?: string
          direction: string
          error_message?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          organization_id: string
          phone_number: string
          status?: string | null
          template_name?: string | null
          whatsapp_msg_id?: string | null
        }
        Update: {
          account_id?: string
          contact_id?: string | null
          content?: string | null
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          organization_id?: string
          phone_number?: string
          status?: string | null
          template_name?: string | null
          whatsapp_msg_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_hot_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_logs: {
        Row: {
          account_id: string | null
          created_at: string
          error: string | null
          event_type: string | null
          id: number
          organization_id: string | null
          payload: Json | null
          processed: boolean | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: never
          organization_id?: string | null
          payload?: Json | null
          processed?: boolean | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: never
          organization_id?: string | null
          payload?: Json | null
          processed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_webhook_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_webhook_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_webhook_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_organizations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          contact_count: number | null
          country: string | null
          created_at: string | null
          deal_count: number | null
          default_currency: string | null
          default_vat_rate: number | null
          email: string | null
          fiscal_year_start: number | null
          font_family: string | null
          iban: string | null
          id: string | null
          invoice_count: number | null
          invoice_prefix: string | null
          kvk_number: string | null
          logo_url: string | null
          max_contacts: number | null
          max_users: number | null
          member_count: number | null
          name: string | null
          phone: string | null
          plan: string | null
          postal_code: string | null
          primary_color: string | null
          project_count: number | null
          project_prefix: string | null
          quote_prefix: string | null
          secondary_color: string | null
          slug: string | null
          updated_at: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_count?: never
          country?: string | null
          created_at?: string | null
          deal_count?: never
          default_currency?: string | null
          default_vat_rate?: number | null
          email?: string | null
          fiscal_year_start?: number | null
          font_family?: string | null
          iban?: string | null
          id?: string | null
          invoice_count?: never
          invoice_prefix?: string | null
          kvk_number?: string | null
          logo_url?: string | null
          max_contacts?: number | null
          max_users?: number | null
          member_count?: never
          name?: string | null
          phone?: string | null
          plan?: string | null
          postal_code?: string | null
          primary_color?: string | null
          project_count?: never
          project_prefix?: string | null
          quote_prefix?: string | null
          secondary_color?: string | null
          slug?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_count?: never
          country?: string | null
          created_at?: string | null
          deal_count?: never
          default_currency?: string | null
          default_vat_rate?: number | null
          email?: string | null
          fiscal_year_start?: number | null
          font_family?: string | null
          iban?: string | null
          id?: string | null
          invoice_count?: never
          invoice_prefix?: string | null
          kvk_number?: string | null
          logo_url?: string | null
          max_contacts?: number | null
          max_users?: number | null
          member_count?: never
          name?: string | null
          phone?: string | null
          plan?: string | null
          postal_code?: string | null
          primary_color?: string | null
          project_count?: never
          project_prefix?: string | null
          quote_prefix?: string | null
          secondary_color?: string | null
          slug?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          auth_created_at: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_super_admin: boolean | null
          last_sign_in_at: string | null
          organizations: Json[] | null
          phone: string | null
          timezone: string | null
        }
        Relationships: []
      }
      email_stats_by_org: {
        Row: {
          bounced: number | null
          clicked: number | null
          delivered: number | null
          failed: number | null
          last_sent_at: string | null
          opened: number | null
          organization_id: string | null
          sent: number | null
          total: number | null
          total_clicks: number | null
          total_opens: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_deal_pipeline: {
        Row: {
          assigned_to_name: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          expected_close: string | null
          id: string | null
          is_lost: boolean | null
          is_won: boolean | null
          organization_id: string | null
          stage_color: string | null
          stage_name: string | null
          stage_order: number | null
          stage_probability: number | null
          title: string | null
          value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hot_leads: {
        Row: {
          ai_pitch_brief: string | null
          assigned_to: string | null
          cms_platform: string | null
          company_id: string | null
          company_name: string | null
          company_size: string | null
          company_website: string | null
          created_at: string | null
          current_step: number | null
          data_source_name: string | null
          data_source_provider: string | null
          decision_makers: Json | null
          email: string | null
          enrichment_status: string | null
          first_name: string | null
          google_rating: number | null
          google_review_count: number | null
          has_crm: boolean | null
          has_erp: boolean | null
          id: string | null
          industry: string | null
          last_audit_at: string | null
          last_name: string | null
          lead_score: number | null
          lead_status: string | null
          lifecycle_stage: string | null
          next_action_at: string | null
          organization_id: string | null
          outreach_status: string | null
          phone: string | null
          score_breakdown: Json | null
          score_tier: string | null
          scored_at: string | null
          sequence_name: string | null
          source: string | null
          tech_stack: string[] | null
          temperature: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_lead_pipeline: {
        Row: {
          ai_pitch_brief: string | null
          assigned_to: string | null
          cms_platform: string | null
          company_id: string | null
          company_name: string | null
          company_size: string | null
          company_website: string | null
          created_at: string | null
          current_step: number | null
          data_source_name: string | null
          data_source_provider: string | null
          decision_makers: Json | null
          email: string | null
          enrichment_status: string | null
          first_name: string | null
          google_rating: number | null
          google_review_count: number | null
          has_crm: boolean | null
          has_erp: boolean | null
          id: string | null
          industry: string | null
          last_audit_at: string | null
          last_name: string | null
          lead_score: number | null
          lead_status: string | null
          lifecycle_stage: string | null
          next_action_at: string | null
          organization_id: string | null
          outreach_status: string | null
          phone: string | null
          score_breakdown: Json | null
          score_tier: string | null
          scored_at: string | null
          sequence_name: string | null
          source: string | null
          tech_stack: string[] | null
          temperature: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_project_overview: {
        Row: {
          assigned_to_name: string | null
          company_name: string | null
          contact_name: string | null
          created_at: string | null
          deadline: string | null
          estimated_value: number | null
          id: string | null
          name: string | null
          open_feedback_count: number | null
          organization_id: string | null
          paid_invoices: number | null
          priority: string | null
          project_number: string | null
          start_date: string | null
          status: string | null
          unpaid_invoices: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
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
      v_revenue_summary: {
        Row: {
          invoice_count: number | null
          month: string | null
          organization_id: string | null
          total_excl_vat: number | null
          total_revenue: number | null
          total_vat: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_expired_raw_leads: { Args: never; Returns: number }
      generate_document_number: {
        Args: { p_entity: string; p_org_id: string; p_prefix: string }
        Returns: string
      }
      generate_webhook_api_key: {
        Args: { p_endpoint_id: string }
        Returns: string
      }
      get_due_scheduled_emails: {
        Args: never
        Returns: {
          bounce_type: string | null
          bounced_at: string | null
          clicked_at: string | null
          clicked_count: number | null
          contact_id: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          from_address: string
          html_content: string
          id: string
          metadata: Json | null
          opened_at: string | null
          opened_count: number | null
          organization_id: string
          reply_to: string | null
          resend_id: string | null
          scheduled_for: string | null
          send_type: string | null
          sent_at: string | null
          sequence_id: string | null
          status: string
          subject: string
          template_id: string | null
          to_address: string
        }[]
        SetofOptions: {
          from: "*"
          to: "email_sends"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      increment_demo_views: { Args: { p_demo_id: string }; Returns: undefined }
      increment_email_clicks: {
        Args: { p_resend_id: string }
        Returns: undefined
      }
      increment_email_opens: {
        Args: { p_resend_id: string }
        Returns: undefined
      }
      is_super_admin: { Args: never; Returns: boolean }
      org_module_enabled: {
        Args: { p_module: string; p_org_id: string }
        Returns: boolean
      }
      resolve_contract_variables: {
        Args: {
          p_company_id?: string
          p_contact_id?: string
          p_contract_number?: string
          p_deal_id?: string
          p_org_id: string
          p_project_id?: string
          p_quote_id?: string
        }
        Returns: Json
      }
      user_has_role: {
        Args: { p_org_id: string; p_roles: string[] }
        Returns: boolean
      }
      user_organization_ids: { Args: never; Returns: string[] }
      user_role_in_org: { Args: { p_org_id: string }; Returns: string }
      verify_webhook_api_key: { Args: { p_api_key: string }; Returns: string }
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
