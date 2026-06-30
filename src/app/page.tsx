import { ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Badge } from "@/components/ui/badge";
import { getRequestI18n } from "@/lib/i18n/request";

export const dynamic = "force-dynamic";

function getCopy(locale: "en-US" | "pt-BR") {
  if (locale === "pt-BR") {
    return {
      kicker: "Controle de acesso",
      title: "Axe CRM com autenticação, RLS e dashboard híbrido.",
      description:
        "Fluxo completo com `@supabase/ssr`, proteção por middleware, dados compartilhados em tabelas CRM e anotações privadas limitadas por `auth.uid() = user_id`.",
      security: "Sessão segura por cookie",
    };
  }

  return {
    kicker: "Access control",
    title: "Axe CRM with authentication, RLS, and a hybrid dashboard.",
    description:
      "End-to-end flow powered by `@supabase/ssr`, middleware protection, shared CRM tables, and private notes locked behind `auth.uid() = user_id`.",
    security: "Secure cookie session",
  };
}

export default async function SignInPage() {
  const { locale } = await getRequestI18n();
  const copy = getCopy(locale);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_18%),linear-gradient(180deg,rgba(248,250,252,1),rgba(241,245,249,0.94))] px-4 py-10 dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_18%),linear-gradient(180deg,rgba(2,6,23,1),rgba(15,23,42,0.96))] md:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,460px)]">
        <section className="space-y-6">
          <Badge className="rounded-full bg-primary/12 px-3 py-1 text-primary hover:bg-primary/12">
            {copy.kicker}
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {copy.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">{copy.description}</p>
          </div>
          <div className="flex w-fit items-center gap-3 rounded-full border border-border/70 bg-background/70 px-4 py-2 text-sm text-muted-foreground shadow-sm">
            <ShieldCheck className="size-4 text-primary" />
            {copy.security}
          </div>
        </section>

        <LoginForm locale={locale} />
      </div>
    </main>
  );
}
