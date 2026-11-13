"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Dialog, Field, Input, Select, Textarea } from "@/components/ui";
import { activeDepartmentsOf, departmentOf, headOf, membersOf, personName, personOf } from "@/lib/pacts/org";
import { localDay } from "@/lib/pacts/rules";
import type { PactRepository } from "@/lib/pacts/store";
import { PARTY_KINDS, type AccessClass, type Impediment, type PartyKind } from "@/lib/pacts/types";
import { useI18n } from "@/lib/i18n/useI18n";

const CLASSES: readonly AccessClass[] = ["INTERNO", "RESTRITO", "SIGILOSO"];

/**
 * Abrir pacto (RF49.CA01): quem pede (eu, minha equipe ou, para a chefia, a chefia/o departamento), com quem (pessoa, equipe,
 * chefia ou departamento ativo da MESMA empresa), entrega esperada, justificativa, critério de aceite e prazo desejado. A
 * identidade vem da sessão; destino fora do alcance volta "não encontrado" sem revelar se existe.
 */
export function OpenPactDialog({ open, onOpenChange, repo, userId, impediment, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repo: PactRepository;
  userId: string;
  impediment: Impediment | null;
  onCreated: (pactId: string) => void;
}) {
  const { t } = useI18n();
  const org = repo.org;
  const me = personOf(org, userId);
  const myDept = me?.departmentId ?? "";
  const isHead = !!myDept && headOf(org, myDept) === userId;
  const requesterKinds: PartyKind[] = isHead ? ["PESSOA", "EQUIPE", "CHEFIA", "DEPARTAMENTO"] : ["PESSOA", "EQUIPE"];
  const departments = activeDepartmentsOf(org, me?.companyId ?? null);
  const suggestion = impediment?.suggestedTarget ?? null;

  const [requesterKind, setRequesterKind] = useState<PartyKind>("PESSOA");
  const [targetKind, setTargetKind] = useState<PartyKind>(suggestion?.kind ?? "DEPARTAMENTO");
  const [targetDept, setTargetDept] = useState(suggestion?.departmentId ?? departments.find((d) => d.id !== myDept)?.id ?? "");
  const [targetPerson, setTargetPerson] = useState(suggestion?.userId ?? "");
  const [expectedDelivery, setExpected] = useState("");
  const [justification, setJustification] = useState("");
  const [criterion, setCriterion] = useState("");
  const [due, setDue] = useState(() => localDay(new Date(Date.now() + 7 * 86_400_000)));
  const [accessClass, setAccessClass] = useState<AccessClass>(impediment?.accessClass === "RESTRITO" || impediment?.accessClass === "SIGILOSO" ? impediment.accessClass : "INTERNO");
  const [grant, setGrant] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const key = useRef(`abrir:${userId}:${Date.now()}`);

  useEffect(() => {
    if (!open) return;
    key.current = `abrir:${userId}:${Date.now()}`;
    setFields({});
    setProblem(null);
    setExpected(impediment ? t("pacts.open.prefillDelivery", { blockedBy: impediment.blockedBy }) : "");
    setJustification(impediment ? t("pacts.open.prefillJustification", { title: impediment.title, n: impediment.dependents.length }) : "");
  }, [open, impediment, userId, t]);

  const people = targetDept ? membersOf(org, targetDept).filter((u) => u !== userId) : [];
  const fieldErr = (f: string) => (fields[f] ? t(`pacts.problem.${fields[f]}`) : undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = repo.dispatch(
      {
        type: "ABRIR",
        draft: {
          requester: { kind: requesterKind, departmentId: myDept, userId: requesterKind === "PESSOA" ? userId : null },
          target: { kind: targetKind, departmentId: targetDept, userId: targetKind === "PESSOA" ? targetPerson || null : null },
          expectedDelivery, justification, acceptanceCriterion: criterion, requestedDueDate: due,
          impedimentId: impediment?.id ?? null, accessClass, grants: accessClass === "SIGILOSO" && grant ? [grant] : [],
        },
      },
      { actorId: userId, now: new Date(), idempotencyKey: key.current },
    );
    if (r.ok) {
      onCreated(r.id);
      return;
    }
    setFields(r.fields ?? {});
    setProblem(r.error === "VALIDACAO" ? t("pacts.error.VALIDACAO") : t(`pacts.error.${r.error}`, { path: r.info?.path ?? "", count: r.info?.count ?? "", limit: r.info?.limit ?? "", hours: "", version: "" }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("pacts.open.title")} description={impediment ? t("pacts.open.fromImpediment", { title: impediment.title }) : t("pacts.open.description")} className="w-[min(94vw,40rem)]">
      <form onSubmit={submit} className="grid gap-3" data-testid="pact-open-form" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("pacts.open.requester")}>
            {({ id }) => <Select id={id} value={requesterKind} onChange={(e) => setRequesterKind(e.target.value as PartyKind)} options={requesterKinds.map((k) => ({ value: k, label: t(`pacts.open.requesterKind.${k}`, { dept: departmentOf(org, myDept)?.acronym ?? "" }) }))} />}
          </Field>
          <Field label={t("pacts.open.targetKind")}>
            {({ id }) => <Select id={id} value={targetKind} onChange={(e) => setTargetKind(e.target.value as PartyKind)} options={PARTY_KINDS.map((k) => ({ value: k, label: t(`pacts.partyKind.${k}`) }))} />}
          </Field>
          <Field label={t("pacts.open.targetDept")} error={fieldErr("target")}>
            {({ id, invalid }) => <Select id={id} invalid={invalid} value={targetDept} onChange={(e) => { setTargetDept(e.target.value); setTargetPerson(""); }} options={departments.map((d) => ({ value: d.id, label: `${d.acronym} — ${d.name}` }))} />}
          </Field>
          {targetKind === "PESSOA" ? (
            <Field label={t("pacts.open.targetPerson")}>
              {({ id }) => <Select id={id} value={targetPerson} onChange={(e) => setTargetPerson(e.target.value)} options={[{ value: "", label: t("pacts.open.choose") }, ...people.map((u) => ({ value: u, label: personName(org, u) }))]} />}
            </Field>
          ) : null}
        </div>
        <Field label={t("pacts.open.expectedDelivery")} required error={fieldErr("expectedDelivery")}>
          {({ id, invalid }) => <Input id={id} invalid={invalid} value={expectedDelivery} onChange={(e) => setExpected(e.target.value)} />}
        </Field>
        <Field label={t("pacts.open.justification")} required error={fieldErr("justification")}>
          {({ id, invalid }) => <Textarea id={id} invalid={invalid} rows={2} value={justification} onChange={(e) => setJustification(e.target.value)} />}
        </Field>
        <Field label={t("pacts.open.criterion")} hint={t("pacts.open.criterionHint")} required error={fieldErr("acceptanceCriterion")}>
          {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} rows={2} value={criterion} onChange={(e) => setCriterion(e.target.value)} />}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("pacts.open.due")} required error={fieldErr("requestedDueDate")}>
            {({ id, invalid }) => <Input id={id} type="date" invalid={invalid} value={due} onChange={(e) => setDue(e.target.value)} />}
          </Field>
          <Field label={t("pacts.open.access")} hint={t("pacts.open.accessHint")}>
            {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={accessClass} onChange={(e) => setAccessClass(e.target.value as AccessClass)} options={CLASSES.map((c) => ({ value: c, label: t(`social.access.${c}`) }))} />}
          </Field>
        </div>
        {accessClass === "SIGILOSO" && targetKind !== "PESSOA" ? (
          <Field label={t("pacts.open.grant")} hint={t("pacts.open.grantHint")} error={fieldErr("grants")}>
            {({ id, describedBy, invalid }) => <Select id={id} aria-describedby={describedBy} invalid={invalid} value={grant} onChange={(e) => setGrant(e.target.value)} options={[{ value: "", label: t("pacts.open.choose") }, ...membersOf(org, targetDept).map((u) => ({ value: u, label: personName(org, u) }))]} />}
          </Field>
        ) : null}
        {problem ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] font-medium text-ws-danger-ink" data-testid="pact-open-error">{problem}</p> : null}
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pacts.open.note")}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" data-testid="pact-open-submit">{t("pacts.open.submit")}</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
        </div>
      </form>
    </Dialog>
  );
}
