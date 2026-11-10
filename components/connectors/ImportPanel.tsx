"use client";
/**
 * Corpo do diálogo "Importar de…" (carregado sob demanda pelo ImportFrom). Duas abas:
 *  - Conta conectada: escolher a conta → buscar no Drive/OneDrive → escolher o item → COPIADO (exporta o conteúdo agora; a tarefa
 *    fica independente) ou VINCULADO (guarda a referência para sincronizar depois) → `POST /api/connectors/{id}/import` → detalhe.
 *  - Colar link: qualquer provedor, inclusive iCloud, sem conta: a regra do contrato mostra o que o link vira antes de enviar
 *    (`POST /api/connectors/link-import`, sempre VINCULADO).
 * CONECTOR_EXPIRADO pede para reconectar (volta para cá com `?importar=conta`); CONECTOR_DESABILITADO explica que a TI configura.
 */
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button, EmptyState, Field, Input, Link, LoadingState, RadioCards, Select, SelectList, Tabs, useToast } from "@/components/ui";
import { inferLinkSource } from "@/lib/connectors/catalog";
import {
  CONNECTORS_HOME, DEFAULT_PAGE_SIZE, connectorErrorKind, connectorsApi, startAuthorization,
  type ConnectorAccount, type ConnectorProvider, type ConnectorProviderInfo, type ConnectorReturn, type ExternalItem, type ImportedTask, type LinkModeName,
} from "@/lib/connectors/client";
import { useConnectorLabels } from "./labels";
import { LinkRulesHint } from "./LinkRulesHint";
import { ConnectorErrorNotice, ConnectorReturnNotice } from "./Notices";

export type ImportTab = "conta" | "link";
export interface ImportPanelProps {
  initialTab?: ImportTab;
  /** volta do provedor (`conector=ok|erro&motivo=`) */
  returned?: ConnectorReturn | null;
  /** o formulário já tem conteúdo: avisa que a importação cria outra tarefa */
  hasDraft?: boolean;
  onDone?: () => void;
}

const OAUTH_PROVIDERS: readonly ConnectorProvider[] = ["GOOGLE", "MICROSOFT"];
const BODY_SM = "text-[length:var(--ws-text-body-sm)]";
const CAPTION = "text-[length:var(--ws-text-caption)]";
const enterTo = (fn: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") {
    e.preventDefault();
    fn();
  }
};

export default function ImportPanel({ initialTab = "conta", returned = null, hasDraft = false, onDone }: ImportPanelProps) {
  const { t } = useConnectorLabels();
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<ImportTab>(initialTab);

  const finish = useCallback((task: ImportedTask, mode: LinkModeName) => {
    toast({ title: t("connectors.import.done"), description: t(`connectors.import.doneMode.${mode}`), tone: "sucesso" });
    onDone?.();
    router.push(`/tasks/${encodeURIComponent(task.id)}`);
  }, [toast, t, onDone, router]);

  return (
    <div className="grid grid-cols-1 gap-[var(--ws-space-3)]" data-testid="import-panel">
      {hasDraft ? <p role="note" className={`rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft px-3 py-2 ${BODY_SM}`}>{t("connectors.import.draftNote")}</p> : null}
      <Tabs
        tabs={[{ slug: "conta", label: t("connectors.import.tabAccount") }, { slug: "link", label: t("connectors.import.tabLink") }]}
        param={null}
        value={tab}
        onChange={(s) => setTab(s as ImportTab)}
        label={t("connectors.import.tabs")}
        look="pills"
      >
        {(active) => (active === "link" ? <LinkImport onImported={finish} /> : <AccountImport returned={returned} onImported={finish} onUseLink={() => setTab("link")} />)}
      </Tabs>
    </div>
  );
}

type Load = { kind: "loading" } | { kind: "error"; error: unknown } | { kind: "ready"; accounts: ConnectorAccount[]; providers: ConnectorProviderInfo[] | null };
interface Results { items: ExternalItem[]; next: string | null; q: string }

function AccountImport({ returned, onImported, onUseLink }: { returned: ConnectorReturn | null; onImported: (task: ImportedTask, mode: LinkModeName) => void; onUseLink: () => void }) {
  const L = useConnectorLabels();
  const { t } = L;
  const pathname = usePathname();
  const returnTo = `${pathname || "/tasks/new"}?importar=conta`;
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [accountId, setAccountId] = useState("");
  const [expired, setExpired] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<LinkModeName>("COPIADO");
  const [title, setTitle] = useState("");
  const [importing, setImporting] = useState(false);
  const [connecting, setConnecting] = useState<ConnectorProvider | null>(null);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    setLoad({ kind: "loading" });
    const [providers, accounts] = await Promise.allSettled([connectorsApi.providers(), connectorsApi.accounts()]);
    if (accounts.status === "rejected") {
      setLoad({ kind: "error", error: accounts.reason });
      return;
    }
    const usable = (accounts.value ?? []).filter((a) => a.status !== "REVOGADO");
    setLoad({ kind: "ready", accounts: usable, providers: providers.status === "fulfilled" ? providers.value ?? [] : null });
    setAccountId((cur) => (usable.some((a) => a.id === cur) ? cur : (usable.find((a) => a.status === "ATIVO") ?? usable[0])?.id ?? ""));
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const account = load.kind === "ready" ? load.accounts.find((a) => a.id === accountId) : undefined;
  const usable = !!account && account.status === "ATIVO" && !expired.has(account.id);
  const markExpired = (e: unknown, id: string) => {
    if (connectorErrorKind(e) === "EXPIRADO") setExpired((s) => new Set(s).add(id));
  };

  const search = useCallback(async (q: string, pageToken?: string | null) => {
    if (!account) return;
    const mine = ++seq.current;
    setSearching(true);
    setError(null);
    if (!pageToken) setSelected(null);
    try {
      const page = await connectorsApi.items(account.id, { q, pageToken, pageSize: DEFAULT_PAGE_SIZE });
      if (mine !== seq.current) return;
      setResults((cur) => ({ items: pageToken && cur ? [...cur.items, ...(page?.items ?? [])] : page?.items ?? [], next: page?.nextPageToken ?? null, q }));
    } catch (e) {
      if (mine !== seq.current) return;
      markExpired(e, account.id);
      setError(e);
      if (!pageToken) setResults(null);
    } finally {
      if (mine === seq.current) setSearching(false);
    }
  }, [account]);

  // conta escolhida e ativa: já mostra os itens recentes (busca vazia)
  const accountKey = account ? `${account.id}:${account.status}` : "";
  useEffect(() => {
    seq.current += 1;
    setResults(null);
    setSelected(null);
    setError(null);
    setQuery("");
    setSearching(false);
    if (account && account.status === "ATIVO") void search("");
  }, [accountKey]); // só quando muda a conta (ou o estado dela)

  const item = results?.items.find((i) => i.externalId === selected) ?? null;
  useEffect(() => {
    setTitle("");
    setMode((m) => (m === "VINCULADO" && item && !item.linkable ? "COPIADO" : m));
  }, [item?.externalId]); // novo item escolhido

  const connect = async (provider: ConnectorProvider) => {
    setConnecting(provider);
    setError(null);
    try {
      await startAuthorization(provider, returnTo);
    } catch (e) {
      setError(e);
      setConnecting(null);
    }
  };

  const doImport = async () => {
    if (!account || !item) return;
    setImporting(true);
    setError(null);
    try {
      const task = await connectorsApi.importItem(account.id, { externalId: item.externalId, linkMode: mode, title: title.trim() || undefined });
      if (!task?.id) throw new Error("import sem id");
      onImported(task, mode);
    } catch (e) {
      markExpired(e, account.id);
      setError(e);
    } finally {
      setImporting(false);
    }
  };

  if (load.kind === "loading") return <LoadingState label={t("connectors.loading")} />;
  if (load.kind === "error") {
    return <ConnectorErrorNotice error={load.error} action={<Button size="sm" variant="ghost" onClick={() => void reload()}>{t("common.retry")}</Button>} />;
  }

  const providerInfo = (p: ConnectorProvider) => load.providers?.find((x) => x.provider === p);
  const providerName = account ? L.provider(account.provider) : undefined;
  const errorKind = connectorErrorKind(error);

  return (
    <div className="grid grid-cols-1 gap-[var(--ws-space-3)]" data-testid="import-account">
      {returned ? <ConnectorReturnNotice ret={returned} okHint={t("connectors.import.returnedOk")} /> : null}

      {load.accounts.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 rounded-[var(--ws-radius-md)] border border-dashed border-ws-border p-3" data-testid="import-no-account">
          <p className={`font-semibold ${BODY_SM}`}>{t("connectors.import.noAccount")}</p>
          <p className={`${BODY_SM} text-ws-text-muted`}>{t("connectors.import.noAccountHint")}</p>
          <div className="flex flex-wrap gap-2">
            {OAUTH_PROVIDERS.map((p) => {
              const info = providerInfo(p);
              const off = load.providers !== null && !info?.enabled;
              return (
                <Button key={p} size="sm" variant="primary" disabled={off} busy={connecting === p} onClick={() => void connect(p)} data-testid={`import-connect-${p}`}>
                  {t("connectors.connect", { provider: L.provider(p) })}
                </Button>
              );
            })}
            <Button size="sm" variant="ghost" onClick={onUseLink}>{t("connectors.import.useLinkInstead")}</Button>
          </div>
          {load.providers !== null && OAUTH_PROVIDERS.every((p) => !providerInfo(p)?.enabled) ? (
            <p className={`${CAPTION} text-ws-text-muted`} data-testid="import-disabled">{t("connectors.import.allDisabled")} {t("connectors.disabledWho")}</p>
          ) : null}
        </div>
      ) : (
        <>
          <Field label={t("connectors.import.account")}>
            {({ id }) => (
              <Select
                id={id}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={load.accounts.map((a) => ({
                  value: a.id,
                  label: `${L.provider(a.provider)} · ${a.accountEmail}${a.status !== "ATIVO" || expired.has(a.id) ? ` — ${L.status(expired.has(a.id) ? "EXPIRADO" : a.status)}` : ""}`,
                }))}
                data-testid="import-account-select"
              />
            )}
          </Field>

          {account && !usable ? (
            <div role="alert" className={`grid grid-cols-1 gap-2 rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft px-3 py-2 ${BODY_SM}`} data-testid="import-needs-reconnect">
              <p>{t("connectors.import.needsReconnect", { account: account.accountEmail, provider: L.provider(account.provider) })}</p>
              <div>
                <Button size="sm" variant="primary" busy={connecting === account.provider} disabled={load.providers !== null && !providerInfo(account.provider)?.enabled} onClick={() => void connect(account.provider)} data-testid="import-reconnect">
                  {t("connectors.reconnect")}
                </Button>
              </div>
            </div>
          ) : null}

          {account && usable ? (
            <div className="grid grid-cols-1 gap-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <Field label={t("connectors.import.search", { account: account.accountEmail })}>
                  {({ id }) => <Input id={id} type="search" leading="buscar" value={query} maxLength={200} onChange={(e) => setQuery(e.target.value)} onKeyDown={enterTo(() => void search(query))} data-testid="import-query" />}
                </Field>
                <Button onClick={() => void search(query)} busy={searching} data-testid="import-search">{t("connectors.import.searchButton")}</Button>
              </div>
              <div aria-live="polite" aria-busy={searching} className="grid grid-cols-1 gap-2">
                {searching && !results ? <LoadingState label={t("connectors.import.searching")} /> : null}
                {results ? (
                  results.items.length ? (
                    <SelectList
                      label={t("connectors.import.results")}
                      value={selected ? [selected] : []}
                      onChange={(ids) => setSelected(ids[0] ?? null)}
                      className="max-h-72 grid-cols-1 overflow-auto"
                      options={results.items.map((it) => ({
                        id: it.externalId,
                        title: it.name,
                        subtitle: [t("connectors.import.itemLine", { kind: L.kind(it.sourceKind), type: L.type(it.taskType), when: L.when(it.modifiedAt) }), L.size(it.sizeBytes)].filter(Boolean).join(" · "),
                      }))}
                    />
                  ) : (
                    <EmptyState compact moji="vazio" title={results.q ? t("connectors.import.noResultsFor", { q: results.q }) : t("connectors.import.noResults")} />
                  )
                ) : null}
                {results?.next ? (
                  <div><Button size="sm" variant="ghost" busy={searching} onClick={() => void search(results.q, results.next)} data-testid="import-more">{t("connectors.import.more")}</Button></div>
                ) : null}
              </div>
            </div>
          ) : null}

          {error && errorKind !== "EXPIRADO" ? <ConnectorErrorNotice error={error} provider={providerName} /> : null}

          {item && usable ? (
            <section className="grid grid-cols-1 gap-3 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-3" aria-label={t("connectors.import.optionsLabel")} data-testid="import-options">
              <div className="grid grid-cols-1 gap-0.5">
                <p className={`font-semibold ${BODY_SM} [overflow-wrap:anywhere]`}>{item.name}</p>
                <p className={`${CAPTION} text-ws-text-muted`}>
                  {t("connectors.import.becomes", { type: L.type(item.taskType), kind: L.kind(item.sourceKind) })}
                  {item.exportFormats.length ? ` · ${t("connectors.import.formats", { formats: item.exportFormats.join(", ") })}` : ""}
                  {/^https:\/\//i.test(item.webUrl ?? "") ? <> · <Link href={item.webUrl}>{t("connectors.import.openOriginal")}</Link></> : null}
                </p>
              </div>
              <RadioCards
                label={t("connectors.import.mode")}
                value={mode}
                onValueChange={(v) => setMode(v as LinkModeName)}
                columns={2}
                options={[
                  { value: "COPIADO", label: t("connectors.linkMode.COPIADO"), hint: t("connectors.linkMode.COPIADOHint") },
                  {
                    value: "VINCULADO",
                    label: t("connectors.linkMode.VINCULADO"),
                    hint: item.linkable ? t("connectors.linkMode.VINCULADOHint", { provider: providerName ?? "" }) : t("connectors.linkMode.notLinkable"),
                    disabled: !item.linkable,
                  },
                ]}
              />
              <Field label={t("connectors.import.titleLabel")} hint={t("connectors.import.titleHint")}>
                {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={title} placeholder={item.name} maxLength={200} onChange={(e) => setTitle(e.target.value)} />}
              </Field>
              <div>
                <Button variant="primary" busy={importing} onClick={() => void doImport()} data-testid="import-submit">{t(`connectors.import.submit.${mode}`)}</Button>
              </div>
            </section>
          ) : null}

          <p className={CAPTION}><Link href={CONNECTORS_HOME}>{t("connectors.manage")}</Link></p>
        </>
      )}
      {load.accounts.length === 0 && error ? <ConnectorErrorNotice error={error} /> : null}
    </div>
  );
}

function LinkImport({ onImported }: { onImported: (task: ImportedTask, mode: LinkModeName) => void }) {
  const L = useConnectorLabels();
  const { t } = L;
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const match = useMemo(() => inferLinkSource(url), [url]);
  const typed = url.trim().length > 0;

  const submit = async () => {
    if (!match || importing) return;
    setImporting(true);
    setError(null);
    try {
      const task = await connectorsApi.linkImport({ url: url.trim(), title: title.trim() || undefined });
      if (!task?.id) throw new Error("link-import sem id");
      onImported(task, "VINCULADO");
    } catch (e) {
      setError(e);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-[var(--ws-space-3)]" data-testid="import-link">
      <p className={`${BODY_SM} text-ws-text-muted`}>{t("connectors.link.intro")}</p>
      <Field label={t("connectors.link.url")} hint={t("connectors.link.urlHint")}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://"
            value={url}
            maxLength={2048}
            invalid={typed && !match}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            onKeyDown={enterTo(() => void submit())}
            data-testid="link-url"
          />
        )}
      </Field>
      <p aria-live="polite" data-testid="link-preview" data-accepted={typed ? String(!!match) : undefined} className={`${BODY_SM} ${typed && !match ? "text-ws-danger-ink" : "text-ws-text"}`}>
        {typed ? (match ? t("connectors.link.becomes", { app: L.kind(match.sourceKind), type: L.type(match.taskType) }) : t("connectors.link.refused")) : ""}
      </p>
      <Field label={t("connectors.import.titleLabel")} hint={t("connectors.link.titleHint")}>
        {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />}
      </Field>
      {error ? <ConnectorErrorNotice error={error} /> : null}
      <div>
        <Button variant="primary" disabled={!match} busy={importing} onClick={() => void submit()} data-testid="link-submit">{t("connectors.link.submit")}</Button>
      </div>
      <details className={`rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-2 ${CAPTION}`} data-testid="link-accepted">
        <summary className="cursor-pointer font-semibold">{t("connectors.link.accepted")}</summary>
        <LinkRulesHint className="mt-2" />
      </details>
    </div>
  );
}
