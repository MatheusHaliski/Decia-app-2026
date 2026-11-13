/**
 * Catálogo VERSIONADO de checklists do Espelho de Conformidade (RF32). Dado, não código: cada item tem id, código curto, base
 * legal com número e ano, fase em que se aplica, tipo de projeto em que vale e a regra determinística que confere a estrutura do
 * projeto. Os textos do catálogo do sistema são chaves i18n (`mirror.item.<ID>.*`); a base legal é a citação da norma, como está.
 *
 * Só normas cuja existência, número e ano foram conferidos: Lei 14.133/2021 (licitações e contratos), Lei 13.709/2018 (LGPD),
 * Lei 12.527/2011 (LAI), Lei 13.146/2015 (LBI), Decreto 5.296/2004, eMAG 3.1 e ABNT NBR 9050. A tela pede para conferir a
 * vigência — normas mudam e o catálogo traz a versão. As diretrizes ESTADUAIS e MUNICIPAIS são EXEMPLOS (`example: true`), sem
 * citar norma real: o órgão as substitui pelas suas. O checklist do DEPARTAMENTO é semente DEMO que o chefe edita (store.ts).
 */
import type { Applicability, ComplianceChecklist, ComplianceItem } from "./types";

export const CATALOG_VERSION = "2026.11.12";

const CONTRATACAO: Applicability = { kind: "SINAL", signal: "CONTRATACAO" };
const DADOS: Applicability = { kind: "SINAL", signal: "DADOS_PESSOAIS" };
const SENSIVEIS: Applicability = { kind: "SINAL", signal: "DADOS_SENSIVEIS" };
const DIGITAL: Applicability = { kind: "SINAL", signal: "SISTEMA_DIGITAL" };
const OBRA: Applicability = { kind: "SINAL", signal: "OBRA_OU_ESPACO" };
const SEMPRE: Applicability = { kind: "SEMPRE" };

/** Item do catálogo do sistema: textos pelas chaves `mirror.item.<id>.{title,why,task}`. */
function sys(id: string, code: string, checklistId: string, rest: Omit<ComplianceItem, "id" | "code" | "checklistId" | "titleKey" | "whyKey">): ComplianceItem {
  return {
    id, code, checklistId, titleKey: `mirror.item.${id}.title`, whyKey: `mirror.item.${id}.why`, ...rest,
    suggestion: rest.suggestion ? { titleKey: `mirror.item.${id}.task`, ...rest.suggestion } : undefined,
  };
}

export const FEDERAL_CHECKLISTS: readonly ComplianceChecklist[] = [
  {
    id: "FED_14133", source: "FEDERAL", nameKey: "mirror.checklist.FED_14133", basis: "Lei nº 14.133, de 1º de abril de 2021", example: false, version: CATALOG_VERSION,
    items: [
      sys("L14133_ETP", "14133-ETP", "FED_14133", {
        basis: "Lei 14.133/2021, art. 18, I", phase: "ELABORACAO", requirement: "OBRIGATORIO", appliesTo: CONTRATACAO,
        rule: { kind: "ARTEFATO", keywords: ["etp", "estudo tecnico preliminar", "estudos tecnicos preliminares"], phases: ["PLANEJAMENTO", "ELABORACAO"] },
        suggestion: { durationDays: 3 },
      }),
      sys("L14133_TR", "14133-TR", "FED_14133", {
        basis: "Lei 14.133/2021, art. 18, II", phase: "ELABORACAO", requirement: "OBRIGATORIO", appliesTo: CONTRATACAO,
        rule: { kind: "ARTEFATO", keywords: ["termo de referencia", "tr", "projeto basico", "anteprojeto"], phases: ["ELABORACAO"] },
        suggestion: { durationDays: 3 },
      }),
      sys("L14133_PRECOS", "14133-PRECOS", "FED_14133", {
        basis: "Lei 14.133/2021, art. 23", phase: "ELABORACAO", requirement: "OBRIGATORIO", appliesTo: CONTRATACAO,
        rule: { kind: "ARTEFATO", keywords: ["pesquisa de preco*", "cotac*", "orcamento estimado", "valor estimado", "estimativa de preco*", "mapa de preco*"], phases: ["PLANEJAMENTO", "ELABORACAO"] },
        suggestion: { durationDays: 2 },
      }),
      sys("L14133_RISCOS", "14133-RISCOS", "FED_14133", {
        basis: "Lei 14.133/2021, art. 18, X, e art. 22", phase: "ELABORACAO", requirement: "OBRIGATORIO", appliesTo: CONTRATACAO,
        rule: {
          kind: "RISCO", keywords: ["contrat*", "licita*", "fornecedor*"],
          taskKeywords: ["matriz de risco*", "mapa de risco*", "analise de risco*", "gerenciamento de risco*"], phases: ["PLANEJAMENTO", "ELABORACAO", "ANALISE"],
        },
        suggestion: { durationDays: 2 },
      }),
      sys("L14133_JURIDICO", "14133-JURIDICO", "FED_14133", {
        basis: "Lei 14.133/2021, art. 53", phase: "ANALISE", requirement: "OBRIGATORIO", appliesTo: CONTRATACAO,
        rule: { kind: "ARTEFATO", keywords: ["parecer juridico", "analise juridica", "assessoria juridica", "assessoramento juridico", "procuradoria", "controle de legalidade"], phases: ["ANALISE", "APROVACAO"] },
        suggestion: { durationDays: 2 },
      }),
      sys("L14133_FISCAL", "14133-FISCAL", "FED_14133", {
        basis: "Lei 14.133/2021, art. 117", phase: "EXECUCAO", requirement: "OBRIGATORIO", appliesTo: CONTRATACAO,
        rule: { kind: "ARTEFATO", keywords: ["fiscal*", "gestor do contrato", "gestao do contrato", "gestao contratual"], phases: ["EXECUCAO"] },
        suggestion: { durationDays: 1 },
      }),
      sys("L14133_RECEBIMENTO", "14133-RECEB", "FED_14133", {
        basis: "Lei 14.133/2021, art. 140", phase: "ENCERRAMENTO", requirement: "OBRIGATORIO", appliesTo: CONTRATACAO,
        rule: { kind: "ARTEFATO", keywords: ["recebimento", "termo de recebimento", "aceite*"], phases: ["EXECUCAO", "ENCERRAMENTO"] },
        suggestion: { durationDays: 1 },
      }),
    ],
  },
  {
    id: "FED_LGPD", source: "FEDERAL", nameKey: "mirror.checklist.FED_LGPD", basis: "Lei nº 13.709, de 14 de agosto de 2018 (LGPD)", example: false, version: CATALOG_VERSION,
    items: [
      sys("LGPD_BASE", "LGPD-BASE", "FED_LGPD", {
        basis: "Lei 13.709/2018, art. 7º (art. 11 para dados sensíveis)", phase: "ANALISE", requirement: "OBRIGATORIO", appliesTo: DADOS,
        rule: { kind: "ARTEFATO", keywords: ["lgpd", "base legal", "dados pessoais", "protecao de dados", "tratamento de dados", "privacidade", "inventario de dados"], phases: ["ELABORACAO", "ANALISE"] },
        suggestion: { durationDays: 2 },
      }),
      sys("LGPD_SEGURANCA", "LGPD-SEG", "FED_LGPD", {
        basis: "Lei 13.709/2018, art. 46", phase: "EXECUCAO", requirement: "RECOMENDADO", appliesTo: DADOS,
        rule: { kind: "ARTEFATO", keywords: ["seguranca", "controle de acesso", "autenticac*", "login", "criptograf*", "perfis de acesso"], phases: ["ELABORACAO", "EXECUCAO"] },
        suggestion: { durationDays: 3 },
      }),
      sys("LGPD_ENCARREGADO", "LGPD-DPO", "FED_LGPD", {
        basis: "Lei 13.709/2018, art. 41", phase: "ANALISE", requirement: "RECOMENDADO", appliesTo: DADOS,
        rule: { kind: "ARTEFATO", keywords: ["encarregado", "dpo"], phases: ["ELABORACAO", "ANALISE"] },
        suggestion: { durationDays: 1 },
      }),
      sys("LGPD_RIPD", "LGPD-RIPD", "FED_LGPD", {
        basis: "Lei 13.709/2018, art. 5º, XVII, e art. 38", phase: "ANALISE", requirement: "OBRIGATORIO", appliesTo: SENSIVEIS,
        rule: { kind: "ARTEFATO", keywords: ["ripd", "relatorio de impacto", "impacto a protecao de dados"], phases: ["ELABORACAO", "ANALISE"] },
        suggestion: { durationDays: 3 },
      }),
    ],
  },
  {
    id: "FED_LAI", source: "FEDERAL", nameKey: "mirror.checklist.FED_LAI", basis: "Lei nº 12.527, de 18 de novembro de 2011 (LAI)", example: false, version: CATALOG_VERSION,
    items: [
      sys("LAI_TRANSPARENCIA", "LAI-TRANSP", "FED_LAI", {
        basis: "Lei 12.527/2011, art. 8º", phase: "EXECUCAO", requirement: "RECOMENDADO", appliesTo: SEMPRE,
        rule: { kind: "ARTEFATO", keywords: ["transparencia", "dados abertos", "divulgac*", "publicar", "publicacao"], phases: ["EXECUCAO", "ENCERRAMENTO"] },
        suggestion: { durationDays: 1 },
      }),
    ],
  },
  {
    id: "FED_ACESS", source: "FEDERAL", nameKey: "mirror.checklist.FED_ACESS", basis: "Lei nº 13.146, de 6 de julho de 2015 (LBI); Decreto nº 5.296, de 2 de dezembro de 2004", example: false, version: CATALOG_VERSION,
    items: [
      sys("LBI_SISTEMAS", "LBI-SISTEMAS", "FED_ACESS", {
        basis: "Lei 13.146/2015, art. 63; Decreto 5.296/2004, art. 47; eMAG 3.1", phase: "ELABORACAO", requirement: "OBRIGATORIO", appliesTo: DIGITAL,
        rule: { kind: "ARTEFATO", keywords: ["acessibilidade", "emag", "wcag", "leitor de tela", "acessivel", "acessiveis"], phases: ["ELABORACAO", "EXECUCAO"] },
        suggestion: { durationDays: 2 },
      }),
      sys("LBI_TESTE", "LBI-TESTE", "FED_ACESS", {
        basis: "eMAG 3.1; Lei 13.146/2015, art. 63", phase: "EXECUCAO", requirement: "RECOMENDADO", appliesTo: DIGITAL,
        rule: { kind: "ARTEFATO", keywords: ["teste de acessibilidade", "testes de acessibilidade", "avaliacao de acessibilidade", "validacao de acessibilidade", "auditoria de acessibilidade"], phases: ["EXECUCAO"] },
        suggestion: { durationDays: 2 },
      }),
      sys("NBR9050", "NBR9050", "FED_ACESS", {
        basis: "ABNT NBR 9050:2020; Lei 13.146/2015, art. 56", phase: "ELABORACAO", requirement: "OBRIGATORIO", appliesTo: OBRA,
        rule: { kind: "ARTEFATO", keywords: ["nbr 9050", "9050", "acessibilidade", "rota acessivel", "desenho universal"], phases: ["ELABORACAO"] },
        suggestion: { durationDays: 3 },
      }),
    ],
  },
];

/** Diretrizes de EXEMPLO: mostram como o órgão cadastra as suas; não citam norma real. */
export const EXAMPLE_CHECKLISTS: readonly ComplianceChecklist[] = [
  {
    id: "UF_EXEMPLO", source: "ESTADUAL", nameKey: "mirror.checklist.UF_EXEMPLO", basisKey: "mirror.basis.ufExample", example: true, version: CATALOG_VERSION,
    items: [
      sys("UF_PARECER_TIC", "UF-TIC", "UF_EXEMPLO", {
        basisKey: "mirror.basis.ufExample", phase: "ANALISE", requirement: "OBRIGATORIO", appliesTo: { kind: "TODOS", of: [DIGITAL, CONTRATACAO] },
        rule: { kind: "ARTEFATO", keywords: ["parecer tecnico de tic", "parecer de tic", "parecer tecnico", "orgao central de tic"], phases: ["ANALISE"] },
        suggestion: { durationDays: 2 },
      }),
      sys("UF_PDTIC", "UF-PDTIC", "UF_EXEMPLO", {
        basisKey: "mirror.basis.ufExample", phase: "DEMANDA", requirement: "RECOMENDADO", appliesTo: SEMPRE,
        rule: { kind: "OBJETIVO_ALINHADO", source: "PDTIC" }, fixTab: "governanca",
      }),
    ],
  },
  {
    id: "MUN_EXEMPLO", source: "MUNICIPAL", nameKey: "mirror.checklist.MUN_EXEMPLO", basisKey: "mirror.basis.munExample", example: true, version: CATALOG_VERSION,
    items: [
      sys("MUN_ALVARA", "MUN-ALVARA", "MUN_EXEMPLO", {
        basisKey: "mirror.basis.munExample", phase: "ELABORACAO", requirement: "OBRIGATORIO", appliesTo: OBRA,
        rule: { kind: "ARTEFATO", keywords: ["alvara", "licenca municipal", "licenciamento"], phases: ["ELABORACAO", "ANALISE"] },
        suggestion: { durationDays: 5 },
      }),
      sys("MUN_CAPACITACAO", "MUN-CAPAC", "MUN_EXEMPLO", {
        basisKey: "mirror.basis.munExample", phase: "ENCERRAMENTO", requirement: "RECOMENDADO", appliesTo: DIGITAL,
        rule: { kind: "ARTEFATO", keywords: ["capacitac*", "treinamento*", "treinar"], phases: ["EXECUCAO", "ENCERRAMENTO"] },
        suggestion: { durationDays: 2 },
      }),
    ],
  },
];

/** Checklist do departamento — SEMENTE DEMO (textos do chefe, como dado); o chefe cria, edita e remove itens (store.ts). */
export const DEPARTMENT_CHECKLIST_ID = "DEP_EXEMPLO";
export function departmentSeed(): ComplianceChecklist {
  const base = { checklistId: DEPARTMENT_CHECKLIST_ID, basis: "Norma interna do departamento (exemplo)", appliesTo: SEMPRE } as const;
  return {
    id: DEPARTMENT_CHECKLIST_ID, source: "DEPARTAMENTO", name: "Checklist do departamento", basis: "Norma interna do departamento (exemplo)", example: false, version: "1",
    items: [
      {
        ...base, id: "dep-1", code: "DEP-1", title: "Plano de testes antes da execução", why: "Toda entrega de sistema tem os testes planejados antes de ir para a execução.",
        phase: "ELABORACAO", requirement: "OBRIGATORIO", rule: { kind: "ARTEFATO", keywords: ["test*", "homologac*", "plano de testes"], phases: ["ELABORACAO", "ANALISE"] },
        suggestion: { title: "Elaborar o plano de testes", durationDays: 2 },
      },
      {
        ...base, id: "dep-2", code: "DEP-2", title: "Portões de fase decididos no DECIA", why: "Quem aprova a passagem de fase deixa o porquê registrado.",
        phase: "APROVACAO", requirement: "OBRIGATORIO", rule: { kind: "PORTOES_NO_DECIA" }, fixTab: "governanca",
      },
      {
        ...base, id: "dep-3", code: "DEP-3", title: "Lições aprendidas em mais de uma fase", why: "Lição registrada só no fim chega tarde para o próprio projeto.",
        phase: "ENCERRAMENTO", requirement: "RECOMENDADO", rule: { kind: "LICOES", minPhases: 2 }, fixTab: "controle",
      },
      {
        ...base, id: "dep-4", code: "DEP-4", title: "Entregas revisadas por outra pessoa (quatro olhos)", why: "Quem fez não é quem confere.",
        phase: "EXECUCAO", requirement: "RECOMENDADO", rule: { kind: "REVISAO" }, fixTab: "quadro",
      },
    ],
  };
}

/** Catálogo completo padrão: federais + exemplos estaduais e municipais + semente do departamento. */
export function defaultChecklists(department: ComplianceChecklist = departmentSeed()): ComplianceChecklist[] {
  return [...FEDERAL_CHECKLISTS, ...EXAMPLE_CHECKLISTS, department];
}
