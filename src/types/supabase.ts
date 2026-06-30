export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          actor_name: string;
          created_at: string;
          entity_type: "company" | "contact" | "deal" | "ticket";
          id: string;
          summary: string;
        };
        Insert: {
          actor_name: string;
          created_at?: string;
          entity_type: "company" | "contact" | "deal" | "ticket";
          id?: string;
          summary: string;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>;
        Relationships: [];
      };
      companies: {
        Row: {
          created_at: string;
          domain: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          domain?: string | null;
          id?: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      contacts: {
        Row: {
          company_name: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
        };
        Insert: {
          company_name?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
        Relationships: [];
      };
      deals: {
        Row: {
          company_name: string | null;
          created_at: string;
          expected_close_date: string | null;
          id: string;
          name: string;
          owner_name: string | null;
          stage: "qualification" | "discovery" | "proposal" | "negotiation" | "closed_won";
          value: number;
        };
        Insert: {
          company_name?: string | null;
          created_at?: string;
          expected_close_date?: string | null;
          id?: string;
          name: string;
          owner_name?: string | null;
          stage: "qualification" | "discovery" | "proposal" | "negotiation" | "closed_won";
          value?: number;
        };
        Update: Partial<Database["public"]["Tables"]["deals"]["Insert"]>;
        Relationships: [];
      };
      notes: {
        Row: {
          content: string | null;
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content?: string | null;
          created_at?: string;
          id?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["notes"]["Insert"]>;
        Relationships: [];
      };
      tickets: {
        Row: {
          created_at: string;
          id: string;
          priority: "low" | "medium" | "high" | "urgent";
          status: "open" | "pending" | "resolved" | "closed";
          subject: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          priority?: "low" | "medium" | "high" | "urgent";
          status?: "open" | "pending" | "resolved" | "closed";
          subject: string;
        };
        Update: Partial<Database["public"]["Tables"]["tickets"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type SupabaseTableRow<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Row"];
