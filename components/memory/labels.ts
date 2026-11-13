/** Rótulos e formatações da Memória (chaves i18n montadas a partir dos enums; os valores estão no fragmento `memoriapactos`). */
import type { AccessClass, MemoryKind, MemoryOrigin } from "@/lib/memory/types";

export const kindKey = (k: MemoryKind) => `memory.kind.${k}`;
export const originKey = (o: MemoryOrigin) => `memory.origin.${o}`;
export const accessKey = (c: AccessClass) => `social.access.${c}`;

export const formatScore = (n: number, intl: string) => new Intl.NumberFormat(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
export const formatPct = (n: number, intl: string) => new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(n * 100);

/** Id do cartão do n-ésimo resultado (âncora das citações [n] da resposta). */
export const hitAnchor = (n: number) => `memoria-trecho-${n}`;
