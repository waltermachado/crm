export type MetricDirection = "up" | "down" | "neutral";

export type MetricId =
  | "totalContacts"
  | "companies"
  | "dealPipelineRevenue"
  | "supportTickets";

export type DashboardMetric = {
  id: MetricId;
  label: string;
  value: number;
  displayValue: string;
  hint: string;
  trendLabel: string;
  trendDirection: MetricDirection;
};

export type DealPipelineCard = {
  id: string;
  title: string;
  companyName: string;
  ownerName: string;
  displayValue: string;
  closeDateLabel: string;
};

export type PipelineStage = {
  id: string;
  label: string;
  dealCount: number;
  displayRevenue: string;
  items: DealPipelineCard[];
};

export type ActivityItem = {
  id: string;
  type: "deal" | "contact" | "ticket" | "company";
  summary: string;
  actorName: string;
  occurredAt: string;
};

export type DashboardSnapshot = {
  workspaceName: string;
  reportingRange: string;
  metrics: DashboardMetric[];
  pipeline: PipelineStage[];
  activities: ActivityItem[];
};

export type PrivateDashboardNote = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type QuickCaptureState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: {
    title?: string[];
    entityType?: string[];
  };
};
