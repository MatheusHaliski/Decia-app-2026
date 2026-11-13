/**
 * Coleta do Dossiê de Transição (RF36.CA01) — função PURA e determinística (D-12): dado quem sai, a data de referência e as fontes
 * (projetos da Mesa, decisões do DECIA, tarefas do Acervo, trechos da Memória), devolve os itens do dossiê. Regras:
 *  • Projetos: os abertos em que a pessoa está na equipe ou é responsável por alguma atividade; as atividades abertas dela entram
 *    em Tarefas; os pedidos de mudança dela ainda sem decisão entram em Pendências; os riscos abertos que ela é dona, em Riscos;
 *    as partes interessadas e a equipe, em Contatos; as lições que ela registrou, em Fontes.
 *  • Tarefas do Acervo: as abertas de que ela é dona ou responsável. PRIVADA só com o consentimento do titular (RF36.CA05) — sem ele,
 *    fica de fora e só a contagem aparece. SIGILOSO entra só por referência (sem título, conteúdo nem referências).
 *  • Pendências: tarefa com prazo legal nos próximos `legalWindowDays` dias ou vencido (área Jurídica, nº de processo, base legal ou
 *    categoria contratual/regulatória), tarefa vencida, tarefa bloqueada, decisão atrasada (data-alvo passada sem decisão), revisão
 *    programada de decisão próxima, pedido de mudança aguardando o comitê.
 *  • Decisões: as não encerradas em que ela é dona ou participante; as evidências delas entram em Fontes.
 *  • Fontes: referências das tarefas, evidências das decisões, lições do projeto e trechos EXATOS da Memória Institucional
 *    (`searchMemory`), com a citação.
 * Nada aqui apaga ou move: o dossiê só descreve o que existe; a transferência acontece no aceite (RF36.CA03, ainda sem API).
 */
import type { DecisionAggregate, DecisionLifecycle } from "@/lib/decia/types";
import type { MemoryHit, MemorySearch } from "@/lib/memory/search";
import { PROJECT_PHASES, type ProjectModel } from "@/lib/projects/types";
import { PENDENCY_KINDS, type Fact, type HandoffItem, type HandoffPerson, type HandoffSection, type ItemSource, type PendencyKind } from "./types";

/** O mínimo de uma tarefa do Acervo para o dossiê (a `TaskView` da API serve). */
export interface HandoffTaskInput {
  id?: string;
  title?: string;
  state?: string;
  dueAt?: string | null;
  priority?: string | null;
  area?: string | null;
  category?: string | null;
  visibility?: string | null;
  accessClass?: string | null;
  blockReason?: string | null;
  extensions?: Record<string, string> | null;
  references?: { label?: string; url?: string }[] | null;
  ownerId?: string | null;
  responsibleId?: string | null;
}

export interface CollectInput {
  subject: HandoffPerson;
  /** data de referência (AAAA-MM-DD) */
  today: string;
  consentForPrivateItems: boolean;
  people: Readonly<Record<string, { name: string }>>;
  projects: readonly ProjectModel[];
  decisions: readonly DecisionAggregate[];
  tasks: readonly HandoffTaskInput[];
  /** as tarefas vieram da API real (Acervo da pessoa logada) ou do exemplo do laboratório */
  taskSource: "API" | "DEMO";
  memory?: readonly MemoryHit[];
  /** janela dos prazos legais, em dias (padrão 30) */
  legalWindowDays?: number;
}

export interface Collected {
  items: HandoffItem[];
  privateExcluded: number;
  sources: ItemSource[];
  /** histórico (contagens do que já terminou: não se transfere, mas conta a história) */
  history: { tasksDone: number; decisionsClosed: number; activitiesDone: number };
}

export const LEGAL_WINDOW_DAYS = 30;
const LEGAL_CATEGORIES = new Set(["CONTRATO_CONVENIO", "LICENCA_ANUENCIA", "PORTARIA_RESOLUCAO"]);
const OPEN_TASK_STATES = new Set(["RASCUNHO", "DISPONIVEL", "EM_USO", "BLOQUEADA"]);
const OPEN_DECISION: readonly DecisionLifecycle[] = ["RASCUNHO", "ENQUADRAMENTO", "PESQUISA", "COMPARACAO", "AGUARDANDO_DECISAO", "REABERTA"];
const CLOSED_DECISION: readonly DecisionLifecycle[] = ["RESOLVIDA", "REVISADA", "ARQUIVADA"];

export const isoDay = (iso: string) => iso.slice(0, 10);
const DAY_MS = 86_400_000;
/** Dias de `from` até `to` (datas AAAA-MM-DD; negativo = `to` já passou). */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${isoDay(to)}T00:00:00Z`) - Date.parse(`${isoDay(from)}T00:00:00Z`)) / DAY_MS);

/** Tarefa com prazo de natureza legal (Jurídico, nº de processo, base legal ou categoria contratual/regulatória). */
export const isLegalTask = (t: HandoffTaskInput) =>
  t.area === "JURIDICO" || !!t.extensions?.caseNumber?.trim() || !!t.extensions?.legalBasis?.trim() || LEGAL_CATEGORIES.has(t.category ?? "");

/** Pendência de uma tarefa do Acervo (a mais grave; `undefined` = sem pendência). */
export function taskPendency(t: HandoffTaskInput, today: string, windowDays = LEGAL_WINDOW_DAYS): PendencyKind | undefined {
  if (!OPEN_TASK_STATES.has(t.state ?? "")) return undefined;
  const due = t.dueAt ? isoDay(t.dueAt) : null;
  if (due && isLegalTask(t) && daysBetween(today, due) <= windowDays) return "PRAZO_LEGAL";
  if (due && due < today) return "VENCIDA";
  if (t.state === "BLOQUEADA") return "BLOQUEADA";
  return undefined;
}

export const pendencyRank = (p: PendencyKind | undefined) => (p ? PENDENCY_KINDS.indexOf(p) : PENDENCY_KINDS.length);

const k = (key: string, vars?: Fact["vars"]): Fact => (vars ? { key, vars } : { key });

export function collectDossier(input: CollectInput): Collected {
  const { subject, today, people } = input;
  const me = subject.id;
  const legalWindow = input.legalWindowDays ?? LEGAL_WINDOW_DAYS;
  const items: HandoffItem[] = [];
  const sources = new Set<ItemSource>();
  const history = { tasksDone: 0, decisionsClosed: 0, activitiesDone: 0 };
  let privateExcluded = 0;
  const nameOf = (id: string | undefined | null) => (id ? people[id]?.name ?? id : "");
  const add = (it: Omit<HandoffItem, "successorId" | "note"> & Partial<Pick<HandoffItem, "successorId" | "note">>) => {
    items.push({ successorId: null, note: "", ...it });
    sources.add(it.source);
  };
  // contatos agregados por pessoa (nome e papéis no trabalho; nada de contato pessoal)
  const contacts = new Map<string, Fact[]>();
  const contact = (userId: string, fact: Fact) => {
    if (userId === me) return;
    const list = contacts.get(userId) ?? [];
    if (!list.some((f) => f.key === fact.key && JSON.stringify(f.vars) === JSON.stringify(fact.vars))) list.push(fact);
    contacts.set(userId, list);
  };
  const seenRefs = new Set<string>();

  // --- projetos da Mesa (DEMO)
  for (const p of input.projects) {
    const roles = p.team.filter((m) => m.userId === me).map((m) => m.role);
    const mine = p.tasks.filter((x) => x.responsibleId === me);
    if (!roles.length && !mine.length) continue;
    if (p.currentPhase === "ENCERRAMENTO" && p.closure.archived) continue; // encerrado e arquivado: só história
    const open = mine.filter((x) => x.status !== "CONCLUIDA");
    history.activitiesDone += mine.length - open.length;
    const lessons = p.lessons.filter((l) => l.authorId === me);
    add({
      id: `projeto:${p.id}`, section: "PROJETOS", title: p.title, href: `/projects/${encodeURIComponent(p.id)}/edit`, source: "DEMO", transferable: true,
      facts: [
        k("handoff.fact.phase", { phase: `@pm.phase.${p.currentPhase}` }),
        ...roles.map((r) => k("handoff.fact.projectRole", { role: `@pm.role.${r}` })),
        k("handoff.fact.activities", { open: open.length, done: mine.length - open.length }),
      ],
    });
    for (const a of open) {
      add({
        id: `atividade:${p.id}:${a.id}`, section: "TAREFAS", title: `${a.code} ${a.title}`, href: `/projects/${encodeURIComponent(p.id)}/edit`, source: "DEMO", transferable: true,
        facts: [k("handoff.fact.inProject", { project: p.title }), k("handoff.fact.flowStatus", { status: `@pm.status.${a.status}` }), k("handoff.fact.percent", { n: a.percentComplete })],
      });
    }
    for (const c of p.changes.filter((x) => x.requesterId === me && (x.status === "SOLICITADA" || x.status === "EM_ANALISE"))) {
      add({
        id: `mudanca:${p.id}:${c.id}`, section: "PENDENCIAS", title: `${c.code} ${c.title}`, href: `/projects/${encodeURIComponent(p.id)}/edit`, source: "DEMO", transferable: true,
        pendency: "MUDANCA_PENDENTE", due: null,
        facts: [k("handoff.fact.inProject", { project: p.title }), k("handoff.fact.changeStatus", { status: `@pm.changeStatus.${c.status}` })],
      });
    }
    for (const r of p.risks.filter((x) => x.status === "ABERTO" && x.ownerId === me)) {
      add({
        id: `risco:${p.id}:${r.id}`, section: "RISCOS", title: r.title, href: `/projects/${encodeURIComponent(p.id)}/edit`, source: "DEMO", transferable: true,
        facts: [
          k("handoff.fact.inProject", { project: p.title }),
          k(r.kind === "OPORTUNIDADE" ? "handoff.fact.opportunity" : "handoff.fact.threat", { p: Math.round(r.probability * 100), impact: r.impactLevel }),
        ],
      });
    }
    for (const s of p.stakeholders) {
      add({
        id: `parte:${p.id}:${s.id}`, section: "CONTATOS", title: s.name, href: null, source: "DEMO", transferable: false,
        facts: [k("handoff.fact.stakeholder", { role: s.role ?? "—", project: p.title }), k("handoff.fact.powerInterest", { power: s.power, interest: s.interest })],
      });
    }
    for (const m of p.team) contact(m.userId, k("handoff.fact.teamRole", { role: `@pm.role.${m.role}`, project: p.title }));
    for (const cm of (p.communications ?? []).filter((x) => x.ownerId === me)) {
      const audience = cm.audienceIds.map((id) => p.stakeholders.find((s) => s.id === id)?.name ?? id).join(", ");
      add({
        id: `comunicacao:${p.id}:${cm.id}`, section: "CONTATOS", title: cm.info, href: `/projects/${encodeURIComponent(p.id)}/edit`, source: "DEMO", transferable: true,
        facts: [k("handoff.fact.communication", { audience, channel: `@pm.comm.channel.${cm.channel}`, frequency: `@pm.comm.frequency.${cm.frequency}` })],
      });
    }
    for (const l of lessons) {
      add({
        id: `licao:${p.id}:${l.id}`, section: "FONTES", title: l.text, href: `/projects/${encodeURIComponent(p.id)}/edit`, source: "DEMO", transferable: false,
        facts: [k("handoff.fact.lesson", { project: p.title, phase: `@pm.phase.${l.phase}` })],
      });
    }
  }

  // --- decisões do DECIA (DEMO, só leitura)
  for (const agg of input.decisions) {
    const d = agg.decision;
    const part = agg.participants.find((x) => x.userId === me);
    const owner = d.ownerUserId === me;
    if (!owner && !part) continue;
    if (d.status === "ARQUIVADA") continue;
    for (const e of agg.evidence) {
      add({
        id: `evidencia:${d.id}:${e.id}`, section: "FONTES", title: e.title, href: e.sourceUrl ?? `/decia/decisoes/${encodeURIComponent(d.id)}`, source: "DEMO", transferable: false,
        facts: [k("handoff.fact.evidence", { decision: d.title, source: e.sourceLabel })],
      });
    }
    if (CLOSED_DECISION.includes(d.status)) {
      history.decisionsClosed += 1;
      continue;
    }
    const nextCheck = agg.checkpoints.filter((c) => c.status === "AGENDADO").map((c) => isoDay(c.dueAt)).sort()[0];
    const target = d.targetDate ? isoDay(d.targetDate) : null;
    let pendency: PendencyKind | undefined;
    let due: string | null = target;
    if (OPEN_DECISION.includes(d.status) && target && target < today) pendency = "DECISAO_ATRASADA";
    else if (owner && nextCheck && daysBetween(today, nextCheck) <= legalWindow) {
      pendency = "REVISAO_PROXIMA";
      due = nextCheck;
    }
    add({
      id: `decisao:${d.id}`, section: "DECISOES", title: d.title, href: `/decia/decisoes/${encodeURIComponent(d.id)}`, source: "DEMO", transferable: true, pendency, due,
      facts: [
        k("handoff.fact.decisionStatus", { status: `@decia.status.${d.status}` }),
        owner ? k("handoff.fact.decisionOwner") : k("handoff.fact.decisionRole", { role: `@decia.role.${part!.role}` }),
        ...(target ? [k("handoff.fact.target", { date: target })] : []),
        ...(nextCheck ? [k("handoff.fact.nextReview", { date: nextCheck })] : []),
      ],
    });
    for (const r of agg.risks.filter((x) => x.status === "ABERTO" && x.ownerUserId === me)) {
      add({
        id: `risco-decisao:${d.id}:${r.id}`, section: "RISCOS", title: r.title, href: `/decia/decisoes/${encodeURIComponent(d.id)}`, source: "DEMO", transferable: true,
        facts: [k("handoff.fact.inDecision", { decision: d.title }), k("handoff.fact.decisionRisk", { likelihood: `@decia.likelihood.${r.likelihood}`, impact: `@decia.level.${r.impact}` })],
      });
    }
    for (const x of agg.participants) contact(x.userId, k("handoff.fact.decisionContact", { role: `@decia.role.${x.role}`, decision: d.title }));
    if (d.ownerUserId && d.ownerUserId !== me) contact(d.ownerUserId, k("handoff.fact.decisionOwnerOf", { decision: d.title }));
  }

  // --- tarefas do Acervo (API real quando logado, exemplo no laboratório)
  for (const t of input.tasks) {
    const id = t.id ?? "";
    if (!id || t.state === "ARQUIVADA") continue;
    const involved = (t.ownerId ?? me) === me || t.responsibleId === me;
    if (!involved) continue;
    if (t.visibility === "PRIVADA" && !input.consentForPrivateItems) {
      privateExcluded += 1;
      continue;
    }
    const restricted = t.accessClass === "SIGILOSO";
    if (!restricted) {
      for (const r of t.references ?? []) {
        const url = (r.url ?? "").trim();
        if (!/^https?:\/\//i.test(url) || seenRefs.has(url)) continue;
        seenRefs.add(url);
        add({ id: `referencia:${seenRefs.size}`, section: "FONTES", title: (r.label ?? "").trim() || url, href: url, source: input.taskSource, transferable: false, facts: [k("handoff.fact.fromTask", { task: t.title ?? "" })] });
      }
    }
    if (!OPEN_TASK_STATES.has(t.state ?? "")) {
      if (t.state === "CONCLUIDA") history.tasksDone += 1;
      continue;
    }
    const pendency = taskPendency(t, today, legalWindow);
    const facts: Fact[] = [k("handoff.fact.taskState", { state: `@social.taskState.${t.state}` })];
    if (t.dueAt) facts.push(k("handoff.fact.due", { date: isoDay(t.dueAt) }));
    if (t.priority === "ALTA" || t.priority === "CRITICA") facts.push(k("handoff.fact.priority", { priority: `@tasks.priority.${t.priority}` }));
    if (t.state === "BLOQUEADA" && t.blockReason && !restricted) facts.push(k("handoff.fact.blocked", { reason: t.blockReason }));
    if (pendency === "PRAZO_LEGAL" && !restricted && t.extensions?.caseNumber) facts.push(k("handoff.fact.caseNumber", { n: t.extensions.caseNumber }));
    add({
      // só a tarefa real (API) tem página; a do exemplo do laboratório não
      id: `tarefa:${id}`, section: "TAREFAS", title: restricted ? "" : t.title ?? "", href: input.taskSource === "API" ? `/tasks/${encodeURIComponent(id)}` : null, source: input.taskSource, transferable: true,
      pendency, due: t.dueAt ? isoDay(t.dueAt) : null, restricted, facts,
    });
  }

  // --- contatos: uma linha por pessoa, com os papéis no trabalho
  for (const [userId, facts] of contacts) {
    add({ id: `contato:${userId}`, section: "CONTATOS", title: nameOf(userId), href: null, source: "DEMO", transferable: false, facts });
  }

  // --- Memória Institucional: trechos exatos para citar
  for (const h of input.memory ?? []) {
    add({
      id: `memoria:${h.docId}:${h.passage.start}`, section: "FONTES", title: h.title, href: h.href, source: "MEMORIA", transferable: false,
      citation: { text: h.passage.text, ref: h.citation },
      // o ano vai como texto: número seria formatado com separador de milhar ("2.025")
      facts: [k("handoff.fact.memory", { kind: `@handoff.memoryKind.${h.kind}`, department: h.department ?? "—", year: h.year != null ? String(h.year) : "—" })],
    });
  }

  return { items: sortItems(items), privateExcluded, sources: [...sources].sort(), history };
}

const SECTION_ORDER: readonly HandoffSection[] = ["PROJETOS", "TAREFAS", "DECISOES", "PENDENCIAS", "RISCOS", "CONTATOS", "FONTES"];
const phaseRank = (it: HandoffItem) => {
  const phase = it.facts.find((f) => f.key === "handoff.fact.phase")?.vars?.phase;
  const i = typeof phase === "string" ? PROJECT_PHASES.indexOf(phase.replace("@pm.phase.", "") as (typeof PROJECT_PHASES)[number]) : -1;
  return i < 0 ? 99 : i;
};

/** Ordem estável: seção; dentro dela, pendência mais grave e prazo mais próximo primeiro; projetos pela fase; contatos e fontes pelo nome. */
export function sortItems(items: readonly HandoffItem[]): HandoffItem[] {
  return [...items].sort((a, b) => {
    const s = SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section);
    if (s) return s;
    if (a.section === "PROJETOS") return phaseRank(a) - phaseRank(b) || a.title.localeCompare(b.title, "pt-BR");
    if (a.section === "CONTATOS" || a.section === "FONTES") return Number(b.source === "MEMORIA") - Number(a.source === "MEMORIA") || a.title.localeCompare(b.title, "pt-BR");
    return pendencyRank(a.pendency) - pendencyRank(b.pendency) || (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.title.localeCompare(b.title, "pt-BR");
  });
}

/** Itens com pendência (de qualquer seção) — a lista "Pendências" do dossiê, da mais grave para a menos grave. */
export const pendenciesOf = (items: readonly HandoffItem[]) =>
  items.filter((i) => i.pendency).sort((a, b) => pendencyRank(a.pendency) - pendencyRank(b.pendency) || (a.due ?? "9999").localeCompare(b.due ?? "9999"));

/** Busca na Memória Institucional com os títulos do que a pessoa deixa (projetos, decisões, tarefas não sigilosas). */
export function memoryQueryFor(items: readonly HandoffItem[]): string {
  return items
    .filter((i) => (i.section === "PROJETOS" || i.section === "DECISOES" || i.section === "TAREFAS") && !i.restricted && i.title)
    .map((i) => i.title)
    .join(" ")
    .slice(0, 600);
}

/**
 * Coleta completa em duas passadas: os itens do sistema e, com os títulos deles, os trechos da Memória Institucional (só o que a
 * pessoa pode ler: PÚBLICO e INTERNO). A busca é injetada (`searchMemory` em produção; sem índice carregado, devolve vazio).
 */
export function collectWithMemory(input: Omit<CollectInput, "memory">, search: MemorySearch): Collected {
  const first = collectDossier(input);
  const query = memoryQueryFor(first.items);
  const memory = query ? search(query, { k: 5, readable: ["PUBLICO", "INTERNO"] }) : [];
  return memory.length ? collectDossier({ ...input, memory }) : first;
}
