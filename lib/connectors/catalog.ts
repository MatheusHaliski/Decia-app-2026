/**
 * Catálogo de fontes externas (RF4, RF20.CA07, RF23, RF34): o que cada aplicativo do Google, da Microsoft e da Apple produz e o
 * que vira no Work Station — `sourceKind` (como a tarefa entrou, um por aplicativo) × `taskType` (o que ela é) —, os formatos, se
 * dá para manter vínculo e por onde chega (conta conectada ou link). Dado versionado em `contracts/connectors/sources.json`
 * (pesquisa em fontes primárias de 09/11/2026, sem os contatos: contato não vira tarefa); guarda em `catalog.test.ts`.
 * Também interpreta as regras da importação por link do contrato (`POST /api/connectors/link-import`).
 */
import data from "@/contracts/connectors/sources.json";
import type { ConnectorProvider, LinkModeName } from "./client";

export const ECOSYSTEMS = ["google", "microsoft", "apple"] as const;
export type Ecosystem = (typeof ECOSYSTEMS)[number];
export const ECOSYSTEM_PROVIDER: Record<Ecosystem, ConnectorProvider> = { google: "GOOGLE", microsoft: "MICROSOFT", apple: "APPLE_ICLOUD" };
export const PROVIDER_ECOSYSTEM: Record<ConnectorProvider, Ecosystem> = { GOOGLE: "google", MICROSOFT: "microsoft", APPLE_ICLOUD: "apple" };

/** Os 15 TaskType de antes dos conectores (enum TaskType, TAXONOMIA §13). */
export const BASE_TASK_TYPES = [
  "TEXTO_MANUAL", "TEXTO_IA", "IMAGEM_WEB", "IMAGEM_EDITADA", "PLANILHA", "DOCUMENTO", "PASTA", "LINK", "DESENHO_TECNICO", "FORMULARIO",
  "ATA_REGISTRO", "EMAIL", "PROTOCOLO", "CRONOGRAMA", "ESTUDO_TECNICO_PRELIMINAR",
] as const;
/** Os 16 TaskType acrescentados pelos conectores (contrato de 09/11/2026). */
export const CONNECTOR_TASK_TYPES = [
  "APRESENTACAO", "DIAGRAMA", "QUADRO_BRANCO", "NOTA", "EVENTO_AGENDA", "LISTA_TAREFAS", "GRAVACAO_REUNIAO", "TRANSCRICAO", "MENSAGEM_CHAT",
  "PAGINA_WEB", "VIDEO", "AUDIO", "PAINEL_DADOS", "CODIGO", "MAPA", "ATIVIDADE_CURSO",
] as const;
export const ALL_TASK_TYPES = [...BASE_TASK_TYPES, ...CONNECTOR_TASK_TYPES] as const;
export type CatalogTaskType = (typeof ALL_TASK_TYPES)[number];

/** Os 17 SourceKind de antes dos conectores; GOOGLE e MICROSOFT ficam como legado genérico. */
export const LEGACY_SOURCE_KINDS = [
  "MANUAL", "ARQUIVO", "COLAR", "GOOGLE", "MICROSOFT", "EMAIL", "LINK", "PROTOCOLO", "FOTO", "TEXTO_IA", "EXTRAIDA_DE_PROJETO", "REMIX",
  "DECIA", "AUTOPILOT", "ATA_VIVA", "DOSSIE", "EXTRACAO",
] as const;
/** Fora do catálogo de propósito: contato não vira tarefa. */
export const EXCLUDED_SOURCE_KINDS = ["GOOGLE_CONTACTS", "MS_CONTACTS", "APPLE_CONTACTS"] as const;
/** A coluna `source_kind` é VARCHAR(20). */
export const SOURCE_KIND_MAX = 20;

/** Dá para manter vínculo com atualização (watch, webhook ou delta)? */
export type LinkableLevel = "SIM" | "PARCIAL" | "NAO";
/** CONTA = alcançável pelos escopos mínimos do conector; LINK = a importação por link infere este sourceKind. */
export type EntryVia = "CONTA" | "LINK";

export interface SourceItem {
  /** `SOURCEKIND.TASKTYPE` — único */
  id: string;
  ecosystem: Ecosystem;
  provider: ConnectorProvider;
  app: string;
  /** texto da pesquisa (pt-BR) */
  artifact: string;
  sourceKind: string;
  taskType: CatalogTaskType;
  taskTypeIsNew: boolean;
  nativeMime: string[];
  extensions: string[];
  /** como a pesquisa descreveu (pt-BR, com observações) */
  exportFormats: string[];
  /** códigos curtos derivados de `exportFormats` (ORIGINAL = o binário como está) */
  formats: string[];
  api: string;
  scopes: string[];
  linkable: LinkableLevel;
  linkableHow: string;
  via: EntryVia[];
  notes: string;
}
export interface SourceKindEntry { sourceKind: string; ecosystem: Ecosystem; provider: ConnectorProvider; app: string; defaultTaskType: CatalogTaskType }
export interface LinkRule {
  /** host exato ou `*.dominio` */
  host: string;
  pathPrefix?: string;
  pathContains?: string;
  sourceKind: string;
  example: string;
}
export interface ResearchSource { title: string; url: string; accessedAt: string }
export interface EcosystemInfo {
  id: Ecosystem;
  provider: ConnectorProvider;
  label: string;
  generatedAt: string;
  /** itens da pesquisa (com os contatos) */
  researchItems: number;
  /** itens no catálogo (sem os contatos) */
  items: number;
  sources: ResearchSource[];
  naoConferido: string[];
}
export interface SourceCatalog {
  schemaVersion: 1;
  version: string;
  about: string;
  fields: Record<string, string>;
  linkImport: { linkMode: LinkModeName; protocol: string; rules: LinkRule[] };
  ecosystems: EcosystemInfo[];
  sourceKinds: SourceKindEntry[];
  items: SourceItem[];
}

export const SOURCE_CATALOG = data as unknown as SourceCatalog;
export const SOURCE_ITEMS: readonly SourceItem[] = SOURCE_CATALOG.items;
export const SOURCE_KINDS: readonly SourceKindEntry[] = SOURCE_CATALOG.sourceKinds;
export const LINK_RULES: readonly LinkRule[] = SOURCE_CATALOG.linkImport.rules;
/** Todos os SourceKind que o frontend rotula (`sourceKind.<VALOR>`): os 17 de antes + um por aplicativo do catálogo. */
export const ALL_SOURCE_KINDS: readonly string[] = [...LEGACY_SOURCE_KINDS, ...SOURCE_KINDS.map((k) => k.sourceKind)];

export const ecosystemInfo = (eco: Ecosystem): EcosystemInfo | undefined => SOURCE_CATALOG.ecosystems.find((e) => e.id === eco);
export const itemsByEcosystem = (eco: Ecosystem, items: readonly SourceItem[] = SOURCE_ITEMS) => items.filter((i) => i.ecosystem === eco);
export const itemsBySourceKind = (kind: string, items: readonly SourceItem[] = SOURCE_ITEMS) => items.filter((i) => i.sourceKind === kind);
export const sourceKindEntry = (kind: string): SourceKindEntry | undefined => SOURCE_KINDS.find((k) => k.sourceKind === kind);
export const sourceKindsByEcosystem = (eco: Ecosystem) => SOURCE_KINDS.filter((k) => k.ecosystem === eco);
export const linkRulesByEcosystem = (eco: Ecosystem) => LINK_RULES.filter((r) => sourceKindEntry(r.sourceKind)?.ecosystem === eco);

/** Chave de comparação: sem acento, sem caixa, espaços colapsados. */
export const searchKey = (s: string) => s.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Filtra por aplicativo, artefato, sourceKind, taskType e formatos — e pelos rótulos que a tela mostrar (`labels`, já traduzidos).
 * Todas as palavras da busca precisam aparecer; busca vazia devolve tudo.
 */
export function filterItems(items: readonly SourceItem[], query: string, labels?: (item: SourceItem) => string[]): SourceItem[] {
  const words = searchKey(query).split(" ").filter(Boolean);
  if (!words.length) return [...items];
  return items.filter((it) => {
    const hay = searchKey([it.app, it.artifact, it.sourceKind, it.taskType, ...it.formats, ...(labels?.(it) ?? [])].join(" "));
    return words.every((w) => hay.includes(w));
  });
}

/** Como a regra aparece na dica da tela: `docs.google.com/document`, `*.sharepoint.com/…/SitePages/`. */
export const linkRulePattern = (r: LinkRule) => `${r.host}${r.pathPrefix ?? (r.pathContains ? `/…${r.pathContains}` : "")}`;

export interface LinkMatch { rule: LinkRule; sourceKind: string; taskType: CatalogTaskType; ecosystem: Ecosystem; app: string; linkMode: LinkModeName }
const MAX_URL = 2048;
const hostMatches = (pattern: string, host: string) =>
  pattern.startsWith("*.") ? host.endsWith(pattern.slice(1)) && host.length > pattern.length - 1 : host === pattern;
const pathMatches = (prefix: string, path: string) => {
  const bare = prefix.replace(/\/+$/, "");
  return path === bare || path.startsWith(`${bare}/`);
};

/**
 * O que um link colado vira, pelas regras do contrato: https, host da lista e o caminho; a primeira regra que casa vence. `null`
 * quando o servidor recusaria (VALIDACAO). Link com usuário/senha embutidos é recusado (padrão de phishing). `/SitePages/` do
 * SharePoint é comparado sem caixa, como o próprio SharePoint trata o caminho.
 */
export function inferLinkSource(raw: string, rules: readonly LinkRule[] = LINK_RULES): LinkMatch | null {
  const text = raw.trim();
  if (!text || text.length > MAX_URL) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== SOURCE_CATALOG.linkImport.protocol || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  for (const rule of rules) {
    if (!hostMatches(rule.host, host)) continue;
    if (rule.pathPrefix && !pathMatches(rule.pathPrefix, url.pathname)) continue;
    if (rule.pathContains && !url.pathname.toLowerCase().includes(rule.pathContains.toLowerCase())) continue;
    const entry = sourceKindEntry(rule.sourceKind);
    if (!entry) continue;
    return { rule, sourceKind: entry.sourceKind, taskType: entry.defaultTaskType, ecosystem: entry.ecosystem, app: entry.app, linkMode: SOURCE_CATALOG.linkImport.linkMode };
  }
  return null;
}
