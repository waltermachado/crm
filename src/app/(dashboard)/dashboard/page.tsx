import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { MyNotesPanel } from "@/components/dashboard/my-notes-panel";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { PipelineBoard } from "@/components/dashboard/pipeline-board";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getDashboardOverview,
  getPrivateDashboardNotes,
} from "@/lib/dashboard/get-dashboard-overview";
import { getRequestI18n } from "@/lib/i18n/request";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const [{ locale, messages }, authResult] = await Promise.all([
    getRequestI18n(),
    supabase.auth.getUser(),
  ]);

  const user = authResult.data.user;

  if (!user) {
    redirect("/");
  }

  const [snapshot, notes] = await Promise.all([
    getDashboardOverview(locale),
    getPrivateDashboardNotes(user),
  ]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.32))] shadow-[0_40px_90px_-50px_rgba(15,23,42,0.5)] backdrop-blur dark:bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(15,23,42,0.74))]">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-primary/12 px-3 py-1 text-primary hover:bg-primary/12">
                {messages.dashboard.badgeBaseline}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-border/80 bg-background/60 px-3 py-1 text-[11px]"
              >
                <ShieldCheck className="mr-1 size-3" />
                {messages.dashboard.badgeRls}
              </Badge>
            </div>
            <div className="max-w-3xl space-y-3">
              <CardTitle className="text-3xl tracking-tight sm:text-4xl">
                {messages.dashboard.heroTitle}
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 text-foreground/75">
                {messages.dashboard.heroDescription.replace(
                  "{workspaceName}",
                  snapshot.workspaceName,
                )}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">{snapshot.reportingRange}</p>
          </CardContent>
        </Card>

        <MyNotesPanel notes={notes} locale={locale} />
      </section>

      <MetricsGrid metrics={snapshot.metrics} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <PipelineBoard pipeline={snapshot.pipeline} copy={messages.dashboard.pipeline} />
        <RecentActivityList activities={snapshot.activities} copy={messages.dashboard.activities} />
      </section>
    </div>
  );
}
