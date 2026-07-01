"use client";

import { useMemo, useTransition } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { signInAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppLocale } from "@/lib/i18n/config";

function getCopy(locale: AppLocale) {
  if (locale === "pt-BR") {
    return {
      badge: "Autenticação Supabase",
      title: "Entre no OslerNotes CRM",
      description:
        "Use e-mail e senha para abrir o dashboard protegido por middleware e sessão baseada em cookies.",
      email: "E-mail",
      password: "Senha",
      emailPlaceholder: "voce@empresa.com",
      passwordPlaceholder: "Digite sua senha",
      submit: "Entrar",
      submitting: "Entrando...",
      footer: "Dados compartilhados ficam visíveis para usuários autenticados. As notas permanecem privadas por RLS.",
      validation: {
        email: "Informe um e-mail válido.",
        password: "A senha deve ter pelo menos 8 caracteres.",
      },
    };
  }

  return {
    badge: "Supabase Authentication",
    title: "Sign in to OslerNotes CRM",
    description:
      "Use your email and password to access the middleware-protected dashboard with cookie-based sessions.",
    email: "Email",
    password: "Password",
    emailPlaceholder: "you@company.com",
    passwordPlaceholder: "Enter your password",
    submit: "Sign in",
    submitting: "Signing in...",
    footer: "Shared CRM records stay available to authenticated users. Notes remain private through RLS.",
    validation: {
      email: "Enter a valid email address.",
      password: "Password must be at least 8 characters long.",
    },
  };
}

export function LoginForm({ locale }: { locale: AppLocale }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const copy = useMemo(() => getCopy(locale), [locale]);
  const schema = useMemo(
    () =>
      z.object({
        email: z.string().trim().email(copy.validation.email),
        password: z.string().min(8, copy.validation.password),
      }),
    [copy.validation.email, copy.validation.password],
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = form;

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await signInAction(values);

      if (result.status === "error") {
        if (result.fieldErrors?.email?.[0]) {
          setError("email", { message: result.fieldErrors.email[0] });
        }

        if (result.fieldErrors?.password?.[0]) {
          setError("password", { message: result.fieldErrors.password[0] });
        }

        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.push("/dashboard" as Route);
      router.refresh();
    });
  });

  return (
    <Card className="border border-border/70 bg-card/90 shadow-[0_35px_120px_-60px_rgba(15,23,42,0.85)] backdrop-blur">
      <CardHeader className="space-y-4">
        <div className="inline-flex w-fit rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {copy.badge}
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl tracking-tight">{copy.title}</CardTitle>
          <CardDescription className="text-sm leading-6 text-muted-foreground">
            {copy.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">{copy.email}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={copy.emailPlaceholder}
                className="pl-10"
                {...register("email")}
              />
            </div>
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{copy.password}</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder={copy.passwordPlaceholder}
                className="pl-10"
                {...register("password")}
              />
            </div>
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full rounded-xl" disabled={isPending}>
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {isPending ? copy.submitting : copy.submit}
          </Button>

          <p className="text-sm leading-6 text-muted-foreground">{copy.footer}</p>
        </form>
      </CardContent>
    </Card>
  );
}
