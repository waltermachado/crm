import { ArrowRight, BriefcaseBusiness } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { I18nMessages } from "@/lib/i18n/messages";
import type { PipelineStage } from "@/types/contracts";

export function PipelineBoard({
  pipeline,
  copy,
}: {
  pipeline: PipelineStage[];
  copy: I18nMessages["dashboard"]["pipeline"];
}) {
  return (
    <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="flex items-start justify-between gap-3 sm:flex-row">
        <div>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </div>
        <Badge
          variant="outline"
          className="rounded-full border-border/80 bg-background/70 px-3 py-1 text-[11px]"
        >
          {copy.placeholderBadge}
        </Badge>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex min-w-max gap-4 pb-4">
            {pipeline.map((stage) => (
              <section
                key={stage.id}
                className="flex w-[280px] shrink-0 flex-col rounded-3xl border border-border/70 bg-background/80 p-4"
              >
                <header className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{stage.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      {stage.dealCount} {copy.activeOpportunities}
                    </p>
                  </div>
                  <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-primary hover:bg-primary/10">
                    {stage.displayRevenue}
                  </Badge>
                </header>

                <div className="mt-4 space-y-3">
                  {stage.items.length > 0 ? (
                    stage.items.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-medium">{item.title}</h4>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.companyName}
                            </p>
                          </div>
                          <BriefcaseBusiness className="mt-0.5 size-4 text-muted-foreground" />
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>{item.ownerName}</span>
                          <span>{item.displayValue}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                          <span>{item.closeDateLabel}</span>
                          <ArrowRight className="size-3" />
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
                      {copy.empty}
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
