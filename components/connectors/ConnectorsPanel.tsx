"use client";
/**
 * Configurações › Conectores (RF4, RF20.CA07, RF23, RF34; contrato de 09/11/2026). Contas do Google e da Microsoft ligadas por
 * OAuth 2.0 (PKCE e `state` de uso único no servidor; tokens cifrados que nunca chegam ao navegador) com estado, conta, escopos e
 * finalidade (LGPD); conectar leva à tela do provedor e o callback volta com `conector=confirmar&pedido=` (a conexão termina NA
 * SESSÃO de quem está logado) ou `conector=erro&motivo=`; desconectar pede
 * confirmação (Google: revoga; Microsoft: apaga aqui e orienta a remover o consentimento). Apple iCloud não tem API pública: entra
 * por link de compartilhamento e por arquivo exportado. Abaixo, o catálogo de fontes (o que cada aplicativo vira).
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Dialog, ErrorState, Link, LoadingState, useToast, type Tone } from "@/components/ui";
import { ApiError, describeError } from "@/lib/api/client";
import { linkRulesByEcosystem } from "@/lib/connectors/catalog";
import {
  CONNECTORS_HOME, SIGNAL_PARAMS, confirmConnection, connectorErrorKind, connectorsApi, describeConnectorError, readConnectorReturn,
  startAuthorization, type ConnectorAccount, type ConnectorProvider, type ConnectorProviderInfo, type ConnectorReturn,
} from "@/lib/connectors/client";
import { useConnectorLabels } from "./labels";
import { LinkRulesHint } from "./LinkRulesHint";
import { ConnectorErrorNotice, ConnectorReturnNotice } from "./Notices";
import { SourceCatalog } from "./SourceCatalog";

const OAUTH_PROVIDERS: readonly ConnectorProvider[] = ["GOOGLE", "MICROSOFT"];
const MS_CONSENT_URL = "https://myapps.microsoft.com";
const STATUS_TONE: Record<string, Tone> = { ATIVO: "success", EXPIRADO: "warning", REVOGADO: "neutral", ERRO: "danger" };
/** Para que serve cada escopo pedido (LGPD: a pessoa vê o motivo de cada permissão). */
const SCOPE_KEYS: Record<string, string> = {
  openid: "openid",
  email: "email",
  "https://www.googleapis.com/auth/drive.readonly": "driveReadonly",
  offline_access: "offlineAccess",
  "User.Read": "userRead",
  "Files.Read": "filesRead",
};
const BODY_SM = "text-[length:var(--ws-text-body-sm)]";
const CAPTION = "text-[length:var(--ws-text-caption)]";

type Load =
  | { kind: "loading" }
  | { kind: "error"; error: unknown }
  | { kind: "ready"; providers: ConnectorProviderInfo[] | null; accounts: ConnectorAccount[] };

export function ConnectorsPanel() {
  const L = useConnectorLabels();
  const { t } = L;
  const { toast } = useToast();
  const [state, setState] = useState<Load>({ kind: "loading" });
  const [connecting, setConnecting] = useState<ConnectorProvider | null>(null);
  const [connectError, setConnectError] = useState<{ provider: ConnectorProvider; error: unknown } | null>(null);
  const [confirm, setConfirm] = useState<ConnectorAccount | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    const [providers, accounts] = await Promise.allSettled([connectorsApi.providers(), connectorsApi.accounts()]);
    // conectores desligados no servidor não impedem a tela: os cartões explicam o que falta configurar
    const allDisabled = accounts.status === "rejected" && connectorErrorKind(accounts.reason) === "DESABILITADO";
    if (accounts.status === "rejected" && !allDisabled) {
      setState({ kind: "error", error: accounts.reason });
      return;
    }
    const fallback = allDisabled ? OAUTH_PROVIDERS.map((p): ConnectorProviderInfo => ({ provider: p, enabled: false, mode: "OAUTH", scopes: [] })) : null;
    setState({
      kind: "ready",
      providers: providers.status === "fulfilled" ? providers.value ?? [] : fallback,
      accounts: accounts.status === "fulfilled" ? accounts.value ?? [] : [],
    });
  }, []);
  useEffect(() => { void load(); }, [load]);

  const connect = async (provider: ConnectorProvider) => {
    setConnecting(provider);
    setConnectError(null);
    try {
      await startAuthorization(provider, CONNECTORS_HOME);
    } catch (error) {
      setConnectError({ provider, error });
      setConnecting(null);
    }
  };

  const disconnect = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await connectorsApi.disconnect(confirm.id);
      toast({
        title: t("connectors.disconnected", { account: confirm.accountEmail }),
        description: confirm.provider === "MICROSOFT" ? t("connectors.disconnectedMicrosoft") : undefined,
        tone: "sucesso",
      });
      setConfirm(null);
      await load();
    } catch (error) {
      toast({ title: t("connectors.disconnectFailed"), description: describeConnectorError(error), tone: "erro" });
    } finally {
      setBusy(false);
    }
  };

  const providerInfo = (p: ConnectorProvider) => (state.kind === "ready" ? state.providers?.find((x) => x.provider === p) : undefined);
  const appleInfo = providerInfo("APPLE_ICLOUD");

  return (
    <div className="grid grid-cols-1 gap-[var(--ws-space-4)]" data-testid="connectors-panel">
      <ReturnBanner onConnected={() => void load()} />
      <Card title={t("connectors.title")} eyebrow="RF4 · RF20.CA07 · RF23 · RF34">
        <div className={`grid grid-cols-1 gap-2 ${BODY_SM}`}>
          <p className="text-ws-text-muted">{t("connectors.intro")}</p>
          <p className="font-semibold">{t("connectors.lgpd.title")}</p>
          <ul className="grid grid-cols-1 list-disc gap-1 pl-5 text-ws-text-muted" data-testid="connectors-lgpd">
            {(["purpose", "security", "control", "revoke"] as const).map((k) => <li key={k}>{t(`connectors.lgpd.${k}`)}</li>)}
          </ul>
        </div>
      </Card>

      {state.kind === "loading" ? <LoadingState label={t("connectors.loading")} /> : null}
      {state.kind === "error" ? (
        <ErrorState
          title={t("connectors.loadFailed")}
          description={describeError(state.error)}
          code={state.error instanceof ApiError ? `${state.error.status || "—"} ${state.error.code}` : undefined}
          correlationId={state.error instanceof ApiError ? state.error.correlationId : undefined}
          onRetry={() => void load()}
        />
      ) : null}
      {state.kind === "ready" ? (
        <div className="grid grid-cols-1 gap-[var(--ws-space-4)] lg:grid-cols-2">
          {OAUTH_PROVIDERS.map((p) => (
            <ProviderCard
              key={p}
              provider={p}
              info={providerInfo(p)}
              knownProviders={state.providers !== null}
              accounts={state.accounts.filter((a) => a.provider === p)}
              connecting={connecting === p}
              error={connectError?.provider === p ? connectError.error : null}
              onConnect={() => void connect(p)}
              onDisconnect={setConfirm}
            />
          ))}
        </div>
      ) : null}

      <AppleCard disabled={appleInfo ? !appleInfo.enabled : false} />
      <SourceCatalog />

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => { if (!o && !busy) setConfirm(null); }}
        title={t("connectors.disconnectTitle", { account: confirm?.accountEmail ?? "" })}
        description={confirm ? t(confirm.provider === "MICROSOFT" ? "connectors.disconnectBody.MICROSOFT" : "connectors.disconnectBody.GOOGLE") : undefined}
      >
        <div className="grid grid-cols-1 gap-3">
          {confirm?.provider === "MICROSOFT" ? <p className={BODY_SM}><Link href={MS_CONSENT_URL}>{t("connectors.msConsentLink")}</Link></p> : null}
          <p className={`${CAPTION} text-ws-text-muted`}>{t("connectors.disconnectKeeps")}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>{t("common.cancel")}</Button>
            <Button variant="danger" busy={busy} onClick={() => void disconnect()} data-testid="disconnect-confirm">{t("connectors.disconnect")}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/**
 * Volta do provedor (`?conector=confirmar&pedido=` ou `?conector=erro&motivo=`): os parâmetros saem da URL assim que lidos (o segredo é
 * de uso único: recarregar não repete); `confirmar` conclui na sessão e, conectando, recarrega a lista de contas.
 */
function ReturnBanner({ onConnected }: { onConnected: () => void }) {
  const { t } = useConnectorLabels();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [shown, setShown] = useState<ConnectorReturn | null>(null);
  const handled = useRef<string | null>(null);
  const connected = useRef(onConnected);
  useEffect(() => { connected.current = onConnected; }, [onConnected]);
  const query = search.toString();

  useEffect(() => {
    if (handled.current === query) return;
    handled.current = query;
    const params = new URLSearchParams(query);
    const signal = readConnectorReturn(params);
    if (!signal) return;
    SIGNAL_PARAMS.forEach((k) => params.delete(k));
    const rest = params.toString();
    router.replace(rest ? `${pathname}?${rest}` : pathname, { scroll: false });
    if (signal.status !== "confirmar") {
      setShown(signal);
      return;
    }
    setShown({ status: "confirmando", reason: null });
    void confirmConnection(signal.request).then((ret) => {
      setShown(ret);
      if (ret.status === "ok") connected.current();
    });
  }, [query, router, pathname]);

  if (!shown) return null;
  return (
    <ConnectorReturnNotice
      ret={shown}
      onDismiss={shown.status === "confirmando" ? undefined : () => setShown(null)}
      okHint={<>{t("connectors.return.okHint")} <Link href="/tasks/new?importar=conta">{t("connectors.return.goImport")}</Link></>}
    />
  );
}

function ProviderCard({ provider, info, knownProviders, accounts, connecting, error, onConnect, onDisconnect }: {
  provider: ConnectorProvider;
  info: ConnectorProviderInfo | undefined;
  /** a lista de provedores respondeu (sem ela, o servidor diz no authorize se está habilitado) */
  knownProviders: boolean;
  accounts: ConnectorAccount[];
  connecting: boolean;
  error: unknown;
  onConnect: () => void;
  onDisconnect: (a: ConnectorAccount) => void;
}) {
  const L = useConnectorLabels();
  const { t } = L;
  const name = L.provider(provider);
  const enabled = knownProviders ? !!info?.enabled : true;
  const disabledByServer = !enabled || connectorErrorKind(error) === "DESABILITADO";
  const active = accounts.some((a) => a.status === "ATIVO");
  const summary: { tone: Tone; key: string } = disabledByServer
    ? { tone: "warning", key: "connectors.summary.disabled" }
    : active
      ? { tone: "success", key: "connectors.summary.connected" }
      : accounts.length
        ? { tone: "warning", key: "connectors.summary.attention" }
        : { tone: "neutral", key: "connectors.summary.none" };
  const scopes = info?.scopes ?? [];
  return (
    <Card as="section" title={name} eyebrow={t("connectors.mode.OAUTH")} actions={<Badge tone={summary.tone}>{t(summary.key)}</Badge>} data-testid={`provider-${provider}`} data-enabled={disabledByServer ? "false" : "true"}>
      <div className={`grid grid-cols-1 gap-3 ${BODY_SM}`}>
        <p><span className="font-semibold">{t("connectors.purposeLabel")}</span> {t(`connectors.purpose.${provider}`)}</p>
        <div className="grid grid-cols-1 gap-1">
          <p className="font-semibold">{t("connectors.scopesLabel")}</p>
          {scopes.length ? (
            <ul className="grid grid-cols-1 gap-1" data-testid="provider-scopes">
              {scopes.map((s) => (
                <li key={s} className="[overflow-wrap:anywhere]">
                  <code className={`font-[family-name:var(--ws-font-mono)] ${CAPTION}`}>{s}</code>
                  <span className="text-ws-text-muted"> — {t(`connectors.scope.${SCOPE_KEYS[s] ?? "other"}`)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ws-text-muted">{t("connectors.scopesUnknown")}</p>
          )}
          <p className={`${CAPTION} text-ws-text-muted`}>{t(`connectors.scopesNote.${provider}`)}</p>
        </div>

        {accounts.length ? (
          <ul className="grid grid-cols-1 gap-2" aria-label={t("connectors.accountsOf", { provider: name })}>
            {accounts.map((a) => (
              <AccountRow key={a.id} account={a} canReconnect={!disabledByServer} reconnecting={connecting} onReconnect={onConnect} onDisconnect={() => onDisconnect(a)} />
            ))}
          </ul>
        ) : (
          <p className="text-ws-text-muted">{t("connectors.noAccount")}</p>
        )}

        {disabledByServer ? (
          <p role="note" className="rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft px-3 py-2" data-testid="provider-disabled">
            {t("connectors.disabledHint", { provider: name })} {t("connectors.disabledWho")}
          </p>
        ) : null}
        {error && connectorErrorKind(error) !== "DESABILITADO" ? <ConnectorErrorNotice error={error} provider={name} inSettings /> : null}

        <div>
          <Button variant="primary" onClick={onConnect} disabled={disabledByServer} busy={connecting} data-testid={`connect-${provider}`}>
            {accounts.length ? t("connectors.connectAnother") : t("connectors.connect", { provider: name })}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AccountRow({ account: a, canReconnect, reconnecting, onReconnect, onDisconnect }: {
  account: ConnectorAccount;
  canReconnect: boolean;
  reconnecting: boolean;
  onReconnect: () => void;
  onDisconnect: () => void;
}) {
  const L = useConnectorLabels();
  const { t } = L;
  return (
    <li className="grid grid-cols-1 gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-3" data-testid="connector-account" data-status={a.status}>
      <p className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 truncate font-semibold">{a.accountEmail}</span>
        <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>{L.status(a.status)}</Badge>
      </p>
      <p className={`${CAPTION} text-ws-text-muted`}>
        {t("connectors.account.connectedAt", { when: L.when(a.connectedAt) })}
        {a.lastUsedAt ? ` · ${t("connectors.account.lastUsedAt", { when: L.when(a.lastUsedAt) })}` : ""}
      </p>
      {a.status !== "ATIVO" ? <p className={`${CAPTION} text-ws-warning-ink`}>{t(`connectors.account.hint.${a.status}`)}</p> : null}
      {a.lastError ? <p className={`${CAPTION} text-ws-danger-ink [overflow-wrap:anywhere]`}>{t("connectors.account.lastError", { error: a.lastError })}</p> : null}
      {a.scopes.length ? (
        <p className={`${CAPTION} text-ws-text-muted [overflow-wrap:anywhere]`}>
          {t("connectors.account.granted")} <span className="font-[family-name:var(--ws-font-mono)]">{a.scopes.join(" · ")}</span>
        </p>
      ) : null}
      <div className="mt-1 flex flex-wrap gap-2">
        {a.status !== "ATIVO" && canReconnect ? (
          <Button size="sm" variant="primary" busy={reconnecting} onClick={onReconnect} data-testid="account-reconnect">{t("connectors.reconnect")}</Button>
        ) : null}
        <Button size="sm" variant="danger" onClick={onDisconnect} data-testid="account-disconnect" aria-label={t("connectors.disconnectNamed", { account: a.accountEmail })}>
          {t("connectors.disconnect")}
        </Button>
      </div>
    </li>
  );
}

/** Apple iCloud: sem API pública para iWork, Notas e Lembretes — o caminho é o link de compartilhamento e o arquivo exportado. */
function AppleCard({ disabled }: { disabled: boolean }) {
  const L = useConnectorLabels();
  const { t } = L;
  const name = L.provider("APPLE_ICLOUD");
  return (
    <Card
      as="section"
      title={name}
      eyebrow={t("connectors.mode.LINK")}
      actions={<Badge tone={disabled ? "warning" : "info"}>{t(disabled ? "connectors.summary.disabled" : "connectors.summary.byLink")}</Badge>}
      data-testid="provider-APPLE_ICLOUD"
    >
      <div className={`grid grid-cols-1 gap-3 ${BODY_SM}`}>
        <p>{t("connectors.apple.noApi")}</p>
        <ol className="grid grid-cols-1 list-decimal gap-2 pl-5">
          {(["link", "file", "caldav"] as const).map((k) => (
            <li key={k}><span className="font-semibold">{t(`connectors.apple.${k}Title`)}</span> {t(`connectors.apple.${k}Body`)}</li>
          ))}
        </ol>
        <div className="grid grid-cols-1 gap-1">
          <p className="font-semibold">{t("connectors.apple.accepted", { count: linkRulesByEcosystem("apple").length })}</p>
          <LinkRulesHint ecosystem="apple" />
        </div>
        {disabled ? (
          <p role="note" className="rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft px-3 py-2">{t("connectors.disabledHint", { provider: name })} {t("connectors.disabledWho")}</p>
        ) : null}
        <div><Button href="/tasks/new?importar=link" variant="default" icon="criar-tarefa">{t("connectors.apple.pasteLink")}</Button></div>
      </div>
    </Card>
  );
}
