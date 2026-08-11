"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ZodIssue } from "zod";
import { ApiError } from "@/lib/api/client";
import { loginSchema, registerSchema } from "@/lib/schemas";
import type { LoginInput, RegisterInput } from "@/lib/schemas";
import { useSession } from "@/hooks/use-session";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Loader2, TriangleAlert } from "lucide-react";

type AuthMode = "login" | "register";

interface AuthFormValues {
  name: string;
  email: string;
  password: string;
}

const EMPTY_VALUES: AuthFormValues = { name: "", email: "", password: "" };

/** Landing auth card: "Entrar" | "Criar conta" tabs (FR-001..FR-005). */
export function AuthCard() {
  const router = useRouter();
  const { token, login, register } = useSession();
  const [tab, setTab] = useState<AuthMode>("login");
  const [serverError, setServerError] = useState<string | null>(null);

  // FR-005: already-authenticated visitors go straight to the dashboard.
  useEffect(() => {
    if (token) {
      router.replace("/dashboard");
    }
  }, [token, router]);

  async function handleAuth(mode: AuthMode, values: LoginInput | RegisterInput) {
    try {
      if (mode === "login") {
        await login(values as LoginInput);
      } else {
        await register(values as RegisterInput);
      }
      // Success: the session store persisted the token; move to the dashboard.
      router.push("/dashboard");
    } catch (error) {
      // FR-004: surface the API message inline (409 duplicate, 401 invalid…).
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível concluir a ação. Tente novamente.",
      );
    }
  }

  return (
    <Card className="animate-scale-in w-full max-w-md self-center shadow-[0_28px_90px_-36px_oklch(0.55_0.12_162/0.45)]">
      <CardHeader>
        <CardTitle className="font-display text-xl">
          {tab === "login" ? "Entrar" : "Criar conta"}
        </CardTitle>
        <CardDescription>
          {tab === "login"
            ? "Acesse o painel para ver seu saldo e suas movimentações."
            : "Comece a organizar suas finanças em segundos."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value as AuthMode);
            setServerError(null);
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="register">Criar conta</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <AuthForm
              key="login"
              mode="login"
              serverError={serverError}
              onFieldChange={() => setServerError(null)}
              onSubmit={(values) => handleAuth("login", values)}
            />
          </TabsContent>
          <TabsContent value="register">
            <AuthForm
              key="register"
              mode="register"
              serverError={serverError}
              onFieldChange={() => setServerError(null)}
              onSubmit={(values) => handleAuth("register", values)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface AuthFormProps {
  mode: AuthMode;
  serverError: string | null;
  onFieldChange: () => void;
  onSubmit: (values: LoginInput | RegisterInput) => Promise<void>;
}

function AuthForm({ mode, serverError, onFieldChange, onSubmit }: AuthFormProps) {
  const schema = mode === "login" ? loginSchema : registerSchema;
  const isRegister = mode === "register";
  const [values, setValues] = useState<AuthFormValues>(EMPTY_VALUES);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Once the user has tried to submit, re-validate live so field errors
  // disappear as they fix them.
  const parseError = useMemo(() => {
    if (!attempted) return null;
    const parsed = schema.safeParse(values);
    return parsed.success ? null : parsed.error;
  }, [values, attempted, schema]);

  function fieldError(field: keyof AuthFormValues): string | undefined {
    if (!parseError) return undefined;
    const issue = parseError.issues.find((item) => item.path[0] === field);
    return issue ? translateIssue(field, values[field], issue) : undefined;
  }

  function setField(field: keyof AuthFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    onFieldChange();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const parsed = schema.safeParse(values);
    if (!parsed.success) return;
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
      {isRegister && (
        <Field id="register-name" label="Nome" error={fieldError("name")}>
          <Input
            id="register-name"
            name="name"
            autoComplete="name"
            placeholder="Seu nome"
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
            aria-invalid={Boolean(fieldError("name"))}
          />
        </Field>
      )}

      <Field
        id={isRegister ? "register-email" : "login-email"}
        label="E-mail"
        error={fieldError("email")}
      >
        <Input
          id={isRegister ? "register-email" : "login-email"}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={values.email}
          onChange={(event) => setField("email", event.target.value)}
          aria-invalid={Boolean(fieldError("email"))}
        />
      </Field>

      <Field
        id={isRegister ? "register-password" : "login-password"}
        label="Senha"
        error={fieldError("password")}
      >
        <Input
          id={isRegister ? "register-password" : "login-password"}
          type="password"
          name="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          placeholder={isRegister ? "Mínimo de 8 caracteres" : "Sua senha"}
          value={values.password}
          onChange={(event) => setField("password", event.target.value)}
          aria-invalid={Boolean(fieldError("password"))}
        />
      </Field>

      {serverError && (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" aria-hidden />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {isRegister ? "Criando conta…" : "Entrando…"}
          </>
        ) : (
          <>
            {isRegister ? "Criar conta" : "Entrar"}
            <ArrowRight className="size-4" aria-hidden />
          </>
        )}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-expense">{error}</p>}
    </div>
  );
}

/** Zod messages are English — translate the common ones to pt-BR. */
function translateIssue(
  field: keyof AuthFormValues,
  value: string,
  issue: ZodIssue,
): string {
  if (field === "email") {
    return value.trim() === "" ? "Informe seu e-mail." : "E-mail inválido.";
  }
  if (field === "name") {
    return value.trim() === "" ? "Informe seu nome." : "Nome inválido.";
  }
  if (value === "") return "Informe sua senha.";
  if (issue.code === "custom") return "Senha deve ter no máximo 72 caracteres.";
  return "A senha deve ter pelo menos 8 caracteres.";
}
