/**
 * Adaptadores de persistência das preferências (RF3.CA03): local (localStorage, com try/catch — modo privado, cota,
 * storage bloqueado) e API (`GET/PUT /api/me/preferences`, Bloco 3). O provider usa o local sempre (resposta imediata,
 * sem flash) e sincroniza com a API quando houver sessão. Mesma chave lida pelo script inline do <head> (bootScript).
 */
import { api, hasSession } from "@/lib/api/client";
import { DEFAULT_PREFERENCES, fromServer, sanitizePreferences, toServer, type UserPreferences } from "./types";

export const PREFS_STORAGE_KEY = "ws.prefs";

export interface PreferencesAdapter {
  load(): Promise<UserPreferences | null>;
  save(p: UserPreferences): Promise<void>;
}

export const localAdapter: PreferencesAdapter = {
  async load() {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(PREFS_STORAGE_KEY) : null;
      return raw ? sanitizePreferences(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  },
  async save(p) {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(p));
    } catch {
      /* armazenamento indisponível: a preferência vale só nesta sessão */
    }
  },
};

export const apiAdapter: PreferencesAdapter = {
  async load() {
    if (!hasSession()) return null;
    try {
      return fromServer(await api.get<unknown>("/api/me/preferences"));
    } catch {
      return null;
    }
  },
  async save(p) {
    if (!hasSession()) return;
    try {
      await api.put("/api/me/preferences", toServer(p));
    } catch {
      /* offline ou API ausente (etapa b): o local já guardou; a próxima sessão sincroniza */
    }
  },
};

/**
 * Script inline do <head> (com nonce da CSP): aplica tema/densidade/fonte/movimento/idioma ANTES da primeira pintura
 * para não haver flash. Só lê a chave local e escreve atributos no <html>; nada de rede. Mantido em sincronia com o
 * PreferencesProvider (teste em PreferencesProvider.test.tsx).
 */
export const bootScript = `(function(){try{var r=localStorage.getItem(${JSON.stringify(PREFS_STORAGE_KEY)});if(!r)return;var p=JSON.parse(r);var h=document.documentElement;var t=["auto","claro","escuro","contraste","terminal"];if(t.indexOf(p.theme)>=0&&p.theme!=="auto")h.setAttribute("data-theme",p.theme);if(["compacta","normal","confortavel"].indexOf(p.density)>=0)h.setAttribute("data-density",p.density);if([90,100,112,125].indexOf(Number(p.fontScale))>=0)h.setAttribute("data-font-scale",String(p.fontScale));if(p.reduceMotion===true)h.setAttribute("data-reduce-motion","true");if(["pt-BR","en","es","qps-ploc"].indexOf(p.language)>=0)h.setAttribute("lang",p.language==="qps-ploc"?"pt-BR":p.language);}catch(e){}})();`;

/** Atributos do <html> para um conjunto de preferências (usado pelo provider e conferido contra o bootScript no teste). */
export function htmlAttributes(p: UserPreferences): Record<string, string | null> {
  return {
    "data-theme": p.theme === "auto" ? null : p.theme,
    "data-density": p.density,
    "data-font-scale": String(p.fontScale),
    "data-reduce-motion": p.reduceMotion ? "true" : null,
    lang: p.language === "qps-ploc" ? "pt-BR" : p.language,
  };
}

export { DEFAULT_PREFERENCES };
