/**
 * Tipo de arquivo → ícone (função pura): extensão, MIME, endereço ou tipo de tarefa do Acervo viram uma família (`FileKind`) com a
 * sigla desenhada no ícone e o tom da convenção de cor do tipo (PDF vermelho, texto azul, planilha verde, apresentação laranja…),
 * sempre por token do design system. A sigla está no desenho: o tipo nunca é indicado só pela cor. Nenhum logotipo de marca.
 */
import type { TaskTypeName } from "@/lib/tasks/client";

export const FILE_KINDS = [
  "pdf", "doc", "sheet", "slides", "csv", "text", "html", "odt", "ods", "odp", "image", "archive", "cad", "ifc", "model3d", "audio",
  "video", "link", "folder", "email", "code", "generic",
] as const;
export type FileKind = (typeof FILE_KINDS)[number];

/** Tom do ícone: nó de cor do DS (a faixa usa a cor cheia; a sigla, a versão `-ink`, com contraste garantido sobre a superfície). */
export type FileTone = "red" | "blue" | "green" | "orange" | "yellow" | "brown" | "spark" | "info" | "accent" | "neutral";

export const KIND_TONE: Record<FileKind, FileTone> = {
  pdf: "red", doc: "blue", odt: "blue", text: "neutral", sheet: "green", ods: "green", csv: "green", slides: "orange", odp: "orange",
  html: "info", image: "info", archive: "yellow", folder: "yellow", cad: "brown", ifc: "brown", model3d: "brown", audio: "spark",
  video: "spark", link: "accent", email: "blue", code: "neutral", generic: "neutral",
};

/** Sigla padrão de cada família (quando a extensão não diz mais). */
export const KIND_ABBR: Record<FileKind, string> = {
  pdf: "PDF", doc: "DOC", sheet: "XLS", slides: "PPT", csv: "CSV", text: "TXT", html: "HTML", odt: "ODT", ods: "ODS", odp: "ODP",
  image: "IMG", archive: "ZIP", cad: "DWG", ifc: "IFC", model3d: "GLB", audio: "MP3", video: "MP4", link: "URL", folder: "", email: "EML",
  code: "</>", generic: "",
};

const BY_EXTENSION: Record<string, FileKind> = {
  pdf: "pdf",
  doc: "doc", docx: "doc", dot: "doc", dotx: "doc", rtf: "doc", pages: "doc",
  xls: "sheet", xlsx: "sheet", xlsm: "sheet", xltx: "sheet", numbers: "sheet",
  ppt: "slides", pptx: "slides", pps: "slides", ppsx: "slides", potx: "slides", key: "slides",
  csv: "csv", tsv: "csv",
  txt: "text", md: "text", markdown: "text", log: "text",
  html: "html", htm: "html", xhtml: "html",
  odt: "odt", ods: "ods", odp: "odp",
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image", bmp: "image", tif: "image", tiff: "image", heic: "image", avif: "image",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive", tgz: "archive",
  dwg: "cad", dxf: "cad", dgn: "cad",
  ifc: "ifc",
  glb: "model3d", gltf: "model3d", obj: "model3d", stl: "model3d", fbx: "model3d",
  mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio", flac: "audio", aac: "audio",
  mp4: "video", mov: "video", webm: "video", mkv: "video", avi: "video",
  eml: "email", msg: "email",
  url: "link", webloc: "link",
  js: "code", ts: "code", tsx: "code", jsx: "code", java: "code", py: "code", json: "code", xml: "code", css: "code", sql: "code", sh: "code",
};

const BY_MIME: Record<string, FileKind> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "doc",
  "application/rtf": "doc",
  "application/vnd.ms-excel": "sheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "sheet",
  "application/vnd.ms-powerpoint": "slides",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "slides",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "application/vnd.oasis.opendocument.presentation": "odp",
  "text/csv": "csv",
  "text/tab-separated-values": "csv",
  "text/plain": "text",
  "text/markdown": "text",
  "text/html": "html",
  "application/zip": "archive",
  "application/x-zip-compressed": "archive",
  "application/x-7z-compressed": "archive",
  "application/gzip": "archive",
  "image/vnd.dwg": "cad",
  "image/vnd.dxf": "cad",
  "application/acad": "cad",
  "application/dxf": "cad",
  "application/x-step": "ifc",
  "model/gltf-binary": "model3d",
  "model/gltf+json": "model3d",
  "message/rfc822": "email",
  "application/vnd.ms-outlook": "email",
  "application/json": "code",
  "inode/directory": "folder",
};

/** Tipo de tarefa do Acervo → família e sigla do formato típico do tipo. */
export const TASK_TYPE_ICON: Record<TaskTypeName, { kind: FileKind; abbr?: string }> = {
  DOCUMENTO: { kind: "doc" }, TEXTO_MANUAL: { kind: "text" }, TEXTO_IA: { kind: "text", abbr: "IA" }, PLANILHA: { kind: "sheet" },
  IMAGEM_EDITADA: { kind: "image" }, IMAGEM_WEB: { kind: "image" }, DESENHO_TECNICO: { kind: "cad" }, CRONOGRAMA: { kind: "sheet", abbr: "GANT" },
  FORMULARIO: { kind: "doc", abbr: "FORM" }, ATA_REGISTRO: { kind: "doc", abbr: "ATA" }, EMAIL: { kind: "email" }, LINK: { kind: "link" },
  PASTA: { kind: "folder" }, PROTOCOLO: { kind: "pdf", abbr: "PROT" }, ESTUDO_TECNICO_PRELIMINAR: { kind: "doc", abbr: "ETP" },
  APRESENTACAO: { kind: "slides" }, DIAGRAMA: { kind: "image", abbr: "SVG" }, QUADRO_BRANCO: { kind: "image", abbr: "QB" },
  NOTA: { kind: "text", abbr: "NOTA" }, EVENTO_AGENDA: { kind: "generic", abbr: "ICS" }, LISTA_TAREFAS: { kind: "text", abbr: "LIST" },
  GRAVACAO_REUNIAO: { kind: "video" }, TRANSCRICAO: { kind: "text", abbr: "VTT" }, MENSAGEM_CHAT: { kind: "email", abbr: "MSG" },
  PAGINA_WEB: { kind: "html" }, VIDEO: { kind: "video" }, AUDIO: { kind: "audio" }, PAINEL_DADOS: { kind: "sheet", abbr: "BI" },
  CODIGO: { kind: "code" }, MAPA: { kind: "image", abbr: "GEO" }, ATIVIDADE_CURSO: { kind: "generic", abbr: "EDU" },
};

/** Extensão (sem ponto, minúscula) de um nome de arquivo ou do caminho de um endereço; vazio se não houver. */
export function extensionOf(nameOrUrl: string): string {
  let path = nameOrUrl.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      /* não é endereço válido: usa como nome */
    }
  }
  const last = path.split(/[\\/]/).pop() ?? "";
  const m = /\.([a-z0-9]{1,8})$/i.exec(last);
  return m ? m[1]!.toLowerCase() : "";
}

export interface FileIconSource {
  /** tipo de tarefa do Acervo */
  type?: TaskTypeName | "" | null;
  /** extensão ("pdf", ".docx") ou formato digitado ("DOCX", "1080×1080 PNG") */
  extension?: string | null;
  mime?: string | null;
  /** nome do arquivo (a extensão sai dele) */
  name?: string | null;
  /** endereço: com extensão conhecida no caminho vira o tipo do arquivo; sem ela, link */
  url?: string | null;
}

export interface FileIconSpec { kind: FileKind; abbr: string; tone: FileTone }

const spec = (kind: FileKind, abbr?: string): FileIconSpec => ({ kind, abbr: (abbr ?? KIND_ABBR[kind]).slice(0, 4), tone: KIND_TONE[kind] });

/** Família pela extensão; texto livre de formato ("formato DOCX", "PNG 1080×1080") também é reconhecido pela primeira sigla conhecida. */
export function kindOfExtension(ext: string | null | undefined): { kind: FileKind; ext: string } | null {
  const raw = (ext ?? "").trim().toLowerCase().replace(/^\./, "");
  if (!raw) return null;
  if (BY_EXTENSION[raw]) return { kind: BY_EXTENSION[raw]!, ext: raw };
  const fromName = extensionOf(raw);
  if (fromName && BY_EXTENSION[fromName]) return { kind: BY_EXTENSION[fromName]!, ext: fromName };
  const word = raw.split(/[^a-z0-9]+/).find((w) => BY_EXTENSION[w]);
  return word ? { kind: BY_EXTENSION[word]!, ext: word } : null;
}

export function kindOfMime(mime: string | null | undefined): FileKind | null {
  const m = (mime ?? "").trim().toLowerCase().split(";")[0]!;
  if (!m) return null;
  if (BY_MIME[m]) return BY_MIME[m]!;
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("text/")) return "text";
  return null;
}

/** Ordem de preferência: extensão/nome (mais específica) → MIME → endereço → tipo de tarefa → genérico. */
export function fileIconSpec(src: FileIconSource): FileIconSpec {
  const byExt = kindOfExtension(src.extension) ?? kindOfExtension(src.name ? extensionOf(src.name) : "");
  if (byExt) return spec(byExt.kind, byExt.ext.toUpperCase());
  const byMime = kindOfMime(src.mime);
  if (byMime) return spec(byMime);
  if (src.url && src.url.trim()) {
    const fromUrl = kindOfExtension(extensionOf(src.url));
    return fromUrl ? spec(fromUrl.kind, fromUrl.ext.toUpperCase()) : spec("link");
  }
  if (src.type) {
    const t = TASK_TYPE_ICON[src.type];
    if (t) return spec(t.kind, t.abbr);
  }
  return spec("generic");
}
