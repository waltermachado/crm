"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitQuickCaptureAction } from "@/app/actions/quick-capture";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { QuickCaptureState } from "@/types/contracts";

function SubmitButton() {
  const { pending } = useFormStatus();
  const { messages } = useI18n();

  return (
    <Button className="w-full rounded-xl" type="submit" disabled={pending}>
      {pending ? messages.quickCapture.submitting : messages.quickCapture.submit}
    </Button>
  );
}

export function QuickCaptureForm() {
  const { messages } = useI18n();
  const initialQuickCaptureState: QuickCaptureState = {
    status: "idle",
    message: messages.quickCapture.initialMessage,
  };
  const [state, action] = useActionState(
    submitQuickCaptureAction,
    initialQuickCaptureState,
  );

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="title">
          {messages.quickCapture.titleLabel}
        </label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder={messages.quickCapture.titlePlaceholder}
          className={cn(
            "flex h-11 w-full rounded-xl border border-border/70 bg-background/70 px-3 text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15",
            state.fieldErrors?.title && "border-destructive/60 focus:border-destructive/60",
          )}
        />
        {state.fieldErrors?.title ? (
          <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="entityType">
          {messages.quickCapture.entityTypeLabel}
        </label>
        <select
          id="entityType"
          name="entityType"
          defaultValue="deal"
          className={cn(
            "flex h-11 w-full rounded-xl border border-border/70 bg-background/70 px-3 text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15",
            state.fieldErrors?.entityType &&
              "border-destructive/60 focus:border-destructive/60",
          )}
        >
          <option value="deal">{messages.quickCapture.entityTypes.deal}</option>
          <option value="contact">{messages.quickCapture.entityTypes.contact}</option>
          <option value="ticket">{messages.quickCapture.entityTypes.ticket}</option>
          <option value="company">{messages.quickCapture.entityTypes.company}</option>
        </select>
        {state.fieldErrors?.entityType ? (
          <p className="text-xs text-destructive">{state.fieldErrors.entityType[0]}</p>
        ) : null}
      </div>

      <SubmitButton />

      <p
        className={cn(
          "text-xs",
          state.status === "error" ? "text-destructive" : "text-muted-foreground",
          state.status === "success" && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {state.message}
      </p>
    </form>
  );
}
