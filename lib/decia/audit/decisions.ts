/**
 * Revisões humanas das DECISÕES ESTRUTURADAS (lib/decia) como registros da trilha: as decisões já guardam versões e fatos
 * somente-acréscimo (`DecisionEvent`, `DecisionSnapshot` com hash). Daqui saem, sem copiar nada para outro lugar:
 *  - sugestão da IA/recomendação do modelo aceita ou descartada (eventos SUGESTAO_IA_ACEITA / SUGESTAO_IA_DESCARTADA);
 *  - decisão registrada contra a recomendação vigente no snapshot DECISAO (aceitou a recomendada ou escolheu outra);
 *  - decisão reaberta (DECISAO_REABERTA) = reversão do registrado.
 * São registros derivados (`chained: false`): a integridade deles é a do próprio snapshot/evento da decisão.
 */
import { canonicalJson, sha256Hex } from "@/lib/decia/rules";
import type { DecisionAggregate } from "@/lib/decia/types";
import type { AuditInput, AuditRecord } from "./types";

interface SnapshotContent { recommendation?: { source: "MODELO" | "IA"; alternativeId: string | null } | null; selected?: string | null; rationale?: string; ranking?: { alt: string; score: number }[] }

function derived(input: AuditInput, id: string): AuditRecord {
  return { ...input, id, seq: 0, prevHash: "", hash: sha256Hex(canonicalJson({ ...input, id })), chained: false };
}

export function auditFromDecisions(aggregates: readonly DecisionAggregate[]): AuditRecord[] {
  const out: AuditRecord[] = [];
  for (const agg of aggregates) {
    const d = agg.decision;
    const alt = (id: string | null | undefined) => {
      const a = agg.alternatives.find((x) => x.id === id);
      return a ? `${a.label} — ${a.title}` : "—";
    };
    const base = { source: "DECISAO" as const, sessionId: d.sessionId ?? null, decisionId: d.id, contextTitle: d.title, policy: null };
    for (const ev of agg.events) {
      if (ev.type === "SUGESTAO_IA_ACEITA" || ev.type === "SUGESTAO_IA_DESCARTADA") {
        const rec = agg.recommendations.find((r) => r.id === ev.payload.recId);
        if (!rec) continue;
        const accepted = ev.type === "SUGESTAO_IA_ACEITA";
        out.push(derived({
          ...base, at: ev.at, actorId: ev.actorUserId ?? "—", action: accepted ? "ACEITOU" : "REJEITOU",
          target: { kind: rec.source === "IA" ? "RECOMENDACAO_IA" : "RECOMENDACAO_MODELO", id: rec.id, label: rec.alternativeId ? alt(rec.alternativeId) : rec.reasoningMd.slice(0, 120) },
          reason: null, before: "", proposed: rec.reasoningMd, after: accepted ? rec.reasoningMd : "",
        }, `dec-${d.id}-${ev.id}`));
      }
      if (ev.type === "DECISAO_REABERTA") {
        const snap = [...agg.snapshots].filter((s) => s.kind === "DECISAO" && s.takenAt <= ev.at).sort((a, b) => b.versionNumber - a.versionNumber)[0];
        out.push(derived({
          ...base, at: ev.at, actorId: ev.actorUserId ?? "—", action: "REVERTEU", target: { kind: "DECISAO", id: d.id, label: d.title },
          reason: typeof ev.payload.reason === "string" ? ev.payload.reason : null, before: snap ? `${snap.selectedAlternativeLabel} — ${snap.rationale}` : "", proposed: null, after: "",
        }, `dec-${d.id}-${ev.id}`));
      }
    }
    for (const snap of agg.snapshots) {
      if (snap.kind !== "DECISAO") continue;
      let content: SnapshotContent;
      try {
        content = JSON.parse(snap.contentJson) as SnapshotContent;
      } catch {
        continue;
      }
      const rec = content.recommendation;
      if (!rec?.alternativeId) continue; // sem recomendação vigente não houve proposta a revisar
      const followed = content.selected === rec.alternativeId;
      out.push(derived({
        ...base, at: snap.takenAt, actorId: snap.takenByUserId, action: followed ? "ACEITOU" : "REJEITOU",
        target: { kind: "DECISAO", id: snap.id, label: d.title }, reason: followed ? null : content.rationale ?? null,
        before: "", proposed: alt(rec.alternativeId), after: `${alt(content.selected)}\n${content.rationale ?? ""}`.trim(),
      }, `dec-${d.id}-${snap.id}`));
    }
  }
  return out;
}
