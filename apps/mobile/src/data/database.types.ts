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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          access_notes: string | null
          active: boolean
          address: string | null
          branch_number: string
          chain_id: string
          created_at: string
          district_id: string
          id: string
          lat: number | null
          lng: number | null
          location_confirmed_at: string | null
          name: string | null
          name_en: string | null
          phone: string | null
          user_id: string | null
        }
        Insert: {
          access_notes?: string | null
          active?: boolean
          address?: string | null
          branch_number: string
          chain_id: string
          created_at?: string
          district_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_confirmed_at?: string | null
          name?: string | null
          name_en?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          access_notes?: string | null
          active?: boolean
          address?: string | null
          branch_number?: string
          chain_id?: string
          created_at?: string
          district_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_confirmed_at?: string | null
          name?: string | null
          name_en?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "request_list"
            referencedColumns: ["chain_id"]
          },
          {
            foreignKeyName: "branches_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "request_list"
            referencedColumns: ["district_id"]
          },
          {
            foreignKeyName: "branches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chains: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name_ar: string
          name_en: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name_ar: string
          name_en: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name_ar?: string
          name_en?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name_ar: string
          name_en: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name_ar: string
          name_en: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name_ar?: string
          name_en?: string
          sort_order?: number
        }
        Relationships: []
      }
      districts: {
        Row: {
          active: boolean
          city_id: string
          created_at: string
          id: string
          name_ar: string
          name_en: string
        }
        Insert: {
          active?: boolean
          city_id: string
          created_at?: string
          id?: string
          name_ar: string
          name_en: string
        }
        Update: {
          active?: boolean
          city_id?: string
          created_at?: string
          id?: string
          name_ar?: string
          name_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "districts_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "request_list"
            referencedColumns: ["city_id"]
          },
        ]
      }
      driver_days_off: {
        Row: {
          created_at: string
          created_by: string | null
          day: string
          driver_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day: string
          driver_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day?: string
          driver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_days_off_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_days_off_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          active: boolean
          city_id: string
          created_at: string
          full_name: string
          full_name_en: string | null
          id: string
          material_id: string
          phone: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          city_id: string
          created_at?: string
          full_name: string
          full_name_en?: string | null
          id?: string
          material_id: string
          phone: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          city_id?: string
          created_at?: string
          full_name?: string
          full_name_en?: string | null
          id?: string
          material_id?: string
          phone?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "request_list"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "drivers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "request_list"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      material_subtypes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          material_id: string
          name_ar: string
          name_en: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          material_id: string
          name_ar: string
          name_en: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          material_id?: string
          name_ar?: string
          name_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_subtypes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_subtypes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "request_list"
            referencedColumns: ["material_id"]
          },
        ]
      }
      materials: {
        Row: {
          active: boolean
          code: string
          color_dark: string
          color_light: string
          contact_phone: string | null
          created_at: string
          icon: string
          id: string
          manager_id: string | null
          name_ar: string
          name_en: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          color_dark?: string
          color_light?: string
          contact_phone?: string | null
          created_at?: string
          icon?: string
          id?: string
          manager_id?: string | null
          name_ar: string
          name_en: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          color_dark?: string
          color_light?: string
          contact_phone?: string | null
          created_at?: string
          icon?: string
          id?: string
          manager_id?: string | null
          name_ar?: string
          name_en?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "materials_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body_ar: string | null
          body_en: string | null
          created_at: string
          id: number
          kind: string
          link: string | null
          material_id: string | null
          read_at: string | null
          request_id: string | null
          title_ar: string
          title_en: string
          user_id: string
        }
        Insert: {
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          id?: never
          kind: string
          link?: string | null
          material_id?: string | null
          read_at?: string | null
          request_id?: string | null
          title_ar: string
          title_en: string
          user_id: string
        }
        Update: {
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          id?: never
          kind?: string
          link?: string | null
          material_id?: string | null
          read_at?: string | null
          request_id?: string | null
          title_ar?: string
          title_en?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "request_list"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_approvals: {
        Row: {
          approved_at: string
          approved_by: string
          driver_id: string
          id: number
          visit_day: string
        }
        Insert: {
          approved_at?: string
          approved_by: string
          driver_id: string
          id?: never
          visit_day: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          driver_id?: string
          id?: never
          visit_day?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_approvals_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          display_name_en: string | null
          id: string
          must_change_password: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          display_name_en?: string | null
          id: string
          must_change_password?: boolean
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          display_name_en?: string | null
          id?: string
          must_change_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      reasons: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["reason_kind"]
          label_ar: string
          label_en: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["reason_kind"]
          label_ar: string
          label_en: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["reason_kind"]
          label_ar?: string
          label_en?: string
          sort_order?: number
        }
        Relationships: []
      }
      request_events: {
        Row: {
          actor_id: string | null
          actor_kind: Database["public"]["Enums"]["actor_kind"]
          created_at: string
          from_status: Database["public"]["Enums"]["request_status"] | null
          id: number
          note: string | null
          request_id: string
          to_status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          actor_id?: string | null
          actor_kind: Database["public"]["Enums"]["actor_kind"]
          created_at?: string
          from_status?: Database["public"]["Enums"]["request_status"] | null
          id?: never
          note?: string | null
          request_id: string
          to_status: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          actor_id?: string | null
          actor_kind?: Database["public"]["Enums"]["actor_kind"]
          created_at?: string
          from_status?: Database["public"]["Enums"]["request_status"] | null
          id?: never
          note?: string | null
          request_id?: string
          to_status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          branch_id: string
          branch_photo_path: string | null
          cancel_note: string | null
          cancel_reason_id: string | null
          cancelled_by: string | null
          closed_by: string | null
          closed_reason: string | null
          closed_reason_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          created_via: string
          decision_since: string | null
          draft_cancelled: boolean
          driver_id: string | null
          id: string
          kg: number | null
          material_id: string
          note: string | null
          number: number
          status: Database["public"]["Enums"]["request_status"]
          subtype_id: string | null
          updated_at: string
          visit_day: string | null
        }
        Insert: {
          branch_id: string
          branch_photo_path?: string | null
          cancel_note?: string | null
          cancel_reason_id?: string | null
          cancelled_by?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          closed_reason_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          created_via?: string
          decision_since?: string | null
          draft_cancelled?: boolean
          driver_id?: string | null
          id?: string
          kg?: number | null
          material_id: string
          note?: string | null
          number?: never
          status?: Database["public"]["Enums"]["request_status"]
          subtype_id?: string | null
          updated_at?: string
          visit_day?: string | null
        }
        Update: {
          branch_id?: string
          branch_photo_path?: string | null
          cancel_note?: string | null
          cancel_reason_id?: string | null
          cancelled_by?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          closed_reason_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          created_via?: string
          decision_since?: string | null
          draft_cancelled?: boolean
          driver_id?: string | null
          id?: string
          kg?: number | null
          material_id?: string
          note?: string | null
          number?: never
          status?: Database["public"]["Enums"]["request_status"]
          subtype_id?: string | null
          updated_at?: string
          visit_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_cancel_reason_id_fkey"
            columns: ["cancel_reason_id"]
            isOneToOne: false
            referencedRelation: "reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_closed_reason_id_fkey"
            columns: ["closed_reason_id"]
            isOneToOne: false
            referencedRelation: "reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "request_list"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "requests_subtype_id_material_id_fkey"
            columns: ["subtype_id", "material_id"]
            isOneToOne: false
            referencedRelation: "material_subtypes"
            referencedColumns: ["id", "material_id"]
          },
        ]
      }
      visit_attempts: {
        Row: {
          driver_id: string
          id: string
          note: string | null
          outcome: Database["public"]["Enums"]["visit_outcome"]
          photo_path: string | null
          reason_id: string | null
          reason_text: string | null
          recorded_at: string
          request_id: string
          visit_day: string
        }
        Insert: {
          driver_id: string
          id?: string
          note?: string | null
          outcome: Database["public"]["Enums"]["visit_outcome"]
          photo_path?: string | null
          reason_id?: string | null
          reason_text?: string | null
          recorded_at?: string
          request_id: string
          visit_day: string
        }
        Update: {
          driver_id?: string
          id?: string
          note?: string | null
          outcome?: Database["public"]["Enums"]["visit_outcome"]
          photo_path?: string | null
          reason_id?: string | null
          reason_text?: string | null
          recorded_at?: string
          request_id?: string
          visit_day?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_attempts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_attempts_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_attempts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_attempts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      request_list: {
        Row: {
          branch_access_notes: string | null
          branch_address: string | null
          branch_id: string | null
          branch_name: string | null
          branch_number: string | null
          branch_phone: string | null
          branch_photo_path: string | null
          cancel_note: string | null
          cancel_reason_id: string | null
          cancelled_by: string | null
          chain_code: string | null
          chain_id: string | null
          chain_name_ar: string | null
          chain_name_en: string | null
          city_code: string | null
          city_id: string | null
          city_name_ar: string | null
          city_name_en: string | null
          closed_by: string | null
          closed_reason: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          created_via: string | null
          decision_since: string | null
          district_id: string | null
          district_name_ar: string | null
          district_name_en: string | null
          draft_cancelled: boolean | null
          driver_id: string | null
          driver_name: string | null
          driver_name_en: string | null
          driver_phone: string | null
          id: string | null
          kg: number | null
          last_attempt_at: string | null
          last_attempt_day: string | null
          last_attempt_driver_id: string | null
          last_attempt_note: string | null
          last_attempt_photo: string | null
          last_outcome: Database["public"]["Enums"]["visit_outcome"] | null
          last_reason_ar: string | null
          last_reason_en: string | null
          lat: number | null
          lng: number | null
          material_code: string | null
          material_color_dark: string | null
          material_color_light: string | null
          material_id: string | null
          material_name_ar: string | null
          material_name_en: string | null
          note: string | null
          number: number | null
          status: Database["public"]["Enums"]["request_status"] | null
          subtype_code: string | null
          subtype_id: string | null
          subtype_name_ar: string | null
          subtype_name_en: string | null
          updated_at: string | null
          visit_day: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_cancel_reason_id_fkey"
            columns: ["cancel_reason_id"]
            isOneToOne: false
            referencedRelation: "reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_attempts_driver_id_fkey"
            columns: ["last_attempt_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      branch_cancel_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      branch_create_request: {
        Args: {
          p_contact_name: string
          p_contact_phone: string
          p_kg: number
          p_material_id: string
          p_note: string
          p_photo_path?: string
          p_subtype_id: string
        }
        Returns: Json
      }
      branch_set_location: {
        Args: { p_lat: number; p_lng: number }
        Returns: undefined
      }
      branch_update_request: {
        Args: {
          p_contact_name: string
          p_contact_phone: string
          p_kg: number
          p_note: string
          p_photo_path?: string
          p_request_id: string
        }
        Returns: undefined
      }
      complete_password_change: { Args: never; Returns: undefined }
      driver_record_outcome: {
        Args: {
          p_note?: string
          p_outcome: Database["public"]["Enums"]["visit_outcome"]
          p_photo_path?: string
          p_reason_id?: string
          p_reason_text?: string
          p_request_id: string
        }
        Returns: undefined
      }
      login_guard_check: { Args: { p_login: string }; Returns: number }
      login_guard_record: {
        Args: { p_login: string; p_ok: boolean }
        Returns: Json
      }
      mark_notifications_read: { Args: never; Returns: undefined }
      set_temp_password: {
        Args: { p_password: string; p_user_id: string }
        Returns: undefined
      }
      staff_approve_plan: {
        Args: {
          p_assignments: Json
          p_clear_draft_cancelled?: string[]
          p_visit_day: string
        }
        Returns: Json
      }
      staff_branch_overview: {
        Args: never
        Returns: {
          branch_id: string
          has_login: boolean
          last_request_at: string
          last_sign_in_at: string
          must_change_password: boolean
          open_requests: number
          user_id: string
        }[]
      }
      staff_cancel_request: {
        Args: { p_note?: string; p_reason_id?: string; p_request_id: string }
        Returns: undefined
      }
      staff_change_plan_driver: {
        Args: {
          p_from_driver: string
          p_to_driver: string
          p_visit_day: string
        }
        Returns: number
      }
      staff_create_request: {
        Args: {
          p_branch_id: string
          p_kg?: number
          p_material_id: string
          p_note?: string
          p_subtype_id?: string
        }
        Returns: Json
      }
      staff_decide: {
        Args: {
          p_decision: string
          p_reason_id?: string
          p_request_id: string
          p_text?: string
        }
        Returns: undefined
      }
      staff_driver_overview: {
        Args: never
        Returns: {
          driver_id: string
          has_login: boolean
          last_sign_in_at: string
          must_change_password: boolean
          off_next: boolean
          off_today: boolean
          user_id: string
          visits_next: number
          visits_today: number
        }[]
      }
      staff_late_branches: {
        Args: { p_city?: string }
        Returns: {
          branch_id: string
          branch_number: string
          chain_code: string
          chain_name_ar: string
          chain_name_en: string
          city_code: string
          city_id: string
          days_since: number
          district_name_ar: string
          district_name_en: string
          last_request_at: string
          phone: string
        }[]
      }
      staff_list_staff: {
        Args: never
        Returns: {
          active: boolean
          created_at: string
          display_name: string
          display_name_en: string
          email: string
          id: string
          last_sign_in_at: string
          material_ids: string[]
          must_change_password: boolean
          phone: string
        }[]
      }
      staff_reason_usage: {
        Args: never
        Returns: {
          reason_id: string
          uses: number
        }[]
      }
      staff_report_v2: {
        Args: {
          p_chain?: string
          p_city?: string
          p_district?: string
          p_driver?: string
          p_from: string
          p_material?: string
          p_to: string
        }
        Returns: Json
      }
      staff_set_account_active: {
        Args: { p_active: boolean; p_user_id: string }
        Returns: undefined
      }
      staff_set_driver_day: {
        Args: { p_day: string; p_driver_id: string; p_working: boolean }
        Returns: number
      }
      staff_set_material_manager: {
        Args: {
          p_contact_phone: string
          p_manager_id: string
          p_material_id: string
        }
        Returns: undefined
      }
      staff_undo_reschedule: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      staff_update_staff: {
        Args: {
          p_display_name: string
          p_display_name_en: string
          p_material_ids: string[]
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      actor_kind: "staff" | "branch" | "driver" | "system"
      app_role: "staff" | "branch" | "driver"
      reason_kind: "cancel" | "close" | "failed" | "partial"
      request_status:
        | "waiting"
        | "scheduled"
        | "needs_decision"
        | "completed"
        | "closed"
        | "cancelled"
      visit_outcome: "full" | "partial" | "failed" | "no_result"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      actor_kind: ["staff", "branch", "driver", "system"],
      app_role: ["staff", "branch", "driver"],
      reason_kind: ["cancel", "close", "failed", "partial"],
      request_status: [
        "waiting",
        "scheduled",
        "needs_decision",
        "completed",
        "closed",
        "cancelled",
      ],
      visit_outcome: ["full", "partial", "failed", "no_result"],
    },
  },
} as const
