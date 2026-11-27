/**
 * Árvores de arquivos do visualizador de card (janela "Arquivos"). Duas fontes, nunca misturadas:
 *  • Rede DECIA (nuvem) — anexos e evidências reais da API (`/api/tasks/{id}/attachments|evidences`) em pastas VIRTUAIS por tipo,
 *    evidências à parte e os vínculos externos (origem do conector, referências) por provedor. Nada é inventado: pasta vazia não aparece.
 *  • Este computador — a pasta que a pessoa escolheu pela File System Access API, lida só no navegador (nada vai ao servidor), com
 *    teto de profundidade e de itens para não travar a aba numa pasta enorme.
 * Funções puras (a leitura da pasta local recebe o handle e não pede permissão: quem pede é a tela, com gesto da pessoa).
 * Cada arquivo leva o formato FAMÍLIA → VARIANTE do catálogo de `lib/tasks/formats.ts` (pela extensão e pelo MIME).
 */
import { FORMAT_VARIANTS, type FormatFamilyId, type FormatVariantCode } from "@/lib/tasks/formats";

export interface FileFormat { family: FormatFamilyId; variant: FormatVariantCode }

/**
 * Formato de um arquivo no catálogo família → variante: pela extensão (a primeira variante que a aceita; PDF fica em DOCUMENTO/PDF) e,
 * sem extensão conhecida, pelo MIME. Desconhecido → `null` (nunca adivinhado).
 */
export function formatOfFile(name: string | undefined, mime: string | undefined): FileFormat | null {
  const ext = extensionOf(name);
  const m = (mime ?? "").toLowerCase().split(";")[0]!.trim();
  const byExt = ext ? FORMAT_VARIANTS.find((v) => v.extensions.includes(ext)) : undefined;
  const hit = byExt ?? (m ? FORMAT_VARIANTS.find((v) => v.mime.some((x) => x.toLowerCase() === m)) : undefined);
  return hit ? { family: hit.family, variant: hit.code } : null;
}

export type FileNodeKind = "folder" | "file" | "link";
export interface FileNode {
  /** id estável dentro da árvore (caminho) */
  id: string;
  kind: FileNodeKind;
  name: string;
  /** chave i18n para pastas virtuais (o nome visível vem do idioma); arquivos usam `name` como está */
  labelKey?: string;
  children?: FileNode[];
  size?: number;
  date?: string;
  mime?: string;
  /** anexo da API (abrir/baixar pelo conteúdo autenticado) */
  attachmentId?: string;
  /** link externo (https) */
  url?: string;
  /** provedor do vínculo externo */
  provider?: string;
  /** situação do antivírus quando o anexo ainda não pode ser baixado */
  unavailable?: boolean;
  evidenceCaption?: string;
  /** formato família → variante (arquivos) */
  format?: FileFormat | null;
  /** arquivo do computador (só na árvore local) */
  file?: () => Promise<File>;
}

export interface CloudAttachment {
  id?: string; fileName?: string; mimeType?: string; sizeBytes?: number; createdAt?: string; image?: boolean; available?: boolean;
  evidence?: { id?: string; caption?: string } | null;
}
export interface CloudEvidence { id?: string; attachmentId?: string; caption?: string; takenAt?: string; createdAt?: string }
export interface CloudLinks {
  /** `sourceKind` da tarefa (ex.: GOOGLE_DOCS, MS_EXCEL) */
  sourceKind?: string | null;
  /** `sourceRef` da tarefa (id ou URL no provedor) */
  sourceRef?: string | null;
  linkMode?: string | null;
  references?: readonly { label?: string; url?: string }[];
}

/** Categoria de um arquivo pelo MIME e pela extensão (a extensão sozinha nunca decide renderização: só agrupa). */
export type FileCategory = "IMAGEM" | "PAGINA_WEB" | "PLANILHA" | "DOCUMENTO" | "DESENHO" | "OUTROS";
export const FILE_CATEGORIES: readonly FileCategory[] = ["IMAGEM", "PAGINA_WEB", "PLANILHA", "DOCUMENTO", "DESENHO", "OUTROS"];

export const extensionOf = (name: string | undefined) => {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(name ?? "");
  return m ? m[1]!.toLowerCase() : "";
};

export function categoryOf(name: string | undefined, mime: string | undefined): FileCategory {
  const ext = extensionOf(name);
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return "IMAGEM";
  if (m === "text/html" || ["html", "htm"].includes(ext)) return "PAGINA_WEB";
  if (m.includes("spreadsheet") || m.includes("excel") || m === "text/csv" || ["xlsx", "xlsm", "xls", "csv", "ods"].includes(ext)) return "PLANILHA";
  if (["dwg", "dxf", "ifc", "skp"].includes(ext)) return "DESENHO";
  if (m === "application/pdf" || m.includes("word") || m.startsWith("text/") || ["pdf", "doc", "docx", "odt", "txt", "md", "rtf", "pptx", "ppt"].includes(ext)) return "DOCUMENTO";
  return "OUTROS";
}

/** Provedor de um `sourceKind` do conector (GOOGLE_*, MS_*, APPLE_*) ou do domínio de um link. */
export function providerOf(sourceKind?: string | null, url?: string | null): string {
  const k = (sourceKind ?? "").toUpperCase();
  if (k.startsWith("GOOGLE")) return "GOOGLE";
  if (k.startsWith("MS_") || k === "MICROSOFT") return "MICROSOFT";
  if (k.startsWith("APPLE")) return "APPLE_ICLOUD";
  try {
    const host = url ? new URL(url).hostname.toLowerCase() : "";
    if (/(^|\.)google\.com$|(^|\.)googleusercontent\.com$/.test(host)) return "GOOGLE";
    if (/(^|\.)(sharepoint|office|live|microsoft|onedrive)\.com$|(^|\.)1drv\.ms$/.test(host)) return "MICROSOFT";
    if (/(^|\.)icloud\.com$/.test(host)) return "APPLE_ICLOUD";
  } catch {
    /* URL inválida: link comum */
  }
  return "WEB";
}

export const isHttpsUrl = (u: string | null | undefined): u is string => {
  if (!u) return false;
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
};

const byName = (a: FileNode, b: FileNode) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "folder" ? -1 : b.kind === "folder" ? 1 : a.name.localeCompare(b.name));

/** Árvore "Rede DECIA (nuvem)" da tarefa: Anexos/<categoria>, Evidências e Vínculos externos/<provedor>. */
export function buildCloudTree(attachments: readonly CloudAttachment[], evidences: readonly CloudEvidence[], links: CloudLinks = {}): FileNode[] {
  const roots: FileNode[] = [];
  const evidenceIds = new Set(evidences.map((e) => e.attachmentId).filter(Boolean));
  const byCat = new Map<FileCategory, FileNode[]>();
  const evidenceFiles: FileNode[] = [];
  for (const a of attachments) {
    if (!a.id) continue;
    const node: FileNode = {
      id: `nuvem/anexo/${a.id}`, kind: "file", name: a.fileName || a.id, size: a.sizeBytes, date: a.createdAt, mime: a.mimeType,
      attachmentId: a.id, unavailable: a.available === false, format: formatOfFile(a.fileName, a.mimeType),
    };
    const ev = evidences.find((e) => e.attachmentId === a.id);
    if (ev || a.evidence || evidenceIds.has(a.id)) {
      evidenceFiles.push({ ...node, id: `nuvem/evidencia/${a.id}`, evidenceCaption: ev?.caption ?? a.evidence?.caption ?? undefined, date: ev?.takenAt ?? node.date });
      continue;
    }
    const cat = categoryOf(a.fileName, a.mimeType);
    byCat.set(cat, [...(byCat.get(cat) ?? []), node]);
  }
  const cats = FILE_CATEGORIES.filter((c) => byCat.has(c)).map<FileNode>((c) => ({
    id: `nuvem/anexos/${c}`, kind: "folder", name: c, labelKey: `cardviewer.files.cat.${c}`, children: byCat.get(c)!.sort(byName),
  }));
  if (cats.length) roots.push({ id: "nuvem/anexos", kind: "folder", name: "anexos", labelKey: "cardviewer.files.attachments", children: cats });
  if (evidenceFiles.length) roots.push({ id: "nuvem/evidencias", kind: "folder", name: "evidencias", labelKey: "cardviewer.files.evidences", children: evidenceFiles.sort(byName) });

  const byProvider = new Map<string, FileNode[]>();
  const pushLink = (n: FileNode) => byProvider.set(n.provider!, [...(byProvider.get(n.provider!) ?? []), n]);
  if (links.sourceKind && !["MANUAL", "ARQUIVO", "COLAR"].includes(links.sourceKind.toUpperCase()) && (links.sourceRef || isHttpsUrl(links.sourceRef))) {
    const url = isHttpsUrl(links.sourceRef) ? links.sourceRef : undefined;
    pushLink({ id: `nuvem/origem/${links.sourceKind}`, kind: "link", name: links.sourceRef ?? links.sourceKind, url, provider: providerOf(links.sourceKind, url), mime: links.linkMode ?? undefined });
  }
  (links.references ?? []).forEach((r, i) => {
    if (!isHttpsUrl(r.url)) return;
    pushLink({ id: `nuvem/ref/${i}`, kind: "link", name: r.label?.trim() || r.url, url: r.url, provider: providerOf(null, r.url) });
  });
  if (byProvider.size) {
    roots.push({
      id: "nuvem/vinculos", kind: "folder", name: "vinculos", labelKey: "cardviewer.files.links",
      children: [...byProvider.keys()].sort().map((p) => ({ id: `nuvem/vinculos/${p}`, kind: "folder", name: p, labelKey: `cardviewer.files.provider.${p}`, children: byProvider.get(p)! })),
    });
  }
  return roots;
}

/** Totais de uma subárvore: arquivos/links e bytes. */
export function treeTotals(nodes: readonly FileNode[]): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  const walk = (list: readonly FileNode[]) => {
    for (const n of list) {
      if (n.kind === "folder") walk(n.children ?? []);
      else {
        files += 1;
        bytes += n.size ?? 0;
      }
    }
  };
  walk(nodes);
  return { files, bytes };
}

/** Achata a árvore na ordem de leitura (para teclado e testes), com a profundidade. */
export function flattenTree(nodes: readonly FileNode[], open: ReadonlySet<string> | "all" = "all", depth = 0): { node: FileNode; depth: number }[] {
  const out: { node: FileNode; depth: number }[] = [];
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.kind === "folder" && (open === "all" || open.has(n.id))) out.push(...flattenTree(n.children ?? [], open, depth + 1));
  }
  return out;
}

/* ── Este computador (File System Access API) ───────────────────────────────────────────────────────────────── */

/** O mínimo da File System Access API que a leitura usa (permite simular nos testes). */
export interface LocalFileHandle { kind: "file"; name: string; getFile(): Promise<File> }
export interface LocalDirHandle { kind: "directory"; name: string; values(): AsyncIterable<LocalFileHandle | LocalDirHandle> }

export const LOCAL_LIMITS = { maxDepth: 4, maxEntries: 400 } as const;

/** Pastas e arquivos ocultos ou de sistema que não entram na lista. */
const SKIP = /^(\.|~\$|Thumbs\.db$|desktop\.ini$|node_modules$)/i;

/**
 * Lê a árvore de uma pasta escolhida pela pessoa (sem enviar nada): pastas primeiro, por nome; para no teto de itens e marca
 * `truncated`. O tamanho e a data de cada arquivo vêm do `getFile()` (só metadados; o conteúdo não é lido).
 */
export async function readLocalTree(dir: LocalDirHandle, limits: { maxDepth: number; maxEntries: number } = LOCAL_LIMITS): Promise<{ nodes: FileNode[]; truncated: boolean; count: number }> {
  let count = 0;
  let truncated = false;
  const walk = async (d: LocalDirHandle, path: string, depth: number): Promise<FileNode[]> => {
    const out: FileNode[] = [];
    for await (const h of d.values()) {
      if (SKIP.test(h.name)) continue;
      if (count >= limits.maxEntries) {
        truncated = true;
        break;
      }
      count += 1;
      const id = `local/${path}${h.name}`;
      if (h.kind === "directory") {
        const children = depth + 1 < limits.maxDepth ? await walk(h, `${path}${h.name}/`, depth + 1) : [];
        if (depth + 1 >= limits.maxDepth) truncated = true;
        out.push({ id, kind: "folder", name: h.name, children });
      } else {
        let size: number | undefined;
        let date: string | undefined;
        let mime: string | undefined;
        try {
          const f = await h.getFile();
          size = f.size;
          date = f.lastModified ? new Date(f.lastModified).toISOString() : undefined;
          mime = f.type || undefined;
        } catch {
          /* arquivo sumiu ou bloqueado: lista sem metadados */
        }
        out.push({ id, kind: "file", name: h.name, size, date, mime, format: formatOfFile(h.name, mime), file: () => h.getFile() });
      }
    }
    return out.sort(byName);
  };
  const nodes = await walk(dir, "", 0);
  return { nodes, truncated, count };
}
