/**
 * Ofertas DEMO do Balcão de Modelos (RF40): modelos de tarefa do Acervo (lib/tasks/areaTemplates), o projeto de exemplo
 * (lib/projects/fixtures) e kits, oferecidos por pessoas fictícias do diretório DEMO do DECIA e pelos perfis do laboratório.
 * Contadores e pontos recebidos são de antes desta aba; os perfis do laboratório começam sem pontos recebidos para o extrato
 * deles continuar batendo com o razão. Datas relativas a `now`.
 */
import { DEMO_PROJECT_ID } from "@/lib/projects/fixtures";
import type { ModelOffer } from "./types";

const DAY_MS = 86_400_000;
const ago = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();

type Seed = Omit<ModelOffer, "createdAt" | "status"> & { daysAgo: number };

const SEEDS: readonly Seed[] = [
  {
    id: "mo-etp", kind: "TAREFA", title: "Estudo técnico preliminar (ETP)", area: "ADMINISTRACAO", department: "CPOE", authorId: "u-ana", authorName: "Ana Exemplo",
    usageDescription: "ETP com as seções exigidas pela Lei 14.133/2021, já revisado pela assessoria jurídica. Ajuste a necessidade e as estimativas.",
    license: "ATRIBUICAO", pricePoints: 0, shelf: "CHANCELADO", sealName: "Contratação conforme · CPOE", source: { type: "TASK_TEMPLATE", templateId: "area.administracao.estudo-tecnico-preliminar" },
    reuseCount: 14, viewsCount: 132, pointsEarned: 0, daysAgo: 64,
  },
  {
    id: "mo-tr", kind: "TAREFA", title: "Termo de referência", area: "ADMINISTRACAO", department: "SECID-UTS", authorId: "u-bruno", authorName: "Bruno Exemplo",
    usageDescription: "Termo de referência com critérios de aceite mensuráveis e matriz de riscos do contrato.",
    license: "COPIA_LIVRE", pricePoints: 20, shelf: "CHANCELADO", sealName: "Modelo oficial da Secretaria", source: { type: "TASK_TEMPLATE", templateId: "area.administracao.termo-de-referencia" },
    reuseCount: 9, viewsCount: 88, pointsEarned: 180, daysAgo: 51,
  },
  {
    id: "mo-kit-contratacao", kind: "KIT", title: "Kit contratação: ETP, termo de referência e controle de contratos", area: "ADMINISTRACAO", department: "CPOE", authorId: "u-carla", authorName: "Carla Exemplo",
    usageDescription: "As três tarefas de uma contratação, na ordem em que o processo pede.",
    license: "ATRIBUICAO", pricePoints: 30, shelf: "CHANCELADO", sealName: "Kit chancelado · Contratações",
    source: { type: "KIT", templateIds: ["area.administracao.estudo-tecnico-preliminar", "area.administracao.termo-de-referencia", "area.administracao.controle-de-contratos"] },
    reuseCount: 6, viewsCount: 71, pointsEarned: 180, daysAgo: 40,
  },
  {
    id: "mo-projeto-decia", kind: "PROJETO", title: "Plataforma DECIA v1.0", area: "SOFTWARE", department: "SECID-UTS", authorId: "u-ana", authorName: "Ana Exemplo",
    usageDescription: "Projeto híbrido com termo de abertura, EAP, cronograma com caminho crítico e portões. Use como referência para projetos de TI.",
    license: "SOMENTE_LEITURA", pricePoints: 0, shelf: "COMUNIDADE", sealName: null, source: { type: "PROJECT", projectId: DEMO_PROJECT_ID },
    reuseCount: 4, viewsCount: 57, pointsEarned: 0, daysAgo: 9,
  },
  {
    id: "mo-defeito", kind: "TAREFA", title: "Correção de defeito com análise de causa raiz", area: "SOFTWARE", department: "SECID-UTS", authorId: "u-carla", authorName: "Carla Exemplo",
    usageDescription: "Roteiro para corrigir, provar a causa raiz e deixar o teste de regressão.",
    license: "COPIA_LIVRE", pricePoints: 0, shelf: "COMUNIDADE", sealName: null, source: { type: "TASK_TEMPLATE", templateId: "area.software.correcao-de-defeito-com-causa-raiz" },
    reuseCount: 21, viewsCount: 140, pointsEarned: 0, daysAgo: 33,
  },
  {
    id: "mo-adr", kind: "TAREFA", title: "Registro de decisão de arquitetura (ADR)", area: "SOFTWARE", department: "SECID-UTS", authorId: "u-diego", authorName: "Diego Exemplo",
    usageDescription: "ADR curto: contexto, decisão, alternativas e consequências, ligado à decisão do DECIA.",
    license: "ATRIBUICAO", pricePoints: 10, shelf: "COMUNIDADE", sealName: null, source: { type: "TASK_TEMPLATE", templateId: "area.software.registro-de-decisao-de-arquitetura" },
    reuseCount: 5, viewsCount: 46, pointsEarned: 50, daysAgo: 21,
  },
  {
    id: "mo-riscos", kind: "TAREFA", title: "Matriz de riscos", area: "PLANEJAMENTO", department: "CPOE", authorId: "chefe.exemplo", authorName: "Chefia Exemplo",
    usageDescription: "Matriz probabilidade × impacto com resposta e responsável por risco.",
    license: "COPIA_LIVRE", pricePoints: 0, shelf: "COMUNIDADE", sealName: null, source: { type: "TASK_TEMPLATE", templateId: "area.planejamento.matriz-de-riscos" },
    reuseCount: 7, viewsCount: 39, pointsEarned: 0, daysAgo: 15,
  },
  {
    id: "mo-parecer", kind: "TAREFA", title: "Parecer jurídico", area: "JURIDICO", department: "ASJUR", authorId: "u-elisa", authorName: "Elisa Exemplo",
    usageDescription: "Parecer com ementa, relatório, fundamentação e conclusão objetiva.",
    license: "ATRIBUICAO", pricePoints: 15, shelf: "COMUNIDADE", sealName: null, source: { type: "TASK_TEMPLATE", templateId: "area.juridico.parecer-juridico" },
    reuseCount: 2, viewsCount: 18, pointsEarned: 30, daysAgo: 6,
  },
  {
    id: "mo-campanha", kind: "TAREFA", title: "Plano de campanha com KPI", area: "MARKETING", department: "ASCOM", authorId: "u-bruno", authorName: "Bruno Exemplo",
    usageDescription: "Campanha com público, mensagem, canais, calendário e indicador de resultado.",
    license: "COPIA_LIVRE", pricePoints: 5, shelf: "COMUNIDADE", sealName: null, source: { type: "TASK_TEMPLATE", templateId: "area.marketing.plano-de-campanha-com-kpi" },
    reuseCount: 3, viewsCount: 22, pointsEarned: 15, daysAgo: 12,
  },
  {
    id: "mo-kit-entrega-software", kind: "KIT", title: "Kit entrega de software: testes, implantação e segurança", area: "SOFTWARE", department: "SECID-UTS", authorId: "u-diego", authorName: "Diego Exemplo",
    usageDescription: "Plano de testes, runbook de implantação e reversão e revisão OWASP para a mesma entrega.",
    license: "COPIA_LIVRE", pricePoints: 25, shelf: "COMUNIDADE", sealName: null,
    source: { type: "KIT", templateIds: ["area.software.plano-de-testes", "area.software.runbook-de-implantacao-e-reversao", "area.software.revisao-de-seguranca-owasp"] },
    reuseCount: 1, viewsCount: 12, pointsEarned: 25, daysAgo: 3,
  },
];

export function buildDemoOffers(now: Date): ModelOffer[] {
  return SEEDS.map(({ daysAgo, ...o }) => ({ ...o, status: "ATIVA", createdAt: ago(now, daysAgo) }));
}
