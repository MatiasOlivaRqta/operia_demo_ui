"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Building2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { loginDemo } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dataSource } from "@/data/config";
import { postApi } from "@/data/http/client";
import { loginSchema, type AuthSession, type LoginValues } from "@/features/auth/schemas";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "next-intl";

export function LoginForm() {
  return dataSource === "api" ? <ApiLoginForm /> : <DemoLoginForm />;
}

function DemoLoginForm() {
  const t = useTranslations("auth.login");
  return (
    <main
      id="contenido"
      className="bg-auth-background text-auth-foreground grid min-h-dvh lg:grid-cols-2"
    >
      <section className="border-sidebar-border bg-sidebar text-sidebar-foreground hidden flex-col justify-between border-r p-12 lg:flex">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="bg-accent text-accent-foreground grid size-10 place-items-center rounded-lg">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          Operia
        </div>
        <div className="max-w-lg">
          <p className="text-accent text-sm font-medium">{t("businessManagement")}</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight">{t("heroTitle")}</h1>
          <p className="text-sidebar-muted mt-6 text-base leading-7">{t("demoDescription")}</p>
        </div>
        <p className="text-sidebar-muted text-sm">{t("demoEnvironment")}</p>
      </section>
      <section className="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-5 flex justify-end">
            <LanguageSwitcher />
          </div>
          <div className="mb-10 flex items-center gap-3 text-lg font-semibold lg:hidden">
            <span className="bg-accent text-accent-foreground grid size-10 place-items-center rounded-lg">
              <Building2 className="size-5" aria-hidden="true" />
            </span>
            Operia
          </div>
          <div>
            <p className="text-accent text-sm font-medium">{t("demo")}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">{t("title")}</h2>
            <p className="text-muted-foreground mt-3 text-sm leading-6">{t("demoHelp")}</p>
          </div>
          <form
            action={loginDemo}
            className="border-border bg-surface-elevated text-foreground shadow-soft mt-8 space-y-5 rounded-xl border p-6 sm:p-8"
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="nombre@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full">
              {t("enterDemo")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </form>
          <p className="text-muted-foreground mt-5 text-center text-xs">{t("demoDisclaimer")}</p>
        </div>
      </section>
    </main>
  );
}

function ApiLoginForm() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const [message, setMessage] = useState("");
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  async function submit(values: LoginValues): Promise<void> {
    setMessage("");
    const result = await postApi<AuthSession>("/auth/login", values, {
      redirectOnUnauthorized: false,
    });
    if (!result.ok) {
      setMessage(t("invalidCredentials"));
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main
      id="contenido"
      className="bg-auth-background text-auth-foreground grid min-h-dvh lg:grid-cols-2"
    >
      <section className="border-sidebar-border bg-sidebar text-sidebar-foreground hidden flex-col justify-between border-r p-12 lg:flex">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="bg-accent text-accent-foreground grid size-10 place-items-center rounded-lg">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          Operia
        </div>
        <div className="max-w-lg">
          <p className="text-accent text-sm font-medium">{t("businessManagement")}</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight">{t("heroTitle")}</h1>
          <p className="text-sidebar-muted mt-6 text-base leading-7">{t("signInWithAccount")}</p>
        </div>
        <p className="text-sidebar-muted text-sm">{t("secureAccess")}</p>
      </section>
      <section className="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-5 flex justify-end">
            <LanguageSwitcher />
          </div>
          <div className="mb-10 flex items-center gap-3 text-lg font-semibold lg:hidden">
            <span className="bg-accent text-accent-foreground grid size-10 place-items-center rounded-lg">
              <Building2 className="size-5" aria-hidden="true" />
            </span>
            Operia
          </div>
          <p className="text-accent text-sm font-medium">{t("access")}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{t("title")}</h2>
          <form
            noValidate
            onSubmit={form.handleSubmit(submit, () => setMessage(t("invalidInput")))}
            className="border-border bg-surface-elevated text-foreground shadow-soft mt-8 space-y-5 rounded-xl border p-6 sm:p-8"
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...form.register("email")}
                aria-invalid={Boolean(form.formState.errors.email)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
                aria-invalid={Boolean(form.formState.errors.password)}
              />
            </div>
            {message && (
              <p
                role="alert"
                className="border-danger/30 bg-danger/10 text-danger rounded-lg border p-3 text-sm"
              >
                {message}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? t("signingIn") : t("signIn")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
