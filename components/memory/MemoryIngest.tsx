"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button, Card, Field, Input, Link, Select, Textarea } from "@/components/ui";
import { readerHref } from "@/lib/memory/citation";
import { INGEST_LIMITS, type IngestErrorCode, type IngestField } from "@/lib/memory/ingest";
import { MEMORY_KINDS, type MemoryKind } from "@/lib/memory/search";
import type { MemoryRepository } from "@/lib/memory/store";
import type { AccessClass } from "@/lib/memory/types";
import { useI18n } from "@/lib/i18n/useI18n";
import { accessKey, kindKey } from "./labels";

/**
 * Ingestão local (RF33.CA01, DEMO): colar texto ou enviar .txt/.md com tipo, unidade, exercício e classe de acesso (nunca acima
 * do que a pessoa lê). Fica só nesta aba; o documento entra no índice na hora e pode ser retirado.
 */
export function MemoryIngest({ repo, allowed, addedBy, defaultDepartment }: {
  repo: MemoryRepository;
  allowed: readonly AccessClass[];
  addedBy: string | null;
  defaultDepartment: string | null;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<MemoryKind>("RELATORIO");
  const [department, setDepartment] = useState(defaultDepartment ?? "");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [accessClass, setAccessClass] = useState<AccessClass>(allowed.includes("INTERNO") ? "INTERNO" : (allowed[0] ?? "PUBLICO"));
  const [body, setBody] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<IngestField, string>>>({});
  const [done, setDone] = useState<string | null>(null);
  const mine = repo.documents().filter((d) => d.origin === "INGESTAO");
  const err = (code: IngestErrorCode | string | undefined) => (code ? t(`memory.ingest.error.${code}`) : undefined);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setDone(null);
    if (!file) return;
    if (file.size > INGEST_LIMITS.fileMaxBytes) {
      setErrors((x) => ({ ...x, file: "ARQUIVO_GRANDE" }));
      return;
    }
    try {
      const text = await file.text();
      setBody(text);
      setFileName(file.name);
      if (!title.trim()) setTitle(file.name.replace(/\.(txt|md|markdown)$/i, ""));
      setErrors((x) => ({ ...x, file: undefined, body: undefined }));
    } catch {
      setErrors((x) => ({ ...x, file: "LEITURA" }));
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const y = year.trim() ? Number(year) : null;
    const r = repo.ingest(
      { title, kind, department: department.trim() || null, year: y !== null && Number.isFinite(y) ? y : -1, accessClass, body, fileName },
      { addedBy, allowedClasses: allowed },
    );
    if (!r.ok) {
      setErrors(r.errors);
      setDone(null);
      return;
    }
    setErrors({});
    setDone(r.doc.id);
    setTitle("");
    setBody("");
    setFileName(null);
  };

  return (
    <Card as="section" aria-labelledby="memory-ingest-title" className="grid gap-3" data-testid="memory-ingest">
      <h2 id="memory-ingest-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("memory.ingest.title")}</h2>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("memory.ingest.hint")}</p>
      <form onSubmit={submit} className="grid gap-3" noValidate>
        <Field label={t("memory.ingest.titleLabel")} required error={err(errors.title)}>
          {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={title} maxLength={INGEST_LIMITS.titleMax} onChange={(e) => setTitle(e.target.value)} />}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("memory.ingest.kindLabel")} error={err(errors.kind)}>
            {({ id }) => <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as MemoryKind)} options={MEMORY_KINDS.map((k) => ({ value: k, label: t(kindKey(k)) }))} />}
          </Field>
          <Field label={t("memory.ingest.accessLabel")} hint={t("memory.ingest.accessHint")} error={err(errors.accessClass)}>
            {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={accessClass} onChange={(e) => setAccessClass(e.target.value as AccessClass)} options={allowed.map((c) => ({ value: c, label: t(accessKey(c)) }))} />}
          </Field>
          <Field label={t("memory.ingest.departmentLabel")} hint={t("memory.ingest.departmentHint")} error={err(errors.department)}>
            {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={department} maxLength={INGEST_LIMITS.departmentMax} onChange={(e) => setDepartment(e.target.value)} />}
          </Field>
          <Field label={t("memory.ingest.yearLabel")} error={err(errors.year)}>
            {({ id, invalid }) => <Input id={id} invalid={invalid} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />}
          </Field>
        </div>
        <Field label={t("memory.ingest.fileLabel")} hint={fileName ? t("memory.ingest.fileLoaded", { name: fileName }) : t("memory.ingest.fileHint")} error={err(errors.file)}>
          {({ id, describedBy, invalid }) => <Input id={id} type="file" aria-describedby={describedBy} invalid={invalid} accept=".txt,.md,.markdown,text/plain,text/markdown" onChange={onFile} />}
        </Field>
        <Field label={t("memory.ingest.bodyLabel")} required error={err(errors.body)}>
          {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} rows={6} value={body} onChange={(e) => { setBody(e.target.value); setFileName(null); }} />}
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary">{t("memory.ingest.submit")}</Button>
          <p aria-live="polite" className="text-[length:var(--ws-text-body-sm)] text-ws-success-ink">{done ? t("memory.ingest.done") : null}</p>
        </div>
      </form>
      <div className="grid gap-1.5">
        <h3 className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("memory.ingest.list")}</h3>
        {mine.length ? (
          <ul className="grid gap-1" data-testid="memory-ingested">
            {mine.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]">
                <Link href={readerHref(d.id)}>{d.title}</Link>
                <span className="text-ws-text-muted">{t(kindKey(d.kind))} · {t(accessKey(d.accessClass))}</span>
                <Button size="sm" variant="ghost" onClick={() => repo.remove(d.id)} aria-label={t("memory.ingest.removeLabel", { title: d.title })}>{t("memory.ingest.remove")}</Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("memory.ingest.none")}</p>
        )}
      </div>
    </Card>
  );
}
