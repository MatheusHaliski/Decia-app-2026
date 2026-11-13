/**
 * Gravação no navegador (RF37.CA01/CA05) — detecção do que este navegador permite, sem nunca mandar o áudio para fora:
 *  - `MediaRecorder` + `getUserMedia` gravam localmente (o áudio fica num Blob da aba; ouvir e descartar, nada é enviado);
 *  - a política de permissões do site pode desligar o microfone (`Permissions-Policy: microphone=()`, D-64): aí não há gravação;
 *  - transcrição ao vivo pela Web Speech API SÓ se o reconhecimento for LOCAL (`processLocally`). O reconhecimento padrão de
 *    vários navegadores envia o áudio a um serviço do fabricante — isso contraria "o áudio nunca sai do navegador", então fica
 *    desligado e a tela explica (colar ou enviar a transcrição continua disponível).
 * Funções puras sobre um "ambiente" injetado (window/document), testáveis sem navegador.
 */

export type SpeechSupport = "LOCAL" | "BAIXAVEL" | "SO_NUVEM" | "AUSENTE";

export interface SpeechResultLike { isFinal: boolean; 0: { transcript: string } }
export interface SpeechEventLike { resultIndex: number; results: ArrayLike<SpeechResultLike> }
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  onresult: ((e: SpeechEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type AvailabilityOptions = { langs: string[]; processLocally: boolean };
export interface SpeechCtorLike {
  new (): SpeechRecognitionLike;
  available?: (o: AvailabilityOptions) => Promise<string>;
  install?: (o: AvailabilityOptions) => Promise<boolean>;
  /** nome antigo da mesma API (rascunho de 2025) */
  availableOnDevice?: (lang: string) => Promise<string>;
  installOnDevice?: (lang: string) => Promise<boolean>;
}

export function speechCtor(win: unknown): SpeechCtorLike | null {
  const w = win as { SpeechRecognition?: SpeechCtorLike; webkitSpeechRecognition?: SpeechCtorLike } | null;
  return w?.SpeechRecognition ?? w?.webkitSpeechRecognition ?? null;
}

const toSupport = (status: string | undefined): SpeechSupport =>
  status === "available" ? "LOCAL" : status === "downloadable" || status === "downloading" ? "BAIXAVEL" : "SO_NUVEM";

/** Reconhecimento de fala que roda no próprio aparelho para o idioma? (sem API de disponibilidade = só nuvem). */
export async function detectSpeech(win: unknown, lang = "pt-BR"): Promise<SpeechSupport> {
  const C = speechCtor(win);
  if (!C) return "AUSENTE";
  try {
    if (typeof C.available === "function") return toSupport(await C.available({ langs: [lang], processLocally: true }));
    if (typeof C.availableOnDevice === "function") return toSupport(await C.availableOnDevice(lang));
  } catch {
    return "SO_NUVEM";
  }
  return "SO_NUVEM";
}

/** Pede ao navegador o pacote de reconhecimento local do idioma (download feito pelo próprio navegador). */
export async function installLocalSpeech(win: unknown, lang = "pt-BR"): Promise<boolean> {
  const C = speechCtor(win);
  try {
    if (C && typeof C.install === "function") return await C.install({ langs: [lang], processLocally: true });
    if (C && typeof C.installOnDevice === "function") return await C.installOnDevice(lang);
  } catch {
    return false;
  }
  return false;
}

/** A política de permissões do documento deixa usar o microfone? null = o navegador não informa (tenta-se e trata o erro). */
export function microphoneAllowedByPolicy(doc: unknown): boolean | null {
  const d = doc as { permissionsPolicy?: { allowsFeature?: (f: string) => boolean }; featurePolicy?: { allowsFeature?: (f: string) => boolean } } | null;
  const policy = d?.permissionsPolicy ?? d?.featurePolicy;
  return typeof policy?.allowsFeature === "function" ? policy.allowsFeature("microphone") : null;
}

export function recorderSupported(win: unknown): boolean {
  const w = win as { MediaRecorder?: unknown; navigator?: { mediaDevices?: { getUserMedia?: unknown } } } | null;
  return typeof w?.MediaRecorder === "function" && typeof w?.navigator?.mediaDevices?.getUserMedia === "function";
}

export type RecorderBlock = "SEM_GRAVADOR" | "POLITICA_DO_SITE" | null;
export function recorderBlock(win: unknown, doc: unknown): RecorderBlock {
  if (!recorderSupported(win)) return "SEM_GRAVADOR";
  if (microphoneAllowedByPolicy(doc) === false) return "POLITICA_DO_SITE";
  return null;
}

/** Erro do getUserMedia → motivo para a tela (sem detalhes técnicos crus). */
export function micErrorReason(name: string | undefined): "PERMISSAO_NEGADA" | "SEM_MICROFONE" | "MICROFONE_OCUPADO" | "BLOQUEADO" | "FALHOU" {
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "PERMISSAO_NEGADA";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "SEM_MICROFONE";
  if (name === "NotReadableError" || name === "AbortError") return "MICROFONE_OCUPADO";
  if (name === "SecurityError") return "BLOQUEADO";
  return "FALHOU";
}

/** "Nome: fala" — a linha que a transcrição ao vivo acrescenta à transcrição (quem fala é escolhido na tela). */
export const transcriptLine = (speaker: string, text: string) => `${speaker}: ${text.trim()}`;
