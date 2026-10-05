"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Badge, Button, Card, ErrorState, Field, Input, Link, Skeleton } from "@/components/ui";
import { ApiError, auth, describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";

/** RF1.CA04: confirmação do código enviado por e-mail → abre a sessão (BFF /bff/auth/confirm). Reenvio com limite (RF1.CA06). */
function Inner() {
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const masked = search.get("masked") ?? "";
  const [email, setEmail] = useState(search.get("email") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [resent, setResent] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      await auth.confirmEmail({ email, code });
      router.push("/mural");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    setError(null);
    try { await auth.resendCode({ email }); setResent(true); } catch (err) { setError(err); }
  };
  const fields = error instanceof ApiError ? error.fields : {};
  return (
    <Card tone="clay" padding="lg" title={t("auth.verify.title")} eyebrow={<Badge tone="accent">RF1</Badge>}>
      <form onSubmit={onSubmit} className="grid gap-[var(--ws-space-4)]" noValidate>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{masked ? t("auth.verify.sentTo", { email: masked }) : t("auth.verify.hint")}</p>
        <Field label={t("auth.email")} error={fields.email} required>
          {({ id, describedBy, invalid }) => <Input id={id} type="email" autoComplete="email" value={email} onChange={(ev) => setEmail(ev.target.value)} required aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <Field label={t("auth.verify.code")} error={fields.code} required>
          {({ id, describedBy, invalid }) => <Input id={id} name="code" inputMode="numeric" autoComplete="one-time-code" required aria-describedby={describedBy} invalid={invalid} className="max-w-48 font-[family-name:var(--ws-font-mono)] tracking-widest" />}
        </Field>
        {error ? <ErrorState description={describeError(error)} code={error instanceof ApiError ? `${error.status || "—"} ${error.code}` : undefined} correlationId={error instanceof ApiError ? error.correlationId : undefined} className="p-[var(--ws-space-4)]" /> : null}
        {resent ? <p role="status" className="text-[length:var(--ws-text-body-sm)] text-ws-success-ink">{t("auth.verify.resent")}</p> : null}
        <Button type="submit" variant="primary" size="lg" busy={busy}>{t("auth.verify.submit")}</Button>
        <div className="flex flex-wrap justify-between gap-2 text-[length:var(--ws-text-body-sm)]">
          <Button variant="ghost" size="sm" onClick={resend} disabled={!email}>{t("auth.verify.resend")}</Button>
          <Link href="/login">{t("auth.reset.back")}</Link>
        </div>
      </form>
    </Card>
  );
}

export function VerifyEmailForm() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Inner />
    </Suspense>
  );
}
