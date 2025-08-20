/**
 * Database Types
 * 
 * TypeScript types for the Supabase database schema.
 * This provides type safety for database operations.
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          github_id: string | null;
          github_username: string | null;
          google_id: string | null;
          google_email: string | null;
          subscription_plan: string | null;
          subscription_status: string | null;
          subscription_expires_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          github_id?: string | null;
          github_username?: string | null;
          google_id?: string | null;
          google_email?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          subscription_expires_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          github_id?: string | null;
          github_username?: string | null;
          google_id?: string | null;
          google_email?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          subscription_expires_at?: string | null;
        };
      };
      jobs: {
        Row: {
          job_id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          lecture_title: string;
          course_subject: string | null;
          audio_file_path: string;
          pdf_file_path: string | null;
          output_pdf_path: string | null;
          txt_file_path: string | null;
          md_file_path: string | null;
          status: 'processing' | 'completed' | 'failed';
          error_message: string | null;
          error_step: string | null;
          processing_started_at: string | null;
          processing_completed_at: string | null;
          pdf_extraction_error: string | null;
          duration_minutes: number | null;
          file_size_mb: number | null;
        };
        Insert: {
          job_id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
          lecture_title: string;
          course_subject?: string | null;
          audio_file_path: string;
          pdf_file_path?: string | null;
          output_pdf_path?: string | null;
          txt_file_path?: string | null;
          md_file_path?: string | null;
          status?: 'processing' | 'completed' | 'failed';
          error_message?: string | null;
          error_step?: string | null;
          processing_started_at?: string | null;
          processing_completed_at?: string | null;
          pdf_extraction_error?: string | null;
          duration_minutes?: number | null;
          file_size_mb?: number | null;
        };
        Update: {
          job_id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
          lecture_title?: string;
          course_subject?: string | null;
          audio_file_path?: string;
          pdf_file_path?: string | null;
          output_pdf_path?: string | null;
          txt_file_path?: string | null;
          md_file_path?: string | null;
          status?: 'processing' | 'completed' | 'failed';
          error_message?: string | null;
          error_step?: string | null;
          processing_started_at?: string | null;
          processing_completed_at?: string | null;
          pdf_extraction_error?: string | null;
          duration_minutes?: number | null;
          file_size_mb?: number | null;
        };
      };
      notes: {
        Row: {
          id: string;
          job_id: string;
          user_id: string;
          created_at: string;
          content: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          user_id: string;
          created_at?: string;
          content: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          user_id?: string;
          created_at?: string;
          content?: string;
        };
      };
      oauth_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          provider_user_id: string;
          provider_username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          provider_user_id: string;
          provider_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          provider_user_id?: string;
          provider_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      update_github_profile: {
        Args: {
          p_user_id: string;
          p_github_id: string;
          p_github_username: string;
          p_avatar_url?: string;
          p_full_name?: string;
        };
        Returns: void;
      };
      update_google_profile: {
        Args: {
          p_user_id: string;
          p_google_id: string;
          p_google_email: string;
          p_avatar_url?: string;
          p_full_name?: string;
        };
        Returns: void;
      };
      can_unlink_oauth_provider: {
        Args: {
          p_user_id: string;
          p_provider: string;
        };
        Returns: Array<{
          can_unlink: boolean;
          reason?: string;
        }>;
      };
      remove_oauth_connection: {
        Args: {
          p_user_id: string;
          p_provider: string;
        };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}