"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ContactRound,
  LayoutDashboard,
  LifeBuoy,
  NotebookPen,
  Settings2,
  Target,
} from "lucide-react";

import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { messages } = useI18n();
  const navigationItems = [
    { href: "/dashboard", label: messages.navigation.overview, icon: LayoutDashboard },
    { href: "/agenda", label: messages.navigation.agenda, icon: CalendarDays },
    { href: "/deals", label: messages.navigation.deals, icon: Target },
    { href: "/notes", label: messages.navigation.notes, icon: NotebookPen },
    { href: "/contacts", label: messages.navigation.contacts, icon: ContactRound },
    { href: "/companies", label: messages.navigation.companies, icon: Building2 },
    { href: "/tickets", label: messages.navigation.tickets, icon: LifeBuoy },
    { href: "/settings", label: messages.navigation.settings, icon: Settings2 },
  ] satisfies Array<{ href: string; label: string; icon: typeof LayoutDashboard }>;

  return (
    <nav className="space-y-1.5" aria-label={messages.navigation.crmNavigation}>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:border-border/70 hover:bg-background/70 hover:text-foreground",
              isActive &&
                "border-primary/15 bg-primary/8 text-foreground shadow-[inset_0_0_0_1px_rgba(59,130,246,0.12)]",
              collapsed && "justify-center px-2.5",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
