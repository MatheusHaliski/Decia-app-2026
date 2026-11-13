"use client";
import { useRef, useState, type FormEvent } from "react";
import { Button, Dialog, Field, Input, Select, Textarea } from "@/components/ui";
import { localDay } from "@/lib/pacts/rules";
import type { PactRepository } from "@/lib/pacts/store";
import type { AccessClass } from "@/lib/pacts/types";
import { useI18n } from "@/lib/i18n/useI18n";

const CLASSES: readonly AccessClass[] = ["INTERNO", "RESTRITO", "SIGILOSO"];

/** Registro manual de impedimento: o que está travado, o que trava, desde quando e quem depende (uma pessoa ou equipe por linha). */
export function ImpedimentDialog({ open, onOpenChange, repo, userId, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repo: PactRepository;
  userId: string;
  onCreated: (id: string) => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [blockedBy, setBlockedBy] = useState("");
  const [since, setSince] = useState(() => localDay(new Date()));
  const [dependents, setDependents] = useState("");
  const [accessClass, setAccessClass] = useState<AccessClass>("INTERNO");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const key = useRef(0);
  const fieldErr = (f: string) => (fields[f] ? t(`pacts.problem.${fields[f]}`) : undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = repo.dispatch(
      { type: "REGISTRAR_IMPEDIMENTO", draft: { title, blockedBy, since, dependents: dependents.split("\n"), accessClass } },
      { actorId: userId, now: new Date(), idempotencyKey: `imp:${userId}:${++key.current}` },
    );
    if (r.ok) {
      setTitle("");
      setBlockedBy("");
      setDependents("");
      setFields({});
      setProblem(null);
      onCreated(r.id);
      return;
    }
    setFields(r.fields ?? {});
    setProblem(t(`pacts.error.${r.error}`, { path: "", count: "", limit: "", hours: "", version: "" }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("pacts.impediment.newTitle")} description={t("pacts.impediment.newDescription")}>
      <form onSubmit={submit} className="grid gap-3" data-testid="impediment-form" noValidate>
        <Field label={t("pacts.impediment.what")} required error={fieldErr("title")}>
          {({ id, invalid }) => <Input id={id} invalid={invalid} value={title} onChange={(e) => setTitle(e.target.value)} />}
        </Field>
        <Field label={t("pacts.impediment.blockedBy")} required error={fieldErr("blockedBy")}>
          {({ id, invalid }) => <Textarea id={id} invalid={invalid} rows={2} value={blockedBy} onChange={(e) => setBlockedBy(e.target.value)} />}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("pacts.impediment.since")} required error={fieldErr("since")}>
            {({ id, invalid }) => <Input id={id} type="date" invalid={invalid} value={since} onChange={(e) => setSince(e.target.value)} />}
          </Field>
          <Field label={t("pacts.open.access")}>
            {({ id }) => <Select id={id} value={accessClass} onChange={(e) => setAccessClass(e.target.value as AccessClass)} options={CLASSES.map((c) => ({ value: c, label: t(`social.access.${c}`) }))} />}
          </Field>
        </div>
        <Field label={t("pacts.impediment.dependents")} hint={t("pacts.impediment.dependentsHint")} required error={fieldErr("dependents")}>
          {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} rows={3} value={dependents} onChange={(e) => setDependents(e.target.value)} />}
        </Field>
        {problem ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] font-medium text-ws-danger-ink">{problem}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" data-testid="impediment-submit">{t("pacts.impediment.submit")}</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
        </div>
      </form>
    </Dialog>
  );
}
