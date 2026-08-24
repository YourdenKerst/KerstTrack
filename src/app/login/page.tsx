"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Card, FieldError, Input, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().min(1, "E-mailadres is verplicht").email("Ongeldig e-mailadres"),
  password: z.string().min(1, "Wachtwoord is verplicht"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginForm) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      setServerError(
        error.message === "Invalid login credentials"
          ? "E-mailadres of wachtwoord onjuist."
          : error.message,
      );
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-2xl">
            🌱
          </div>
          <h1 className="text-xl font-semibold text-foreground">Welkom terug</h1>
          <p className="mt-1 text-sm text-muted-foreground">Log in om je dag bij te houden.</p>
        </div>

        {/* method="post": if this ever native-submits before hydration attaches onSubmit,
            credentials go in the POST body instead of leaking into the URL/history/server logs. */}
        <form
          method="post"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
          suppressHydrationWarning
        >
          <div>
            <Label htmlFor="email">E-mailadres</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="jij@voorbeeld.nl"
              {...register("email")}
            />
            <FieldError>{errors.email?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="password">Wachtwoord</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </div>

          {serverError && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{serverError}</p>
          )}

          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? "Inloggen…" : "Inloggen"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
