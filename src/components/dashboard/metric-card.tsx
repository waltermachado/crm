import {
  Building2,
  CircleDollarSign,
  ContactRound,
  LifeBuoy,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardMetric, MetricId } from "@/types/contracts";

const metricIcons: Record<MetricId, typeof ContactRound> = {
  totalContacts: ContactRound,
  companies: Building2,
  dealPipelineRevenue: CircleDollarSign,
  supportTickets: LifeBuoy,
};

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metricIcons[metric.id];
  const TrendIcon = metric.trendDirection === "down" ? TrendingDown : TrendingUp;
  const trendTone =
    metric.trendDirection === "down"
      ? "text-amber-600 dark:text-amber-300"
      : metric.trendDirection === "neutral"
        ? "text-muted-foreground"
        : "text-emerald-600 dark:text-emerald-300";

  return (
    <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardDescription>{metric.label}</CardDescription>
            <CardTitle className="mt-2 text-3xl tracking-tight">
              {metric.displayValue}
            </CardTitle>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/80 p-3">
            <Icon className="size-5 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge
          variant="outline"
          className="rounded-full border-border/80 bg-background/70 px-2.5 py-1 text-[11px]"
        >
          <TrendIcon className={`mr-1 size-3 ${trendTone}`} />
          <span className={trendTone}>{metric.trendLabel}</span>
        </Badge>
        <p className="text-sm text-muted-foreground">{metric.hint}</p>
      </CardContent>
    </Card>
  );
}
