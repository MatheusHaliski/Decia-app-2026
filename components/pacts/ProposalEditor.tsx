"use client";
import { useState, type FormEvent } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { personName, type OrgDirectory } from "@/lib/pacts/org";
import { COMMITMENT_KINDS, type CommitmentDraft, type CommitmentKind, type Side } from "@/lib/pacts/types";
import { useI18n } from "@/lib/i18n/useI18n";

export interface ProposalValues {
  side: Side;
  commitments: CommitmentDraft[];
  executorId: string | null;
  note: string;
  reason: string;
}

const NONE = "";

/**
 * Pacote de compromissos de uma rodada (RF49, mediação): cada linha é um compromisso de PRAZO, SUPORTE ou RECURSO de um dos
 * lados. Precisa haver ao menos um PRAZO de quem entrega (a "data acordada"). Na renegociação o motivo é obrigatório e o acordo
 * vigente continua valendo até o novo aceite dos dois lados.
 */
export function ProposalEditor({ org, sides, initial, executors, mode, onSubmit, onCancel }: {
  org: OrgDirectory;
  sides: readonly Side[];
  initial: readonly CommitmentDraft[];
  executors: readonly string[];
  /** proposta normal ou renegociação */
  mode: "PROPOR" | "RENEGOCIAR";
  onSubmit: (v: ProposalValues) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [side, setSide] = useState<Side>(sides[0] ?? "SOLICITANTE");
  const [rows, setRows] = useState<CommitmentDraft[]>(() =>
    initial.length ? initial.map((c) => ({ ...c })) : [{ kind: "PRAZO", side: "DESTINATARIO", description: "", dueDate: "" }],
  );
  const [executorId, setExecutorId] = useState<string>(NONE);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const set = (i: number, patch: Partial<CommitmentDraft>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ side, commitments: rows.map((r) => ({ ...r, dueDate: r.dueDate || null })), executorId: executorId || null, note, reason });
  };
  const title = mode === "RENEGOCIAR" ? t("pacts.proposal.renegotiateTitle") : t("pacts.proposal.title");
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-3" aria-label={title} data-testid="pact-proposal-editor">
      <p className="text-[length:var(--ws-text-body-sm)] font-semibold">{title}</p>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pacts.proposal.hint")}</p>
      {sides.length > 1 ? (
        <Field label={t("pacts.proposal.asSide")}>
          {({ id }) => <Select id={id} value={side} onChange={(e) => setSide(e.target.value as Side)} options={sides.map((s) => ({ value: s, label: t(`pacts.side.${s}`) }))} />}
        </Field>
      ) : null}
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-[length:var(--ws-text-body-sm)] font-semibold">{t("pacts.proposal.commitments")}</legend>
        {rows.map((row, i) => (
          <div key={i} className="grid gap-2 rounded-[var(--ws-radius-sm)] border border-ws-border bg-ws-surface-1 p-2 sm:grid-cols-[8rem_10rem_minmax(0,1fr)_10rem_auto] sm:items-end" data-testid="pact-commitment-row">
            <Field label={t("pacts.proposal.kind")}>
              {({ id }) => <Select id={id} value={row.kind} onChange={(e) => set(i, { kind: e.target.value as CommitmentKind })} options={COMMITMENT_KINDS.map((k) => ({ value: k, label: t(`pacts.commitment.kind.${k}`) }))} />}
            </Field>
            <Field label={t("pacts.proposal.who")}>
              {({ id }) => <Select id={id} value={row.side} onChange={(e) => set(i, { side: e.target.value as Side })} options={(["DESTINATARIO", "SOLICITANTE"] as const).map((s) => ({ value: s, label: t(`pacts.side.${s}`) }))} />}
            </Field>
            <Field label={t("pacts.proposal.description")}>
              {({ id }) => <Input id={id} value={row.description} onChange={(e) => set(i, { description: e.target.value })} />}
            </Field>
            <Field label={row.kind === "PRAZO" ? t("pacts.proposal.dateRequired") : t("pacts.proposal.dateOptional")}>
              {({ id }) => <Input id={id} type="date" value={row.dueDate ?? ""} onChange={(e) => set(i, { dueDate: e.target.value })} />}
            </Field>
            <Button size="sm" variant="ghost" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} disabled={rows.length === 1} aria-label={t("pacts.proposal.removeRow", { n: i + 1 })}>
              {t("pacts.proposal.remove")}
            </Button>
          </div>
        ))}
        <div>
          <Button size="sm" onClick={() => setRows((r) => [...r, { kind: "SUPORTE", side: "SOLICITANTE", description: "", dueDate: "" }])} disabled={rows.length >= 10}>+ {t("pacts.proposal.add")}</Button>
        </div>
      </fieldset>
      <Field label={t("pacts.proposal.executor")} hint={t("pacts.proposal.executorHint")}>
        {({ id, describedBy }) => (
          <Select id={id} aria-describedby={describedBy} value={executorId} onChange={(e) => setExecutorId(e.target.value)}
            options={[{ value: NONE, label: mode === "RENEGOCIAR" ? t("pacts.proposal.executorKeep") : t("pacts.proposal.executorLater") }, ...executors.map((u) => ({ value: u, label: personName(org, u) }))]} />
        )}
      </Field>
      {mode === "RENEGOCIAR" ? (
        <Field label={t("pacts.proposal.reason")} required>
          {({ id }) => <Textarea id={id} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      ) : null}
      <Field label={t("pacts.proposal.note")}>
        {({ id }) => <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="primary">{mode === "RENEGOCIAR" ? t("pacts.proposal.submitRenegotiate") : t("pacts.proposal.submit")}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>{t("common.cancel")}</Button>
      </div>
    </form>
  );
}
