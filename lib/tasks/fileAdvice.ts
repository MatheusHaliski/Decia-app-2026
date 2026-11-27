/**
 * Orientação na ESCOLHA de arquivos (criador de tarefas e seção de anexos), antes de salvar — funções puras, a tela só traduz:
 *  • tipo que o servidor não aceita (lista única em `accepted.ts`): o arquivo não entra e a pessoa lê "não será aceito; envie …",
 *    com as alternativas aceitas da família pedida (ou a lista geral);
 *  • formato diferente do pedido na tarefa (`matchesFormat` do catálogo): o arquivo entra, com o aviso "Você pediu Desenho técnico
 *    (DWG/DXF/IFC/GLB/PDF) e anexou TXT".
 */
import { ACCEPTED_TYPES, extensionOfName, isAcceptedExtension, isAcceptedFile } from "./accepted";
import { attachmentFormat, matchesFormat, variantOf, variantsOf, type FormatChoice, type FormatFamilyId } from "./formats";

export interface PickedFile { name: string; type?: string; size?: number }

export interface FileAdvice {
  name: string;
  /** o servidor recusa o tipo: não deve ser enviado */
  notAccepted: boolean;
  /** rótulo curto do que foi anexado (variante do catálogo, ou a extensão em maiúsculas) */
  got: string;
  /** formato diferente do pedido (só quando há formato pedido e o arquivo é reconhecido) */
  mismatch: boolean;
}

/** Siglas das variantes de uma família, sem repetir (PDF aparece uma vez) e sem PDF/A (é PDF no arquivo). */
export function familyCodes(family: FormatFamilyId): string[] {
  return [...new Set(variantsOf(family).filter((v) => v.code !== "PDF_A" && v.family !== "LINK").map((v) => v.code))];
}

/** "DWG/DXF/IFC/GLB/PDF" do formato pedido (variante escolhida: só ela). */
export function askedCodes(asked: FormatChoice): string {
  if (!asked.family) return "";
  const v = variantOf(asked.family, asked.variant);
  return v ? (v.code === "PDF_A" ? "PDF/A" : v.code) : familyCodes(asked.family).join("/");
}

/** O que foi anexado, em poucas letras: a variante estimada do catálogo ("TXT") ou a extensão ("EXE"); sem nada, "?". */
export function gotLabel(f: PickedFile): string {
  const fmt = attachmentFormat({ fileName: f.name, mimeType: f.type ?? "" });
  if (fmt?.format.variant) return fmt.format.variant;
  const ext = extensionOfName(f.name);
  return ext ? ext.toUpperCase() : "?";
}

/**
 * Alternativas aceitas para a mensagem "envie em …": as variantes aceitas da família pedida; sem formato pedido (ou família sem
 * variante aceita), os tipos aceitos em geral.
 */
export function acceptedAlternatives(asked?: FormatChoice | null): string[] {
  if (asked?.family) {
    const fam = [...new Set(variantsOf(asked.family).filter((v) => v.extensions.some(isAcceptedExtension) && v.code !== "PDF_A").map((v) => v.code))];
    if (fam.length) return fam;
  }
  return [...new Set(ACCEPTED_TYPES.map((x) => (x.code === "JPEG" ? "JPG" : x.code)))];
}

export function adviseFile(f: PickedFile, asked?: FormatChoice | null): FileAdvice {
  const notAccepted = !isAcceptedFile(f.name, f.type);
  const mismatch = !!asked?.family && matchesFormat(asked, { fileName: f.name, mimeType: f.type ?? "" }) === false;
  return { name: f.name, notAccepted, got: gotLabel(f), mismatch };
}

/** Separa a escolha: os que podem ir (com o aviso de formato, se houver) e os recusados pelo tipo. */
export function splitPicked<T extends PickedFile>(files: readonly T[], asked?: FormatChoice | null): { ok: T[]; refused: T[] } {
  const ok: T[] = [];
  const refused: T[] = [];
  for (const f of files) (adviseFile(f, asked).notAccepted ? refused : ok).push(f);
  return { ok, refused };
}
