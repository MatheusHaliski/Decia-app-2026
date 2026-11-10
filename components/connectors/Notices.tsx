"use client";
import type { ReactNode } from "react";
import { Button, Link, cn } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { CONNECTORS_HOME, connectorErrorKind, describeConnectorError, type ConnectorReturn } from "@/lib/connectors/client";
import { hasMessage } from "@/lib/i18n/core";
import { useI18n } from "@/lib/i18n/useI18n";

const BOX = "grid grid-cols-1 gap-2 rounded-[var(--ws-radius-md)] border px-3 py-2 text-[length:var(--ws-text-body-sm)] text-ws-text";

/**
 * Volta do provedor: concluindo (a confirmação na sessão ainda não respondeu) e sucesso em `status`; erro em `alert`, com o motivo
 * traduzido (código fixo do servidor, nunca texto livre da URL).
 */
export function ConnectorReturnNotice({ ret, okHint, onDismiss }: { ret: ConnectorReturn; okHint?: ReactNode; onDismiss?: () => void }) {
  const { t } = useI18n();
  if (ret.status === "confirmando") {
    return (
      <div role="status" aria-busy="true" data-testid="connector-return" data-status="confirmando" className={cn(BOX, "border-ws-border bg-ws-surface-1")}>
        <p className="font-semibold">{t("connectors.return.confirming")}</p>
        <p className="text-ws-text-muted">{t("connectors.return.confirmingHint")}</p>
      </div>
    );
  }
  const ok = ret.status === "ok";
  const reason = !ret.reason
    ? t("connectors.return.reasonNone")
    : hasMessage("pt-BR", `connectors.return.reason.${ret.reason}`)
      ? t(`connectors.return.reason.${ret.reason}`)
      : t("connectors.return.reasonUnknown", { code: ret.reason });
  return (
    <div
      role={ok ? "status" : "alert"}
      data-testid="connector-return"
      data-status={ret.status}
      className={cn(BOX, "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start", ok ? "border-ws-success bg-ws-success-soft" : "border-ws-danger bg-ws-danger-soft")}
    >
      <div className="grid grid-cols-1 min-w-0 gap-0.5">
        <p className="font-semibold">{ok ? t("connectors.return.ok") : t("connectors.return.erro")}</p>
        <p>{ok ? okHint ?? t("connectors.return.okHint") : reason}</p>
      </div>
      {onDismiss ? <Button size="sm" variant="ghost" onClick={onDismiss}>{t("connectors.return.dismiss")}</Button> : null}
    </div>
  );
}

/**
 * Erro de uma chamada dos conectores com o que a pessoa pode fazer: CONECTOR_EXPIRADO oferece reconectar; CONECTOR_DESABILITADO
 * explica que a TI precisa configurar; VALIDACAO mostra também a explicação do servidor; o código de correlação vai junto.
 */
export function ConnectorErrorNotice({ error, provider, onReconnect, reconnecting, action, inSettings = false }: {
  error: unknown;
  /** nome do provedor já traduzido (entra nas mensagens) */
  provider?: string;
  onReconnect?: () => void;
  reconnecting?: boolean;
  action?: ReactNode;
  /** já está em Configurações › Conectores: sem o atalho para lá */
  inSettings?: boolean;
}) {
  const { t } = useI18n();
  const kind = connectorErrorKind(error);
  const api = error instanceof ApiError ? error : null;
  const message = describeConnectorError(error, provider ? { provider } : {});
  const serverDetail = kind === "VALIDACAO" && api?.message && api.message !== message && !/^bad request$/i.test(api.message) ? api.message : null;
  const soft = kind === "EXPIRADO" || kind === "DESABILITADO";
  return (
    <div role="alert" data-testid="connector-error" data-kind={kind} className={cn(BOX, soft ? "border-ws-warning bg-ws-warning-soft" : "border-ws-danger bg-ws-danger-soft")}>
      <p>{message}</p>
      {serverDetail ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{serverDetail}</p> : null}
      {kind === "DESABILITADO" ? (
        <p className="text-[length:var(--ws-text-caption)]">
          {t("connectors.disabledWho")}
          {inSettings ? null : <> <Link href={CONNECTORS_HOME}>{t("connectors.manage")}</Link></>}
        </p>
      ) : null}
      {api?.correlationId ? <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("error.correlation", { correlationId: api.correlationId })}</p> : null}
      {(kind === "EXPIRADO" && onReconnect) || action ? (
        <div className="flex flex-wrap gap-2">
          {kind === "EXPIRADO" && onReconnect ? <Button size="sm" variant="primary" busy={reconnecting} onClick={onReconnect} data-testid="error-reconnect">{t("connectors.reconnect")}</Button> : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}
