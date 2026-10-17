"use client";
import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Checkbox, Dialog, ErrorState, Field, Input, Textarea } from "@/components/ui";
import { accountApi, daysLeft, DELETION_GRACE_DAYS } from "@/lib/account/client";
import { ApiError, describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { useCurrentUser } from "@/lib/session/CurrentUserProvider";
import { useReactivate } from "./DeletionBanner";

/** Palavra que a pessoa digita para confirmar (evita exclusão por clique distraído). */
export const DELETE_CONFIRM_WORD = "EXCLUIR";
const CONSEQUENCES = ["hidden", "sessions", "content", "twoFactor", "reactivate", "anonymized", "legal"] as const;

/**
 * Configurações › Dados (RF3.CA19/CA20, D-18, D-145): excluir a conta. O modal explica as consequências, pede a senha atual, a
 * palavra de confirmação e o "entendi"; a exclusão fica agendada por 30 dias e pode ser desfeita com "Reativar conta".
 */
export function DataPanel() {
  const { t, intl } = useI18n();
  const { me, reload } = useCurrentUser();
  const { reactivate, busy } = useReactivate();
  const [open, setOpen] = useState(false);
  const scheduled = me?.status === "DELETION_SCHEDULED";

  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <Card title={t("account.deletion.title")} eyebrow="RF3.CA19" data-testid="delete-account-card">
        {scheduled ? (
          <div className="grid gap-[var(--ws-space-3)]">
            <p className="flex flex-wrap items-center gap-2">
              <Badge tone="warning">{t("account.deletion.scheduledBadge")}</Badge>
              <span>{me?.deletionScheduledAt ? t("account.deletion.scheduledText", { date: new Date(me.deletionScheduledAt).toLocaleDateString(intl), days: String(daysLeft(me.deletionScheduledAt) ?? 0) }) : t("account.deletion.scheduledTextNoDate")}</span>
            </p>
            <Button variant="primary" className="justify-self-start" busy={busy} onClick={reactivate}>{t("account.deletion.reactivate")}</Button>
          </div>
        ) : (
          <div className="grid gap-[var(--ws-space-3)]">
            <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("account.deletion.intro", { days: String(DELETION_GRACE_DAYS) })}</p>
            <Button variant="danger" className="justify-self-start" onClick={() => setOpen(true)} data-testid="delete-account-open">{t("account.deletion.open")}</Button>
          </div>
        )}
      </Card>
      <DeleteAccountDialog open={open} onOpenChange={setOpen} onDone={reload} />
    </div>
  );
}

export function DeleteAccountDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => Promise<void> | void }) {
  const { t } = useI18n();
  const [understood, setUnderstood] = useState(false);
  const [word, setWord] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const ready = understood && word.trim().toUpperCase() === DELETE_CONFIRM_WORD;
  const fields = error instanceof ApiError ? error.fields : {};

  const close = (o: boolean) => {
    if (!o) { setUnderstood(false); setWord(""); setError(null); }
    onOpenChange(o);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!ready) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await accountApi.requestDeletion({ currentPassword: String(f.get("currentPassword") ?? ""), reason: String(f.get("reason") ?? "") || undefined });
      await onDone();
      close(false);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close} title={t("account.deletion.dialogTitle")} description={t("account.deletion.dialogDescription", { days: String(DELETION_GRACE_DAYS) })} className="w-[min(94vw,36rem)]">
      <form onSubmit={submit} className="grid gap-[var(--ws-space-4)]" noValidate data-testid="delete-account-dialog">
        <div className="rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft p-[var(--ws-space-3)]">
          <p className="font-semibold">{t("account.deletion.consequencesTitle")}</p>
          <ul className="mt-2 grid list-disc gap-1 pl-5 text-[length:var(--ws-text-body-sm)]" data-testid="delete-consequences">
            {CONSEQUENCES.map((c) => <li key={c}>{t(`account.deletion.consequence.${c}`, { days: String(DELETION_GRACE_DAYS) })}</li>)}
          </ul>
        </div>
        <Field label={t("account.currentPassword")} error={fields.currentPassword} required>
          {({ id, describedBy, invalid }) => <Input id={id} name="currentPassword" type="password" autoComplete="current-password" required aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <Field label={t("account.deletion.reason")} hint={t("account.deletion.reasonHint")} error={fields.reason}>
          {({ id, describedBy }) => <Textarea id={id} name="reason" rows={2} maxLength={500} aria-describedby={describedBy} />}
        </Field>
        <Checkbox checked={understood} onCheckedChange={setUnderstood} label={t("account.deletion.understood", { days: String(DELETION_GRACE_DAYS) })} />
        <Field label={t("account.deletion.typeWord", { word: DELETE_CONFIRM_WORD })} required>
          {({ id, describedBy }) => <Input id={id} name="confirmWord" value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" aria-describedby={describedBy} data-testid="delete-confirm-word" />}
        </Field>
        {error ? <ErrorState title={t("account.deletion.failed")} description={describeError(error)} code={error instanceof ApiError ? `${error.status} ${error.code}` : undefined} className="p-[var(--ws-space-3)]" /> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={() => close(false)}>{t("common.cancel")}</Button>
          <Button type="submit" variant="danger" busy={busy} disabled={!ready} data-testid="delete-account-confirm">{t("account.deletion.confirm")}</Button>
        </div>
      </form>
    </Dialog>
  );
}
