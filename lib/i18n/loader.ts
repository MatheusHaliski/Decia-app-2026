/**
 * Catálogos de mensagens sob demanda (auditoria "Desempenho"): só o pt-BR (idioma-fonte e fallback) vai estático no bundle;
 * en e es chegam por `import()` dinâmico do JSON quando a pessoa escolhe o idioma (cada um vira um chunk próprio de ~190 KB gzip,
 * baixado uma vez). Enquanto o catálogo novo carrega, a tela continua no último idioma pronto — nunca em branco — e troca
 * sozinha quando ele chega (`useI18n` assina `subscribeCatalogs`).
 *
 * Caminho síncrono (testes, SSR, scripts): `registerCatalog(locale, json)` — ou `import "@/lib/i18n/all"`, que registra os três
 * de uma vez (o setup do Vitest faz isso, então `translate("en", …)` e o `renderWithProviders` seguem síncronos nos testes).
 */
import ptBR from "./messages/pt-BR.json";
import { baseLocale, type Locale } from "./state";

export type Catalog = Record<string, string>;
export type BaseLocale = Exclude<Locale, "qps-ploc">;

/** Catálogos já disponíveis (o pt-BR sempre). Objeto vivo: `MESSAGES` de core.ts é este mesmo objeto. */
export const catalogs: Partial<Record<BaseLocale, Catalog>> = { "pt-BR": ptBR as Catalog };

type Importer = () => Promise<{ default: unknown }>;
/** `import()` com caminho literal: o bundler gera um chunk por idioma e só o baixa quando chamado. */
const defaultImporters: Record<Exclude<BaseLocale, "pt-BR">, Importer> = {
  en: () => import("./messages/en.json"),
  es: () => import("./messages/es.json"),
};
let importers: Record<Exclude<BaseLocale, "pt-BR">, Importer> = { ...defaultImporters };

const pending = new Map<BaseLocale, Promise<Catalog>>();
const listeners = new Set<() => void>();
let version = 0;
/** Último idioma pedido e o último pronto para exibir (o que a tela mostra enquanto o pedido carrega). */
let requested: BaseLocale = "pt-BR";
let shown: BaseLocale = "pt-BR";

function emit() {
  version++;
  for (const l of [...listeners]) l();
}

export const isCatalogLoaded = (l: Locale): boolean => catalogs[baseLocale(l)] !== undefined;
export const getCatalog = (l: Locale): Catalog | undefined => catalogs[baseLocale(l)];

/** Registro síncrono de um catálogo (testes, SSR, scripts — ou quem já tem o JSON em mãos). */
export function registerCatalog(l: Locale, catalog: Catalog) {
  const b = baseLocale(l);
  catalogs[b] = catalog;
  if (requested === b) shown = b;
  emit();
}

/** Baixa (uma vez) o catálogo de um idioma. Falha de rede: a promessa rejeita, nada é registrado e um novo pedido tenta de novo. */
export function loadCatalog(l: Locale): Promise<Catalog> {
  const b = baseLocale(l);
  const ready = catalogs[b];
  if (ready) return Promise.resolve(ready);
  const inFlight = pending.get(b);
  if (inFlight) return inFlight;
  const p = importers[b as Exclude<BaseLocale, "pt-BR">]()
    .then((m) => {
      const catalog = ((m as { default?: unknown }).default ?? m) as Catalog;
      catalogs[b] = catalog;
      if (requested === b) shown = b;
      pending.delete(b);
      emit();
      return catalog;
    })
    .catch((err: unknown) => {
      pending.delete(b);
      throw err;
    });
  pending.set(b, p);
  return p;
}

/**
 * Pede um idioma para exibição: se o catálogo já está aqui passa a valer na hora; senão baixa e só então troca (se o pedido ainda
 * for o mesmo — trocar en → es → en rápido não pisca o idioma intermediário). Erro de rede: fica no idioma anterior.
 */
export function requestLocale(l: Locale): Promise<void> {
  const b = baseLocale(l);
  requested = b;
  if (catalogs[b]) {
    if (shown !== b) {
      shown = b;
      emit();
    }
    return Promise.resolve();
  }
  return loadCatalog(b).then(
    () => undefined,
    () => undefined,
  );
}

/**
 * Idioma a usar AGORA para um pedido: ele mesmo quando o catálogo está pronto; senão o último exibido (sem tela em branco nem
 * chave crua). O pseudo-idioma usa o pt-BR, que está sempre carregado.
 */
export function displayLocale(l: Locale): Locale {
  return isCatalogLoaded(l) ? l : shown;
}

export function subscribeCatalogs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export const catalogsVersion = () => version;

/**
 * Primeira visita com idioma salvo (en/es em `ws.prefs`, a mesma chave do script do <head>): começa a baixar o catálogo já na
 * avaliação do módulo, em paralelo à hidratação, para a troca acontecer o mais cedo possível.
 */
export function prefetchSavedLocale(storage: Pick<Storage, "getItem"> | undefined = typeof localStorage !== "undefined" ? localStorage : undefined) {
  try {
    const raw = storage?.getItem("ws.prefs");
    if (!raw) return;
    const lang = (JSON.parse(raw) as { language?: unknown }).language;
    if (lang === "en" || lang === "es") void loadCatalog(lang).catch(() => undefined);
  } catch {
    /* modo privado / JSON inválido: carrega quando o provider pedir */
  }
}
if (typeof window !== "undefined") prefetchSavedLocale();

/** Só para testes do próprio loader: volta ao estado inicial (só pt-BR) e permite trocar os importadores. */
export function __resetCatalogsForTests(custom?: Partial<Record<Exclude<BaseLocale, "pt-BR">, Importer>>) {
  for (const k of Object.keys(catalogs) as BaseLocale[]) if (k !== "pt-BR") delete catalogs[k];
  pending.clear();
  importers = { ...defaultImporters, ...custom };
  requested = "pt-BR";
  shown = "pt-BR";
  emit();
}
