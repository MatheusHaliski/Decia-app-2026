"use client";
/**
 * Criador e edição de tarefa (RF4, RF12; auditoria 17/10/2026). Campos comuns a qualquer profissão; extensões só da área escolhida,
 * nenhuma obrigatória. Erros do servidor por campo (422) ficam junto do campo; conflito de versão (409) preserva o que foi digitado
 * e oferece recarregar. Sair com alterações não salvas pede confirmação (nada é gravado em armazenamento local: pode ser sigiloso).
 */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button, Card, Checkbox, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { api, ApiError, describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import {
  ACCESS_CLASSES, AREA_EXTENSIONS, PRIORITIES, TASK_TYPE_NAMES, VISIBILITIES, WORK_AREAS, tasksApi,
  type AccessClassName, type Criterion, type Deliverable, type PriorityName, type Reference, type TaskRequest, type TaskTypeName, type TaskView,
  type VisibilityName, type WorkArea,
} from "@/lib/tasks/client";

interface FormState {
  title: string;
  type: TaskTypeName | "";
  area: WorkArea | "";
  objective: string;
  descriptionMd: string;
  priority: PriorityName;
  dueAt: string;
  responsibleMe: boolean;
  accessClass: AccessClassName;
  visibility: VisibilityName;
  deliverables: Deliverable[];
  criteria: Criterion[];
  references: Reference[];
  extensions: Record<string, string>;
}

const empty: FormState = {
  title: "", type: "", area: "", objective: "", descriptionMd: "", priority: "MEDIA", dueAt: "", responsibleMe: false,
  accessClass: "INTERNO", visibility: "PRIVADA", deliverables: [], criteria: [], references: [], extensions: {},
};

function fromView(v: TaskView, me: string | null): FormState {
  return {
    title: v.title ?? "", type: v.type ?? "", area: v.area ?? "", objective: v.objective ?? "", descriptionMd: v.descriptionMd ?? "",
    priority: v.priority ?? "MEDIA", dueAt: v.dueAt ?? "", responsibleMe: !!me && v.responsibleId === me, accessClass: v.accessClass ?? "INTERNO",
    visibility: v.visibility ?? "PRIVADA", deliverables: (v.deliverables as Deliverable[]) ?? [], criteria: (v.acceptanceCriteria as Criterion[]) ?? [],
    references: (v.references as Reference[]) ?? [], extensions: { ...(v.extensions ?? {}) },
  };
}

export interface TaskFormProps {
  mode: "create" | "edit";
  initial?: TaskView;
  onSaved: (task: TaskView) => void;
}

export function TaskForm({ mode, initial, onSaved }: TaskFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [me, setMe] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => (initial ? fromView(initial, null) : empty));
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(initial ? fromView(initial, null) : empty));
  const [version, setVersion] = useState<number | undefined>(initial?.version);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const dirty = JSON.stringify(form) !== baseline;

  useEffect(() => {
    let alive = true;
    api.get<{ id: string }>("/api/me").then((u) => {
      if (!alive) return;
      setMe(u.id);
      if (initial) {
        const f = fromView(initial, u.id);
        setForm((cur) => (JSON.stringify(cur) === baseline ? f : cur));
        setBaseline(JSON.stringify(f));
      }
    }).catch(() => { /* sem sessão: o envio mostra o erro */ });
    return () => { alive = false; };
  }, []); // uma vez por montagem: a visão inicial e a linha de base já estão no estado

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const extensionKeys = useMemo(() => (form.area ? AREA_EXTENSIONS[form.area] : []), [form.area]);

  function body(draft?: boolean): TaskRequest {
    const extensions = Object.fromEntries(extensionKeys.map((k) => [k, form.extensions[k] ?? ""]).filter(([, v]) => (v ?? "").trim()));
    return {
      title: form.title, type: form.type || undefined, area: form.area || undefined, objective: form.objective || undefined,
      descriptionMd: form.descriptionMd || undefined, priority: form.priority, dueAt: form.dueAt || undefined,
      responsibleId: form.responsibleMe && me ? me : undefined, accessClass: form.accessClass, visibility: form.visibility,
      deliverables: form.deliverables.filter((d) => d.text.trim()), acceptanceCriteria: form.criteria.filter((c) => c.text.trim()),
      references: form.references.filter((r) => r.url.trim()), extensions, draft, version,
    };
  }

  async function submit(e: FormEvent, draft?: boolean) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!form.title.trim()) local.title = t("tasks.form.errTitle");
    if (!form.type) local.type = t("tasks.form.errType");
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    setConflict(false);
    try {
      const saved = mode === "create" ? await tasksApi.create(body(draft)) : await tasksApi.update(initial!.id!, body());
      setBaseline(JSON.stringify(form));
      setVersion(saved.version);
      toast({ title: t(mode === "create" ? "tasks.form.created" : "tasks.form.saved"), tone: "sucesso" });
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setErrors(err.fields);
      else if (err instanceof ApiError && err.status === 409 && err.code === "EDICAO_CONCORRENTE") setConflict(true);
      else toast({ title: t("tasks.form.saveFailed"), description: describeError(err), tone: "erro" });
    } finally {
      setBusy(false);
    }
  }

  async function reloadServer() {
    if (!initial?.id) return;
    const fresh = await tasksApi.get(initial.id);
    const f = fromView(fresh, me);
    setForm(f);
    setBaseline(JSON.stringify(f));
    setVersion(fresh.version);
    setConflict(false);
  }

  const err = (k: string) => errors[k];
  return (
    <form className="grid gap-[var(--ws-space-4)]" onSubmit={(e) => submit(e)} noValidate data-testid="task-form" aria-busy={busy}>
      {conflict ? (
        <div role="alert" className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-danger bg-ws-danger-soft p-3 text-[length:var(--ws-text-body-sm)]" data-testid="task-conflict">
          <p>{t("tasks.form.conflict")}</p>
          <div><Button size="sm" variant="ghost" onClick={() => void reloadServer()}>{t("tasks.form.reload")}</Button></div>
        </div>
      ) : null}
      <Card title={t("tasks.form.essentials")}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t("tasks.form.title")} required error={err("title")} className="md:col-span-2">
            {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={form.title} maxLength={200} onChange={(e) => set("title", e.target.value)} />}
          </Field>
          <Field label={t("tasks.form.type")} required error={err("type")}>
            {({ id, describedBy, invalid }) => (
              <Select id={id} aria-describedby={describedBy} invalid={invalid} value={form.type} onChange={(e) => set("type", e.target.value as TaskTypeName)}
                options={[{ value: "", label: t("tasks.form.choose") }, ...TASK_TYPE_NAMES.map((v) => ({ value: v, label: t(`social.taskType.${v}`) }))]} />
            )}
          </Field>
          <Field label={t("tasks.form.area")} hint={t("tasks.form.areaHint")}>
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} value={form.area} onChange={(e) => set("area", e.target.value as WorkArea)}
                options={[{ value: "", label: t("tasks.form.noArea") }, ...WORK_AREAS.map((v) => ({ value: v, label: t(`tasks.area.${v}`) }))]} />
            )}
          </Field>
          <Field label={t("tasks.form.objective")} hint={t("tasks.form.objectiveHint")} error={err("objective")} className="md:col-span-2">
            {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={form.objective} maxLength={500} onChange={(e) => set("objective", e.target.value)} />}
          </Field>
          <Field label={t("tasks.form.description")} error={err("descriptionMd")} className="md:col-span-2">
            {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} rows={5} value={form.descriptionMd} onChange={(e) => set("descriptionMd", e.target.value)} />}
          </Field>
        </div>
      </Card>

      <Card title={t("tasks.form.planning")}>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label={t("tasks.form.priority")}>
            {({ id }) => <Select id={id} value={form.priority} onChange={(e) => set("priority", e.target.value as PriorityName)} options={PRIORITIES.map((v) => ({ value: v, label: t(`tasks.priority.${v}`) }))} />}
          </Field>
          <Field label={t("tasks.form.dueAt")} error={err("dueAt")}>
            {({ id, describedBy, invalid }) => <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={form.dueAt} onChange={(e) => set("dueAt", e.target.value)} />}
          </Field>
          <div className="self-end">
            <Checkbox checked={form.responsibleMe} onCheckedChange={(v) => set("responsibleMe", v)} label={t("tasks.form.responsibleMe")} hint={t("tasks.form.responsibleHint")} disabled={!me} />
            {err("responsibleId") ? <p className="text-[length:var(--ws-text-caption)] text-ws-danger-ink">{err("responsibleId")}</p> : null}
          </div>
        </div>
      </Card>

      <ListEditor
        title={t("tasks.form.deliverables")} hint={t("tasks.form.deliverablesHint")} error={err("deliverables")} addLabel={t("tasks.form.addDeliverable")}
        items={form.deliverables} onChange={(v) => set("deliverables", v)} make={() => ({ text: "" })} testId="deliverables"
        render={(d, update, label) => <Input aria-label={label} value={d.text} maxLength={300} onChange={(e) => update({ text: e.target.value })} />}
      />
      <ListEditor
        title={t("tasks.form.criteria")} hint={t("tasks.form.criteriaHint")} error={err("acceptanceCriteria")} addLabel={t("tasks.form.addCriterion")}
        items={form.criteria} onChange={(v) => set("criteria", v)} make={() => ({ text: "", done: false })} testId="criteria"
        render={(c, update, label) => (
          <div className="grid gap-1 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-3">
            <Input aria-label={label} value={c.text} maxLength={300} onChange={(e) => update({ ...c, text: e.target.value })} />
            <Checkbox checked={c.done} onCheckedChange={(v) => update({ ...c, done: v })} label={t("tasks.form.criterionDone")} />
          </div>
        )}
      />
      <ListEditor
        title={t("tasks.form.references")} hint={t("tasks.form.referencesHint")} error={err("references")} addLabel={t("tasks.form.addReference")}
        items={form.references} onChange={(v) => set("references", v)} make={() => ({ label: "", url: "" })} testId="references"
        render={(r, update, label) => (
          <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
            <Input aria-label={t("tasks.form.referenceLabel", { n: label })} placeholder={t("tasks.form.referenceLabelPh")} value={r.label} maxLength={300} onChange={(e) => update({ ...r, label: e.target.value })} />
            <Input aria-label={t("tasks.form.referenceUrl", { n: label })} type="url" placeholder="https://" value={r.url} maxLength={500} onChange={(e) => update({ ...r, url: e.target.value })} />
          </div>
        )}
      />

      {extensionKeys.length ? (
        <Card title={t("tasks.form.areaFields", { area: t(`tasks.area.${form.area}`) })} data-testid="area-fields">
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("tasks.form.areaFieldsHint")}</p>
          {err("extensions") ? <p className="text-[length:var(--ws-text-caption)] text-ws-danger-ink">{err("extensions")}</p> : null}
          <div className="grid gap-3 md:grid-cols-2">
            {extensionKeys.map((k) => (
              <Field key={k} label={t(`tasks.ext.${k}`)}>
                {({ id }) => <Input id={id} value={form.extensions[k] ?? ""} maxLength={500} onChange={(e) => set("extensions", { ...form.extensions, [k]: e.target.value })} />}
              </Field>
            ))}
          </div>
        </Card>
      ) : null}

      <Card title={t("tasks.form.privacy")}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t("tasks.form.accessClass")} hint={t("tasks.form.accessClassHint")}>
            {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={form.accessClass} onChange={(e) => set("accessClass", e.target.value as AccessClassName)} options={ACCESS_CLASSES.map((v) => ({ value: v, label: t(`social.access.${v}`) }))} />}
          </Field>
          <Field label={t("tasks.form.visibility")} hint={form.accessClass === "SIGILOSO" ? t("tasks.form.sigilosoHint") : undefined}>
            {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={form.visibility} onChange={(e) => set("visibility", e.target.value as VisibilityName)} options={VISIBILITIES.map((v) => ({ value: v, label: t(`social.visibility.${v}`) }))} />}
          </Field>
        </div>
      </Card>

      <div className="sticky bottom-0 z-[1] flex flex-wrap items-center gap-2 border-t border-ws-border bg-ws-surface-0 py-3">
        <Button type="submit" variant="primary" disabled={busy} data-testid="task-submit">{t(mode === "create" ? "tasks.form.create" : "tasks.form.save")}</Button>
        {mode === "create" ? <Button variant="ghost" disabled={busy} onClick={(e) => void submit(e as unknown as FormEvent, true)} data-testid="task-draft">{t("tasks.form.saveDraft")}</Button> : null}
        <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted" aria-live="polite" data-testid="task-dirty">
          {busy ? t("tasks.form.saving") : dirty ? t("tasks.form.unsaved") : mode === "edit" ? t("tasks.form.allSaved") : ""}
        </span>
      </div>
    </form>
  );
}

function ListEditor<T>({ title, hint, error, addLabel, items, onChange, make, render, testId }: {
  title: string; hint: string; error?: string; addLabel: string; items: T[]; onChange: (v: T[]) => void; make: () => T;
  render: (item: T, update: (v: T) => void, label: string) => ReactNode; testId: string;
}) {
  const { t } = useI18n();
  return (
    <Card title={title}>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{hint}</p>
      {error ? <p className="text-[length:var(--ws-text-caption)] text-ws-danger-ink" role="alert">{error}</p> : null}
      <ol className="grid gap-2" data-testid={testId}>
        {items.map((item, i) => {
          const label = `${title} ${i + 1}`;
          return (
            <li key={i} className="grid grid-cols-[1fr_auto] items-start gap-2">
              {render(item, (v) => onChange(items.map((x, j) => (j === i ? v : x))), label)}
              <Button size="sm" variant="ghost" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={t("tasks.form.remove", { item: label })}>×</Button>
            </li>
          );
        })}
      </ol>
      <div><Button size="sm" variant="ghost" onClick={() => onChange([...items, make()])}>+ {addLabel}</Button></div>
    </Card>
  );
}
