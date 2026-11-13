/**
 * Textos do Espelho de Conformidade montados a partir do resultado determinístico (RF32): título e base legal do item, onde ele
 * vale, o porquê do status e a evidência ("o que atende"), com os textos do projeto como estão.
 */
import { fmt, nameOf, type PeopleDirectory } from "../shared";
import { formatVars } from "../simulate/shared";
import type { Applicability, ComplianceChecklist, ComplianceItem, Evidence, ItemResult } from "@/lib/projects/compliance/types";

type T = (key: string, vars?: Record<string, string | number>) => string;

export const itemTitle = (t: T, item: ComplianceItem) => (item.titleKey ? t(item.titleKey) : (item.title ?? item.code));
export const itemWhy = (t: T, item: ComplianceItem) => (item.whyKey ? t(item.whyKey) : (item.why ?? ""));
export const itemBasis = (t: T, item: Pick<ComplianceItem, "basis" | "basisKey">) => (item.basisKey ? t(item.basisKey) : (item.basis ?? "—"));
export const checklistName = (t: T, c: ComplianceChecklist) => (c.nameKey ? t(c.nameKey) : (c.name ?? c.id));
export const suggestionTitle = (t: T, item: ComplianceItem) => (item.suggestion?.titleKey ? t(item.suggestion.titleKey) : (item.suggestion?.title ?? itemTitle(t, item)));

export function appliesLabel(t: T, a: Applicability): string {
  switch (a.kind) {
    case "SEMPRE": return t("mirror.applies.SEMPRE");
    case "SINAL": return t("mirror.applies.SINAL", { signal: t(`mirror.signal.${a.signal}`) });
    case "AREA": return t("mirror.applies.AREA", { areas: a.areas.map((x) => t(`tasks.area.${x}`)).join(", ") });
    case "TODOS": return a.of.map((x) => appliesLabel(t, x)).join(` ${t("mirror.applies.and")} `);
  }
}

/** Uma evidência: tipo, código e texto do projeto, fase e responsável. */
export function evidenceText(t: T, e: Evidence, people: PeopleDirectory): string {
  const label = e.kind === "GATE" ? t(`pm.gateOutcome.${e.label}`) : e.kind === "AREA" ? t(`tasks.area.${e.label}`) : e.kind === "NEED" ? t(`pm.need.${e.label}`) : `“${e.label}”`;
  const parts = [t(`mirror.ev.${e.kind}`), e.code && e.kind !== "GATE" ? e.code : null, label].filter(Boolean).join(" ");
  const extra = [e.phase ? t(`pm.phase.${e.phase}`) : null, e.responsibleId ? nameOf(people, e.responsibleId) : null, e.linked && e.kind === "TASK" ? t("mirror.ev.linked") : null].filter(Boolean);
  return extra.length ? `${parts} (${extra.join(" · ")})` : parts;
}

/** Por que o item está assim, com a evidência principal. */
export function reasonText(t: T, intl: string, r: ItemResult, people: PeopleDirectory): string {
  const ev = r.evidence.slice(0, 2).map((e) => evidenceText(t, e, people)).join("; ");
  const vars = formatVars(t, intl, { ...r.reason.vars }, people);
  if (r.reason.code === "NA_MARCADO" && r.waiver) vars.when = fmt.date(intl, r.waiver.at);
  return t(`mirror.reason.${r.reason.code}`, { ...vars, evidence: ev || "—" });
}
