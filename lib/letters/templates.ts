/**
 * Modelos de peça do Letters: relatório técnico, parecer, ofício/memorando e ADR. Os títulos de seção são conteúdo do
 * documento (em português, idioma analisado pelo copiloto); as dicas dos blocos vazios vêm do i18n (`hintKey`).
 */
import type { DocType, LetterBlock } from "./types";

export const TEMPLATE_TYPES = ["RELATORIO_TECNICO", "PARECER", "OFICIO", "ADR"] as const satisfies readonly DocType[];
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

type B = Omit<LetterBlock, "id">;
const h1 = (text: string): B => ({ kind: "TITULO", level: 1, text });
const h2 = (text: string): B => ({ kind: "TITULO", level: 2, text });
const p = (hint: string): B => ({ kind: "PARAGRAFO", text: "", hintKey: `letters.hint.${hint}` });

export function templateBlocks(type: TemplateType): B[] {
  switch (type) {
    case "RELATORIO_TECNICO":
      return [
        h1("Relatório técnico"),
        h2("1 Introdução"), p("introducao"),
        h2("2 Objetivo"), p("objetivo"),
        h2("3 Metodologia"), p("metodologia"),
        h2("4 Resultados"), p("resultados"),
        h2("5 Conclusão"), p("conclusao"),
        h2("Referências"), { kind: "REFERENCIAS", text: "", hintKey: "letters.hint.referencias" },
      ];
    case "PARECER":
      return [
        h1("Parecer nº"), p("ementa"),
        h2("1 Relatório"), p("relatorio"),
        h2("2 Análise"), p("analise"),
        h2("3 Conclusão"), p("conclusaoParecer"),
        p("assinatura"),
      ];
    case "OFICIO":
      return [p("identificacao"), p("data"), p("destinatario"), p("assunto"), p("vocativo"), p("corpo"), p("fecho"), p("assinatura")];
    case "ADR":
      return [
        h1("ADR 001:"),
        h2("Status"), p("status"),
        h2("Contexto"), p("contexto"),
        h2("Decisão"), p("decisao"),
        h2("Consequências"), p("consequencias"),
        h2("Alternativas consideradas"), { kind: "LISTA", text: "", hintKey: "letters.hint.alternativas" },
      ];
  }
}

/** Título de seção para inserir quando falta (achado SECAO_AUSENTE). */
export const SECTION_HEADINGS: Readonly<Record<string, string>> = {
  introducao: "Introdução",
  objetivo: "Objetivo",
  metodologia: "Metodologia",
  resultados: "Resultados",
  conclusao: "Conclusão",
  referencias: "Referências",
  relatorio: "Relatório",
  analise: "Análise",
  status: "Status",
  contexto: "Contexto",
  decisao: "Decisão",
  consequencias: "Consequências",
};
