"use client";
import { useState } from "react";
import { Badge, Button, Card, useToast } from "@/components/ui";
import { accountApi, daysLeft } from "@/lib/account/client";
import { describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { useOptionalCurrentUser } from "@/lib/session/CurrentUserProvider";

/** Reativar a conta (D-18, D-145): cancela a exclusão agendada enquanto o prazo de 30 dias não terminou. */
export function useReactivate() {
  const { t } = useI18n();
  const { toast } = useToast();
  const current = useOptionalCurrentUser();
  const [busy, setBusy] = useState(false);
  const reactivate = async () => {
    setBusy(true);
    try {
      await accountApi.cancelDeletion();
      await current?.reload();
      toast({ title: t("account.deletion.reactivated"), description: t("account.deletion.reactivatedHint"), tone: "sucesso" });
    } catch (e) {
      toast({ title: t("account.deletion.reactivateFailed"), description: describeError(e), tone: "erro" });
    } finally {
      setBusy(false);
    }
  };
  return { reactivate, busy };
}

/**
 * Aviso no topo de todas as páginas quando a exclusão da conta está agendada: até quando dá para voltar atrás e o botão
 * "Reativar conta". Some quando a conta volta a ACTIVE.
 */
export function DeletionBanner() {
  const { t, intl } = useI18n();
  const current = useOptionalCurrentUser();
  const { reactivate, busy } = useReactivate();
  const me = current?.me;
  if (!me || me.status !== "DELETION_SCHEDULED") return null;
  const when = me.deletionScheduledAt ? new Date(me.deletionScheduledAt) : null;
  const days = daysLeft(me.deletionScheduledAt);
  return (
    <Card tone="soft" role="status" className="mb-[var(--ws-space-4)] border border-ws-warning" data-testid="deletion-banner">
      <div className="flex flex-wrap items-center gap-[var(--ws-space-3)]">
        <Badge tone="warning">{t("account.deletion.scheduledBadge")}</Badge>
        <p className="min-w-0 flex-1 text-[length:var(--ws-text-body-sm)]">
          {when ? t("account.deletion.scheduledText", { date: when.toLocaleDateString(intl), days: String(days ?? 0) }) : t("account.deletion.scheduledTextNoDate")}
        </p>
        <Button variant="primary" size="sm" busy={busy} onClick={reactivate} data-testid="reactivate-account">{t("account.deletion.reactivate")}</Button>
      </div>
    </Card>
  );
}
