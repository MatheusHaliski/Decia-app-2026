"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import type { AccessClass, Commitment } from "@/lib/pacts/types";
import { useI18n } from "@/lib/i18n/useI18n";

/** Moldura das ações do pacto: formulário curto, com enviar e cancelar (teclado: Enter envia, Esc pelo botão). */
function Frame({ title, onSubmit, onCancel, submitLabel, children, testId }: { title: string; onSubmit: (e: FormEvent) => void; onCancel: () => void; submitLabel: string; children: ReactNode; testId?: string }) {
  const { t } = useI18n();
  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-3" aria-label={title} data-testid={testId}>
      <p className="text-[length:var(--ws-text-body-sm)] font-semibold">{title}</p>
      {children}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="primary">{submitLabel}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>{t("common.cancel")}</Button>
      </div>
    </form>
  );
}

/** Texto obrigatório (motivo, pergunta, resposta, decisão, reconhecimento). */
export function TextForm({ title, label, hint, submitLabel, onSubmit, onCancel, testId }: { title: string; label: string; hint?: string; submitLabel: string; onSubmit: (text: string) => void; onCancel: () => void; testId?: string }) {
  const [text, setText] = useState("");
  return (
    <Frame title={title} submitLabel={submitLabel} onCancel={onCancel} testId={testId} onSubmit={(e) => { e.preventDefault(); onSubmit(text); }}>
      <Field label={label} hint={hint} required>
        {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} rows={3} value={text} onChange={(e) => setText(e.target.value)} />}
      </Field>
    </Frame>
  );
}

const CLASSES: readonly AccessClass[] = ["PUBLICO", "INTERNO", "RESTRITO", "SIGILOSO"];

export function DeliveryForm({ onSubmit, onCancel }: { onSubmit: (v: { evidence: string; evidenceClass: AccessClass; resourceVersion: string }) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [evidence, setEvidence] = useState("");
  const [evidenceClass, setEvidenceClass] = useState<AccessClass>("INTERNO");
  const [resourceVersion, setResourceVersion] = useState("");
  return (
    <Frame title={t("pacts.form.deliver.title")} submitLabel={t("pacts.form.deliver.submit")} onCancel={onCancel} testId="pact-form-deliver" onSubmit={(e) => { e.preventDefault(); onSubmit({ evidence, evidenceClass, resourceVersion }); }}>
      <Field label={t("pacts.form.deliver.evidence")} hint={t("pacts.form.deliver.evidenceHint")} required>
        {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={evidence} onChange={(e) => setEvidence(e.target.value)} />}
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("pacts.form.deliver.version")} required>
          {({ id }) => <Input id={id} value={resourceVersion} onChange={(e) => setResourceVersion(e.target.value)} />}
        </Field>
        <Field label={t("pacts.form.deliver.class")} hint={t("pacts.form.deliver.classHint")}>
          {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={evidenceClass} onChange={(e) => setEvidenceClass(e.target.value as AccessClass)} options={CLASSES.map((c) => ({ value: c, label: t(`social.access.${c}`) }))} />}
        </Field>
      </div>
    </Frame>
  );
}

export function ReturnForm({ onSubmit, onCancel }: { onSubmit: (v: { unmetCriterion: string; reason: string }) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [unmetCriterion, setUnmet] = useState("");
  const [reason, setReason] = useState("");
  return (
    <Frame title={t("pacts.form.return.title")} submitLabel={t("pacts.form.return.submit")} onCancel={onCancel} testId="pact-form-return" onSubmit={(e) => { e.preventDefault(); onSubmit({ unmetCriterion, reason }); }}>
      <Field label={t("pacts.form.return.criterion")} required>
        {({ id }) => <Input id={id} value={unmetCriterion} onChange={(e) => setUnmet(e.target.value)} />}
      </Field>
      <Field label={t("pacts.form.return.reason")} required>
        {({ id }) => <Textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
      </Field>
    </Frame>
  );
}

export function CheckinForm({ commitments, onSubmit, onCancel }: { commitments: readonly Commitment[]; onSubmit: (v: { note: string; updates: { commitmentId: string; status: "CUMPRIDO" | "DESCUMPRIDO" }[] }) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const [marks, setMarks] = useState<Record<string, string>>({});
  return (
    <Frame title={t("pacts.form.checkin.title")} submitLabel={t("pacts.form.checkin.submit")} onCancel={onCancel} testId="pact-form-checkin"
      onSubmit={(e) => {
        e.preventDefault();
        const updates = Object.entries(marks).filter(([, v]) => v === "CUMPRIDO" || v === "DESCUMPRIDO").map(([commitmentId, status]) => ({ commitmentId, status: status as "CUMPRIDO" | "DESCUMPRIDO" }));
        onSubmit({ note, updates });
      }}>
      <Field label={t("pacts.form.checkin.note")} required>
        {({ id }) => <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      <div className="grid gap-2">
        {commitments.map((c) => (
          <Field key={c.id} label={`${t(`pacts.commitment.kind.${c.kind}`)} · ${c.description}`}>
            {({ id }) => (
              <Select id={id} value={marks[c.id] ?? ""} onChange={(e) => setMarks((m) => ({ ...m, [c.id]: e.target.value }))}
                options={[{ value: "", label: t("pacts.form.checkin.keep", { status: t(`pacts.commitment.status.${c.status}`) }) }, { value: "CUMPRIDO", label: t("pacts.commitment.status.CUMPRIDO") }, { value: "DESCUMPRIDO", label: t("pacts.commitment.status.DESCUMPRIDO") }]} />
            )}
          </Field>
        ))}
      </div>
    </Frame>
  );
}

export function MilestoneForm({ onSubmit, onCancel }: { onSubmit: (v: { title: string; dueDate: string }) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  return (
    <Frame title={t("pacts.form.milestone.title")} submitLabel={t("pacts.form.milestone.submit")} onCancel={onCancel} testId="pact-form-milestone" onSubmit={(e) => { e.preventDefault(); onSubmit({ title, dueDate }); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("pacts.form.milestone.name")} required>
          {({ id }) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} />}
        </Field>
        <Field label={t("pacts.form.milestone.date")} required>
          {({ id }) => <Input id={id} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
        </Field>
      </div>
    </Frame>
  );
}
