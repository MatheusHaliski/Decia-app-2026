"use client";
import { useState, type FormEvent } from "react";
import { Badge, Button, Card, ErrorState, Field, Input, LoadingState, Textarea, useToast } from "@/components/ui";
import { accountApi } from "@/lib/account/client";
import { ApiError, describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { useCurrentUser } from "@/lib/session/CurrentUserProvider";
import { TwoFactorCard } from "./TwoFactorCard";

/** Configurações › Conta (RF3.CA01/CA04, RF2.CA02): dados do perfil e verificação em duas etapas da conta real. */
export function AccountPanel() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { me, status, reload } = useCurrentUser();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  if (status === "loading") return <LoadingState />;
  if (!me) return <ErrorState title={t("account.signedOut")} description={t("account.signedOutHint")} />;
  const fields = error instanceof ApiError ? error.fields : {};
  const locked = me.status === "DELETION_SCHEDULED";

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "");
    setBusy(true);
    setError(null);
    try {
      await accountApi.updateProfile({ fullName: v("fullName"), displayName: v("displayName"), jobTitle: v("jobTitle"), bio: v("bio") });
      await reload();
      toast({ title: t("account.profileSaved"), tone: "sucesso" });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-[var(--ws-space-4)] md:grid-cols-2">
      <Card title={t("account.profileTitle")} eyebrow="RF3.CA01" data-testid="account-profile"
        actions={<Badge tone="accent">{t(`profile.${me.profileType === "CHEFE_DEPARTAMENTO" ? "CHEFE" : me.profileType ?? "EMPREGADO"}`)}</Badge>}>
        <form onSubmit={save} className="grid gap-[var(--ws-space-3)]" noValidate>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">@{me.username} · {me.email}</p>
          <Field label={t("account.fullName")} error={fields.fullName} required>
            {({ id, describedBy, invalid }) => <Input id={id} name="fullName" defaultValue={me.fullName ?? ""} maxLength={160} disabled={locked} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <Field label={t("account.displayName")} hint={t("account.displayNameHint")} error={fields.displayName}>
            {({ id, describedBy, invalid }) => <Input id={id} name="displayName" defaultValue={me.displayName ?? ""} maxLength={80} disabled={locked} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <Field label={t("account.jobTitle")} error={fields.jobTitle}>
            {({ id, describedBy, invalid }) => <Input id={id} name="jobTitle" defaultValue={me.jobTitle ?? ""} maxLength={120} disabled={locked} aria-describedby={describedBy} invalid={invalid} />}
          </Field>
          <Field label={t("account.bio")} error={fields.bio}>
            {({ id, describedBy }) => <Textarea id={id} name="bio" defaultValue={me.bio ?? ""} rows={3} maxLength={1000} disabled={locked} aria-describedby={describedBy} />}
          </Field>
          {locked ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("account.lockedByDeletion")}</p> : null}
          {error ? <ErrorState title={t("error.title")} description={describeError(error)} className="p-[var(--ws-space-3)]" /> : null}
          <Button type="submit" variant="primary" className="justify-self-start" busy={busy} disabled={locked}>{t("account.saveProfile")}</Button>
        </form>
      </Card>
      <TwoFactorCard />
    </div>
  );
}
