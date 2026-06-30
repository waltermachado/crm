import { LanguagePreferenceForm } from "@/components/settings/language-preference-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRequestI18n } from "@/lib/i18n/request";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { locale, messages } = await getRequestI18n();
  const params = await searchParams;
  const showConfirmation = params.saved === "language";

  return (
    <SettingsShell messages={messages}>
      {showConfirmation ? (
        <div
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
          role="status"
          aria-live="polite"
        >
          {messages.settings.confirmation}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <CardHeader>
            <CardTitle>{messages.settings.languageCardTitle}</CardTitle>
            <CardDescription>{messages.settings.languageCardDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguagePreferenceForm selectedLocale={locale} messages={messages} />
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <CardHeader>
            <CardTitle>{messages.common.language}</CardTitle>
            <CardDescription>{messages.settings.detectBrazil}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="font-medium text-foreground">
                {messages.languages["pt-BR"].visual} · {messages.languages["pt-BR"].label}
              </p>
              <p className="mt-2">{messages.settings.helperText}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="font-medium text-foreground">
                {messages.languages["en-US"].visual} · {messages.languages["en-US"].label}
              </p>
              <p className="mt-2">{messages.settings.accessibilityHint}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsShell>
  );
}
