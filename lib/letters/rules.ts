/**
 * Catálogo das regras do copiloto (RF53.CA04): cada regra tem categoria, aba, gravidade padrão e a obra de referência
 * indicada. As referências são obras e normas reais citadas só por autoria e título: edição e página NÃO foram
 * conferidas nesta versão e por isso não aparecem (`verified: false`) — o copiloto nunca inventa edição, página ou
 * citação. O texto explicativo de cada regra (título, explicação, exemplo correto) vem do i18n `letters.rule.<id>.*`.
 */
import type { CopilotTab, FindingCategory, Severity } from "./types";

export interface RuleReference {
  id: string;
  /** autoria e título, como identificados; sem edição nem página */
  citation: string;
  verified: false;
}

export const REFERENCES: Readonly<Record<string, RuleReference>> = {
  CUNHA_CINTRA: { id: "CUNHA_CINTRA", citation: "CUNHA, Celso; CINTRA, Lindley. Nova gramática do português contemporâneo.", verified: false },
  BECHARA: { id: "BECHARA", citation: "BECHARA, Evanildo. Moderna gramática portuguesa.", verified: false },
  MANUAL_REDACAO: { id: "MANUAL_REDACAO", citation: "BRASIL. Presidência da República. Manual de redação da Presidência da República.", verified: false },
  KOCH: { id: "KOCH", citation: "KOCH, Ingedore Villaça. A coesão textual.", verified: false },
  DANES: { id: "DANES", citation: "DANEŠ, František. Functional sentence perspective and the organization of the text.", verified: false },
  NBR10520: { id: "NBR10520", citation: "ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. NBR 10520: informação e documentação: citações em documentos: apresentação.", verified: false },
  NBR6023: { id: "NBR6023", citation: "ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. NBR 6023: informação e documentação: referências: elaboração.", verified: false },
  NBR10719: { id: "NBR10719", citation: "ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. NBR 10719: informação e documentação: relatório técnico e/ou científico: apresentação.", verified: false },
  VANCOUVER: { id: "VANCOUVER", citation: "NATIONAL LIBRARY OF MEDICINE. Citing medicine: the NLM style guide for authors, editors, and publishers.", verified: false },
  NYGARD: { id: "NYGARD", citation: "NYGARD, Michael. Documenting architecture decisions.", verified: false },
  DOI: { id: "DOI", citation: "INTERNATIONAL DOI FOUNDATION. DOI Handbook.", verified: false },
  MODELO: { id: "MODELO", citation: "Modelo de peça do Letters (convenção do Work Station; não é norma externa).", verified: false },
};

export interface RuleInfo {
  id: string;
  category: FindingCategory;
  tab: CopilotTab;
  severity: Severity;
  reference: keyof typeof REFERENCES;
}

const rule = (id: string, category: FindingCategory, tab: CopilotTab, severity: Severity, reference: keyof typeof REFERENCES): RuleInfo => ({ id, category, tab, severity, reference });

export const RULES: Readonly<Record<string, RuleInfo>> = Object.fromEntries(
  [
    // Gramática
    rule("CRASE_MASCULINO", "CRASE", "GRAMATICA", "ERRO", "CUNHA_CINTRA"),
    rule("CRASE_VERBO", "CRASE", "GRAMATICA", "ERRO", "CUNHA_CINTRA"),
    rule("CRASE_PRONOME", "CRASE", "GRAMATICA", "ERRO", "CUNHA_CINTRA"),
    rule("CRASE_PLURAL", "CRASE", "GRAMATICA", "AVISO", "CUNHA_CINTRA"),
    rule("CRASE_LOCUCAO", "CRASE", "GRAMATICA", "ERRO", "BECHARA"),
    rule("CRASE_DEVIDO", "CRASE", "GRAMATICA", "AVISO", "BECHARA"),
    rule("CONCORDANCIA_NOMINAL", "CONCORDANCIA", "GRAMATICA", "ERRO", "CUNHA_CINTRA"),
    rule("CONCORDANCIA_GENERO", "CONCORDANCIA", "GRAMATICA", "ERRO", "CUNHA_CINTRA"),
    rule("CONCORDANCIA_ADJETIVO", "CONCORDANCIA", "GRAMATICA", "AVISO", "CUNHA_CINTRA"),
    rule("CONCORDANCIA_VERBAL", "CONCORDANCIA", "GRAMATICA", "ERRO", "BECHARA"),
    rule("CONCORDANCIA_PRONOME", "CONCORDANCIA", "GRAMATICA", "ERRO", "BECHARA"),
    rule("VERBO_IMPESSOAL", "CONCORDANCIA", "GRAMATICA", "ERRO", "BECHARA"),
    rule("REGENCIA_ASSISTIR", "REGENCIA", "GRAMATICA", "AVISO", "BECHARA"),
    rule("REGENCIA_OBEDECER", "REGENCIA", "GRAMATICA", "ERRO", "BECHARA"),
    rule("REGENCIA_PREFERIR", "REGENCIA", "GRAMATICA", "AVISO", "BECHARA"),
    rule("REGENCIA_IMPLICAR", "REGENCIA", "GRAMATICA", "AVISO", "BECHARA"),
    rule("ONDE_TEMPO", "USO", "GRAMATICA", "AVISO", "MANUAL_REDACAO"),
    rule("A_NIVEL_DE", "USO", "GRAMATICA", "AVISO", "MANUAL_REDACAO"),
    rule("PLEONASMO", "PLEONASMO", "GRAMATICA", "AVISO", "CUNHA_CINTRA"),
    rule("PALAVRA_DUPLICADA", "ESTILO", "GRAMATICA", "ERRO", "MANUAL_REDACAO"),
    rule("REPETICAO_PROXIMA", "ESTILO", "GRAMATICA", "SUGESTAO", "MANUAL_REDACAO"),
    rule("FRASE_LONGA", "ESTILO", "GRAMATICA", "AVISO", "MANUAL_REDACAO"),
    rule("ESPACO_ANTES_PONTUACAO", "PONTUACAO", "GRAMATICA", "AVISO", "MANUAL_REDACAO"),
    rule("ESPACO_DUPLO", "PONTUACAO", "GRAMATICA", "SUGESTAO", "MANUAL_REDACAO"),
    rule("REGISTRO_INFORMAL", "REGISTRO", "GRAMATICA", "AVISO", "MANUAL_REDACAO"),
    // Morfossintaxe (pessoa e voz verbal)
    rule("TRATAMENTO_MISTO", "TRATAMENTO", "MORFOSSINTAXE", "AVISO", "CUNHA_CINTRA"),
    rule("VOZ_PASSIVA", "ESTILO", "MORFOSSINTAXE", "SUGESTAO", "MANUAL_REDACAO"),
    // Coerência e narrativa
    rule("CONECTIVO_REPETIDO", "COESAO", "COERENCIA", "SUGESTAO", "KOCH"),
    rule("PARAGRAFO_SEM_CONECTIVO", "COESAO", "COERENCIA", "SUGESTAO", "KOCH"),
    rule("COESAO_BAIXA", "COESAO", "COERENCIA", "AVISO", "KOCH"),
    rule("PROGRESSAO_RUPTURA", "PROGRESSAO", "COERENCIA", "SUGESTAO", "DANES"),
    rule("TEMPO_VERBAL_MISTO", "TEMPO_VERBAL", "COERENCIA", "SUGESTAO", "CUNHA_CINTRA"),
    rule("SECAO_AUSENTE", "ESTRUTURA", "COERENCIA", "AVISO", "NBR10719"),
    rule("SECAO_VAZIA", "ESTRUTURA", "COERENCIA", "AVISO", "NBR10719"),
    rule("SECAO_FORA_DE_ORDEM", "ESTRUTURA", "COERENCIA", "SUGESTAO", "NBR10719"),
    rule("SECAO_MODELO_AUSENTE", "ESTRUTURA", "COERENCIA", "AVISO", "MODELO"),
    rule("ELEMENTO_OFICIO_AUSENTE", "ESTRUTURA", "COERENCIA", "AVISO", "MANUAL_REDACAO"),
    rule("SECAO_ADR_AUSENTE", "ESTRUTURA", "COERENCIA", "AVISO", "NYGARD"),
    rule("IMPESSOALIDADE", "SUBJETIVIDADE", "COERENCIA", "SUGESTAO", "MANUAL_REDACAO"),
    rule("SUBJETIVIDADE", "SUBJETIVIDADE", "COERENCIA", "SUGESTAO", "MANUAL_REDACAO"),
    rule("CONTINUIDADE_PERSONAGEM", "CONTINUIDADE", "COERENCIA", "AVISO", "KOCH"),
    rule("TEXTO_SEM_CITACAO", "ESTRUTURA", "COERENCIA", "AVISO", "NBR10520"),
    // Citações e referências
    rule("CITACAO_SEM_REFERENCIA", "CITACAO", "CITACOES", "ERRO", "NBR10520"),
    rule("CITACAO_ANO_DIVERGENTE", "CITACAO", "CITACOES", "ERRO", "NBR10520"),
    rule("CITACAO_NUMERICA_INEXISTENTE", "CITACAO", "CITACOES", "ERRO", "VANCOUVER"),
    rule("CITACAO_NUMERICA_ORDEM", "CITACAO", "CITACOES", "SUGESTAO", "VANCOUVER"),
    rule("SISTEMA_CHAMADA_MISTO", "CITACAO", "CITACOES", "AVISO", "NBR10520"),
    rule("CITACAO_DIRETA_SEM_PAGINA", "CITACAO", "CITACOES", "AVISO", "NBR10520"),
    rule("CITACAO_LONGA_SEM_FONTE", "CITACAO", "CITACOES", "AVISO", "NBR10520"),
    rule("REFERENCIA_NAO_CITADA", "REFERENCIA", "CITACOES", "AVISO", "NBR6023"),
    rule("REFERENCIA_SEM_AUTOR", "REFERENCIA", "CITACOES", "AVISO", "NBR6023"),
    rule("REFERENCIA_SEM_ANO", "REFERENCIA", "CITACOES", "AVISO", "NBR6023"),
    rule("REFERENCIA_SEM_TITULO", "REFERENCIA", "CITACOES", "AVISO", "NBR6023"),
    rule("REFERENCIA_SEM_LOCAL_EDITORA", "REFERENCIA", "CITACOES", "AVISO", "NBR6023"),
    rule("REFERENCIA_URL_SEM_ACESSO", "REFERENCIA", "CITACOES", "AVISO", "NBR6023"),
    rule("REFERENCIA_DOI_INVALIDO", "REFERENCIA", "CITACOES", "ERRO", "DOI"),
    rule("REFERENCIA_CAIXA_AUTOR", "REFERENCIA", "CITACOES", "SUGESTAO", "NBR6023"),
  ].map((r) => [r.id, r]),
);

export const ruleInfo = (id: string): RuleInfo => {
  const r = RULES[id];
  if (!r) throw new Error(`regra desconhecida: ${id}`);
  return r;
};

export const RULE_IDS = Object.keys(RULES);
