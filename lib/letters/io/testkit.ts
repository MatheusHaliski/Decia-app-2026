/** Apoio dos testes de importação/exportação: peça de exemplo com todos os tipos de bloco e rótulos fixos. */
import { createPiece, type LetterPiece } from "../pieces";
import type { ExportLabels } from "./export";

export const TEST_LABELS: ExportLabels = {
  docType: "Tipo",
  docTypeValue: "Relatório técnico",
  genre: "Gênero",
  genreValue: "Técnico",
  language: "Idioma",
  languageValue: "Português (Brasil)",
  revision: "Revisão",
  updated: "Atualizado em",
  updatedValue: "13/11/2026",
  references: "Referências",
};

export function samplePiece(now = new Date("2026-11-13T12:00:00Z")): LetterPiece {
  return createPiece({
    id: "amostra",
    title: "Relatório — Ensaio de ida & volta <v2>",
    docType: "RELATORIO_TECNICO",
    ownerId: "u-teste",
    now,
    mode: "SOB_SOLICITACAO",
    blocks: [
      { kind: "TITULO", level: 1, text: "Relatório técnico" },
      { kind: "TITULO", level: 2, text: "1 Introdução" },
      { kind: "PARAGRAFO", text: "Texto com *asteriscos*, _sublinhados_, `crases`, [colchetes] e <tags> que não são marcação." },
      { kind: "PARAGRAFO", text: "Primeira linha do parágrafo\nsegunda linha do mesmo parágrafo." },
      { kind: "PARAGRAFO", text: "" , hintKey: "letters.hint.objetivo" },
      { kind: "TITULO", level: 3, text: "1.1 Escopo & limites" },
      { kind: "LISTA", text: "primeiro item\nsegundo item com 50% de \"aspas\"\n# não é título" },
      { kind: "CITACAO", text: "A rastreabilidade dos documentos é condição para a transparência (SILVA, 2020, p. 12)." },
      { kind: "PARAGRAFO", text: "2026. Ano que começa com número e ponto." },
      { kind: "TITULO", level: 2, text: "Referências" },
      { kind: "REFERENCIAS", text: "SILVA, João. Gestão documental. São Paulo: Atlas, 2020.\nSOUZA, Maria. Tempo de tramitação. Revista X, v. 5, p. 30-52, 2021." },
    ],
  });
}

/** O que deve sobreviver à ida e volta: tipo, nível e texto dos blocos não vazios. */
export const shape = (blocks: readonly { kind: string; level?: number; text: string }[]) =>
  blocks.filter((b) => b.text.trim()).map((b) => ({ kind: b.kind, ...(b.kind === "TITULO" ? { level: b.level ?? 2 } : {}), text: b.text }));

