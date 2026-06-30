import { ArrowUpRight, Construction } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ModulePlaceholder({
  title,
  description,
  badge,
  ctaLabel,
  helperText,
}: {
  title: string;
  description: string;
  badge: string;
  ctaLabel: string;
  helperText: string;
}) {
  return (
    <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="gap-4">
        <Badge className="w-fit rounded-full bg-primary/12 px-3 py-1 text-primary hover:bg-primary/12">
          {badge}
        </Badge>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="text-3xl tracking-tight">{title}</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6 text-foreground/75">
              {description}
            </CardDescription>
          </div>
          <div className="rounded-3xl border border-border/80 bg-background/80 p-4">
            <Construction className="size-6 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Button className="rounded-full px-4">
          {ctaLabel}
          <ArrowUpRight className="size-4" />
        </Button>
        <p className="text-sm text-muted-foreground">{helperText}</p>
      </CardContent>
    </Card>
  );
}
