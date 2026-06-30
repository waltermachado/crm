import { ShieldCheck } from "lucide-react";

import { SettingsSubnav } from "@/components/settings/settings-subnav";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { I18nMessages } from "@/lib/i18n/messages";

export function SettingsShell({
  messages,
  children,
}: {
  messages: I18nMessages;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
        <CardHeader className="gap-4">
          <Badge className="w-fit rounded-full bg-primary/12 px-3 py-1 text-primary hover:bg-primary/12">
            {messages.settings.badge}
          </Badge>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-3xl tracking-tight">{messages.settings.title}</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6 text-foreground/75">
                {messages.settings.description}
              </CardDescription>
            </div>
            <div className="rounded-3xl border border-border/80 bg-background/80 p-4">
              <ShieldCheck className="size-6 text-primary" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <SettingsSubnav />

      {children}
    </div>
  );
}
