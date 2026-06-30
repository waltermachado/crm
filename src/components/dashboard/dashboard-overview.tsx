import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { PipelineBoard } from "@/components/dashboard/pipeline-board";
import { QuickCaptureForm } from "@/components/dashboard/quick-capture-form";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { I18nMessages } from "@/lib/i18n/messages";
import type { DashboardSnapshot } from "@/types/contracts";

export function DashboardOverview({
  snapshot,
  copy,
}: {
  snapshot: DashboardSnapshot;
  copy: I18nMessages["dashboard"];
}) {
  const heroDescription = copy.heroDescription.replace(
    "{workspaceName}",
    snapshot.workspaceName,
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.32))] shadow-[0_40px_90px_-50px_rgba(15,23,42,0.5)] backdrop-blur dark:bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(15,23,42,0.74))]">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-primary/12 px-3 py-1 text-primary hover:bg-primary/12">
                {copy.badgeBaseline}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-border/80 bg-background/60 px-3 py-1 text-[11px]"
              >
                <ShieldCheck className="mr-1 size-3" />
                {copy.badgeRls}
              </Badge>
            </div>
            <div className="max-w-3xl space-y-3">
              <CardTitle className="text-3xl tracking-tight sm:text-4xl">
                {copy.heroTitle}
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 text-foreground/75">
                {heroDescription}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button className="rounded-full px-4">
              {copy.reviewWorkspaceHealth}
              <ArrowUpRight className="size-4" />
            </Button>
            <p className="text-sm text-muted-foreground">{snapshot.reportingRange}</p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <CardHeader>
            <CardTitle>{copy.quickCaptureTitle}</CardTitle>
            <CardDescription>{copy.quickCaptureDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <QuickCaptureForm />
          </CardContent>
        </Card>
      </section>

      <MetricsGrid metrics={snapshot.metrics} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <PipelineBoard pipeline={snapshot.pipeline} copy={copy.pipeline} />
        <RecentActivityList activities={snapshot.activities} copy={copy.activities} />
      </section>
    </div>
  );
}
