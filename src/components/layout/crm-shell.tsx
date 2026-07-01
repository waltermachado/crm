"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Command,
  LoaderCircle,
  LogOut,
  Menu,
  PanelLeftClose,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { signOutAction } from "@/app/actions/auth";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

function formatSegment(segment: string) {
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function WorkspaceSidebar({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { messages } = useI18n();

  return (
    <div className="flex h-full flex-col rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.58))] p-3 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.55)] backdrop-blur dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.7))]">
      <div className={cn("flex items-center gap-3 px-3 py-3", collapsed && "justify-center px-0")}>
        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <span className="font-semibold tracking-tight">ON</span>
        </div>
        <div className={cn("min-w-0", collapsed && "hidden")}>
          <p className="font-semibold tracking-tight">OslerNotes CRM</p>
          <p className="text-xs text-muted-foreground">{messages.shell.enterpriseWorkspace}</p>
        </div>
      </div>

      <div className="mt-4 flex-1">
        <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      <div
        className={cn(
          "mt-4 rounded-3xl border border-border/70 bg-background/70 p-4",
          collapsed && "p-3",
        )}
      >
        <div className={cn("flex items-start gap-3", collapsed && "justify-center")}>
          <ShieldCheck className="mt-0.5 size-4 text-primary" />
          <div className={cn("space-y-1", collapsed && "hidden")}>
            <p className="text-sm font-medium">{messages.shell.securityTitle}</p>
            <p className="text-xs text-muted-foreground">
              {messages.shell.securityDescription}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CrmShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: {
    email: string;
    label: string;
    initials: string;
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, startSignOutTransition] = useTransition();
  const { locale, messages } = useI18n();

  const breadcrumbs = useMemo(() => {
    const breadcrumbLabels: Record<string, string> = {
      dashboard: messages.navigation.overview,
      agenda: messages.navigation.agenda,
      deals: messages.navigation.deals,
      contacts: messages.navigation.contacts,
      companies: messages.navigation.companies,
      tickets: messages.navigation.tickets,
      settings: messages.navigation.settings,
      calendar: messages.settings.calendarTab,
    };
    const segments = pathname.split("/").filter(Boolean);
    return segments.length > 0
      ? segments.map((segment) => breadcrumbLabels[segment] ?? formatSegment(segment))
      : [messages.shell.breadcrumbOverview];
  }, [messages, pathname]);

  const shellCopy =
    locale === "pt-BR"
      ? {
          signOut: "Sair",
          signingOut: "Saindo...",
        }
      : {
          signOut: "Sign out",
          signingOut: "Signing out...",
        };

  function handleSignOut() {
    startSignOutTransition(async () => {
      const result = await signOutAction();

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_18%),linear-gradient(180deg,rgba(248,250,252,1),rgba(241,245,249,0.92))] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_16%),linear-gradient(180deg,rgba(2,6,23,1),rgba(15,23,42,0.95))]">
      <div className="mx-auto flex min-h-screen max-w-[1680px] gap-4 px-4 py-4 md:px-6">
        <aside
          className={cn(
            "hidden transition-[width] duration-200 xl:block",
            collapsed ? "w-24" : "w-[290px]",
          )}
        >
          <WorkspaceSidebar collapsed={collapsed} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col rounded-[32px] border border-white/60 bg-white/55 shadow-[0_40px_120px_-70px_rgba(15,23,42,0.55)] backdrop-blur dark:border-white/6 dark:bg-slate-950/45">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 px-4 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger
                    render={
                      <Button variant="outline" size="icon" className="xl:hidden" />
                    }
                  >
                    <Menu className="size-4" />
                    <span className="sr-only">{messages.shell.openNavigation}</span>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full max-w-xs border-border/70 p-0">
                    <SheetHeader className="border-b border-border/70">
                      <SheetTitle>{messages.shell.workspaceNavigation}</SheetTitle>
                      <SheetDescription>{messages.shell.switchModules}</SheetDescription>
                    </SheetHeader>
                    <div className="h-full p-4">
                      <WorkspaceSidebar
                        collapsed={false}
                        onNavigate={() => setMobileOpen(false)}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                <Button
                  variant="outline"
                  size="icon"
                  className="hidden xl:inline-flex"
                  onClick={() => setCollapsed((value) => !value)}
                >
                  {collapsed ? (
                    <ChevronRight className="size-4" />
                  ) : (
                    <PanelLeftClose className="size-4" />
                  )}
                  <span className="sr-only">{messages.shell.toggleSidebar}</span>
                </Button>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {messages.shell.workspace}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h1 className="font-heading text-lg font-semibold tracking-tight">
                      {breadcrumbs[breadcrumbs.length - 1]}
                    </h1>
                    <Badge
                      variant="outline"
                      className="rounded-full border-border/80 bg-background/70 px-2 py-0.5 text-[11px]"
                    >
                      {messages.shell.liveShell}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-sm text-muted-foreground md:flex">
                  <Command className="size-4" />
                  {messages.shell.searchPlaceholder}
                </div>
                <Button variant="outline" size="icon">
                  <Bell className="size-4" />
                  <span className="sr-only">{messages.shell.notifications}</span>
                </Button>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 rounded-full border border-border/70 bg-background/80 px-2 py-1.5 pr-3"
                >
                  <Avatar className="size-9">
                    <AvatarFallback>{user.initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-medium">{user.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {messages.languages[locale].shortLabel} · {messages.shell.productionBaseline}
                    </p>
                  </div>
                </Link>
                <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
                  {isSigningOut ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                  {isSigningOut ? shellCopy.signingOut : shellCopy.signOut}
                </Button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border border-border/70 bg-background/80 px-2 py-1 text-xs">
                {messages.navigation.home}
              </span>
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb}-${index}`} className="flex items-center gap-2">
                  <ChevronLeft className="size-3 rotate-180" />
                  <span>{crumb}</span>
                </span>
              ))}
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
