"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Badge, Button, Card, Dialog, ErrorState, Field, Input, Link, LoadingState, useToast } from "@/components/ui";
import { accountApi, groupSecret, type TwoFactorSetup, type TwoFactorStatus } from "@/lib/account/client";
import { ApiError, describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { useCurrentUser } from "@/lib/session/CurrentUserProvider";

type Step = { kind: "idle" } | { kind: "password" } | { kind: "scan"; setup: TwoFactorSetup } | { kind: "codes"; codes: string[] } | { kind: "disable" } | { kind: "regenerate" };

function Failure({ error }: { error: unknown }) {
  const { t } = useI18n();
  if (!error) return null;
  return <ErrorState title={t("error.title")} description={describeError(error)} code={error instanceof ApiError ? `${error.status} ${error.code}` : undefined} className="p-[var(--ws-space-3)]" />;
}

/** Códigos de recuperação: mostrados uma única vez, com copiar e baixar. */
export function RecoveryCodesView({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const text = codes.join("\n");
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast({ title: t("account.twoFactor.copied"), tone: "sucesso" }); } catch { /* sem permissão: a pessoa copia à mão */ }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([`${t("account.twoFactor.codesFileHeader")}\n\n${text}\n`], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "work-station-codigos-de-recuperacao.txt";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="grid gap-[var(--ws-space-3)]" data-testid="recovery-codes">
      <p className="text-[length:var(--ws-text-body-sm)]">{t("account.twoFactor.codesIntro")}</p>
      <ol className="grid grid-cols-2 gap-2 rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-[var(--ws-space-3)] font-mono text-[length:var(--ws-text-body-sm)]">
        {codes.map((c) => <li key={c}>{c}</li>)}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={copy}>{t("account.twoFactor.copy")}</Button>
        <Button size="sm" onClick={download}>{t("account.twoFactor.download")}</Button>
        <Button size="sm" variant="primary" onClick={onDone} data-testid="recovery-codes-done">{t("account.twoFactor.savedCodes")}</Button>
      </div>
    </div>
  );
}

/**
 * Verificação em duas etapas (RF2.CA02, D-144): ativar (senha → segredo e link do aplicativo → primeiro código → códigos de
 * recuperação), gerar novos códigos e desativar (senha + código). O segredo nunca é guardado no navegador.
 */
export function TwoFactorCard() {
  const { t, intl } = useI18n();
  const { toast } = useToast();
  const { reload } = useCurrentUser();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try { setStatus(await accountApi.twoFactor.status()); setLoadError(null); } catch (e) { setLoadError(e); }
  };
  useEffect(() => { void refresh(); }, []);

  const run = (fn: (f: FormData) => Promise<void>) => async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try { await fn(f); } catch (err) { setError(err); } finally { setBusy(false); }
  };
  const close = () => { setStep({ kind: "idle" }); setError(null); };
  const value = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

  const enabled = !!status?.enabled;
  return (
    <Card title={t("account.twoFactor.title")} eyebrow="RF2.CA02" data-testid="two-factor-card"
      actions={status ? <Badge tone={enabled ? "success" : "neutral"}>{enabled ? t("account.twoFactor.on") : t("account.twoFactor.off")}</Badge> : null}>
      {loadError ? <ErrorState title={t("error.title")} description={describeError(loadError)} onRetry={refresh} className="p-[var(--ws-space-3)]" />
        : !status ? <LoadingState />
        : (
          <div className="grid gap-[var(--ws-space-3)]">
            <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(enabled ? "account.twoFactor.onIntro" : "account.twoFactor.offIntro")}</p>
            {enabled ? (
              <>
                <p className="text-[length:var(--ws-text-body-sm)]" data-testid="two-factor-summary">
                  {t("account.twoFactor.summary", { date: status.enabledAt ? new Date(status.enabledAt).toLocaleDateString(intl) : "—", left: String(status.recoveryCodesLeft ?? 0) })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setStep({ kind: "regenerate" })}>{t("account.twoFactor.regenerate")}</Button>
                  <Button size="sm" variant="danger" onClick={() => setStep({ kind: "disable" })} data-testid="two-factor-disable-open">{t("account.twoFactor.disable")}</Button>
                </div>
              </>
            ) : (
              <Button variant="primary" className="justify-self-start" onClick={() => setStep({ kind: "password" })} data-testid="two-factor-enable-open">{t("account.twoFactor.enable")}</Button>
            )}
          </div>
        )}

      <Dialog open={step.kind === "password"} onOpenChange={(o) => !o && close()} title={t("account.twoFactor.enable")} description={t("account.twoFactor.passwordStep")}>
        <form className="grid gap-[var(--ws-space-3)]" noValidate onSubmit={run(async (f) => setStep({ kind: "scan", setup: await accountApi.twoFactor.setup(value(f, "currentPassword")) }))}>
          <Field label={t("account.currentPassword")} required>
            {({ id, describedBy }) => <Input id={id} name="currentPassword" type="password" autoComplete="current-password" aria-describedby={describedBy} />}
          </Field>
          <Failure error={error} />
          <Button type="submit" variant="primary" busy={busy}>{t("common.continue")}</Button>
        </form>
      </Dialog>

      <Dialog open={step.kind === "scan"} onOpenChange={(o) => !o && close()} title={t("account.twoFactor.scanTitle")} description={t("account.twoFactor.scanDescription")}>
        {step.kind === "scan" ? (
          <form className="grid gap-[var(--ws-space-3)]" noValidate onSubmit={run(async (f) => {
            const r = await accountApi.twoFactor.enable(value(f, "code"));
            setStep({ kind: "codes", codes: r.recoveryCodes ?? [] });
            await refresh();
            await reload();
          })}>
            <ol className="grid list-decimal gap-2 pl-5 text-[length:var(--ws-text-body-sm)]">
              <li>{t("account.twoFactor.scanStep1")}</li>
              <li>
                {t("account.twoFactor.scanStep2")}{" "}
                <Link href={step.setup.otpauthUri ?? "#"} data-testid="two-factor-otpauth">{t("account.twoFactor.openApp")}</Link>
                <span className="mt-1 block font-mono text-[length:var(--ws-text-body)] tracking-wider" data-testid="two-factor-secret">{groupSecret(step.setup.secret ?? "")}</span>
                <span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("account.twoFactor.manualHint", { account: step.setup.account ?? "", issuer: step.setup.issuer ?? "" })}</span>
              </li>
              <li>{t("account.twoFactor.scanStep3")}</li>
            </ol>
            <Field label={t("account.twoFactor.code")} required>
              {({ id, describedBy }) => <Input id={id} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} aria-describedby={describedBy} data-testid="two-factor-code" />}
            </Field>
            <Failure error={error} />
            <Button type="submit" variant="primary" busy={busy}>{t("account.twoFactor.confirm")}</Button>
          </form>
        ) : null}
      </Dialog>

      <Dialog open={step.kind === "codes"} onOpenChange={(o) => !o && close()} title={t("account.twoFactor.codesTitle")}>
        {step.kind === "codes" ? <RecoveryCodesView codes={step.codes} onDone={() => { close(); toast({ title: t("account.twoFactor.enabledToast"), tone: "sucesso" }); }} /> : null}
      </Dialog>

      <Dialog open={step.kind === "disable" || step.kind === "regenerate"} onOpenChange={(o) => !o && close()}
        title={t(step.kind === "disable" ? "account.twoFactor.disable" : "account.twoFactor.regenerate")}
        description={t(step.kind === "disable" ? "account.twoFactor.disableDescription" : "account.twoFactor.regenerateDescription")}>
        <form className="grid gap-[var(--ws-space-3)]" noValidate onSubmit={run(async (f) => {
          if (step.kind === "disable") {
            await accountApi.twoFactor.disable(value(f, "currentPassword"), value(f, "code"));
            close();
            toast({ title: t("account.twoFactor.disabledToast"), tone: "aviso" });
          } else {
            const r = await accountApi.twoFactor.regenerate(value(f, "currentPassword"), value(f, "code"));
            setStep({ kind: "codes", codes: r.recoveryCodes ?? [] });
          }
          await refresh();
          await reload();
        })}>
          <Field label={t("account.currentPassword")} required>
            {({ id, describedBy }) => <Input id={id} name="currentPassword" type="password" autoComplete="current-password" aria-describedby={describedBy} />}
          </Field>
          <Field label={t(step.kind === "disable" ? "account.twoFactor.codeOrRecovery" : "account.twoFactor.code")} required>
            {({ id, describedBy }) => <Input id={id} name="code" autoComplete="one-time-code" maxLength={12} aria-describedby={describedBy} />}
          </Field>
          <Failure error={error} />
          <Button type="submit" variant={step.kind === "disable" ? "danger" : "primary"} busy={busy}>{t(step.kind === "disable" ? "account.twoFactor.disableConfirm" : "account.twoFactor.regenerateConfirm")}</Button>
        </form>
      </Dialog>
    </Card>
  );
}
