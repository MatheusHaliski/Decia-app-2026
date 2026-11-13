/**
 * Memória Institucional (RF33) — pequeno dicionário de sinônimos do serviço público, aplicado só na PERGUNTA (o texto do
 * documento nunca muda, para a citação continuar exata). Cada grupo reúne expressões que, numa busca institucional, pedem os
 * mesmos documentos ("ofício" ≈ "expediente", "portaria" ≈ "ato normativo"). A expansão pesa menos que o termo literal
 * (`SYNONYM_WEIGHT`) e aparece na explicação de cada resultado ("sinônimo: ofício ≈ expediente").
 */
import { contentTerms } from "./text";

export const SYNONYM_WEIGHT = 0.6;

/** Grupos de expressões equivalentes (texto livre, com acento; a comparação usa a forma normalizada e radicalizada). */
export const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ["ofício", "expediente", "memorando", "correspondência oficial"],
  ["portaria", "ato normativo"],
  ["instrução normativa", "norma interna", "regulamento"],
  ["convênio", "transferência voluntária", "termo de cooperação"],
  ["licitação", "certame", "processo licitatório"],
  ["ata", "registro de reunião", "memória de reunião"],
  ["servidor", "funcionário", "agente público"],
  ["orçamento", "dotação"],
  ["calçada", "passeio público"],
  ["pavimentação", "asfalto", "recapeamento"],
  ["teletrabalho", "trabalho remoto", "home office"],
  ["protocolo", "processo administrativo"],
  ["prazo", "data limite"],
  ["LGPD", "proteção de dados pessoais"],
  ["aditivo", "aditamento"],
  ["parecer", "nota técnica"],
  ["nuvem", "cloud"],
];

export interface SynonymPhrase {
  /** expressão como escrita no dicionário */
  label: string;
  /** radicais de conteúdo, em ordem */
  stems: readonly string[];
}

/** Dicionário compilado: cada grupo vira lista de frases radicalizadas (sem palavras vazias). */
export const COMPILED_SYNONYMS: readonly (readonly SynonymPhrase[])[] = SYNONYM_GROUPS.map((group) =>
  group.map((label) => ({ label, stems: contentTerms(label).map((t) => t.stem) })).filter((p) => p.stems.length > 0),
);

export interface SynonymMatch {
  /** posição (no vetor de radicais da pergunta) do primeiro e do último radical casado */
  from: number;
  to: number;
  /** expressão encontrada na pergunta */
  matched: SynonymPhrase;
  /** expressões equivalentes do mesmo grupo */
  alternatives: readonly SynonymPhrase[];
}

/**
 * Procura as expressões do dicionário na sequência de radicais da pergunta (casamento contíguo, a mais longa primeiro em
 * cada posição). Devolve, para cada uma, as alternativas do grupo — quem chama decide o peso.
 */
export function findSynonyms(queryStems: readonly string[]): SynonymMatch[] {
  const out: SynonymMatch[] = [];
  for (const group of COMPILED_SYNONYMS) {
    for (const phrase of group) {
      const n = phrase.stems.length;
      for (let i = 0; i + n <= queryStems.length; i++) {
        let ok = true;
        for (let j = 0; j < n; j++) if (queryStems[i + j] !== phrase.stems[j]) { ok = false; break; }
        if (!ok) continue;
        out.push({ from: i, to: i + n - 1, matched: phrase, alternatives: group.filter((p) => p !== phrase) });
      }
    }
  }
  return out;
}
