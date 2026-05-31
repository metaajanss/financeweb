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
      accounts: {
        Row: {
          ai_config: Json | null
          business_name: string | null
          company_name: string | null
          created_at: string | null
          id: string
          language: string | null
          name: string
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          plan_id: string | null
          sequence_settings: Json | null
          setup_wizard_completed: boolean | null
          setup_wizard_data: Json | null
          setup_wizard_step: number | null
          stripe_customer_id: string | null
          subscription_status: string | null
          timezone: string | null
        }
        Insert: {
          ai_config?: Json | null
          business_name?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          language?: string | null
          name: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan_id?: string | null
          sequence_settings?: Json | null
          setup_wizard_completed?: boolean | null
          setup_wizard_data?: Json | null
          setup_wizard_step?: number | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          timezone?: string | null
        }
        Update: {
          ai_config?: Json | null
          business_name?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          language?: string | null
          name?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan_id?: string | null
          sequence_settings?: Json | null
          setup_wizard_completed?: boolean | null
          setup_wizard_data?: Json | null
          setup_wizard_step?: number | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      account_presentations: {
        Row: {
          id: string
          account_id: string
          title: string | null
          pdf_path: string
          page_count: number
          status: string
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          title?: string | null
          pdf_path: string
          page_count: number
          status?: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          title?: string | null
          pdf_path?: string
          page_count?: number
          status?: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_presentations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          }
        ]
      }
      account_slides: {
        Row: {
          id: string
          presentation_id: string
          account_id: string
          page_number: number
          image_path: string
          raw_text: string | null
          speaking_script: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          presentation_id: string
          account_id: string
          page_number: number
          image_path: string
          raw_text?: string | null
          speaking_script?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          presentation_id?: string
          account_id?: string
          page_number?: number
          image_path?: string
          raw_text?: string | null
          speaking_script?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_slides_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "account_presentations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_slides_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_payofflab_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_payofflab_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_payofflab_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_payofflab_sessions: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_payofflab_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_companies: {
        Row: {
          company_type: string | null
          created_at: string | null
          description: string | null
          domain: string | null
          founded_year: number | null
          fts: unknown
          funding_amount: string | null
          hq_location: string | null
          id: string
          industry: string | null
          keywords: string[] | null
          logo_url: string | null
          name: string
          size: string | null
          technologies: string[] | null
          updated_at: string | null
        }
        Insert: {
          company_type?: string | null
          created_at?: string | null
          description?: string | null
          domain?: string | null
          founded_year?: number | null
          fts?: unknown
          funding_amount?: string | null
          hq_location?: string | null
          id?: string
          industry?: string | null
          keywords?: string[] | null
          logo_url?: string | null
          name: string
          size?: string | null
          technologies?: string[] | null
          updated_at?: string | null
        }
        Update: {
          company_type?: string | null
          created_at?: string | null
          description?: string | null
          domain?: string | null
          founded_year?: number | null
          fts?: unknown
          funding_amount?: string | null
          hq_location?: string | null
          id?: string
          industry?: string | null
          keywords?: string[] | null
          logo_url?: string | null
          name?: string
          size?: string | null
          technologies?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      b2b_unlocked_leads: {
        Row: {
          company_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_unlocked_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "b2b_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_generation_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          generated_title: string | null
          id: string
          post_id: string | null
          status: string
          topic_id: string
          triggered_by: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          generated_title?: string | null
          id?: string
          post_id?: string | null
          status?: string
          topic_id: string
          triggered_by?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          generated_title?: string | null
          id?: string
          post_id?: string | null
          status?: string
          topic_id?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_generation_queue_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_generation_queue_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "blog_generation_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_generation_topics: {
        Row: {
          auto_publish: boolean
          created_at: string
          generation_mode: string
          id: string
          keywords: string[]
          last_keyword_index: number
          last_run_at: string | null
          length_words: number
          posts_per_run: number
          schedule_type: string
          status: string
          target_locale: string
          tone: string
          updated_at: string
        }
        Insert: {
          auto_publish?: boolean
          created_at?: string
          generation_mode?: string
          id?: string
          keywords?: string[]
          last_keyword_index?: number
          last_run_at?: string | null
          length_words?: number
          posts_per_run?: number
          schedule_type?: string
          status?: string
          target_locale?: string
          tone?: string
          updated_at?: string
        }
        Update: {
          auto_publish?: boolean
          created_at?: string
          generation_mode?: string
          id?: string
          keywords?: string[]
          last_keyword_index?: number
          last_run_at?: string | null
          length_words?: number
          posts_per_run?: number
          schedule_type?: string
          status?: string
          target_locale?: string
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_redirects: {
        Row: {
          created_at: string | null
          id: string
          locale: string
          new_slug: string
          old_slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          locale: string
          new_slug: string
          old_slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          locale?: string
          new_slug?: string
          old_slug?: string
        }
        Relationships: []
      }
      blog_translation_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          post_id: string
          status: string
          target_locale: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          post_id: string
          status?: string
          target_locale: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          post_id?: string
          status?: string
          target_locale?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_translation_queue_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_widgets: {
        Row: {
          account_id: string
          config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_widgets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          account_id: string
          channel: string
          created_at: string | null
          id: string
          integration_id: string | null
          is_ai_active: boolean | null
          last_message_at: string | null
          lead_id: string
          metadata: Json | null
          status: string | null
        }
        Insert: {
          account_id: string
          channel: string
          created_at?: string | null
          id?: string
          integration_id?: string | null
          is_ai_active?: boolean | null
          last_message_at?: string | null
          lead_id: string
          metadata?: Json | null
          status?: string | null
        }
        Update: {
          account_id?: string
          channel?: string
          created_at?: string | null
          id?: string
          integration_id?: string | null
          is_ai_active?: boolean | null
          last_message_at?: string | null
          lead_id?: string
          metadata?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string
          error_type: string
          id: string
          message: string
          metadata: Json | null
          severity: string
          stack_trace: string | null
          tenant_id: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_type: string
          id?: string
          message: string
          metadata?: Json | null
          severity: string
          stack_trace?: string | null
          tenant_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          severity?: string
          stack_trace?: string | null
          tenant_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      event_logs: {
        Row: {
          account_id: string
          created_at: string
          data: Json | null
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          data?: Json | null
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          data?: Json | null
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      gsc_connections: {
        Row: {
          access_token: string | null
          auto_max_per_run: number | null
          auto_min_score: number | null
          auto_mode: boolean | null
          auto_publish: boolean | null
          created_at: string
          email: string | null
          expiry_date: number | null
          id: string
          last_synced_at: string | null
          refresh_token: string | null
          site_url: string
          status: string
        }
        Insert: {
          access_token?: string | null
          auto_max_per_run?: number | null
          auto_min_score?: number | null
          auto_mode?: boolean | null
          auto_publish?: boolean | null
          created_at?: string
          email?: string | null
          expiry_date?: number | null
          id?: string
          last_synced_at?: string | null
          refresh_token?: string | null
          site_url: string
          status?: string
        }
        Update: {
          access_token?: string | null
          auto_max_per_run?: number | null
          auto_min_score?: number | null
          auto_mode?: boolean | null
          auto_publish?: boolean | null
          created_at?: string
          email?: string | null
          expiry_date?: number | null
          id?: string
          last_synced_at?: string | null
          refresh_token?: string | null
          site_url?: string
          status?: string
        }
        Relationships: []
      }
      gsc_raw_data: {
        Row: {
          clicks: number
          connection_id: string
          ctr: number
          date_range: string
          id: string
          impressions: number
          page: string | null
          position: number
          query: string
          synced_at: string
        }
        Insert: {
          clicks?: number
          connection_id: string
          ctr?: number
          date_range?: string
          id?: string
          impressions?: number
          page?: string | null
          position?: number
          query: string
          synced_at?: string
        }
        Update: {
          clicks?: number
          connection_id?: string
          ctr?: number
          date_range?: string
          id?: string
          impressions?: number
          page?: string | null
          position?: number
          query?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gsc_raw_data_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "gsc_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      gsc_recommendations: {
        Row: {
          category: string
          clicks: number
          clicks_trend: number | null
          connection_id: string
          created_at: string
          ctr: number
          id: string
          impressions: number
          impressions_trend: number | null
          intent: string
          matched_post_id: string | null
          position: number
          position_trend: number | null
          priority_score: number
          query: string
          recommended_action: string
          status: string
          synced_at: string
          topic_id: string | null
        }
        Insert: {
          category: string
          clicks?: number
          clicks_trend?: number | null
          connection_id: string
          created_at?: string
          ctr?: number
          id?: string
          impressions?: number
          impressions_trend?: number | null
          intent?: string
          matched_post_id?: string | null
          position?: number
          position_trend?: number | null
          priority_score?: number
          query: string
          recommended_action: string
          status?: string
          synced_at?: string
          topic_id?: string | null
        }
        Update: {
          category?: string
          clicks?: number
          clicks_trend?: number | null
          connection_id?: string
          created_at?: string
          ctr?: number
          id?: string
          impressions?: number
          impressions_trend?: number | null
          intent?: string
          matched_post_id?: string | null
          position?: number
          position_trend?: number | null
          priority_score?: number
          query?: string
          recommended_action?: string
          status?: string
          synced_at?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gsc_recommendations_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "gsc_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gsc_recommendations_matched_post_id_fkey"
            columns: ["matched_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          message: string
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          message: string
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          message?: string
          subject?: string | null
        }
        Relationships: []
      }
      integrations: {
        Row: {
          account_id: string
          config: Json | null
          created_at: string | null
          id: string
          is_primary: boolean
          label: string | null
          last_synced_at: string | null
          provider: string
          status: string | null
        }
        Insert: {
          account_id: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_primary?: boolean
          label?: string | null
          last_synced_at?: string | null
          provider: string
          status?: string | null
        }
        Update: {
          account_id?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_primary?: boolean
          label?: string | null
          last_synced_at?: string | null
          provider?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_folders: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_folders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_groups: {
        Row: {
          account_id: string
          created_at: string | null
          description: string | null
          folder_id: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_groups_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_groups_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "lead_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          account_id: string
          company: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          group_id: string | null
          id: string
          language: string | null
          last_name: string | null
          metadata: Json | null
          phone: string | null
          preferred_integration_id: string | null
          score: number | null
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          group_id?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          preferred_integration_id?: string | null
          score?: number | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          group_id?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          preferred_integration_id?: string | null
          score?: number | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "lead_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_preferred_integration_id_fkey"
            columns: ["preferred_integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          account_id: string
          agent_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          end_time: string
          google_event_id: string | null
          id: string
          lead_id: string | null
          location: string | null
          meeting_link: string | null
          meeting_type: string | null
          metadata: Json | null
          scheduled_at: string | null
          start_time: string
          status: string | null
          ai_avatar_enabled: boolean | null
          ai_avatar_bot_id: string | null
          ai_avatar_status: string | null
          transcript_url: string | null
          recording_url: string | null
          title: string | null
        }
        Insert: {
          account_id: string
          agent_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_time: string
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          location?: string | null
          meeting_link?: string | null
          meeting_type?: string | null
          metadata?: Json | null
          scheduled_at?: string | null
          start_time: string
          ai_avatar_enabled?: boolean | null
          ai_avatar_bot_id?: string | null
          ai_avatar_status?: string | null
          transcript_url?: string | null
          recording_url?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          account_id?: string
          agent_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_time?: string
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          location?: string | null
          meeting_link?: string | null
          meeting_type?: string | null
          metadata?: Json | null
          scheduled_at?: string | null
          start_time?: string
          ai_avatar_enabled?: boolean | null
          ai_avatar_bot_id?: string | null
          ai_avatar_status?: string | null
          transcript_url?: string | null
          recording_url?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_transcripts: {
        Row: {
          id: string
          meeting_id: string
          account_id: string
          bot_id: string | null
          speaker: string | null
          content: string
          timestamp_ms: number | null
          spoken_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          account_id: string
          bot_id?: string | null
          speaker?: string | null
          content: string
          timestamp_ms?: number | null
          spoken_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          account_id?: string
          bot_id?: string | null
          speaker?: string | null
          content?: string
          timestamp_ms?: number | null
          spoken_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcripts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          external_message_id: string | null
          id: string
          metadata: Json | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          external_message_id?: string | null
          id?: string
          metadata?: Json | null
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          external_message_id?: string | null
          id?: string
          metadata?: Json | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          account_id: string | null
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_translations: {
        Row: {
          content: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          language: string
          post_id: string
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          language: string
          post_id: string
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          language?: string
          post_id?: string
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_translations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          cluster_topic: string | null
          content: string | null
          content_type: string | null
          cover_image: string | null
          created_at: string | null
          excerpt: string | null
          featured_image_url: string | null
          freshness_score: number | null
          id: string
          last_seo_audit_at: string | null
          needs_update: boolean | null
          pillar_post_id: string | null
          published: boolean | null
          published_at: string | null
          rank_at_30d: number | null
          rank_at_60d: number | null
          rank_at_90d: number | null
          reading_time_minutes: number | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          cluster_topic?: string | null
          content?: string | null
          content_type?: string | null
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          freshness_score?: number | null
          id?: string
          last_seo_audit_at?: string | null
          needs_update?: boolean | null
          pillar_post_id?: string | null
          published?: boolean | null
          published_at?: string | null
          rank_at_30d?: number | null
          rank_at_60d?: number | null
          rank_at_90d?: number | null
          reading_time_minutes?: number | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          cluster_topic?: string | null
          content?: string | null
          content_type?: string | null
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          freshness_score?: number | null
          id?: string
          last_seo_audit_at?: string | null
          needs_update?: boolean | null
          pillar_post_id?: string | null
          published?: boolean | null
          published_at?: string | null
          rank_at_30d?: number | null
          rank_at_60d?: number | null
          rank_at_90d?: number | null
          reading_time_minutes?: number | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_pillar_post_id_fkey"
            columns: ["pillar_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_id: string | null
          avatar_url: string | null
          b2b_credits: number | null
          created_at: string | null
          email: string | null
          email_alerts: boolean | null
          first_name: string | null
          full_name: string | null
          id: string
          language: string | null
          last_name: string | null
          onboarding_completed: boolean | null
          phone: string | null
          push_notifications: boolean | null
          role: string | null
          sms_updates: boolean | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          avatar_url?: string | null
          b2b_credits?: number | null
          created_at?: string | null
          email?: string | null
          email_alerts?: boolean | null
          first_name?: string | null
          full_name?: string | null
          id: string
          language?: string | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          push_notifications?: boolean | null
          role?: string | null
          sms_updates?: boolean | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          avatar_url?: string | null
          b2b_credits?: number | null
          created_at?: string | null
          email?: string | null
          email_alerts?: boolean | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          push_notifications?: boolean | null
          role?: string | null
          sms_updates?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_enrollments: {
        Row: {
          account_id: string
          created_at: string | null
          current_step_index: number | null
          id: string
          integration_id: string | null
          last_executed_at: string | null
          lead_id: string
          next_step_due_at: string | null
          retry_count: number | null
          sequence_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          current_step_index?: number | null
          id?: string
          integration_id?: string | null
          last_executed_at?: string | null
          lead_id: string
          next_step_due_at?: string | null
          retry_count?: number | null
          sequence_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          current_step_index?: number | null
          id?: string
          integration_id?: string | null
          last_executed_at?: string | null
          lead_id?: string
          next_step_due_at?: string | null
          retry_count?: number | null
          sequence_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_enrollments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_events: {
        Row: {
          account_id: string
          channel: string
          created_at: string | null
          enrollment_id: string | null
          event_type: string
          id: string
          integration_id: string | null
          lead_id: string | null
          metadata: Json | null
          sequence_id: string | null
          step_index: number | null
        }
        Insert: {
          account_id: string
          channel: string
          created_at?: string | null
          enrollment_id?: string | null
          event_type: string
          id?: string
          integration_id?: string | null
          lead_id?: string | null
          metadata?: Json | null
          sequence_id?: string | null
          step_index?: number | null
        }
        Update: {
          account_id?: string
          channel?: string
          created_at?: string | null
          enrollment_id?: string | null
          event_type?: string
          id?: string
          integration_id?: string | null
          lead_id?: string | null
          metadata?: Json | null
          sequence_id?: string | null
          step_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_events_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_events_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_events_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_active: boolean | null
          lead_type: string | null
          metrics: Json | null
          name: string
          steps: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          lead_type?: string | null
          metrics?: Json | null
          name: string
          steps?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          lead_type?: string | null
          metrics?: Json | null
          name?: string
          steps?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequences_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_accounts: {
        Row: {
          account_name: string
          created_at: string | null
          credentials: Json
          id: string
          is_active: boolean | null
          last_used_at: string | null
          platform: string
          platform_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          created_at?: string | null
          credentials?: Json
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform: string
          platform_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          created_at?: string | null
          credentials?: Json
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform?: string
          platform_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      social_media_campaigns: {
        Row: {
          avoid_topics: string[] | null
          brand_context: string | null
          campaign_mode: string | null
          created_at: string | null
          cta_url: string | null
          id: string
          last_angle_index: number | null
          last_run_at: string | null
          marketing_goal: string
          name: string
          platform_overrides: Json | null
          schedule_type: string | null
          status: string | null
          target_audience: string | null
          target_platforms: string[]
          tone: string | null
          topics: string[] | null
          total_generated: number | null
          updated_at: string | null
          utm_params: Json | null
        }
        Insert: {
          avoid_topics?: string[] | null
          brand_context?: string | null
          campaign_mode?: string | null
          created_at?: string | null
          cta_url?: string | null
          id?: string
          last_angle_index?: number | null
          last_run_at?: string | null
          marketing_goal: string
          name: string
          platform_overrides?: Json | null
          schedule_type?: string | null
          status?: string | null
          target_audience?: string | null
          target_platforms: string[]
          tone?: string | null
          topics?: string[] | null
          total_generated?: number | null
          updated_at?: string | null
          utm_params?: Json | null
        }
        Update: {
          avoid_topics?: string[] | null
          brand_context?: string | null
          campaign_mode?: string | null
          created_at?: string | null
          cta_url?: string | null
          id?: string
          last_angle_index?: number | null
          last_run_at?: string | null
          marketing_goal?: string
          name?: string
          platform_overrides?: Json | null
          schedule_type?: string | null
          status?: string | null
          target_audience?: string | null
          target_platforms?: string[]
          tone?: string | null
          topics?: string[] | null
          total_generated?: number | null
          updated_at?: string | null
          utm_params?: Json | null
        }
        Relationships: []
      }
      social_media_channel_settings: {
        Row: {
          active_days: number[] | null
          active_hours_end: number | null
          active_hours_start: number | null
          created_at: string | null
          daily_post_limit: number | null
          id: string
          is_active: boolean | null
          min_hours_between: number | null
          mix_educational: number | null
          mix_engagement: number | null
          mix_industry: number | null
          mix_promotional: number | null
          mix_social_proof: number | null
          platform: string
          platform_config: Json | null
          posts_per_run: number | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          active_days?: number[] | null
          active_hours_end?: number | null
          active_hours_start?: number | null
          created_at?: string | null
          daily_post_limit?: number | null
          id?: string
          is_active?: boolean | null
          min_hours_between?: number | null
          mix_educational?: number | null
          mix_engagement?: number | null
          mix_industry?: number | null
          mix_promotional?: number | null
          mix_social_proof?: number | null
          platform: string
          platform_config?: Json | null
          posts_per_run?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          active_days?: number[] | null
          active_hours_end?: number | null
          active_hours_start?: number | null
          created_at?: string | null
          daily_post_limit?: number | null
          id?: string
          is_active?: boolean | null
          min_hours_between?: number | null
          mix_educational?: number | null
          mix_engagement?: number | null
          mix_industry?: number | null
          mix_promotional?: number | null
          mix_social_proof?: number | null
          platform?: string
          platform_config?: Json | null
          posts_per_run?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      social_media_content_library: {
        Row: {
          ai_config_snapshot: Json | null
          body: string
          content_type: string
          created_at: string | null
          embedding_hash: string | null
          id: string
          last_used_at: string | null
          priority: number | null
          source: string | null
          source_ref: string | null
          status: string | null
          suggested_platforms: string[] | null
          suggested_tone: string | null
          times_used: number | null
          title: string
          updated_at: string | null
          used_in_posts: string[] | null
        }
        Insert: {
          ai_config_snapshot?: Json | null
          body: string
          content_type: string
          created_at?: string | null
          embedding_hash?: string | null
          id?: string
          last_used_at?: string | null
          priority?: number | null
          source?: string | null
          source_ref?: string | null
          status?: string | null
          suggested_platforms?: string[] | null
          suggested_tone?: string | null
          times_used?: number | null
          title: string
          updated_at?: string | null
          used_in_posts?: string[] | null
        }
        Update: {
          ai_config_snapshot?: Json | null
          body?: string
          content_type?: string
          created_at?: string | null
          embedding_hash?: string | null
          id?: string
          last_used_at?: string | null
          priority?: number | null
          source?: string | null
          source_ref?: string | null
          status?: string | null
          suggested_platforms?: string[] | null
          suggested_tone?: string | null
          times_used?: number | null
          title?: string
          updated_at?: string | null
          used_in_posts?: string[] | null
        }
        Relationships: []
      }
      social_media_oauth_states: {
        Row: {
          created_at: string | null
          expires_at: string
          platform: string
          state: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          platform: string
          state: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          platform?: string
          state?: string
        }
        Relationships: []
      }
      social_media_posts: {
        Row: {
          account_id: string | null
          campaign_id: string | null
          comments_count: number | null
          content: string
          content_item_id: string | null
          content_type: string
          created_at: string | null
          error_message: string | null
          hashtags: string[] | null
          id: string
          last_stats_at: string | null
          likes_count: number | null
          metadata: Json | null
          platform: string
          platform_post_id: string | null
          platform_url: string | null
          post_type: string | null
          published_at: string | null
          retry_count: number | null
          scheduled_for: string | null
          shares_count: number | null
          status: string | null
          title: string | null
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          account_id?: string | null
          campaign_id?: string | null
          comments_count?: number | null
          content: string
          content_item_id?: string | null
          content_type: string
          created_at?: string | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          last_stats_at?: string | null
          likes_count?: number | null
          metadata?: Json | null
          platform: string
          platform_post_id?: string | null
          platform_url?: string | null
          post_type?: string | null
          published_at?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          shares_count?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          account_id?: string | null
          campaign_id?: string | null
          comments_count?: number | null
          content?: string
          content_item_id?: string | null
          content_type?: string
          created_at?: string | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          last_stats_at?: string | null
          likes_count?: number | null
          metadata?: Json | null
          platform?: string
          platform_post_id?: string | null
          platform_url?: string | null
          post_type?: string | null
          published_at?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          shares_count?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_posts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "social_media_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_media_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "social_media_content_library"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_run_history: {
        Row: {
          campaign_id: string | null
          content_type: string | null
          error: string | null
          generated_at: string | null
          id: string
          platform: string | null
          post_id: string | null
          status: string | null
          trigger_type: string | null
        }
        Insert: {
          campaign_id?: string | null
          content_type?: string | null
          error?: string | null
          generated_at?: string | null
          id?: string
          platform?: string | null
          post_id?: string | null
          status?: string | null
          trigger_type?: string | null
        }
        Update: {
          campaign_id?: string | null
          content_type?: string | null
          error?: string | null
          generated_at?: string | null
          id?: string
          platform?: string | null
          post_id?: string | null
          status?: string | null
          trigger_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_run_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_media_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_run_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          account_id: string
          created_at: string | null
          email: string
          id: string
          role: string | null
          status: string | null
          token: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          email: string
          id?: string
          role?: string | null
          status?: string | null
          token?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          email?: string
          id?: string
          role?: string | null
          status?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_admin_reply: boolean | null
          is_read: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin_reply?: boolean | null
          is_read?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin_reply?: boolean | null
          is_read?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error: string | null
          event: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          webhook_id: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          account_id: string
          created_at: string | null
          events: string[]
          id: string
          secret: string
          status: string | null
          url: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          events: string[]
          id?: string
          secret: string
          status?: string | null
          url: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          events?: string[]
          id?: string
          secret?: string
          status?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      widgets: {
        Row: {
          account_id: string
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "widgets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_lead_score: {
        Args: {
          p_company: string
          p_conv_count: number
          p_created_at: string
          p_email: string
          p_phone: string
          p_reply_count: number
          p_source: string
          p_status: string
        }
        Returns: number
      }
      exec_sql: { Args: { sql: string }; Returns: undefined }
      merge_meeting_metadata: {
        Args: {
          p_meeting_id: string
          p_account_id: string
          p_patch: Json
          p_avatar_status?: string | null
          p_avatar_bot_id?: string | null
          p_meeting_status?: string | null
          p_transcript_url?: string | null
          p_recording_url?: string | null
        }
        Returns: boolean
      }
      get_global_sequence_metrics: {
        Args: { p_account_id: string }
        Returns: {
          total_active: number
          total_completed: number
          total_enrolled: number
        }[]
      }
      get_my_account_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_sequence_daily_stats: {
        Args: { p_account_id: string; p_days?: number; p_sequence_id?: string }
        Returns: {
          event_date: string
          failed_count: number
          opened_count: number
          replied_count: number
          sent_count: number
        }[]
      }
      get_unread_conversations_count: {
        Args: { p_account_id: string }
        Returns: number
      }
      get_sequence_enrollment_counts: {
        Args: { p_sequence_ids: string[] }
        Returns: {
          cnt: number
          sequence_id: string
          status: string
        }[]
      }
      get_sequence_metrics_batch: {
        Args: { p_sequence_ids: string[] }
        Returns: {
          channel: string
          cnt: number
          event_type: string
          sequence_id: string
        }[]
      }
      get_super_admin_stats: {
        Args: never
        Returns: {
          active_subscriptions: number
          avg_leads_per_tenant: number
          mrr_estimate: number
          new_tenants_this_month: number
          new_tenants_this_week: number
          new_tenants_today: number
          total_conversations: number
          total_leads: number
          total_meetings: number
          total_tenants: number
          trial_tenants: number
        }[]
      }
      grab_pending_enrollments: {
        Args: { batch_size_int?: number }
        Returns: {
          account_id: string
          current_step_index: number
          enrollment_id: string
          lead: Json
          lead_id: string
          next_step_due_at: string
          retry_count: number
          sequence_id: string
          sequence_name: string
          steps: Json
          trigger_type: string
        }[]
      }
      recalculate_account_lead_scores: {
        Args: { p_account_id: string }
        Returns: number
      }
      refresh_sequence_metrics: { Args: { seq_id: string }; Returns: undefined }
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
