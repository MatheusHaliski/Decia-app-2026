"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Checkbox, ErrorState, Field, Input, Link, RadioCards } from "@/components/ui";
import { ApiError, auth, describeError } from "@/lib/api/client";
import { safeNext } from "@/lib/auth/next";
import { useI18n } from "@/lib/i18n/useI18n";
import { RfBlock, rfById } from "@/components/shell/RfPage";

/**
 * Formulários de autenticação (RF1 cadastro · RF2 login · recuperação de senha) chamando o BFF (`/bff/auth/*`, cookie
 * `ws_rt` HttpOnly; access token só em memória). Sem backend (etapa b) a API responde 502 OFFLINE → ErrorState amigável.
 * Erros 401/422/429/503 traduzidos por lib/api/client.ts describeError; 422 traz mensagens por campo (RF1.CA01).
 */
type Status = { kind: "idle" } | { kind: "busy" } | { kind: "error"; error: unknown } | { kind: "ok" };

function useSubmit<T>(fn: (data: T) => Promise<void>) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const run = async (data: T) => {
    setStatus({ kind: "busy" });
    try { await fn(data); setStatus({ kind: "ok" }); } catch (error) { setStatus({ kind: "error", error }); }
  };
  return { status, run, reset: () => setStatus({ kind: "idle" }) };
}

function Failure({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useI18n();
  const e = error instanceof ApiError ? error : null;
  return (
    <ErrorState
      title={e?.status === 0 || e?.status === 502 || e?.status === 503 ? t("auth.offlineTitle") : t("error.title")}
      description={describeError(error)}
      code={e ? `${e.status || "—"} ${e.code}` : undefined}
      correlationId={e?.correlationId}
      onRetry={onRetry}
      className="p-[var(--ws-space-4)]"
    />
  );
}

function RfFooter({ id }: { id: string }) {
  const rf = rfById(id);
  return rf ? <RfBlock rf={rf} /> : null;
}

/** Por que a pessoa caiu no login (Bloco 4): saiu em outra aba / sessão encerrada, ou o IdP institucional recusou. */
const LOGIN_REASONS = new Set(["signed-out", "oidc-error"]);

export function LoginForm({ next, reason, oidcEnabled = false }: { next?: string | null; reason?: string | null; oidcEnabled?: boolean } = {}) {
  const { t } = useI18n();
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(false);
  // D-60: o destino vem de ?next= e passa por safeNext (só caminho relativo da própria origem)
  const target = safeNext(next);
  const { status, run, reset } = useSubmit(async (f: FormData) => {
    await auth.login({ identifier: String(f.get("identifier") ?? ""), password: String(f.get("password") ?? ""), rememberMe });
    router.push(target);
  });
  const fields = status.kind === "error" && status.error instanceof ApiError ? status.error.fields : {};
  const onSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); void run(new FormData(e.currentTarget)); };
  return (
    <div className="grid gap-[var(--ws-space-4)]">
      {reason && LOGIN_REASONS.has(reason) ? (
        <Card tone="soft" role="status" data-testid="login-reason">
          <p className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]">
            <Badge tone={reason === "signed-out" ? "info" : "warning"}>{t(`auth.reason.${reason}.badge`)}</Badge>
            <span>{t(`auth.reason.${reason}`)}</span>
          </p>
        </Card>
      ) : null}
      <Card tone="clay" padding="lg" title={t("auth.login.title")} eyebrow={<Badge tone="accent">RF2</Badge>}>
        <form onSubmit={onSubmit} className="grid gap-[var(--ws-space-4)]" noValidate>
          <Field label={t("auth.identifier")} error={fields.identifier ?? fields.email} required>
            {({ id, describedBy, invalid }) => <Input id={id} name="identifier" type="text" autoComplete="username" required aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <Field label={t("auth.password")} error={fields.password} required>
            {({ id, describedBy, invalid }) => <Input id={id} name="password" type="password" autoComplete="current-password" required aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <Checkbox checked={rememberMe} onCheckedChange={setRememberMe} label={t("auth.login.rememberMe")} hint={t("auth.login.rememberMeHint")} />
          {status.kind === "error" ? <Failure error={status.error} onRetry={reset} /> : null}
          <Button type="submit" variant="primary" size="lg" busy={status.kind === "busy"}>{t("auth.login.submit")}</Button>
          <div className="flex flex-wrap justify-between gap-2 text-[length:var(--ws-text-body-sm)]">
            <Link href="/password-reset">{t("auth.login.forgot")}</Link>
            <Link href="/register">{t("auth.login.noAccount")}</Link>
          </div>
        </form>
      </Card>
      {oidcEnabled ? (
        // navegação de página inteira (não next/link: o prefetch dispararia o início do fluxo e gravaria o cookie de uso único)
        <Button variant="secondary" className="justify-self-center" data-testid="oidc-start" onClick={() => window.location.assign(`/bff/auth/oidc/start?next=${encodeURIComponent(target)}`)}>{t("auth.oidc.start")}</Button>
      ) : (
        <p className="text-center text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("auth.oidcSoon")}</p>
      )}
      <RfFooter id="RF2" />
    </div>
  );
}

const PROFILE_TYPES = ["EMPREGADO", "EMPRESA", "CHEFE_DEPARTAMENTO"] as const;

export function RegisterForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [profileType, setProfileType] = useState<(typeof PROFILE_TYPES)[number]>("EMPREGADO");
  const [localError, setLocalError] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const { status, run, reset } = useSubmit(async (f: FormData) => {
    const password = String(f.get("password") ?? "");
    if (password !== String(f.get("confirm") ?? "")) { setLocalError(t("auth.register.passwordMismatch")); throw new ApiError(422, "VALIDACAO", t("error.validation"), { confirm: t("auth.register.passwordMismatch") }); }
    setLocalError(null);
    const receipt = await auth.register({ profileType, fullName: String(f.get("fullName") ?? ""), username: String(f.get("username") ?? ""), email: String(f.get("email") ?? ""), password, confirmPassword: password, acceptTerms });
    router.push(`/verify-email?email=${encodeURIComponent(String(f.get("email") ?? ""))}&masked=${encodeURIComponent(receipt.maskedEmail ?? "")}`);
  });
  const fields = status.kind === "error" && status.error instanceof ApiError ? status.error.fields : {};
  const onSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); void run(new FormData(e.currentTarget)); };
  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <Card tone="clay" padding="lg" title={t("auth.register.title")} eyebrow={<Badge tone="accent">RF1</Badge>}>
        <form onSubmit={onSubmit} className="grid gap-[var(--ws-space-4)]" noValidate>
          <RadioCards label={t("auth.register.profileType")} value={profileType} onValueChange={(v) => setProfileType(v as typeof profileType)} columns={1} options={PROFILE_TYPES.map((p) => ({ value: p, label: t(`profileType.${p}`), hint: p === "EMPREGADO" ? undefined : t("auth.register.pendingValidation") }))} />
          <Field label={t("auth.fullName")} error={fields.fullName} required>
            {({ id, describedBy, invalid }) => <Input id={id} name="fullName" autoComplete="name" required aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <Field label={t("auth.username")} error={fields.username} hint={t("auth.usernameHint")} required>
            {({ id, describedBy, invalid }) => <Input id={id} name="username" autoComplete="username" required aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <Field label={t("auth.email")} error={fields.email} required>
            {({ id, describedBy, invalid }) => <Input id={id} name="email" type="email" autoComplete="email" required aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <div className="grid items-start gap-[var(--ws-space-4)] sm:grid-cols-2">
            <Field label={t("auth.password")} error={fields.password} hint={t("auth.passwordHint")} required>
              {({ id, describedBy, invalid }) => <Input id={id} name="password" type="password" autoComplete="new-password" required aria-describedby={describedBy} invalid={invalid} />}
            </Field>
            <Field label={t("auth.confirm")} error={fields.confirm ?? localError ?? undefined} required>
              {({ id, describedBy, invalid }) => <Input id={id} name="confirm" type="password" autoComplete="new-password" required aria-describedby={describedBy} invalid={invalid} />}
            </Field>
          </div>
          <Checkbox checked={acceptTerms} onCheckedChange={setAcceptTerms} label={t("auth.register.terms")} hint={t("auth.register.termsHint")} />
          {status.kind === "error" ? <Failure error={status.error} onRetry={reset} /> : null}
          <Button type="submit" variant="primary" size="lg" busy={status.kind === "busy"}>{t("auth.register.submit")}</Button>
          <p className="text-[length:var(--ws-text-body-sm)]"><Link href="/login">{t("auth.register.hasAccount")}</Link></p>
        </form>
      </Card>
      <RfFooter id="RF1" />
    </div>
  );
}

export function PasswordResetForm() {
  const { t } = useI18n();
  const { status, run, reset } = useSubmit(async (f: FormData) => {
    await auth.passwordReset({ email: String(f.get("email") ?? "") });
  });
  const onSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); void run(new FormData(e.currentTarget)); };
  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <Card tone="clay" padding="lg" title={t("auth.reset.title")} eyebrow={<Badge tone="accent">RF2</Badge>}>
        {status.kind === "ok" ? (
          <p role="status" className="text-[length:var(--ws-text-body)]">{t("auth.reset.sent")}</p>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-[var(--ws-space-4)]" noValidate>
            <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("auth.reset.hint")}</p>
            <Field label={t("auth.email")} required>
              {({ id }) => <Input id={id} name="email" type="email" autoComplete="email" required />}
            </Field>
            {status.kind === "error" ? <Failure error={status.error} onRetry={reset} /> : null}
            <Button type="submit" variant="primary" size="lg" busy={status.kind === "busy"}>{t("auth.reset.submit")}</Button>
            <p className="text-[length:var(--ws-text-body-sm)]"><Link href="/login">{t("auth.reset.back")}</Link></p>
          </form>
        )}
      </Card>
      <RfFooter id="RF2" />
    </div>
  );
}
