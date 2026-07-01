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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          description: string
          id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
        }
        Relationships: []
      }
      Activity: {
        Row: {
          actorMembershipId: string | null
          createdAt: string
          entityId: string
          entityType: Database["public"]["Enums"]["ActivityEntityType"]
          id: string
          metadata: Json | null
          summary: string
          workspaceId: string
        }
        Insert: {
          actorMembershipId?: string | null
          createdAt?: string
          entityId: string
          entityType: Database["public"]["Enums"]["ActivityEntityType"]
          id: string
          metadata?: Json | null
          summary: string
          workspaceId: string
        }
        Update: {
          actorMembershipId?: string | null
          createdAt?: string
          entityId?: string
          entityType?: Database["public"]["Enums"]["ActivityEntityType"]
          id?: string
          metadata?: Json | null
          summary?: string
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Activity_actorMembershipId_fkey"
            columns: ["actorMembershipId"]
            isOneToOne: false
            referencedRelation: "Membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Activity_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      CalendarEvent: {
        Row: {
          contactId: string | null
          createdAt: string
          dealId: string | null
          description: string | null
          endDatetime: string
          eventType: Database["public"]["Enums"]["CalendarEventType"]
          externalEventId: string | null
          id: string
          integrationAccountId: string | null
          isAllDay: boolean
          lastSyncedAt: string | null
          location: string | null
          ownerMembershipId: string | null
          startDatetime: string
          title: string
          updatedAt: string
          userId: string
          workspaceId: string
        }
        Insert: {
          contactId?: string | null
          createdAt?: string
          dealId?: string | null
          description?: string | null
          endDatetime: string
          eventType: Database["public"]["Enums"]["CalendarEventType"]
          externalEventId?: string | null
          id: string
          integrationAccountId?: string | null
          isAllDay?: boolean
          lastSyncedAt?: string | null
          location?: string | null
          ownerMembershipId?: string | null
          startDatetime: string
          title: string
          updatedAt: string
          userId: string
          workspaceId: string
        }
        Update: {
          contactId?: string | null
          createdAt?: string
          dealId?: string | null
          description?: string | null
          endDatetime?: string
          eventType?: Database["public"]["Enums"]["CalendarEventType"]
          externalEventId?: string | null
          id?: string
          integrationAccountId?: string | null
          isAllDay?: boolean
          lastSyncedAt?: string | null
          location?: string | null
          ownerMembershipId?: string | null
          startDatetime?: string
          title?: string
          updatedAt?: string
          userId?: string
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "CalendarEvent_contactId_fkey"
            columns: ["contactId"]
            isOneToOne: false
            referencedRelation: "Contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CalendarEvent_dealId_fkey"
            columns: ["dealId"]
            isOneToOne: false
            referencedRelation: "Deal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CalendarEvent_integrationAccountId_fkey"
            columns: ["integrationAccountId"]
            isOneToOne: false
            referencedRelation: "IntegrationAccount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CalendarEvent_ownerMembershipId_fkey"
            columns: ["ownerMembershipId"]
            isOneToOne: false
            referencedRelation: "Membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CalendarEvent_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      Company: {
        Row: {
          createdAt: string
          id: string
          industry: string | null
          name: string
          updatedAt: string
          website: string | null
          workspaceId: string
        }
        Insert: {
          createdAt?: string
          id: string
          industry?: string | null
          name: string
          updatedAt: string
          website?: string | null
          workspaceId: string
        }
        Update: {
          createdAt?: string
          id?: string
          industry?: string | null
          name?: string
          updatedAt?: string
          website?: string | null
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Company_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      Contact: {
        Row: {
          companyId: string | null
          createdAt: string
          email: string | null
          fullName: string
          id: string
          ownerMembershipId: string | null
          phone: string | null
          updatedAt: string
          workspaceId: string
        }
        Insert: {
          companyId?: string | null
          createdAt?: string
          email?: string | null
          fullName: string
          id: string
          ownerMembershipId?: string | null
          phone?: string | null
          updatedAt: string
          workspaceId: string
        }
        Update: {
          companyId?: string | null
          createdAt?: string
          email?: string | null
          fullName?: string
          id?: string
          ownerMembershipId?: string | null
          phone?: string | null
          updatedAt?: string
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Contact_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Contact_ownerMembershipId_fkey"
            columns: ["ownerMembershipId"]
            isOneToOne: false
            referencedRelation: "Membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Contact_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          status: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string | null
        }
        Relationships: []
      }
      Deal: {
        Row: {
          companyId: string | null
          contactId: string | null
          createdAt: string
          description: string | null
          enteredStageAt: string
          expectedCloseAt: string | null
          id: string
          name: string
          ownerMembershipId: string | null
          pipelineId: string | null
          position: number
          stage: Database["public"]["Enums"]["DealStage"]
          stageId: string | null
          status: string | null
          updatedAt: string
          valueCents: number
          webhookMetadata: Json | null
          workspaceId: string
        }
        Insert: {
          companyId?: string | null
          contactId?: string | null
          createdAt?: string
          description?: string | null
          enteredStageAt?: string
          expectedCloseAt?: string | null
          id: string
          name: string
          ownerMembershipId?: string | null
          pipelineId?: string | null
          position?: number
          stage: Database["public"]["Enums"]["DealStage"]
          stageId?: string | null
          status?: string | null
          updatedAt: string
          valueCents?: number
          webhookMetadata?: Json | null
          workspaceId: string
        }
        Update: {
          companyId?: string | null
          contactId?: string | null
          createdAt?: string
          description?: string | null
          enteredStageAt?: string
          expectedCloseAt?: string | null
          id?: string
          name?: string
          ownerMembershipId?: string | null
          pipelineId?: string | null
          position?: number
          stage?: Database["public"]["Enums"]["DealStage"]
          stageId?: string | null
          status?: string | null
          updatedAt?: string
          valueCents?: number
          webhookMetadata?: Json | null
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Deal_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Deal_contactId_fkey"
            columns: ["contactId"]
            isOneToOne: false
            referencedRelation: "Contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Deal_ownerMembershipId_fkey"
            columns: ["ownerMembershipId"]
            isOneToOne: false
            referencedRelation: "Membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Deal_pipelineId_fkey"
            columns: ["pipelineId"]
            isOneToOne: false
            referencedRelation: "Pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Deal_stageId_fkey"
            columns: ["stageId"]
            isOneToOne: false
            referencedRelation: "PipelineStage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Deal_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      DealEventLog: {
        Row: {
          actorMembershipId: string | null
          createdAt: string
          dealId: string | null
          deliveredAt: string | null
          eventType: Database["public"]["Enums"]["DealEventType"]
          id: string
          payload: Json
          pipelineId: string | null
          responseStatus: number | null
          stageId: string | null
          webhookUrl: string | null
          workspaceId: string
        }
        Insert: {
          actorMembershipId?: string | null
          createdAt?: string
          dealId?: string | null
          deliveredAt?: string | null
          eventType: Database["public"]["Enums"]["DealEventType"]
          id: string
          payload: Json
          pipelineId?: string | null
          responseStatus?: number | null
          stageId?: string | null
          webhookUrl?: string | null
          workspaceId: string
        }
        Update: {
          actorMembershipId?: string | null
          createdAt?: string
          dealId?: string | null
          deliveredAt?: string | null
          eventType?: Database["public"]["Enums"]["DealEventType"]
          id?: string
          payload?: Json
          pipelineId?: string | null
          responseStatus?: number | null
          stageId?: string | null
          webhookUrl?: string | null
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "DealEventLog_actorMembershipId_fkey"
            columns: ["actorMembershipId"]
            isOneToOne: false
            referencedRelation: "Membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DealEventLog_dealId_fkey"
            columns: ["dealId"]
            isOneToOne: false
            referencedRelation: "Deal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DealEventLog_pipelineId_fkey"
            columns: ["pipelineId"]
            isOneToOne: false
            referencedRelation: "Pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DealEventLog_stageId_fkey"
            columns: ["stageId"]
            isOneToOne: false
            referencedRelation: "PipelineStage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DealEventLog_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          company: string | null
          created_at: string
          id: string
          stage: string
          title: string
          value: number
        }
        Insert: {
          company?: string | null
          created_at?: string
          id?: string
          stage?: string
          title: string
          value?: number
        }
        Update: {
          company?: string | null
          created_at?: string
          id?: string
          stage?: string
          title?: string
          value?: number
        }
        Relationships: []
      }
      DealStageTransition: {
        Row: {
          actorMembershipId: string | null
          createdAt: string
          dealId: string
          durationInPreviousStageSeconds: number | null
          fromStageId: string | null
          id: string
          toStageId: string | null
          workspaceId: string
        }
        Insert: {
          actorMembershipId?: string | null
          createdAt?: string
          dealId: string
          durationInPreviousStageSeconds?: number | null
          fromStageId?: string | null
          id: string
          toStageId?: string | null
          workspaceId: string
        }
        Update: {
          actorMembershipId?: string | null
          createdAt?: string
          dealId?: string
          durationInPreviousStageSeconds?: number | null
          fromStageId?: string | null
          id?: string
          toStageId?: string | null
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "DealStageTransition_actorMembershipId_fkey"
            columns: ["actorMembershipId"]
            isOneToOne: false
            referencedRelation: "Membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DealStageTransition_dealId_fkey"
            columns: ["dealId"]
            isOneToOne: false
            referencedRelation: "Deal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DealStageTransition_fromStageId_fkey"
            columns: ["fromStageId"]
            isOneToOne: false
            referencedRelation: "PipelineStage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DealStageTransition_toStageId_fkey"
            columns: ["toStageId"]
            isOneToOne: false
            referencedRelation: "PipelineStage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DealStageTransition_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      IntegrationAccount: {
        Row: {
          accessToken: string | null
          calendarName: string
          createdAt: string
          expiresAt: string | null
          externalCalendarId: string
          id: string
          isActive: boolean
          membershipId: string | null
          provider: Database["public"]["Enums"]["IntegrationProvider"]
          providerAccountEmail: string | null
          refreshToken: string | null
          settings: Json | null
          syncToken: string | null
          updatedAt: string
          userId: string
          webhookChannelId: string | null
          webhookResourceId: string | null
          workspaceId: string
        }
        Insert: {
          accessToken?: string | null
          calendarName: string
          createdAt?: string
          expiresAt?: string | null
          externalCalendarId: string
          id: string
          isActive?: boolean
          membershipId?: string | null
          provider: Database["public"]["Enums"]["IntegrationProvider"]
          providerAccountEmail?: string | null
          refreshToken?: string | null
          settings?: Json | null
          syncToken?: string | null
          updatedAt: string
          userId: string
          webhookChannelId?: string | null
          webhookResourceId?: string | null
          workspaceId: string
        }
        Update: {
          accessToken?: string | null
          calendarName?: string
          createdAt?: string
          expiresAt?: string | null
          externalCalendarId?: string
          id?: string
          isActive?: boolean
          membershipId?: string | null
          provider?: Database["public"]["Enums"]["IntegrationProvider"]
          providerAccountEmail?: string | null
          refreshToken?: string | null
          settings?: Json | null
          syncToken?: string | null
          updatedAt?: string
          userId?: string
          webhookChannelId?: string | null
          webhookResourceId?: string | null
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "IntegrationAccount_membershipId_fkey"
            columns: ["membershipId"]
            isOneToOne: false
            referencedRelation: "Membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "IntegrationAccount_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      Membership: {
        Row: {
          createdAt: string
          email: string
          fullName: string
          id: string
          role: Database["public"]["Enums"]["WorkspaceRole"]
          updatedAt: string
          userId: string
          workspaceId: string
        }
        Insert: {
          createdAt?: string
          email: string
          fullName: string
          id: string
          role: Database["public"]["Enums"]["WorkspaceRole"]
          updatedAt: string
          userId: string
          workspaceId: string
        }
        Update: {
          createdAt?: string
          email?: string
          fullName?: string
          id?: string
          role?: Database["public"]["Enums"]["WorkspaceRole"]
          updatedAt?: string
          userId?: string
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Membership_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      NoteCard: {
        Row: {
          color: string | null
          columnName: string | null
          content: string | null
          createdAt: string
          id: string
          order: number
          title: string
          updatedAt: string
          workspaceId: string
        }
        Insert: {
          color?: string | null
          columnName?: string | null
          content?: string | null
          createdAt?: string
          id: string
          order?: number
          title: string
          updatedAt: string
          workspaceId: string
        }
        Update: {
          color?: string | null
          columnName?: string | null
          content?: string | null
          createdAt?: string
          id?: string
          order?: number
          title?: string
          updatedAt?: string
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "NoteCard_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "NoteWorkspace"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      NoteSequence: {
        Row: {
          currentValue: number
          id: string
          updatedAt: string
        }
        Insert: {
          currentValue?: number
          id: string
          updatedAt: string
        }
        Update: {
          currentValue?: number
          id?: string
          updatedAt?: string
        }
        Relationships: []
      }
      NoteWorkspace: {
        Row: {
          columnDefinitions: Json | null
          createdAt: string
          crmWorkspaceId: string
          documentContent: string | null
          id: string
          name: string
          updatedAt: string
          userId: string
          viewType: Database["public"]["Enums"]["NoteViewType"]
          whiteboardData: Json | null
        }
        Insert: {
          columnDefinitions?: Json | null
          createdAt?: string
          crmWorkspaceId: string
          documentContent?: string | null
          id: string
          name: string
          updatedAt: string
          userId: string
          viewType: Database["public"]["Enums"]["NoteViewType"]
          whiteboardData?: Json | null
        }
        Update: {
          columnDefinitions?: Json | null
          createdAt?: string
          crmWorkspaceId?: string
          documentContent?: string | null
          id?: string
          name?: string
          updatedAt?: string
          userId?: string
          viewType?: Database["public"]["Enums"]["NoteViewType"]
          whiteboardData?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "NoteWorkspace_crmWorkspaceId_fkey"
            columns: ["crmWorkspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      Pipeline: {
        Row: {
          createdAt: string
          id: string
          isDefault: boolean
          name: string
          updatedAt: string
          workspaceId: string
        }
        Insert: {
          createdAt?: string
          id: string
          isDefault?: boolean
          name: string
          updatedAt: string
          workspaceId: string
        }
        Update: {
          createdAt?: string
          id?: string
          isDefault?: boolean
          name?: string
          updatedAt?: string
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Pipeline_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      PipelineStage: {
        Row: {
          colorToken: string | null
          createdAt: string
          id: string
          isClosedLost: boolean
          isClosedWon: boolean
          name: string
          pipelineId: string
          position: number
          slug: string
          updatedAt: string
          workspaceId: string
        }
        Insert: {
          colorToken?: string | null
          createdAt?: string
          id: string
          isClosedLost?: boolean
          isClosedWon?: boolean
          name: string
          pipelineId: string
          position: number
          slug: string
          updatedAt: string
          workspaceId: string
        }
        Update: {
          colorToken?: string | null
          createdAt?: string
          id?: string
          isClosedLost?: boolean
          isClosedWon?: boolean
          name?: string
          pipelineId?: string
          position?: number
          slug?: string
          updatedAt?: string
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "PipelineStage_pipelineId_fkey"
            columns: ["pipelineId"]
            isOneToOne: false
            referencedRelation: "Pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PipelineStage_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      Ticket: {
        Row: {
          createdAt: string
          id: string
          ownerMembershipId: string | null
          priority: string | null
          status: Database["public"]["Enums"]["TicketStatus"]
          subject: string
          updatedAt: string
          workspaceId: string
        }
        Insert: {
          createdAt?: string
          id: string
          ownerMembershipId?: string | null
          priority?: string | null
          status: Database["public"]["Enums"]["TicketStatus"]
          subject: string
          updatedAt: string
          workspaceId: string
        }
        Update: {
          createdAt?: string
          id?: string
          ownerMembershipId?: string | null
          priority?: string | null
          status?: Database["public"]["Enums"]["TicketStatus"]
          subject?: string
          updatedAt?: string
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Ticket_ownerMembershipId_fkey"
            columns: ["ownerMembershipId"]
            isOneToOne: false
            referencedRelation: "Membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Ticket_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      Workspace: {
        Row: {
          createdAt: string
          id: string
          name: string
          slug: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          name: string
          slug: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          id?: string
          name?: string
          slug?: string
          updatedAt?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rpc_move_deal: {
        Args: {
          p_actor_membership_id: string
          p_deal_id: string
          p_duration_in_previous_stage_seconds: number
          p_is_stage_change: boolean
          p_new_stage_enum: string
          p_new_stage_id: string
          p_old_stage_id: string
          p_source_updates: Json
          p_target_updates: Json
          p_workspace_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      ActivityEntityType: "company" | "contact" | "deal" | "ticket"
      CalendarEventType: "MEETING" | "TASK" | "SCHEDULE" | "PERSONAL"
      DealEventType:
        | "DEAL_CREATED"
        | "DEAL_UPDATED"
        | "DEAL_MOVED"
        | "DEAL_DELETED"
      DealStage:
        | "qualification"
        | "discovery"
        | "proposal"
        | "negotiation"
        | "closed"
      IntegrationProvider: "GOOGLE" | "APPLE"
      NoteViewType: "GRID" | "KANBAN" | "DOC" | "WHITEBOARD"
      TicketStatus: "open" | "pending" | "resolved"
      WorkspaceRole: "admin" | "sales_manager" | "support_lead"
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
    Enums: {
      ActivityEntityType: ["company", "contact", "deal", "ticket"],
      CalendarEventType: ["MEETING", "TASK", "SCHEDULE", "PERSONAL"],
      DealEventType: [
        "DEAL_CREATED",
        "DEAL_UPDATED",
        "DEAL_MOVED",
        "DEAL_DELETED",
      ],
      DealStage: [
        "qualification",
        "discovery",
        "proposal",
        "negotiation",
        "closed",
      ],
      IntegrationProvider: ["GOOGLE", "APPLE"],
      NoteViewType: ["GRID", "KANBAN", "DOC", "WHITEBOARD"],
      TicketStatus: ["open", "pending", "resolved"],
      WorkspaceRole: ["admin", "sales_manager", "support_lead"],
    },
  },
} as const
