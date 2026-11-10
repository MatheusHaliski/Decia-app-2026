/**
 * Checagem de qualidade da tarefa no criador do Acervo (RF4 + RF43 + RF75.CA06 "pré-checagem pela rubrica"). Determinística: o
 * sistema verifica e a IA, quando conectada, só redige a partir destes resultados (D-12). Três camadas:
 *  • ESSENCIAL — vale para qualquer tarefa: objetivo tangível (medida e prazo), entregas como substantivos, critérios de aceite
 *    verificáveis, prazo, referências válidas, privacidade coerente;
 *  • ÁREA — regras da área de trabalho escolhida (ex.: Software pede repositório e testes; Jurídico, número CNJ e base legal;
 *    Engenharia, norma técnica e ART; Pesquisa, pergunta, método, amostra e consentimento);
 *  • CAMPO — rubrica, entregas típicas, fontes e dados sensíveis do pacote da profissão (campo de estudo escolhido).
 * Cada achado traz a correção aplicável com um clique (`fixes`) quando há uma.
 */
import type { OccupationPack } from "@/lib/career/occupationPack";
import { looksLikeActivity } from "@/lib/projects/engine/methods";
import { AREA_EXTENSIONS, type WorkArea } from "./client";
import type { TaskDraft } from "./templates";

export type CheckStatus = "OK" | "AVISO" | "FALTA";
export type CheckGroup = "ESSENCIAL" | "AREA" | "CAMPO";
export type QuickFix =
  | { kind: "ADD_CRITERION"; text: string }
  | { kind: "ADD_DELIVERABLE"; text: string }
  | { kind: "ADD_REFERENCE"; label: string; url: string }
  | { kind: "SET_EXTENSION"; key: string; value: string }
  | { kind: "SET_ACCESS"; accessClass: TaskDraft["accessClass"] };
export interface QualityCheck { id: string; group: CheckGroup; status: CheckStatus; vars?: Record<string, string | number>; field?: string; fixes?: QuickFix[] }
export interface QualityReport {
  checks: QualityCheck[];
  counts: Record<CheckStatus, number>;
  /** PRONTA: nada falta nem pede atenção · QUASE: só avisos · INCOMPLETA: falta algo essencial */
  readiness: "PRONTA" | "QUASE" | "INCOMPLETA";
}

// ------------------------------------------------------------------ texto
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const STOP = new Set(["para", "com", "sem", "uma", "das", "dos", "que", "por", "pela", "pelo", "como", "mais", "este", "esta", "esse", "essa", "entre", "sobre", "cada", "todo", "toda", "ser", "tem", "ter", "sao", "nas", "nos", "ate"]);
/** Radicais de palavras significativas (≥ 4 letras, 6 primeiras) para comparar textos sem depender de flexão. */
export function stems(s: string): Set<string> {
  return new Set(norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.slice(0, 6)));
}
const overlap = (a: Set<string>, b: Set<string>) => [...a].filter((x) => b.has(x)).length;

const HAS_NUMBER = /\d/;
const HAS_DEADLINE = /\b(ate|prazo|dia|dias|semana|semanas|mes|meses|trimestre|semestre|ano|horas?|\d{1,2}\/\d{1,2}(\/\d{2,4})?|\d{4}-\d{2}-\d{2})\b/;
const VAGUE = /\b(adequad[oa]s?|de qualidade|bom|boa|bons|boas|melhor(ar|ia)?|otimizar|eficiente|satisfatori[oa]|correto|correta)\b/;
const PLACEHOLDER = /\[[^\]]{1,60}\]/;
const GENERIC_TITLES = new Set(["tarefa", "teste", "documento", "nova tarefa", "atividade", "trabalho", "relatorio", "reuniao"]);
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

const deadlineIn = (s: string) => HAS_DEADLINE.test(norm(s));
const isVague = (s: string) => VAGUE.test(norm(s)) && !HAS_NUMBER.test(s);
const mentions = (re: RegExp, ...texts: string[]) => texts.some((t) => re.test(norm(t)));

// ------------------------------------------------------------------ checagem
export function assessTask(d: TaskDraft, pack?: OccupationPack | null): QualityReport {
  const checks: QualityCheck[] = [];
  const add = (c: QualityCheck) => checks.push(c);
  const allText = [d.title, d.objective, d.descriptionMd, ...d.criteria, ...d.deliverables];
  const criteria = d.criteria.map((c) => c.trim()).filter(Boolean);
  const deliverables = d.deliverables.map((c) => c.trim()).filter(Boolean);
  const refs = d.references.filter((r) => r.url.trim());

  // --- essencial
  const title = d.title.trim();
  add({ id: "titulo", group: "ESSENCIAL", field: "title", status: !title ? "FALTA" : title.length < 8 || GENERIC_TITLES.has(norm(title)) ? "AVISO" : "OK" });
  add({ id: "tipo", group: "ESSENCIAL", field: "type", status: d.type ? "OK" : "FALTA" });
  const obj = d.objective.trim();
  add({
    id: "objetivo", group: "ESSENCIAL", field: "objective",
    status: !obj ? "FALTA" : HAS_NUMBER.test(obj) || deadlineIn(obj) ? "OK" : "AVISO",
  });
  const placeholders = allText.filter((t) => PLACEHOLDER.test(t)).length;
  if (placeholders) add({ id: "marcadores", group: "ESSENCIAL", status: "AVISO", vars: { n: placeholders } });
  const verbs = deliverables.filter((x) => looksLikeActivity(x));
  add({
    id: "entregas", group: "ESSENCIAL", field: "deliverables",
    status: !deliverables.length ? "FALTA" : verbs.length ? "AVISO" : "OK",
    vars: verbs.length ? { text: verbs[0]! } : { n: deliverables.length },
  });
  const vague = criteria.filter(isVague);
  add({
    id: "criterios", group: "ESSENCIAL", field: "acceptanceCriteria",
    status: criteria.length === 0 ? "FALTA" : criteria.length < 2 || vague.length ? "AVISO" : "OK",
    vars: { n: criteria.length, vague: vague.length, text: vague[0] ?? "" },
  });
  add({
    id: "prazo", group: "ESSENCIAL", field: "dueAt",
    status: d.dueAt ? "OK" : d.priority === "ALTA" || d.priority === "CRITICA" ? "FALTA" : "AVISO",
  });
  const badRefs = d.references.filter((r) => (r.url.trim() || r.label.trim()) && !URL_RE.test(r.url.trim()));
  if (badRefs.length) add({ id: "referenciasUrl", group: "ESSENCIAL", field: "references", status: "AVISO", vars: { n: badRefs.length } });
  const restricted = d.accessClass === "RESTRITO" || d.accessClass === "SIGILOSO";
  if (restricted && (d.visibility === "EMPRESA" || d.visibility === "PUBLICA")) add({ id: "privacidade", group: "ESSENCIAL", field: "visibility", status: "FALTA" });

  // --- área
  if (d.area) areaChecks(d.area, d, criteria, refs, allText).forEach(add);

  // --- campo de estudo
  if (pack) fieldChecks(pack, d, criteria, deliverables, refs).forEach(add);

  const counts = { OK: 0, AVISO: 0, FALTA: 0 } as Record<CheckStatus, number>;
  for (const c of checks) counts[c.status] += 1;
  return { checks, counts, readiness: counts.FALTA ? "INCOMPLETA" : counts.AVISO ? "QUASE" : "PRONTA" };
}

function areaChecks(area: WorkArea, d: TaskDraft, criteria: string[], refs: TaskDraft["references"], allText: string[]): QualityCheck[] {
  const out: QualityCheck[] = [];
  const ext = (k: string) => (d.extensions[k] ?? "").trim();
  const keys = AREA_EXTENSIONS[area];
  const filled = keys.filter((k) => ext(k)).length;
  if (keys.length) out.push({ id: "areaCampos", group: "AREA", status: filled === keys.length ? "OK" : "AVISO", vars: { filled, total: keys.length }, field: "extensions" });
  const c = (id: string, ok: boolean, extra: Partial<QualityCheck> = {}) => out.push({ id, group: "AREA", status: ok ? "OK" : "AVISO", ...extra });
  switch (area) {
    case "SOFTWARE":
      c("swRepositorio", /^(https?:\/\/\S+|[\w.-]+\/[\w.-]+)$/.test(ext("repository")), { field: "ext.repository" });
      c("swTestes", mentions(/\b(test|teste|testes|cobertura|ci\b|revisao de codigo|code review)/, ...criteria), {
        fixes: [{ kind: "ADD_CRITERION", text: "Testes automatizados cobrem o caso e passam no pipeline de integração contínua" }],
      });
      c("swSeguranca", mentions(/\b(segur|owasp|vulnerab|segredo|senha|lgpd|dado pessoal)/, ...allText), {
        fixes: [{ kind: "ADD_CRITERION", text: "Sem segredos no código e sem vulnerabilidade do OWASP Top 10 introduzida" }, { kind: "ADD_REFERENCE", label: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/" }],
      });
      break;
    case "ADMINISTRACAO":
      c("admProcesso", Boolean(ext("process")), { field: "ext.process" });
      c("admIndicador", mentions(/\b(indicador|meta|sla|kpi|%|percent)/, d.objective, ...criteria) && (HAS_NUMBER.test(d.objective) || criteria.some((x) => HAS_NUMBER.test(x))), {
        fixes: [{ kind: "ADD_CRITERION", text: "Indicador de resultado definido com meta numérica, fonte do dado e periodicidade" }],
      });
      break;
    case "DESIGN":
      c("dsFormato", Boolean(ext("format") && ext("dimensions")), { field: "ext.format" });
      c("dsAcessibilidade", mentions(/\b(acessib|wcag|contraste|texto alternativo|alt text|leitor de tela)/, ...allText), {
        fixes: [
          { kind: "ADD_CRITERION", text: "Contraste mínimo de 4,5:1 no texto e texto alternativo em toda imagem informativa (WCAG 2.2)" },
          { kind: "ADD_REFERENCE", label: "WCAG 2.2", url: "https://www.w3.org/TR/WCAG22/" },
        ],
      });
      c("dsMarca", Boolean(ext("brandGuide")), { field: "ext.brandGuide" });
      break;
    case "PESQUISA": {
      c("pqPergunta", ext("question").endsWith("?"), { field: "ext.question" });
      c("pqMetodo", Boolean(ext("method")), { field: "ext.method" });
      c("pqAmostra", HAS_NUMBER.test(ext("sample")), { field: "ext.sample" });
      c("pqReferencias", refs.length >= 2, { vars: { n: refs.length }, field: "references" });
      const people = mentions(/\b(pessoa|participante|entrevist|questionario|servidor|usuari|paciente|aluno|estudante)/, ext("sample"), d.descriptionMd, d.objective);
      if (people) {
        c("pqEtica", mentions(/\b(consentimento|tcle|cep|comite de etica|lgpd|anonimiz)/, ...allText), {
          fixes: [
            { kind: "ADD_CRITERION", text: "Termo de consentimento livre e esclarecido aplicado e dados pessoais tratados conforme a LGPD" },
            { kind: "ADD_REFERENCE", label: "Lei 13.709/2018 (LGPD)", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" },
          ],
        });
      }
      break;
    }
    case "MARKETING": {
      c("mkPublico", Boolean(ext("audience")), { field: "ext.audience" });
      c("mkKpi", HAS_NUMBER.test(ext("indicator")), { field: "ext.indicator" });
      if (/\b(e-?mail|whats|sms|mensage)/.test(norm(ext("channel")))) {
        c("mkConsentimento", mentions(/\b(consentimento|opt-?in|descadastr|lgpd)/, ...allText), {
          fixes: [{ kind: "ADD_CRITERION", text: "Envio só para quem consentiu (opt-in) e com opção de descadastro em toda mensagem" }],
        });
      }
      break;
    }
    case "PLANEJAMENTO":
      c("plHorizonte", Boolean(ext("horizon")), { field: "ext.horizon" });
      c("plMarco", Boolean(ext("milestone")) && (HAS_NUMBER.test(ext("milestone")) || deadlineIn(ext("milestone"))), { field: "ext.milestone" });
      c("plSmart", HAS_NUMBER.test(d.objective) && deadlineIn(d.objective), { field: "objective" });
      break;
    case "ENGENHARIA":
      c("engNorma", /\b(nbr|abnt|iso|iec|nr[- ]?\d)/.test(norm(ext("standard"))), { field: "ext.standard" });
      c("engArt", mentions(/\b(art\b|rrt|anotacao de responsabilidade|registro de responsabilidade|responsavel tecnico)/, ...allText), {
        fixes: [{ kind: "ADD_CRITERION", text: "ART (ou RRT) do responsável técnico emitida e anexada à entrega" }],
      });
      break;
    case "JURIDICO": {
      const n = ext("caseNumber");
      if (n) c("jurNumero", /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(n), { field: "ext.caseNumber" });
      c("jurBase", /\b(lei|art\.?|artigo|decreto|resolucao|sumula|constituicao|cf\/88|portaria|instrucao normativa)\b/.test(norm(ext("legalBasis"))), { field: "ext.legalBasis" });
      out.push({ id: "jurPrazo", group: "AREA", status: d.dueAt ? "OK" : "FALTA", field: "dueAt" });
      if (d.accessClass === "PUBLICO") out.push({ id: "jurSigilo", group: "AREA", status: "AVISO", field: "accessClass", fixes: [{ kind: "SET_ACCESS", accessClass: "RESTRITO" }] });
      break;
    }
    case "OUTRA":
      break;
  }
  return out;
}

function fieldChecks(pack: OccupationPack, d: TaskDraft, criteria: string[], deliverables: string[], refs: TaskDraft["references"]): QualityCheck[] {
  const out: QualityCheck[] = [];
  const crit = criteria.map(stems);
  // rubrica objetiva do campo: só os critérios automáticos que valem para ESTA tarefa — os da tarefa-guia de onde o modelo veio
  // ou, sem ela, os das tarefas do mesmo tipo de peça (texto no Letters × desenho no Drawings); nunca os de outra tarefa
  const guided = (d.extensions.guidedTask ?? "").trim();
  const drawingTypes = new Set(["DESENHO_TECNICO", "IMAGEM_EDITADA", "IMAGEM_WEB"]);
  const customEditor = new Map(pack.guidedTasks.custom.map((c) => [c.id, c.editor]));
  const editorOf = (code: string) => (code.startsWith("D") ? "drawings" : code.startsWith("L") ? "letters" : customEditor.get(code));
  const wanted = drawingTypes.has(d.type) ? "drawings" : "letters";
  const rubric = pack.rubric.objective
    .filter((r) => r.auto && (guided ? r.appliesTo.includes(guided) : r.appliesTo.some((a) => editorOf(a) === wanted)))
    .slice(0, 6);
  if (rubric.length) {
    const covered = rubric.filter((r) => crit.some((c) => overlap(stems(r.check), c) >= 2));
    const missing = rubric.filter((r) => !covered.includes(r));
    out.push({
      id: "campoRubrica", group: "CAMPO", status: covered.length >= Math.min(2, rubric.length) ? "OK" : "AVISO",
      vars: { covered: covered.length, total: rubric.length },
      fixes: missing.slice(0, 3).map((r) => ({ kind: "ADD_CRITERION" as const, text: r.check.charAt(0).toUpperCase() + r.check.slice(1) })),
    });
  }
  const typical = pack.vocabulary.deliverables;
  if (typical.length) {
    const match = deliverables.some((x) => typical.some((t) => overlap(stems(x), stems(t)) >= 2));
    out.push({ id: "campoEntregas", group: "CAMPO", status: match ? "OK" : "AVISO", fixes: typical.slice(0, 2).map((t) => ({ kind: "ADD_DELIVERABLE" as const, text: t.charAt(0).toUpperCase() + t.slice(1) })) });
  }
  const cite = [...pack.ai.citeSources].sort((a, b) => rank(a.kind) - rank(b.kind));
  if (cite.length) {
    const hosts = new Set(cite.map((s) => hostOf(s.url)));
    const has = refs.some((r) => hosts.has(hostOf(r.url)));
    out.push({ id: "campoFontes", group: "CAMPO", status: has ? "OK" : "AVISO", fixes: cite.slice(0, 2).map((s) => ({ kind: "ADD_REFERENCE" as const, label: s.title, url: s.url })) });
  }
  const sensitive = pack.system.privacy.sensitiveData;
  if (sensitive.length && (d.accessClass === "PUBLICO" || d.visibility === "PUBLICA")) {
    out.push({ id: "campoDados", group: "CAMPO", status: "AVISO", vars: { data: sensitive.slice(0, 3).join(", ") }, field: "accessClass", fixes: [{ kind: "SET_ACCESS", accessClass: "RESTRITO" }] });
  }
  return out;
}

const KIND_ORDER = ["norma", "conselho", "orgao-publico", "referencia", "educacao", "estatistica", "comunidade"];
const rank = (k: string) => {
  const i = KIND_ORDER.indexOf(k);
  return i < 0 ? KIND_ORDER.length : i;
};
function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
