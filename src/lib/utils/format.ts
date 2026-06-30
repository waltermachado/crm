import { getCurrencyForLocale, type AppLocale } from "@/lib/i18n/config";

export function formatCompactNumber(value: number, locale: AppLocale = "en-US") {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

export function formatCurrencyFromCents(
  valueCents: bigint | number,
  locale: AppLocale = "en-US",
) {
  const amount =
    typeof valueCents === "bigint" ? Number(valueCents) / 100 : valueCents / 100;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: getCurrencyForLocale(locale),
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatStageLabel(value: string) {
  return value
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function formatRelativeDate(value: Date | string, locale: AppLocale = "en-US") {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
