/**
 * Adaptadores de persistência das preferências (RF3.CA03): local (localStorage, com try/catch — modo privado, cota,
 * storage bloqueado) e API (`GET/PUT /api/me/preferences`, Bloco 3). O provider usa o local sempre (resposta imediata,
 * sem flash) e sincroniza com a API quando houver sessão. Mesma chave lida pelo script inline do <head> (bootScript).
 */
import { api, hasSession } from "@/lib/api/client";
import { DEFAULT_PREFERENCES, fromServer, isOccupationCode, sanitizePreferences, toServer, type UserPreferences } from "./types";

export const PREFS_STORAGE_KEY = "ws.prefs";
/**
 * Profissão preferida fora do `ws.prefs` (D-147): o `localStorage` é do navegador inteiro (e o script do <head> o lê), então a
 * profissão — dado só do dono — fica no `sessionStorage` desta aba, que some ao fechá-la. Com sessão, a fonte é a API.
 */
export const OCCUPATION_SESSION_KEY = "ws.prefs.occupation";
/**
 * Sem sessão, a pessoa pode CONSENTIR explicitamente (Configurações › Trabalho) em lembrar a profissão neste navegador: aí ela fica numa
 * chave própria do `localStorage` (nunca no `ws.prefs` que o script do <head> lê) e é apagada ao sair da conta ou ao retirar o
 * consentimento. Padrão: sem consentimento, só na aba.
 */
export const OCCUPATION_DEVICE_KEY = "ws.prefs.occupation.device";
export const OCCUPATION_CONSENT_KEY = "ws.prefs.occupation.consent";

function readSessionOccupation(): string | null {
  try {
    const v = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(OCCUPATION_SESSION_KEY) : null;
    return isOccupationCode(v) ? v : null;
  } catch {
    return null;
  }
}

/** A pessoa consentiu em lembrar a profissão neste navegador (sem sessão)? */
export function occupationDeviceConsent(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(OCCUPATION_CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

function readDeviceOccupation(): string | null {
  if (!occupationDeviceConsent()) return null;
  try {
    const v = localStorage.getItem(OCCUPATION_DEVICE_KEY);
    return isOccupationCode(v) ? v : null;
  } catch {
    return null;
  }
}

function writeDeviceOccupation(code: string | null): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (code && occupationDeviceConsent()) localStorage.setItem(OCCUPATION_DEVICE_KEY, code);
    else localStorage.removeItem(OCCUPATION_DEVICE_KEY);
  } catch {
    /* armazenamento indisponível */
  }
}

/**
 * Dá ou retira o consentimento de lembrar a profissão neste navegador. Dar grava a profissão atual na chave própria; retirar apaga a
 * chave e o consentimento (a profissão volta a valer só na aba). Devolve o estado final (falso se o navegador bloquear o armazenamento).
 */
export function setOccupationDeviceConsent(on: boolean, current: string | null): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    if (on) {
      localStorage.setItem(OCCUPATION_CONSENT_KEY, "1");
      writeDeviceOccupation(isOccupationCode(current) ? current : null);
    } else {
      localStorage.removeItem(OCCUPATION_CONSENT_KEY);
      localStorage.removeItem(OCCUPATION_DEVICE_KEY);
    }
  } catch {
    return false;
  }
  return occupationDeviceConsent();
}

function writeSessionOccupation(code: string | null): void {
  try {
    if (typeof sessionStorage === "undefined") return;
    if (code) sessionStorage.setItem(OCCUPATION_SESSION_KEY, code);
    else sessionStorage.removeItem(OCCUPATION_SESSION_KEY);
  } catch {
    /* armazenamento indisponível: vale só na memória da página */
  }
}

/**
 * Esquece a profissão guardada nesta aba e a cópia consentida do navegador (ao sair da conta: a próxima pessoa no mesmo navegador não a
 * herda). O consentimento em si fica, para valer de novo na próxima escolha.
 */
export const forgetSessionOccupation = () => {
  writeSessionOccupation(null);
  writeDeviceOccupation(null);
};

export interface PreferencesAdapter {
  load(): Promise<UserPreferences | null>;
  save(p: UserPreferences): Promise<void>;
  /**
   * Fonte do servidor: ao entrar na conta depois de a página abrir, o provider relê este adaptador e sincroniza a profissão (a do
   * servidor vence; sem profissão no servidor, a escolhida antes de entrar — no cadastro, por exemplo — sobe para a conta).
   */
  syncOnSignIn?: boolean;
}

export const localAdapter: PreferencesAdapter = {
  async load() {
    const occupation = readSessionOccupation() ?? readDeviceOccupation();
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(PREFS_STORAGE_KEY) : null;
      if (!raw) return occupation ? sanitizePreferences({ ...DEFAULT_PREFERENCES, preferredOccupation: occupation }) : null;
      // a profissão nunca é lida do armazenamento compartilhado do navegador, só da aba
      return sanitizePreferences({ ...JSON.parse(raw), preferredOccupation: occupation });
    } catch {
      return null;
    }
  },
  async save(p) {
    const code = isOccupationCode(p.preferredOccupation) ? p.preferredOccupation : null;
    writeSessionOccupation(code);
    writeDeviceOccupation(code);
    try {
      const shared: Partial<UserPreferences> = { ...p };
      delete shared.preferredOccupation;
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(shared));
    } catch {
      /* armazenamento indisponível: a preferência vale só nesta sessão */
    }
  },
};

export const apiAdapter: PreferencesAdapter = {
  syncOnSignIn: true,
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
