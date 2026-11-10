/**
 * Conectores de fontes externas (RF4, RF20.CA07, RF23, RF34): cliente de `/api/connectors` com tipos PRÓPRIOS que espelham o
 * contrato REST combinado com o backend em 09/11/2026 — não dependem de `lib/api/schema.d.ts`. Tokens nunca chegam aqui: o
 * navegador só vê o e-mail da conta, o estado e os escopos. Conectar = `POST authorize` → o navegador vai à tela do provedor
 * (PKCE e `state` ficam no servidor) → o callback do backend volta com `conector=ok` ou `conector=erro&motivo=<CODIGO>`.
 */
import { api, ApiError, describeError, qs } from "@/lib/api/client";
import { safeNext } from "@/lib/auth/next";
import { tr, type Vars } from "@/lib/i18n/core";

export const CONNECTOR_PROVIDERS = ["GOOGLE", "MICROSOFT", "APPLE_ICLOUD"] as const;
export type ConnectorProvider = (typeof CONNECTOR_PROVIDERS)[number];
/** Google e Microsoft conectam conta (OAuth 2.0); Apple iCloud não tem API pública: só link e arquivo exportado. */
export type ConnectorMode = "OAUTH" | "LINK";
export const CONNECTOR_STATUSES = ["ATIVO", "EXPIRADO", "REVOGADO", "ERRO"] as const;
export type ConnectorStatus = (typeof CONNECTOR_STATUSES)[number];
/** `LinkMode` do domínio: COPIADO exporta o conteúdo agora; VINCULADO guarda a referência para sincronizar depois. */
export const LINK_MODES = ["COPIADO", "VINCULADO"] as const;
export type LinkModeName = (typeof LINK_MODES)[number];

/** `GET /api/connectors/providers` */
export interface ConnectorProviderInfo { provider: ConnectorProvider; enabled: boolean; mode: ConnectorMode; scopes: string[] }
/** `GET /api/connectors` — só as contas da própria pessoa (BOLA no servidor). */
export interface ConnectorAccount {
  id: string;
  provider: ConnectorProvider;
  accountEmail: string;
  status: ConnectorStatus;
  scopes: string[];
  connectedAt: string;
  lastUsedAt?: string | null;
  lastError?: string | null;
}
/** Item de `GET /api/connectors/{id}/items`: o arquivo no provedor e o que ele vira (sourceKind × taskType). */
export interface ExternalItem {
  externalId: string;
  name: string;
  mimeType: string;
  sourceKind: string;
  taskType: string;
  webUrl: string;
  modifiedAt: string;
  sizeBytes?: number | null;
  exportFormats: string[];
  linkable: boolean;
}
export interface ExternalItemPage { items: ExternalItem[]; nextPageToken?: string | null }
export interface ImportItemRequest { externalId: string; linkMode: LinkModeName; title?: string }
export interface LinkImportRequest { url: string; title?: string }
/** A parte do `TaskView` (201) que a importação usa; o restante da visão chega junto e não é lido aqui. */
export interface ImportedTask {
  id: string;
  title?: string;
  type?: string;
  sourceKind?: string;
  linkMode?: LinkModeName;
  sourceRef?: string;
  version?: number;
}

/** Destino padrão do callback (contrato: `{frontendBaseUrl}{returnTo ou /settings?tab=conectores}`). */
export const CONNECTORS_HOME = "/settings?tab=conectores";
export const DEFAULT_PAGE_SIZE = 20;
/** Teto do contrato para `pageSize`. */
export const MAX_PAGE_SIZE = 50;

const clampPageSize = (n?: number) => Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(n ?? DEFAULT_PAGE_SIZE)));
const SIGNAL_PARAMS = ["conector", "motivo"];

/** `returnTo` só pode ser caminho interno (sem open redirect) e não leva adiante um `conector=`/`motivo=` antigo. */
export function safeReturnTo(path: string | null | undefined): string {
  const safe = safeNext(path, CONNECTORS_HOME);
  const [base, query = ""] = safe.split("?", 2);
  const params = new URLSearchParams(query);
  SIGNAL_PARAMS.forEach((k) => params.delete(k));
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base!;
}

const enc = encodeURIComponent;
export const connectorsApi = {
  providers: () => api.get<ConnectorProviderInfo[]>("/api/connectors/providers"),
  accounts: () => api.get<ConnectorAccount[]>("/api/connectors"),
  authorize: (provider: ConnectorProvider, returnTo?: string) =>
    api.post<{ url: string }>(`/api/connectors/${enc(provider)}/authorize`, returnTo ? { returnTo: safeReturnTo(returnTo) } : {}),
  disconnect: (id: string) => api.delete<void>(`/api/connectors/${enc(id)}`),
  items: (id: string, params: { q?: string; pageToken?: string | null; pageSize?: number } = {}) =>
    api.get<ExternalItemPage>(`/api/connectors/${enc(id)}/items${qs({ q: params.q?.trim(), pageToken: params.pageToken ?? undefined, pageSize: clampPageSize(params.pageSize) })}`),
  importItem: (id: string, body: ImportItemRequest) => api.post<ImportedTask>(`/api/connectors/${enc(id)}/import`, body),
  linkImport: (body: LinkImportRequest) => api.post<ImportedTask>("/api/connectors/link-import", body),
};

/** Navegação para fora do app (tela de consentimento do provedor). Isolada para os testes trocarem. */
export const browserNav = {
  assign(url: string) {
    window.location.assign(url);
  },
};

/** A URL de autorização vem do nosso backend, mas só seguimos https (ou http local, em desenvolvimento): nada de `javascript:`. */
export function isSafeAuthorizeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"));
  } catch {
    return false;
  }
}

/** Código local (não vem do servidor): a URL de autorização recebida não é https. */
export const UNSAFE_AUTHORIZE_URL = "URL_AUTORIZACAO_INSEGURA";

/** Pede a URL de autorização e leva o navegador até ela; quem chama trata o erro (ex.: CONECTOR_DESABILITADO). */
export async function startAuthorization(provider: ConnectorProvider, returnTo?: string): Promise<void> {
  const res = await connectorsApi.authorize(provider, returnTo);
  if (!res || typeof res.url !== "string" || !isSafeAuthorizeUrl(res.url)) {
    throw new ApiError(502, UNSAFE_AUTHORIZE_URL, tr("connectors.error.badAuthorizeUrl"));
  }
  browserNav.assign(res.url);
}

/** Códigos de erro do contrato (campo `code`). */
export const CONNECTOR_ERROR_CODES = {
  EXPIRADO: "CONECTOR_EXPIRADO",
  DESABILITADO: "CONECTOR_DESABILITADO",
  PROVEDOR: "PROVEDOR_INDISPONIVEL",
  VALIDACAO: "VALIDACAO",
  ACESSO_NEGADO: "ACESSO_NEGADO",
  NAO_ENCONTRADO: "NAO_ENCONTRADO",
} as const;
export type ConnectorErrorKind = keyof typeof CONNECTOR_ERROR_CODES | "OUTRO";

/**
 * Classifica o erro pelo `code` do contrato; sem código conhecido, pelo status (400/422 → VALIDACAO, 403, 404, 502). 409 e 503
 * sem o código do contrato ficam como OUTRO: podem ser outro conflito ou o proxy fora do ar, não "reconecte" nem "fale com a TI".
 */
export function connectorErrorKind(e: unknown): ConnectorErrorKind {
  if (!(e instanceof ApiError) || e.code === UNSAFE_AUTHORIZE_URL) return "OUTRO";
  const byCode = (Object.keys(CONNECTOR_ERROR_CODES) as (keyof typeof CONNECTOR_ERROR_CODES)[]).find((k) => CONNECTOR_ERROR_CODES[k] === e.code);
  if (byCode) return byCode;
  if (e.status === 400 || e.status === 422) return "VALIDACAO";
  if (e.status === 403) return "ACESSO_NEGADO";
  if (e.status === 404) return "NAO_ENCONTRADO";
  if (e.status === 502) return "PROVEDOR";
  return "OUTRO";
}

/**
 * Mensagem traduzida para um erro dos conectores: CONECTOR_EXPIRADO pede para reconectar, CONECTOR_DESABILITADO explica que a TI
 * precisa configurar; VALIDACAO usa a mensagem do campo quando o servidor manda uma. O resto cai no `describeError` comum.
 */
export function describeConnectorError(e: unknown, vars: Vars = {}): string {
  if (e instanceof ApiError && e.code === UNSAFE_AUTHORIZE_URL) return tr("connectors.error.badAuthorizeUrl");
  const kind = connectorErrorKind(e);
  if (kind === "OUTRO") return describeError(e);
  if (kind === "VALIDACAO" && e instanceof ApiError) {
    const field = Object.values(e.fields)[0];
    if (field) return field;
  }
  return tr(`connectors.error.${kind}`, vars);
}

/** Retorno do callback na URL (`conector=ok|erro&motivo=`): o motivo só passa se for um código (letras e _), nunca texto livre. */
export interface ConnectorReturn { status: "ok" | "erro"; reason: string | null }
export function readConnectorReturn(params: URLSearchParams | null | undefined): ConnectorReturn | null {
  const status = params?.get("conector");
  if (status !== "ok" && status !== "erro") return null;
  const raw = params?.get("motivo") ?? "";
  return { status, reason: /^[A-Za-z_]{1,40}$/.test(raw) ? raw.toUpperCase() : null };
}
