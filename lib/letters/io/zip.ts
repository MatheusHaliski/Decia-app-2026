/**
 * ZIP mínimo, no navegador e sem biblioteca: leitura pelo diretório central com `DecompressionStream("deflate-raw")` e
 * escrita com `CompressionStream("deflate-raw")` (ou armazenado, sem compressão, quando a plataforma não oferece).
 * Defesas (RF52.CA07, RF70.CA05): ZIP64, criptografia e métodos fora de 0/8 são recusados; tamanho declarado, razão de
 * compressão e tamanho real descomprimido têm teto (bomba de descompressão); o CRC-32 de cada entrada lida é conferido.
 */

export type ZipErrorCode = "ZIP_INVALIDO" | "ZIP_CRIPTOGRAFADO" | "ZIP64_NAO_SUPORTADO" | "ZIP_METODO" | "ZIP_GRANDE_DEMAIS" | "ZIP_CORROMPIDO";

export class ZipError extends Error {
  constructor(readonly code: ZipErrorCode, detail = "") {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "ZipError";
  }
}

export const ZIP_LIMITS = {
  maxEntries: 2_000,
  /** soma dos tamanhos descomprimidos declarados */
  maxTotalUncompressed: 64 * 1024 * 1024,
  /** uma entrada lida (document.xml, styles.xml…) */
  maxEntryUncompressed: 24 * 1024 * 1024,
  /** razão descomprimido/comprimido acima disso, em entrada de mais de 1 MB, é tratada como bomba */
  maxRatio: 200,
} as const;

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  crc32: number;
  /** início dos dados comprimidos */
  dataOffset: number;
}

export interface ZipArchive {
  entries: ReadonlyMap<string, ZipEntry>;
  /** bytes descomprimidos da entrada (com CRC conferido); `undefined` se não existe */
  read(name: string): Promise<Uint8Array | undefined>;
  readText(name: string): Promise<string | undefined>;
}

/* ── CRC-32 ───────────────────────────────────────────────────────────────────────────────────────────── */

let CRC_TABLE: Uint32Array | null = null;
export function crc32(data: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/* ── Streams ──────────────────────────────────────────────────────────────────────────────────────────── */

async function pump(data: Uint8Array, stream: TransformStream<Uint8Array, Uint8Array>, max: number): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(data);
      c.close();
    },
  });
  const reader = source.pipeThrough(stream).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      throw new ZipError("ZIP_GRANDE_DEMAIS", "descomprimido acima do teto");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

export const canInflate = () => typeof DecompressionStream !== "undefined";

async function inflateRaw(data: Uint8Array, max: number): Promise<Uint8Array> {
  if (!canInflate()) throw new ZipError("ZIP_METODO", "DecompressionStream indisponível");
  try {
    return await pump(data, new DecompressionStream("deflate-raw") as unknown as TransformStream<Uint8Array, Uint8Array>, max);
  } catch (e) {
    if (e instanceof ZipError) throw e;
    throw new ZipError("ZIP_CORROMPIDO", "fluxo deflate inválido");
  }
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  return pump(data, new CompressionStream("deflate-raw") as unknown as TransformStream<Uint8Array, Uint8Array>, Number.MAX_SAFE_INTEGER);
}

/* ── Leitura ──────────────────────────────────────────────────────────────────────────────────────────── */

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;

export const looksLikeZip = (b: Uint8Array) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;

export function openZip(bytes: Uint8Array): ZipArchive {
  if (bytes.length < 22 || !looksLikeZip(bytes)) throw new ZipError("ZIP_INVALIDO", "assinatura ausente");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // fim do diretório central: varre de trás para frente (comentário de até 64 KB)
  let eocd = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 22 - 0xffff); p--) {
    if (view.getUint32(p, true) === SIG_EOCD) {
      eocd = p;
      break;
    }
  }
  if (eocd < 0) throw new ZipError("ZIP_INVALIDO", "fim do diretório central ausente");
  const count = view.getUint16(eocd + 10, true);
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  if (count === 0xffff || cdOffset === 0xffffffff || cdSize === 0xffffffff) throw new ZipError("ZIP64_NAO_SUPORTADO");
  if (count > ZIP_LIMITS.maxEntries) throw new ZipError("ZIP_GRANDE_DEMAIS", "entradas demais");
  if (cdOffset + cdSize > eocd) throw new ZipError("ZIP_INVALIDO", "diretório central fora do arquivo");

  const entries = new Map<string, ZipEntry>();
  const decoder = new TextDecoder("utf-8");
  let total = 0;
  let p = cdOffset;
  for (let k = 0; k < count; k++) {
    if (p + 46 > bytes.length || view.getUint32(p, true) !== SIG_CENTRAL) throw new ZipError("ZIP_INVALIDO", "entrada do diretório central");
    const flags = view.getUint16(p + 8, true);
    const method = view.getUint16(p + 10, true);
    const crc = view.getUint32(p + 16, true);
    const compressedSize = view.getUint32(p + 20, true);
    const uncompressedSize = view.getUint32(p + 24, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (flags & 1) throw new ZipError("ZIP_CRIPTOGRAFADO");
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) throw new ZipError("ZIP64_NAO_SUPORTADO");
    total += uncompressedSize;
    if (total > ZIP_LIMITS.maxTotalUncompressed) throw new ZipError("ZIP_GRANDE_DEMAIS", "conteúdo descomprimido declarado");
    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== SIG_LOCAL) throw new ZipError("ZIP_INVALIDO", "cabeçalho local");
    const dataOffset = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    if (dataOffset + compressedSize > bytes.length) throw new ZipError("ZIP_INVALIDO", "dados fora do arquivo");
    entries.set(name, { name, method, compressedSize, uncompressedSize, crc32: crc, dataOffset });
  }

  const read = async (name: string) => {
    const e = entries.get(name);
    if (!e) return undefined;
    if (e.uncompressedSize > ZIP_LIMITS.maxEntryUncompressed) throw new ZipError("ZIP_GRANDE_DEMAIS", name);
    if (e.uncompressedSize > 1024 * 1024 && e.uncompressedSize > e.compressedSize * ZIP_LIMITS.maxRatio) throw new ZipError("ZIP_GRANDE_DEMAIS", `razão de compressão em ${name}`);
    const raw = bytes.subarray(e.dataOffset, e.dataOffset + e.compressedSize);
    let out: Uint8Array;
    if (e.method === 0) out = raw.slice();
    else if (e.method === 8) out = await inflateRaw(raw, e.uncompressedSize);
    else throw new ZipError("ZIP_METODO", `método ${e.method}`);
    if (out.length !== e.uncompressedSize || crc32(out) !== e.crc32) throw new ZipError("ZIP_CORROMPIDO", name);
    return out;
  };
  return {
    entries,
    read,
    async readText(name) {
      const b = await read(name);
      return b ? new TextDecoder("utf-8").decode(b) : undefined;
    },
  };
}

/* ── Escrita ──────────────────────────────────────────────────────────────────────────────────────────── */

export interface ZipInputFile {
  name: string;
  data: Uint8Array | string;
}

function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/** Monta um ZIP (deflate quando a plataforma comprime, senão armazenado). Nomes em UTF-8 (bit 11). */
export async function writeZip(files: readonly ZipInputFile[], when = new Date(), opts: { compress?: boolean } = {}): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const { time, date } = dosDateTime(when);
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const deflated = opts.compress === false ? null : await deflateRaw(data);
    const useDeflate = !!deflated && deflated.length < data.length;
    const body = useDeflate ? deflated! : data;
    const method = useDeflate ? 8 : 0;

    const lh = new Uint8Array(30 + name.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, SIG_LOCAL, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, method, true);
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, body.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    lh.set(name, 30);
    locals.push(lh, body);

    const ch = new Uint8Array(46 + name.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, SIG_CENTRAL, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, method, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, body.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    ch.set(name, 46);
    centrals.push(ch);
    offset += lh.length + body.length;
  }
  const cdSize = centrals.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, SIG_EOCD, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  const parts = [...locals, ...centrals, eocd];
  const out = new Uint8Array(parts.reduce((s, c) => s + c.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
