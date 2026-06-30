import { getErrorMessage } from "@/lib/errors/app-error";
import { getServerEnv } from "@/lib/env/server";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel) {
  const env = getServerEnv();
  return levelPriority[level] >= levelPriority[env.LOG_LEVEL];
}

function write(level: LogLevel, scope: string, message: string, context?: unknown) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    level,
    scope,
    message,
    context:
      context instanceof Error
        ? {
            name: context.name,
            message: getErrorMessage(context),
          }
        : context,
    timestamp: new Date().toISOString(),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function createLogger(scope: string) {
  return {
    debug(message: string, context?: unknown) {
      write("debug", scope, message, context);
    },
    info(message: string, context?: unknown) {
      write("info", scope, message, context);
    },
    warn(message: string, context?: unknown) {
      write("warn", scope, message, context);
    },
    error(message: string, context?: unknown) {
      write("error", scope, message, context);
    },
  };
}
