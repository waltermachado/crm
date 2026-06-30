import { Building2, ContactRound, LifeBuoy, Target } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { I18nMessages } from "@/lib/i18n/messages";
import type { ActivityItem } from "@/types/contracts";

const activityIcons = {
  company: Building2,
  contact: ContactRound,
  deal: Target,
  ticket: LifeBuoy,
} as const;

function createInitials(input: string) {
  return input
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function RecentActivityList({
  activities,
  copy,
}: {
  activities: ActivityItem[];
  copy: I18nMessages["dashboard"]["activities"];
}) {
  const activityLabels = copy.types;

  return (
    <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.type];

          return (
            <div key={activity.id}>
              <article className="flex items-start gap-3">
                <Avatar className="size-10 border border-border/70 bg-background">
                  <AvatarFallback className="bg-background text-xs text-foreground">
                    {createInitials(activity.actorName)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full border-border/80 bg-background/70 px-2 py-0.5 text-[11px]"
                    >
                      <Icon className="mr-1 size-3" />
                      {activityLabels[activity.type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {activity.occurredAt}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{activity.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {copy.recordedBy} {activity.actorName}
                  </p>
                </div>
              </article>

              {index < activities.length - 1 ? (
                <Separator className="mt-4 bg-border/70" />
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
