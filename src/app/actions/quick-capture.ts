"use server";

import { z } from "zod";

import { getRequestI18n } from "@/lib/i18n/request";
import { createLogger } from "@/lib/logger";
import type { QuickCaptureState } from "@/types/contracts";

const logger = createLogger("quick-capture-action");

const quickCaptureSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Enter at least 3 characters.")
    .max(80, "Keep the title under 80 characters."),
  entityType: z.enum(["deal", "contact", "ticket", "company"]),
});

export async function submitQuickCaptureAction(
  _previousState: QuickCaptureState,
  formData: FormData,
): Promise<QuickCaptureState> {
  const { messages } = await getRequestI18n();

  const parsed = quickCaptureSchema.safeParse({
    title: formData.get("title"),
    entityType: formData.get("entityType"),
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;

    if (errors.title) {
      errors.title = errors.title.map((message) => {
        if (message.includes("at least 3")) {
          return messages.quickCapture.validation.titleMin;
        }

        if (message.includes("under 80")) {
          return messages.quickCapture.validation.titleMax;
        }

        return message;
      });
    }

    return {
      status: "error",
      message: messages.quickCapture.reviewError,
      fieldErrors: errors,
    };
  }

  logger.info("Received quick capture placeholder submission.", parsed.data);

  return {
    status: "success",
    message: `${messages.quickCapture.successPrefix} ${
      messages.quickCapture.entityTypes[parsed.data.entityType]
    } ${messages.quickCapture.successSuffix} "${parsed.data.title}".`,
  };
}
