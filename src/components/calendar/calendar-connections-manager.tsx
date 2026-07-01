"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Apple, Link2, RefreshCw, Unplug } from "lucide-react";

import {
  disconnectCalendarConnectionAction,
  reactivateCalendarConnectionAction,
  saveAppleCalendarConnectionAction,
} from "@/app/actions/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CALENDAR_SETTINGS_PATH } from "@/lib/calendar/routes";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { CalendarConnectionRecord, CalendarSnapshot } from "@/types/calendar";

type AppleIntegrationFormValues = {
  calendarName: string;
  caldavUrl: string;
  appleId: string;
  appSpecificPassword: string;
};

const inputClassName =
  "flex h-11 w-full rounded-2xl border border-border/70 bg-background/80 px-3 text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15";

function buildAppleFormValues(connection: CalendarConnectionRecord | null): AppleIntegrationFormValues {
  return {
    calendarName: connection?.label ?? "Apple Calendar",
    caldavUrl: connection?.externalCalendarId ?? "",
    appleId: connection?.providerAccountEmail ?? "",
    appSpecificPassword: "",
  };
}

function isPlaceholderConnection(connection: CalendarConnectionRecord | null) {
  return connection?.id.endsWith("-placeholder") ?? false;
}

function formatLastSync(value: string | null | undefined, locale: string) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CalendarConnectionsManager({
  snapshot,
}: {
  snapshot: CalendarSnapshot;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useI18n();
  const [statusMessage, setStatusMessage] = useState("");
  const [integrationPending, startIntegrationTransition] = useTransition();

  const copy = locale === "pt-BR"
    ? {
        badge: "Integrações de calendário",
        title: "Conexões de agendas",
        description:
          "Centralize a conexão, manutenção e retomada da sincronização das agendas Google e Apple sem sair da área principal de configurações.",
        summaryTitle: "Agendas vinculadas ao usuário",
        summaryDescription:
          "Acompanhe o status de cada provedor, revise o último sync e ajuste credenciais quando necessário.",
        statusConnected: "Conectada",
        statusSuspended: "Sincronização suspensa",
        statusPending: "Não conectada",
        lastSync: "Último sync",
        notSyncedYet: "Ainda sem histórico de sincronização",
        connectedWith: "Conta vinculada",
        googleTitle: "Google Calendar",
        googleHint: "Gerencie a conexão OAuth2 com a conta Google usada para sincronização bidirecional.",
        googleMissingConfig: "Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e APP_URL para ativar o OAuth2.",
        googleConnected: "Google Calendar conectado.",
        googleReconnect: "Reconectar Google",
        googleConnect: "Conectar Google",
        appleTitle: "Apple Calendar / CalDAV",
        appleHint:
          "Edite a URL CalDAV, o Apple ID e a App-Specific Password para manter o sync ativo ou atualizar credenciais.",
        appleMissingConfig:
          "Defina INTEGRATION_ENCRYPTION_KEY para salvar as credenciais da Apple com criptografia.",
        calendarNameLabel: "Nome do calendário",
        caldavUrl: "URL CalDAV",
        appleId: "Apple ID",
        appPassword: "App-Specific Password",
        saveApple: "Salvar credenciais Apple",
        savingIntegration: "Salvando integração...",
        disconnect: "Desvincular conta",
        reactivate: "Reativar sincronização",
        integrationError: "Não foi possível concluir a integração.",
        appleSaved: "Apple Calendar atualizado com sucesso.",
      }
    : {
        badge: "Calendar integrations",
        title: "Calendar connections",
        description:
          "Centralize connection management, credential updates, and sync recovery for Google and Apple calendars inside the main settings area.",
        summaryTitle: "Calendars linked to the user",
        summaryDescription:
          "Track provider status, review the latest sync, and update credentials when needed.",
        statusConnected: "Connected",
        statusSuspended: "Sync paused",
        statusPending: "Not connected",
        lastSync: "Last sync",
        notSyncedYet: "No sync history yet",
        connectedWith: "Linked account",
        googleTitle: "Google Calendar",
        googleHint: "Manage the OAuth2 connection used for bidirectional Google Calendar sync.",
        googleMissingConfig: "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and APP_URL to enable OAuth2.",
        googleConnected: "Google Calendar connected.",
        googleReconnect: "Reconnect Google",
        googleConnect: "Connect Google",
        appleTitle: "Apple Calendar / CalDAV",
        appleHint:
          "Edit the CalDAV URL, Apple ID, and App-Specific Password to keep sync active or refresh credentials.",
        appleMissingConfig:
          "Set INTEGRATION_ENCRYPTION_KEY to store Apple credentials with encryption.",
        calendarNameLabel: "Calendar name",
        caldavUrl: "CalDAV URL",
        appleId: "Apple ID",
        appPassword: "App-Specific Password",
        saveApple: "Save Apple credentials",
        savingIntegration: "Saving integration...",
        disconnect: "Unlink account",
        reactivate: "Reactivate sync",
        integrationError: "Could not complete the integration.",
        appleSaved: "Apple Calendar updated successfully.",
      };

  const externalConnections = useMemo(
    () => snapshot.visibleCalendars.filter((connection) => connection.provider !== "OSLERNOTES_CRM"),
    [snapshot.visibleCalendars],
  );
  const googleConnection = useMemo(
    () => externalConnections.find((connection) => connection.provider === "GOOGLE") ?? null,
    [externalConnections],
  );
  const appleConnection = useMemo(
    () => externalConnections.find((connection) => connection.provider === "APPLE") ?? null,
    [externalConnections],
  );
  const [appleValues, setAppleValues] = useState<AppleIntegrationFormValues>(() =>
    buildAppleFormValues(appleConnection),
  );

  useEffect(() => {
    setAppleValues(buildAppleFormValues(appleConnection));
  }, [appleConnection]);

  useEffect(() => {
    const integrationStatus = searchParams.get("integrationStatus");
    const integrationError = searchParams.get("integrationError");

    if (integrationStatus === "connected") {
      setStatusMessage(copy.googleConnected);
      return;
    }

    if (integrationError) {
      setStatusMessage(copy.integrationError);
    }
  }, [copy.googleConnected, copy.integrationError, searchParams]);

  async function handleSaveAppleConnection() {
    startIntegrationTransition(async () => {
      const result = await saveAppleCalendarConnectionAction(appleValues);
      setStatusMessage(result.status === "success" ? copy.appleSaved : result.message);

      if (result.status === "success") {
        setAppleValues((current) => ({
          ...current,
          appSpecificPassword: "",
        }));
        router.refresh();
      }
    });
  }

  async function handleDisconnect(connectionId: string) {
    startIntegrationTransition(async () => {
      const result = await disconnectCalendarConnectionAction({
        integrationAccountId: connectionId,
      });
      setStatusMessage(result.message);

      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  async function handleReactivate(connectionId: string) {
    startIntegrationTransition(async () => {
      const result = await reactivateCalendarConnectionAction({
        integrationAccountId: connectionId,
      });
      setStatusMessage(result.message);

      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  function renderConnectionStatus(connection: CalendarConnectionRecord | null) {
    if (!connection || isPlaceholderConnection(connection)) {
      return copy.statusPending;
    }

    return connection.isConnected ? copy.statusConnected : copy.statusSuspended;
  }

  return (
    <div className="space-y-6">
      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground"
        >
          {statusMessage}
        </div>
      ) : null}

      <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit rounded-full bg-primary/12 px-3 py-1 text-primary hover:bg-primary/12">
              {copy.badge}
            </Badge>
            <div className="space-y-2">
              <CardTitle className="text-2xl tracking-tight">{copy.title}</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6 text-foreground/75">
                {copy.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
        <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <CardHeader>
            <CardTitle>{copy.summaryTitle}</CardTitle>
            <CardDescription>{copy.summaryDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {externalConnections.map((connection) => {
              const lastSync = formatLastSync(connection.lastSyncedAt, locale);

              return (
                <div
                  key={connection.id}
                  className="rounded-3xl border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{connection.label}</p>
                        <Badge className={cn("rounded-full px-2 py-0.5 ring-1", connection.colorClassName)}>
                          {renderConnectionStatus(connection)}
                        </Badge>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {connection.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {connection.providerAccountEmail ? (
                      <p>
                        {copy.connectedWith}: <span className="text-foreground">{connection.providerAccountEmail}</span>
                      </p>
                    ) : null}
                    <p>
                      {copy.lastSync}: <span className="text-foreground">{lastSync ?? copy.notSyncedYet}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <CardTitle>{copy.googleTitle}</CardTitle>
                  <CardDescription>
                    {snapshot.integrationState.googleOAuthConfigured
                      ? copy.googleHint
                      : copy.googleMissingConfig}
                  </CardDescription>
                </div>
                <Badge className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
                  OAuth2
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge className="rounded-full bg-background text-foreground ring-1 ring-border">
                {renderConnectionStatus(googleConnection)}
              </Badge>
              <a
                href={
                  snapshot.integrationState.googleOAuthConfigured
                    ? `/api/v1/integrations/google/start?returnTo=${CALENDAR_SETTINGS_PATH}`
                    : "#"
                }
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition",
                  snapshot.integrationState.googleOAuthConfigured
                    ? "hover:bg-muted"
                    : "pointer-events-none opacity-50",
                )}
              >
                <Link2 className="size-4" />
                {googleConnection?.isConnected ? copy.googleReconnect : copy.googleConnect}
              </a>

              {googleConnection && !isPlaceholderConnection(googleConnection) && !googleConnection.isConnected ? (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={integrationPending}
                  onClick={() => handleReactivate(googleConnection.id)}
                >
                  <RefreshCw className="size-4" />
                  {integrationPending ? copy.savingIntegration : copy.reactivate}
                </Button>
              ) : null}

              {googleConnection?.isConnected ? (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={integrationPending}
                  onClick={() => handleDisconnect(googleConnection.id)}
                >
                  <Unplug className="size-4" />
                  {integrationPending ? copy.savingIntegration : copy.disconnect}
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <CardTitle>{copy.appleTitle}</CardTitle>
                  <CardDescription>
                    {snapshot.integrationState.secureCredentialsEnabled
                      ? copy.appleHint
                      : copy.appleMissingConfig}
                  </CardDescription>
                </div>
                <Badge className="rounded-full bg-background text-foreground ring-1 ring-border">
                  {renderConnectionStatus(appleConnection)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                className={inputClassName}
                placeholder={copy.calendarNameLabel}
                value={appleValues.calendarName}
                onChange={(event) =>
                  setAppleValues((current) => ({
                    ...current,
                    calendarName: event.target.value,
                  }))
                }
              />
              <input
                className={inputClassName}
                placeholder={copy.caldavUrl}
                value={appleValues.caldavUrl}
                onChange={(event) =>
                  setAppleValues((current) => ({
                    ...current,
                    caldavUrl: event.target.value,
                  }))
                }
              />
              <input
                className={inputClassName}
                placeholder={copy.appleId}
                value={appleValues.appleId}
                onChange={(event) =>
                  setAppleValues((current) => ({
                    ...current,
                    appleId: event.target.value,
                  }))
                }
              />
              <input
                className={inputClassName}
                placeholder={copy.appPassword}
                type="password"
                value={appleValues.appSpecificPassword}
                onChange={(event) =>
                  setAppleValues((current) => ({
                    ...current,
                    appSpecificPassword: event.target.value,
                  }))
                }
              />
              <Button
                className="w-full"
                variant="outline"
                disabled={integrationPending || !snapshot.integrationState.secureCredentialsEnabled}
                onClick={handleSaveAppleConnection}
              >
                <Apple className="size-4" />
                {integrationPending ? copy.savingIntegration : copy.saveApple}
              </Button>

              {appleConnection && !isPlaceholderConnection(appleConnection) && !appleConnection.isConnected ? (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={integrationPending}
                  onClick={() => handleReactivate(appleConnection.id)}
                >
                  <RefreshCw className="size-4" />
                  {integrationPending ? copy.savingIntegration : copy.reactivate}
                </Button>
              ) : null}

              {appleConnection?.isConnected ? (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={integrationPending}
                  onClick={() => handleDisconnect(appleConnection.id)}
                >
                  <Unplug className="size-4" />
                  {integrationPending ? copy.savingIntegration : copy.disconnect}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
