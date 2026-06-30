"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const SETTINGS_NAV_ITEMS = [
  { href: "/settings", key: "general" },
  { href: "/settings/calendar", key: "calendar" },
] as const satisfies Array<{ href: Route; key: "general" | "calendar" }>;

export function SettingsSubnav() {
  const pathname = usePathname();
  const { messages } = useI18n();

  return (
    <nav
      className="grid gap-3 rounded-[28px] border border-border/70 bg-card/75 p-3 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur md:grid-cols-2"
      aria-label={messages.settings.submenuAriaLabel}
    >
      {SETTINGS_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const label =
          item.key === "general" ? messages.settings.generalTab : messages.settings.calendarTab;
        const description =
          item.key === "general"
            ? messages.settings.generalTabDescription
            : messages.settings.calendarTabDescription;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-3xl border px-4 py-4 transition",
              isActive
                ? "border-primary/20 bg-primary/8 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.12)]"
                : "border-border/70 bg-background/70 hover:border-border hover:bg-background",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          </Link>
        );
      })}
    </nav>
  );
}
