export type WorkspaceRole = "admin" | "sales_manager" | "support_lead";

export type DealStage =
  | "qualification"
  | "discovery"
  | "proposal"
  | "negotiation"
  | "closed";

export type TicketStatus = "open" | "pending" | "resolved";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type Company = {
  id: string;
  workspaceId: string;
  name: string;
  industry?: string | null;
  website?: string | null;
};

export type Contact = {
  id: string;
  workspaceId: string;
  companyId?: string | null;
  ownerMembershipId?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
};

export type Deal = {
  id: string;
  workspaceId: string;
  companyId?: string | null;
  ownerMembershipId?: string | null;
  name: string;
  stage: DealStage;
  valueCents: number;
};

export type Ticket = {
  id: string;
  workspaceId: string;
  ownerMembershipId?: string | null;
  subject: string;
  status: TicketStatus;
  priority?: string | null;
};
