import type { DashboardMetric } from "@/types/contracts";
import { MetricCard } from "@/components/dashboard/metric-card";

export function MetricsGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <section
      aria-label="Key CRM metrics"
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </section>
  );
}
