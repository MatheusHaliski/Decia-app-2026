/**
 * Exportação do Dossiê de Transição (RF36.CA02): Markdown (para ler e anexar), JSON (para outro sistema ler, com chaves estáveis) e
 * HTML para impressão (abre numa janela própria, sem o menu do app). Tudo PURO: recebe a tradução e as datas formatadas; o texto do
 * usuário é escapado (Markdown e HTML). Só dado de trabalho: nomes e papéis, sem contato pessoal.
 */
import type { Vars } from "@/lib/i18n/core";
import { pendenciesOf } from "./collect";
import { HANDOFF_SECTIONS, type Fact, type HandoffDossier, type HandoffItem, type HandoffSection } from "./types";
import { checklist, successorsOf, summarize, transferableItems } from "./workflow";

export type Translate = (key: string, vars?: Vars) => string;

export interface ExportContext {
  t: Translate;
  /** nomes das pessoas citadas (sucessores, solicitante) */
  people: Readonly<Record<string, { name: string }>>;
  /** data e hora no idioma da tela */
  formatDateTime: (iso: string) => string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Fato → texto: valores `@chave` são traduzidos; datas AAAA-MM-DD viram data no idioma da tela. */
export function renderFact(t: Translate, f: Fact): string {
  const vars: Vars = {};
  for (const [key, v] of Object.entries(f.vars ?? {})) {
    if (typeof v === "string" && v.startsWith("@")) vars[key] = t(v.slice(1));
    else if (typeof v === "string" && DATE.test(v)) vars[key] = new Date(`${v}T12:00:00Z`);
    else vars[key] = v;
  }
  return t(f.key, vars);
}

/** Título do item para a tela e a exportação (o sigiloso aparece só por referência). */
export const itemTitle = (t: Translate, it: HandoffItem) => (it.restricted ? t("handoff.restricted", { ref: it.id.split(":").pop()?.slice(0, 8) ?? "" }) : it.title);

const personName = (ctx: ExportContext, id: string | null) => (id ? ctx.people[id]?.name ?? id : ctx.t("handoff.noSuccessor"));

/** Itens de uma seção como a tela mostra (Pendências reúne as marcadas de todas as seções). */
export const sectionItems = (d: HandoffDossier, section: HandoffSection): HandoffItem[] =>
  section === "PENDENCIAS" ? pendenciesOf(d.items) : d.items.filter((i) => i.section === section);

// ------------------------------------------------------------------ Markdown
const md = (s: string) => s.replace(/([\\`*_[\]<>|#])/g, "\\$1").replace(/\s+/g, " ").trim();

function mdItem(it: HandoffItem, ctx: ExportContext): string[] {
  const { t } = ctx;
  const bits = [`**${md(itemTitle(t, it))}**`];
  const facts = it.facts.map((f) => md(renderFact(t, f)));
  if (it.pendency) facts.unshift(`⚠ ${md(t(`handoff.pendency.${it.pendency}`))}`);
  if (facts.length) bits.push(facts.join(" · "));
  if (it.transferable) bits.push(`${md(t("handoff.export.successor"))}: ${md(personName(ctx, it.successorId))}`);
  if (it.href && /^https?:\/\//.test(it.href)) bits.push(`<${it.href}>`);
  const out = [`- ${bits.join(" — ")}`];
  if (it.note.trim()) out.push(`  - ${md(t("handoff.export.note"))}: ${md(it.note)}`);
  if (it.citation) out.push(`  > “${md(it.citation.text)}” — ${md(it.citation.ref)}`);
  return out;
}

export function toMarkdown(d: HandoffDossier, ctx: ExportContext): string {
  const { t } = ctx;
  const lines: string[] = [
    `# ${md(t("handoff.export.title", { name: d.subjectName }))}`,
    "",
    `- ${t("handoff.export.reason")}: ${t(`handoff.reason.${d.reason}`)}`,
    `- ${t("handoff.export.effective")}: ${renderFact(t, { key: "handoff.export.date", vars: { date: d.effectiveDate } })}`,
    `- ${t("handoff.export.status")}: ${t(`handoff.status.${d.status}`)}`,
    `- ${t("handoff.export.requestedBy")}: ${md(d.requestedByName)}`,
    `- ${t("handoff.export.generated")}: ${ctx.formatDateTime(d.createdAt)} · v${d.version}`,
    `- ${t("handoff.export.sources")}: ${d.sources.map((s) => t(`handoff.source.${s}`)).join(", ")}`,
    "",
    `> ✦ ${t("handoff.summary.title")}`,
    ...summarize(d).map((f) => `> - ${md(renderFact(t, f))}`),
    `> ${t("handoff.summary.note")}`,
  ];
  for (const section of HANDOFF_SECTIONS) {
    const items = sectionItems(d, section);
    lines.push("", `## ${t(`handoff.section.${section}`)} (${items.length})`, "");
    if (!items.length) lines.push(`_${t("handoff.empty")}_`);
    for (const it of items) lines.push(...mdItem(it, ctx));
  }
  lines.push("", `## ${t("handoff.plan.title")}`, "", `| ${t("handoff.export.item")} | ${t("handoff.export.section")} | ${t("handoff.export.successor")} |`, "|---|---|---|");
  for (const it of transferableItems(d)) lines.push(`| ${md(itemTitle(t, it))} | ${t(`handoff.section.${it.section}`)} | ${md(personName(ctx, it.successorId))} |`);
  lines.push("", `## ${t("handoff.checklist.title")}`, "");
  for (const c of checklist(d)) lines.push(`- [${c.done ? "x" : " "}] ${md(renderFact(t, c.label))}`);
  lines.push("", `## ${t("handoff.ack.title")}`, "");
  const successors = successorsOf(d);
  if (!successors.length) lines.push(`_${t("handoff.ack.none")}_`);
  for (const s of successors) {
    const ack = d.acknowledgments.find((a) => a.successorId === s);
    lines.push(`- ${md(personName(ctx, s))}: ${ack ? t("handoff.ack.done", { when: ctx.formatDateTime(ack.at) }) : t("handoff.ack.pending")}`);
  }
  if (d.refusal) lines.push(`- ${t("handoff.ack.refused", { name: personName(ctx, d.refusal.successorId), reason: d.refusal.reason })}`);
  if (d.cancellation) lines.push("", `> ${t("handoff.cancelled", { reason: d.cancellation.reason })}`);
  lines.push("", `_${t("handoff.export.footer")}_`, "");
  return lines.join("\n");
}

// ------------------------------------------------------------------ JSON
/** JSON com chaves estáveis (`ws.handoff/1`): os fatos seguem como chave + variáveis; os nomes das pessoas citadas vão à parte. */
export function toJson(d: HandoffDossier, people: Readonly<Record<string, { name: string }>>): string {
  const ids = new Set<string>([d.subjectId, d.requestedById, ...d.items.map((i) => i.successorId).filter((x): x is string => !!x), ...d.acknowledgments.map((a) => a.successorId)]);
  const names = Object.fromEntries([...ids].sort().map((id) => [id, people[id]?.name ?? (id === d.subjectId ? d.subjectName : id === d.requestedById ? d.requestedByName : id)]));
  return `${JSON.stringify({ schema: "ws.handoff/1", dossier: d, people: names }, null, 2)}\n`;
}

// ------------------------------------------------------------------ HTML para impressão
const html = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function toPrintHtml(d: HandoffDossier, ctx: ExportContext, lang = "pt-BR"): string {
  const { t } = ctx;
  const li = (it: HandoffItem) => {
    const facts = it.facts.map((f) => renderFact(t, f));
    if (it.pendency) facts.unshift(`⚠ ${t(`handoff.pendency.${it.pendency}`)}`);
    const succ = it.transferable ? `<br><span class="muted">${html(t("handoff.export.successor"))}: ${html(personName(ctx, it.successorId))}</span>` : "";
    const note = it.note.trim() ? `<br><span class="muted">${html(t("handoff.export.note"))}: ${html(it.note)}</span>` : "";
    const cite = it.citation ? `<blockquote>“${html(it.citation.text)}” — ${html(it.citation.ref)}</blockquote>` : "";
    return `<li><strong>${html(itemTitle(t, it))}</strong>${facts.length ? ` — ${html(facts.join(" · "))}` : ""}${succ}${note}${cite}</li>`;
  };
  const sections = HANDOFF_SECTIONS.map((s) => {
    const items = sectionItems(d, s);
    return `<section><h2>${html(t(`handoff.section.${s}`))} (${items.length})</h2>${items.length ? `<ul>${items.map(li).join("")}</ul>` : `<p class="muted">${html(t("handoff.empty"))}</p>`}</section>`;
  }).join("");
  const plan = transferableItems(d).map((it) => `<tr><td>${html(itemTitle(t, it))}</td><td>${html(t(`handoff.section.${it.section}`))}</td><td>${html(personName(ctx, it.successorId))}</td></tr>`).join("");
  const checks = checklist(d).map((c) => `<li>${c.done ? "☑" : "☐"} ${html(renderFact(t, c.label))}</li>`).join("");
  const acks = successorsOf(d).map((s) => {
    const ack = d.acknowledgments.find((a) => a.successorId === s);
    return `<li>${html(personName(ctx, s))}: ${html(ack ? t("handoff.ack.done", { when: ctx.formatDateTime(ack.at) }) : t("handoff.ack.pending"))} ________________________</li>`;
  }).join("");
  const title = t("handoff.export.title", { name: d.subjectName });
  return `<!doctype html>
<html lang="${html(lang)}"><head><meta charset="utf-8"><title>${html(title)}</title>
<style>
body{font:13px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;margin:2rem auto;max-width:56rem;padding:0 1rem}
h1{font-size:1.5rem;margin:0 0 .5rem}h2{font-size:1.1rem;margin:1.5rem 0 .5rem;border-bottom:1px solid currentColor;padding-bottom:.2rem}
ul{padding-left:1.2rem}li{margin:.25rem 0}.muted{opacity:.75}table{border-collapse:collapse;width:100%}
td,th{border:1px solid currentColor;padding:.25rem .5rem;text-align:left;vertical-align:top}blockquote{margin:.25rem 0 .25rem 1rem;font-style:italic}
dl{display:grid;grid-template-columns:max-content 1fr;gap:.15rem 1rem}dt{font-weight:600}
@media print{body{margin:0}section{break-inside:avoid-page}}
</style></head><body>
<h1>${html(title)}</h1>
<dl>
<dt>${html(t("handoff.export.reason"))}</dt><dd>${html(t(`handoff.reason.${d.reason}`))}</dd>
<dt>${html(t("handoff.export.effective"))}</dt><dd>${html(renderFact(t, { key: "handoff.export.date", vars: { date: d.effectiveDate } }))}</dd>
<dt>${html(t("handoff.export.status"))}</dt><dd>${html(t(`handoff.status.${d.status}`))}</dd>
<dt>${html(t("handoff.export.requestedBy"))}</dt><dd>${html(d.requestedByName)}</dd>
<dt>${html(t("handoff.export.generated"))}</dt><dd>${html(ctx.formatDateTime(d.createdAt))} · v${d.version}</dd>
<dt>${html(t("handoff.export.sources"))}</dt><dd>${html(d.sources.map((s) => t(`handoff.source.${s}`)).join(", "))}</dd>
</dl>
<section><h2>✦ ${html(t("handoff.summary.title"))}</h2><ul>${summarize(d).map((f) => `<li>${html(renderFact(t, f))}</li>`).join("")}</ul><p class="muted">${html(t("handoff.summary.note"))}</p></section>
${sections}
<section><h2>${html(t("handoff.plan.title"))}</h2><table><thead><tr><th scope="col">${html(t("handoff.export.item"))}</th><th scope="col">${html(t("handoff.export.section"))}</th><th scope="col">${html(t("handoff.export.successor"))}</th></tr></thead><tbody>${plan}</tbody></table></section>
<section><h2>${html(t("handoff.checklist.title"))}</h2><ul>${checks}</ul></section>
<section><h2>${html(t("handoff.ack.title"))}</h2><ul>${acks || `<li class="muted">${html(t("handoff.ack.none"))}</li>`}</ul></section>
<p class="muted">${html(t("handoff.export.footer"))}</p>
</body></html>
`;
}

/** Nome de arquivo para as exportações (sem acento nem espaço). */
export function exportFileName(d: HandoffDossier, ext: "md" | "json" | "html"): string {
  const slug = d.subjectName.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "pessoa";
  return `dossie-transicao-${slug}-${d.effectiveDate}.${ext}`;
}
