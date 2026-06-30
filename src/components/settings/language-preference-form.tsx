"use client";

import { useFormStatus } from "react-dom";

import { saveLanguagePreferenceAction } from "@/app/actions/language-preference";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/config";
import type { I18nMessages } from "@/lib/i18n/messages";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function LanguagePreferenceForm({
  selectedLocale,
  messages,
}: {
  selectedLocale: AppLocale;
  messages: I18nMessages;
}) {
  return (
    <form action={saveLanguagePreferenceAction} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="locale"
          className="text-sm font-medium text-foreground"
        >
          {messages.settings.languageCardTitle}
        </label>
        <select
          id="locale"
          name="locale"
          defaultValue={selectedLocale}
          className="flex h-11 w-full rounded-xl border border-border/70 bg-background/80 px-3 text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15"
          aria-describedby="language-selector-help"
        >
          <option value="pt-BR">
            {messages.languages["pt-BR"].visual} · {messages.languages["pt-BR"].label}
          </option>
          <option value="en-US">
            {messages.languages["en-US"].visual} · {messages.languages["en-US"].label}
          </option>
        </select>
      </div>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p id="language-selector-help">{messages.settings.helperText}</p>
        <p>
          {messages.settings.currentSelection}:{" "}
          <span className="font-medium text-foreground">
            {messages.languages[selectedLocale].label}
          </span>
        </p>
        <p>{messages.settings.accessibilityHint}</p>
      </div>

      <SubmitButton label={messages.common.save} pendingLabel={messages.common.saving} />
    </form>
  );
}
