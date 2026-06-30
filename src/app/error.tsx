"use client";

import { useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMessages } from "@/lib/i18n/messages";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const locale = useMemo(
    () =>
      typeof window !== "undefined" &&
      (window.document.documentElement.lang || window.navigator.language)
        .toLowerCase()
        .startsWith("pt")
        ? "pt-BR"
        : "en-US",
    [],
  );
  const copy = getMessages(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-xl border border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>{copy.errors.globalTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {copy.errors.globalDescription}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => reset()}>{copy.errors.retry}</Button>
            <Button variant="outline" onClick={() => window.location.assign("/")}>
              {copy.errors.backHome}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
