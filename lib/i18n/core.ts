/**
 * Tradução sem React: catálogos, fallback e interpolação de variáveis `{nome}`. O provider React (etapa b) e o
 * `tr()` usado fora de componentes passam por aqui. Cadeia de fallback: idioma escolhido → pt-BR (idioma-fonte) →
 * a própria chave. O ICU completo (plural/select/number/date) do FAI entra junto com as primeiras telas.
 */
import ptBR from "./messages/pt-BR.json";
import en from "./messages/en.json";
import es from "./messages/es.json";
import { pseudo } from "./pseudo";
import { PSEUDO_LOCALE, baseLocale, getCurrentLocale, type Locale } from "./state";

export type Catalog = Record<string, string>;
export type Vars = Record<string, string | number | boolean | Date | null | undefined>;

export const MESSAGES: Record<Exclude<Locale, "qps-ploc">, Catalog> = {
  "pt-BR": ptBR as Catalog,
  en: en as Catalog,
  es: es as Catalog,
};

/** Chaves sem texto / sem tradução encontradas em tempo de execução (QA lê em window.__wsI18n). */
export const missingKeys = new Set<string>();
export const untranslatedKeys = new Set<string>();
const warned = new Set<string>();

function report(kind: "missing" | "untranslated", key: string) {
  (kind === "missing" ? missingKeys : untranslatedKeys).add(key);
  if (typeof window !== "undefined") {
    const w = window as unknown as { __wsI18n?: { missing: string[]; untranslated: string[] } };
    w.__wsI18n = { missing: [...missingKeys], untranslated: [...untranslatedKeys] };
  }
  if (process.env.NODE_ENV !== "production" && !warned.has(kind + key)) {
    warned.add(kind + key);
    console.warn(`[i18n] ${kind === "missing" ? "chave sem texto" : "chave sem tradução"}: ${key}`);
  }
}

export const hasMessage = (locale: Locale, key: string) => MESSAGES[baseLocale(locale)]?.[key] !== undefined;

/** Texto-fonte de uma chave no idioma pedido, com fallback para pt-BR e, por fim, a própria chave. */
export function resolveMessage(locale: Locale, key: string): string {
  const base = baseLocale(locale);
  const msg = MESSAGES[base]?.[key];
  if (msg !== undefined) return msg;
  const pt = MESSAGES["pt-BR"][key];
  if (pt === undefined) {
    report("missing", key);
    return key;
  }
  if (base !== "pt-BR") report("untranslated", key);
  return pt;
}

/** `{nome}` → valor; `''` é apóstrofo literal; variável ausente fica como está (visível no QA). */
export function interpolate(message: string, vars?: Vars, intl = "pt-BR"): string {
  if (!vars || !message.includes("{")) return message.replace(/''/g, "'");
  return message
    .replace(/\{\s*([A-Za-z0-9_]+)\s*\}/g, (whole, name: string) => {
      const v = vars[name];
      if (v === undefined || v === null) return whole;
      if (typeof v === "number") return new Intl.NumberFormat(intl).format(v);
      if (v instanceof Date) return new Intl.DateTimeFormat(intl, { dateStyle: "medium" }).format(v);
      return String(v);
    })
    .replace(/''/g, "'");
}

export function translate(locale: Locale, key: string, vars?: Vars): string {
  const msg = resolveMessage(locale, key);
  const intl = locale === PSEUDO_LOCALE ? "pt-BR" : locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR";
  const out = interpolate(msg, vars, intl);
  return locale === PSEUDO_LOCALE ? pseudo(out) : out;
}

/** Tradução no idioma corrente — para módulos sem React (helpers, constantes, cliente da API). */
export const tr = (key: string, vars?: Vars) => translate(getCurrentLocale(), key, vars);
