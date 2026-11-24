/**
 * Matriz de formatos do Letters (RF52.CA05; RF70 matriz de leitura/escrita): só o que está HABILITADO aparece como
 * operação na tela, e cada formato habilitado aponta o teste de ida e volta que o sustenta. PDF sai pela versão
 * para impressão do navegador ("Salvar como PDF"); importar PDF, ODT, RTF e .doc fica pendente e não aparece.
 */
import type { ExportFormat, ImportFormat } from "./model";

export type CapabilityStatus = "HABILITADO" | "VIA_IMPRESSAO" | "PENDENTE";

export interface FormatCapability {
  id: ImportFormat | ExportFormat | "pdf" | "odt" | "rtf" | "doc";
  read: CapabilityStatus;
  write: CapabilityStatus;
  /** teste que prova a ida e volta (RF72: CA → teste → evidência) */
  roundTripTest?: string;
}

export const LETTERS_FORMATS: readonly FormatCapability[] = [
  { id: "md", read: "HABILITADO", write: "HABILITADO", roundTripTest: "lib/letters/io/roundtrip.test.ts › Markdown" },
  { id: "txt", read: "HABILITADO", write: "HABILITADO", roundTripTest: "lib/letters/io/roundtrip.test.ts › texto" },
  { id: "html", read: "HABILITADO", write: "HABILITADO", roundTripTest: "lib/letters/io/roundtrip.test.ts › HTML" },
  { id: "docx", read: "HABILITADO", write: "HABILITADO", roundTripTest: "lib/letters/io/docx.test.ts › ida e volta" },
  { id: "pdf", read: "PENDENTE", write: "VIA_IMPRESSAO" },
  { id: "odt", read: "PENDENTE", write: "PENDENTE" },
  { id: "rtf", read: "PENDENTE", write: "PENDENTE" },
  { id: "doc", read: "PENDENTE", write: "PENDENTE" },
];

export const enabledImports = () => LETTERS_FORMATS.filter((f) => f.read === "HABILITADO").map((f) => f.id as ImportFormat);
export const enabledExports = () => LETTERS_FORMATS.filter((f) => f.write === "HABILITADO").map((f) => f.id as ExportFormat);
