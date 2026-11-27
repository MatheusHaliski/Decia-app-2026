/**
 * Tipos de arquivo que o servidor ACEITA no envio de anexos e evidências — espelho de `DetectedType` do backend
 * (`ws-application/.../application/media/DetectedType.java`, D-67: o tipo real é decidido pelo conteúdo, nunca pela extensão).
 * Um lugar só: quando o backend ganhar um tipo, acrescente a linha aqui (o teste `accepted.test.ts` compara com o enum Java) e o
 * criador, a seção de anexos, o `accept` dos inputs, o catálogo de formatos (`formats.ts`, campo `detected`) e as mensagens
 * "não será aceito; envie …" passam a valer na hora.
 *
 * O navegador só usa a extensão e o MIME declarados para ORIENTAR (accept, aviso antes de salvar); quem decide é o servidor.
 */

export interface AcceptedType {
  /** código do `DetectedType` */
  code: string;
  /** MIME canônico */
  mime: string;
  /** extensões aceitas no nome (a primeira é a canônica) */
  extensions: readonly string[];
  image: boolean;
}

const T = (code: string, mime: string, extensions: readonly string[], image = false): AcceptedType => ({ code, mime, extensions, image });

/** Os tipos aceitos hoje, na ordem do enum do backend. */
export const ACCEPTED_TYPES: readonly AcceptedType[] = [
  T("PNG", "image/png", ["png"], true),
  T("JPEG", "image/jpeg", ["jpg", "jpeg", "jpe"], true),
  T("GIF", "image/gif", ["gif"], true),
  T("WEBP", "image/webp", ["webp"], true),
  T("PDF", "application/pdf", ["pdf"]),
  T("DOCX", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ["docx"]),
  T("XLSX", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ["xlsx"]),
  T("PPTX", "application/vnd.openxmlformats-officedocument.presentationml.presentation", ["pptx"]),
  T("ZIP", "application/zip", ["zip"]),
  T("DWG", "image/vnd.dwg", ["dwg"]),
  T("DXF", "image/vnd.dxf", ["dxf"]),
  T("IFC", "application/x-step", ["ifc"]),
  T("GLB", "model/gltf-binary", ["glb"]),
  T("ODT", "application/vnd.oasis.opendocument.text", ["odt"]),
  T("ODS", "application/vnd.oasis.opendocument.spreadsheet", ["ods"]),
  T("ODP", "application/vnd.oasis.opendocument.presentation", ["odp"]),
  T("TXT", "text/plain", ["txt", "text", "log"]),
  T("CSV", "text/csv", ["csv"]),
  T("TSV", "text/tab-separated-values", ["tsv", "tab"]),
  T("MD", "text/markdown", ["md", "markdown"]),
  T("JSON", "application/json", ["json"]),
  T("XML", "application/xml", ["xml"]),
];

export const extensionOfName = (name: string | null | undefined): string => {
  const m = /\.([a-z0-9]{1,8})$/i.exec((name ?? "").trim());
  return m ? m[1]!.toLowerCase() : "";
};

/** A extensão é de um tipo aceito? */
export const isAcceptedExtension = (ext: string | null | undefined): boolean =>
  !!ext && ACCEPTED_TYPES.some((x) => x.extensions.includes(ext.toLowerCase()));

/**
 * O arquivo tem cara de tipo aceito? Pela extensão; sem extensão, pelo MIME declarado. Só orientação: o servidor ainda confere o
 * conteúdo (um .pdf que não é PDF é recusado lá).
 */
export function isAcceptedFile(name: string | null | undefined, mime?: string | null): boolean {
  const ext = extensionOfName(name);
  if (ext) return isAcceptedExtension(ext);
  const m = (mime ?? "").toLowerCase().split(";")[0]!.trim();
  return !!m && ACCEPTED_TYPES.some((x) => x.mime === m);
}

/** Valor do atributo `accept` do `<input type="file">`: extensões e MIMEs aceitos. `imagesOnly` para a câmera do celular. */
export function acceptAttribute(imagesOnly = false): string {
  const list = ACCEPTED_TYPES.filter((x) => !imagesOnly || x.image);
  return [...list.flatMap((x) => x.extensions.map((e) => `.${e}`)), ...list.map((x) => x.mime)].join(",");
}

/** Nomes curtos dos tipos aceitos, para a mensagem ("PNG, JPEG, GIF, …"). */
export const acceptedLabels = (): string[] => ACCEPTED_TYPES.map((x) => x.code);
