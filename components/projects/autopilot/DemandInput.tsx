"use client";
/**
 * Passo 1 do Autopiloto (RF30.CA01): a demanda bruta — texto colado (e-mail, ofício, despacho) ou arquivo .txt, .eml, .md ou
 * .pdf lido AQUI no navegador (nada vai a servidor). O texto lido aparece no campo para a pessoa conferir antes da leitura.
 */
import { useRef, useState, type ChangeEvent } from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { EXAMPLE_OFICIO } from "@/lib/projects/autopilot/examples";
import { ACCEPTED_FILES, AUTOPILOT_LIMITS, fileBytes, readDemandBytes, type ReadFailure, type SourceKind } from "@/lib/projects/autopilot/sources";

export interface DemandInputValue { text: string; kind: SourceKind; fileName?: string; pages?: number; truncated?: boolean }

const MB = Math.round(AUTOPILOT_LIMITS.fileBytes / (1024 * 1024));

export function DemandInput({ value, onChange, onRead, disabled }: { value: DemandInputValue; onChange: (v: DemandInputValue) => void; onRead: () => void; disabled?: boolean }) {
  const { t, intl } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReadFailure | "ILEGIVEL" | null>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > AUTOPILOT_LIMITS.fileBytes) {
      setError("GRANDE_DEMAIS");
      return;
    }
    setBusy(true);
    try {
      const r = await readDemandBytes(file.name, await fileBytes(file), file.type);
      if (!r.ok) setError(r.reason);
      else onChange({ text: r.text, kind: r.kind, fileName: file.name, pages: r.pages, truncated: r.truncated });
    } catch {
      setError("ILEGIVEL");
    } finally {
      setBusy(false);
    }
  };

  const chars = new Intl.NumberFormat(intl).format(value.text.length);
  return (
    <div className="grid gap-[var(--ws-space-3)]">
      <Field label={t("autopilot.input.textLabel")} hint={t("autopilot.input.textHint")}>
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            rows={14}
            value={value.text}
            maxLength={AUTOPILOT_LIMITS.textChars}
            onChange={(e) => onChange({ ...value, text: e.target.value, kind: value.fileName ? value.kind : "COLAR" })}
            className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-body-sm)]"
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button icon="acervo" onClick={() => fileRef.current?.click()} busy={busy} disabled={disabled}>{t("autopilot.input.file")}</Button>
        <Input ref={fileRef} type="file" accept={ACCEPTED_FILES} className="sr-only" tabIndex={-1} aria-label={t("autopilot.input.fileLabel")} onChange={onFile} data-testid="autopilot-file" />
        <Button variant="ghost" onClick={() => { setError(null); onChange({ text: EXAMPLE_OFICIO, kind: "COLAR" }); }} disabled={disabled}>{t("autopilot.input.example")}</Button>
        {value.text ? <Button variant="ghost" onClick={() => { setError(null); onChange({ text: "", kind: "COLAR" }); }}>{t("autopilot.input.clear")}</Button> : null}
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("autopilot.input.privacy", { mb: MB })}</p>
      <p aria-live="polite" className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="autopilot-loaded">
        {value.fileName
          ? value.kind === "PDF"
            ? t("autopilot.input.loadedPdf", { name: value.fileName, pages: value.pages ?? 0, chars })
            : t("autopilot.input.loaded", { name: value.fileName, chars })
          : ""}
        {value.truncated ? ` ${t("autopilot.input.truncated", { max: new Intl.NumberFormat(intl).format(AUTOPILOT_LIMITS.textChars) })}` : ""}
      </p>
      {error ? (
        <p role="alert" className="rounded-[var(--ws-radius-md)] border border-ws-danger bg-ws-danger-soft px-3 py-2 text-[length:var(--ws-text-body-sm)] text-ws-text" data-testid="autopilot-error">
          {t(`autopilot.input.err.${error}`, { mb: MB })}
        </p>
      ) : null}
      <div>
        <Button variant="spark" onClick={onRead} disabled={disabled || !value.text.trim()}>
          <span aria-hidden>✦</span> {t("autopilot.input.read")}
        </Button>
      </div>
    </div>
  );
}
