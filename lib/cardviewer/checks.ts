/**
 * "Melhorias ✦" — o CI da IA da Work Station sobre uma tarefa ou um projeto: verificações DETERMINÍSTICAS (D-12) que dão PASSOU,
 * ATENÇÃO ou FALHOU, cada uma com o porquê, a sugestão concreta e "abrir onde corrigir". A IA só redige a partir destes resultados.
 *  • Tarefa: a checagem de qualidade do Acervo (`assessTask`, com a rubrica do campo de estudo quando há pacote) + prazos (vencendo,
 *    vencido, prazo legal sem regra), critérios de aceite na conclusão, anexos/evidências faltando, responsável, classificação de
 *    acesso coerente com a categoria, descrição vaga e bloqueio sem motivo.
 *  • Projeto: os indicadores e portões do motor (`computeMetrics`: IDC/IDP, caminho crítico, reserva, riscos sem resposta, RACI,
 *    mudanças pendentes…) e o Espelho de Conformidade (`mirrorSummary`).
 * "Aplicar sugestão" só existe para as correções seguras da checagem do Acervo (critério, entrega, referência, campo da área,
 * classificação), e vira um corpo de PUT a partir da versão atual (`requestFromView`) — a pessoa revisa e confirma.
 */
import type { OccupationPack } from "@/lib/career/occupationPack";
import { mirrorSummary, type MirrorSummary } from "@/lib/projects/compliance/evaluate";
import { computeMetrics, type LinkedDecision } from "@/lib/projects/metrics";
import { allMetrics } from "@/lib/projects/feedback";
import { effectiveDueOf, isOpenState } from "@/lib/tasks/acervo";
import { requestFromView, type TaskRequest, type TaskView } from "@/lib/tasks/client";
import { deadlineStatus, isIsoDate } from "@/lib/tasks/legalDeadline";
import { assessTask, type CheckStatus, type QuickFix } from "@/lib/tasks/quality";
import { formatFromView, matchesFormat, type FormatChoice } from "@/lib/tasks/formats";
import type { TaskDraft } from "@/lib/tasks/templates";
import type { ProjectSubject, TaskSubject } from "./subject";

export type Verdict = "FALHOU" | "ATENCAO" | "PASSOU";
export const VERDICTS: readonly Verdict[] = ["FALHOU", "ATENCAO", "PASSOU"];
export const VERDICT_MARK: Record<Verdict, string> = { FALHOU: "✕", ATENCAO: "!", PASSOU: "✓" };

export type CheckGroup = "QUALIDADE" | "AREA" | "CAMPO" | "PRAZO" | "ARQUIVOS" | "PESSOAS" | "ACESSO" | "MOTOR" | "ESPELHO";

export interface Msg { key: string; vars?: Record<string, string | number> }
export interface ImprovementCheck {
  id: string;
  group: CheckGroup;
  verdict: Verdict;
  title: Msg;
  /** o que foi encontrado */
  detail: Msg;
  /** por que importa */
  why: Msg;
  /** sugestão concreta (ausente quando passou) */
  suggestion?: Msg;
  /** indicador do motor do projeto (o texto vem de `pm.metric.<id>.*`) */
  metric?: { id: string; vars: Record<string, string | number> };
  /** correção aplicável com revisão (só tarefa da API) */
  fix?: QuickFix;
  /** onde corrigir */
  where: { href: string; label: Msg };
}

export interface CheckReport { checks: ImprovementCheck[]; counts: Record<Verdict, number>; noData: number }

const RANK: Record<Verdict, number> = { FALHOU: 0, ATENCAO: 1, PASSOU: 2 };
const fromQuality: Record<CheckStatus, Verdict> = { FALTA: "FALHOU", AVISO: "ATENCAO", OK: "PASSOU" };

function report(checks: ImprovementCheck[], noData = 0): CheckReport {
  const sorted = checks.map((c, i) => ({ c, i })).sort((a, b) => RANK[a.c.verdict] - RANK[b.c.verdict] || a.i - b.i).map((x) => x.c);
  const counts: Record<Verdict, number> = { FALHOU: 0, ATENCAO: 0, PASSOU: 0 };
  for (const c of sorted) counts[c.verdict] += 1;
  return { checks: sorted, counts, noData };
}

/* ── tarefa ──────────────────────────────────────────────────────────────────────────────────────────────── */

export function draftOf(s: TaskSubject): TaskDraft {
  return {
    title: s.title, type: s.type as TaskDraft["type"], area: (s.area ?? "") as TaskDraft["area"], objective: s.objective, descriptionMd: s.descriptionMd,
    priority: (s.priority ?? "MEDIA") as TaskDraft["priority"], dueAt: s.dueAt ?? "", accessClass: s.accessClass as TaskDraft["accessClass"],
    visibility: s.visibility as TaskDraft["visibility"], deliverables: [...s.deliverables], criteria: s.criteria.map((c) => c.text), references: [...s.references],
    extensions: { ...s.extensions },
  };
}

/** Tipos cuja entrega é um arquivo (sem anexo, a tarefa não tem o que mostrar). */
const FILE_TYPES = new Set(["DOCUMENTO", "PLANILHA", "IMAGEM_EDITADA", "IMAGEM_WEB", "DESENHO_TECNICO", "APRESENTACAO", "DIAGRAMA", "FORMULARIO", "ATA_REGISTRO", "ESTUDO_TECNICO_PRELIMINAR", "CRONOGRAMA", "PAGINA_WEB"]);
/** Categorias que pedem evidência (foto com data/local). */
const EVIDENCE_CATEGORIES = new Set(["VISTORIA_RELATORIO_FOTOGRAFICO", "LICENCA_ANUENCIA"]);
/** Categorias que costumam carregar dado pessoal ou estratégico: público pede atenção. */
const SENSITIVE_CATEGORIES = new Set(["PARECER_TECNICO", "CONTRATO_CONVENIO", "TERMO_REFERENCIA", "PLANILHA_ORCAMENTARIA", "LICENCA_ANUENCIA"]);
const VAGUE = /\b(adequad[oa]s?|de qualidade|melhor(ar|ia)?|otimizar|eficiente|satisfatori[oa]|etc\.?|diversos|v[aá]rios)\b/i;

export interface TaskCheckInput {
  subject: TaskSubject;
  today: string;
  /** anexos e evidências conhecidos (API); `null` = fonte sem arquivos (DEMO) — os checks de arquivo ficam de fora */
  files: { attachments: number; evidences: number; list?: readonly { fileName?: string; mimeType?: string }[] } | null;
  pack?: OccupationPack | null;
}

export function taskChecks({ subject: s, today, files, pack }: TaskCheckInput): CheckReport {
  const edit = s.source === "API" ? `/tasks/${s.id}/edit` : `/tasks/${s.id}`;
  const where = (labelKey = "cardviewer.where.edit") => ({ href: edit, label: { key: labelKey } });
  const out: ImprovementCheck[] = [];
  const mine = (id: string, group: CheckGroup, verdict: Verdict, vars: Record<string, string | number> = {}, w = where()): ImprovementCheck => ({
    id, group, verdict, title: { key: `cardviewer.check.${id}.title` },
    detail: { key: `cardviewer.check.${id}.${verdict === "PASSOU" ? "pass" : verdict === "ATENCAO" ? "warn" : "fail"}`, vars },
    why: { key: `cardviewer.check.${id}.why` }, suggestion: verdict === "PASSOU" ? undefined : { key: `cardviewer.check.${id}.fix`, vars }, where: w,
  });

  // 1. checagem de qualidade do Acervo (essencial, área e rubrica do campo)
  const q = assessTask(draftOf(s), pack ?? null);
  for (const c of q.checks) {
    const verdict = fromQuality[c.status];
    const vars = c.vars ?? {};
    const fix = verdict !== "PASSOU" && s.source === "API" ? c.fixes?.[0] : undefined;
    out.push({
      id: `q.${c.id}`, group: c.group === "ESSENCIAL" ? "QUALIDADE" : c.group, verdict, title: { key: `tasks.q.${c.id}.title` },
      detail: { key: `tasks.q.${c.id}.${c.status === "OK" ? "ok" : c.status === "AVISO" ? "warn" : "missing"}`, vars },
      why: { key: `tasks.q.${c.id}.why` }, suggestion: verdict === "PASSOU" ? undefined : { key: `tasks.q.${c.id}.${c.status === "AVISO" ? "warn" : "missing"}`, vars },
      fix, where: where(),
    });
  }

  // 2. prazos (só tarefa aberta cobra prazo)
  const open = isOpenState(s.state as never);
  const eff = effectiveDueOf(s.dueAt, s.legalDueAt);
  if (open && eff && isIsoDate(eff)) {
    const st = deadlineStatus(eff, today);
    const legal = eff === s.legalDueAt;
    const v: Verdict = st.kind === "VENCIDA" ? "FALHOU" : st.kind === "HOJE" || st.days <= 3 ? "ATENCAO" : "PASSOU";
    out.push(mine("prazoSituacao", "PRAZO", v, { days: Math.abs(st.days), date: eff, kind: legal ? "legal" : "task" }));
  }
  if (s.legalDueAt) out.push(mine("prazoLegalRegra", "PRAZO", s.legalRuleId ? "PASSOU" : "ATENCAO", { date: s.legalDueAt }));

  // 3. critérios na conclusão
  if (s.criteria.length) {
    const pending = s.criteria.filter((c) => !c.done).length;
    const done = s.state === "CONCLUIDA";
    out.push(mine("criteriosConclusao", "QUALIDADE", done && pending ? "FALHOU" : "PASSOU", { pending, total: s.criteria.length }));
  }

  // 4. arquivos (só quando a fonte tem arquivos)
  if (files) {
    if (FILE_TYPES.has(s.type)) {
      const v: Verdict = files.attachments > 0 ? "PASSOU" : s.state === "CONCLUIDA" ? "FALHOU" : "ATENCAO";
      out.push(mine("anexos", "ARQUIVOS", v, { n: files.attachments, type: s.type }, { href: s.source === "API" ? `/tasks/${s.id}` : edit, label: { key: "cardviewer.where.files" } }));
    }
    const asked = formatFromView({ extensions: s.extensions });
    const mism = formatMismatch(asked, files.list ?? []);
    if (mism) {
      const v: Verdict = mism.wrong.length === 0 ? "PASSOU" : mism.right === 0 && s.state === "CONCLUIDA" ? "FALHOU" : "ATENCAO";
      out.push(mine("formatoAnexo", "ARQUIVOS", v, { asked: mism.asked, files: mism.wrong.slice(0, 3).join(", "), n: mism.wrong.length }, { href: edit, label: { key: "cardviewer.where.edit" } }));
    }
    if (s.category && EVIDENCE_CATEGORIES.has(s.category)) {
      const v: Verdict = files.evidences > 0 ? "PASSOU" : s.state === "CONCLUIDA" ? "FALHOU" : "ATENCAO";
      out.push(mine("evidencias", "ARQUIVOS", v, { n: files.evidences }, { href: `/tasks/${s.id}`, label: { key: "cardviewer.where.files" } }));
    }
  }

  // 5. pessoas e acesso
  const high = s.priority === "ALTA" || s.priority === "CRITICA";
  out.push(mine("responsavel", "PESSOAS", s.responsibleId ? "PASSOU" : open && high ? "FALHOU" : "ATENCAO"));
  if (s.category && SENSITIVE_CATEGORIES.has(s.category)) out.push(mine("acessoCategoria", "ACESSO", s.accessClass === "PUBLICO" ? "ATENCAO" : "PASSOU", { category: s.category }));
  if (s.state === "BLOQUEADA") out.push(mine("bloqueioMotivo", "PESSOAS", s.blockReason ? "PASSOU" : "FALHOU"));

  // 6. descrição
  const desc = s.descriptionMd.trim();
  const descV: Verdict = desc.length >= 40 && !(VAGUE.test(desc) && !/\d/.test(desc)) ? "PASSOU" : "ATENCAO";
  out.push(mine("descricao", "QUALIDADE", descV, { n: desc.length }));

  return report(out);
}

/**
 * Anexos em formato diferente do pedido (família → variante de `lib/tasks/formats.ts`). Pedido só de família: confere a família;
 * com variante: confere a variante (PDF e PDF/A contam como o mesmo arquivo). Sem formato pedido ou sem anexos: `null` (não se aplica).
 */
export function formatMismatch(asked: FormatChoice, files: readonly { fileName?: string; mimeType?: string }[]): { asked: string; wrong: string[]; right: number } | null {
  if (!asked.family || !files.length) return null;
  // uma regra só com o criador e o Acervo: `matchesFormat` do catálogo (aceita, por exemplo, PDF de prancha em Desenho técnico)
  const wrong: string[] = [];
  let right = 0;
  for (const f of files) {
    if (matchesFormat(asked, f) === true) right += 1;
    else wrong.push(f.fileName ?? "?");
  }
  return { asked: asked.variant || asked.family, wrong, right };
}

/** Corpo de PUT com a correção aplicada (preserva todo o resto e a versão, para o servidor recusar se alguém mudou antes). */
export function applyFix(view: TaskView, fix: QuickFix): TaskRequest {
  switch (fix.kind) {
    case "ADD_CRITERION": return requestFromView(view, { acceptanceCriteria: [...(view.acceptanceCriteria ?? []), { text: fix.text, done: false }] });
    case "ADD_DELIVERABLE": return requestFromView(view, { deliverables: [...(view.deliverables ?? []), { text: fix.text }] });
    case "ADD_REFERENCE": return requestFromView(view, { references: [...(view.references ?? []), { label: fix.label, url: fix.url }] });
    case "SET_EXTENSION": return requestFromView(view, { extensions: { ...(view.extensions ?? {}), [fix.key]: fix.value } });
    case "SET_ACCESS": return requestFromView(view, { accessClass: fix.accessClass });
  }
}

/* ── projeto ─────────────────────────────────────────────────────────────────────────────────────────────── */

const fromMetric = { OK: "PASSOU", ATENCAO: "ATENCAO", CRITICO: "FALHOU" } as const;

export function projectChecks(p: ProjectSubject, decisions: readonly LinkedDecision[] = [], mirror?: MirrorSummary): CheckReport {
  if (p.variant === "MURAL") {
    // esquema leve do Mural: sem modelo do motor; o que dá para verificar é o que o esquema tem
    const pr = p.project;
    const out: ImprovementCheck[] = [];
    const w = { href: `/projects/${pr.id}`, label: { key: "cardviewer.where.project" } };
    const c = (id: string, verdict: Verdict, vars: Record<string, string | number> = {}): ImprovementCheck => ({
      id, group: "MOTOR", verdict, title: { key: `cardviewer.check.${id}.title` }, detail: { key: `cardviewer.check.${id}.${verdict === "PASSOU" ? "pass" : verdict === "ATENCAO" ? "warn" : "fail"}`, vars },
      why: { key: `cardviewer.check.${id}.why` }, suggestion: verdict === "PASSOU" ? undefined : { key: `cardviewer.check.${id}.fix`, vars }, where: w,
    });
    out.push(c("projMarco", pr.nextMilestoneAt ? "PASSOU" : "ATENCAO"));
    out.push(c("projResponsavel", pr.responsibleId ? "PASSOU" : "ATENCAO"));
    out.push(c("projObjetivo", pr.objective && pr.objective.trim().length >= 20 ? "PASSOU" : "ATENCAO"));
    return report(out, 1);
  }
  const m = p.model;
  const metrics = computeMetrics(m, decisions);
  const out: ImprovementCheck[] = [];
  let noData = 0;
  for (const x of allMetrics(metrics)) {
    if (x.status === "SEM_DADOS") {
      noData += 1;
      continue;
    }
    const verdict = fromMetric[x.status];
    out.push({
      id: `m.${x.id}`, group: "MOTOR", verdict, title: { key: `pm.metric.${x.id}.title` }, detail: { key: `pm.metric.${x.id}.detail`, vars: x.vars },
      why: { key: `pm.ref.${x.ref}` }, suggestion: verdict === "PASSOU" ? undefined : { key: `pm.metric.${x.id}.advice` },
      metric: { id: x.id, vars: x.vars },
      where: { href: `/projects/${m.id}/edit${x.tab === "quadro" ? "" : `?aba=${x.tab}`}`, label: { key: "cardviewer.where.tab", vars: { tab: x.tab } } },
    });
  }
  const ms = mirror ?? mirrorSummary(m);
  const mv: Verdict = ms.gate === "BLOQUEADO" ? "FALHOU" : ms.percent !== null && ms.percent < 80 ? "ATENCAO" : "PASSOU";
  out.push({
    id: "espelho", group: "ESPELHO", verdict: mv, title: { key: "cardviewer.check.espelho.title" },
    detail: { key: `cardviewer.check.espelho.${mv === "PASSOU" ? "pass" : mv === "ATENCAO" ? "warn" : "fail"}`, vars: { percent: ms.percent ?? 0, met: ms.met, applicable: ms.applicable, blocking: ms.blocking.slice(0, 4).join(", "), n: ms.blocking.length } },
    why: { key: "cardviewer.check.espelho.why" }, suggestion: mv === "PASSOU" ? undefined : { key: "cardviewer.check.espelho.fix", vars: { n: ms.blocking.length } },
    where: { href: `/projects/${m.id}/mirror`, label: { key: "cardviewer.where.mirror" } },
  });
  return report(out, noData);
}
