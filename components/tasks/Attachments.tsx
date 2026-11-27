"use client";
/**
 * Anexos & Evidências (RF41.CA06): seção do detalhe da tarefa (enviar, listar, abrir, remover com confirmação, marcar/desmarcar evidência)
 * e a lista "meus anexos" da página /attachments. O arquivo vai por multipart e o servidor confere o tipo pelo conteúdo, o tamanho, o
 * antivírus e tira os metadados da foto; a localização da evidência só existe se a pessoa a informar (ou pedir a do aparelho) e fica
 * cifrada. Imagem abre numa aba; os demais tipos são baixados (nunca renderizados como página).
 */
import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { Button, Card, Checkbox, Dialog, EmptyState, ErrorState, Field, Input, Link, LoadingState, Select, Tag, Textarea, useToast } from "@/components/ui";
import { ApiError, describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { attachmentsApi, type AttachmentView, type EvidenceMeta, type TaskView } from "@/lib/tasks/client";
import { formatBytes, formatDateTime, isBlob, localDateTimeToIso, openOrDownload } from "@/lib/tasks/files";
import { attachmentFormat, FORMAT_FAMILIES, formatFromView, formatMismatch, type FormatFamilyId } from "@/lib/tasks/formats";
import { AttachmentFormat, useFormatText } from "./AttachmentFormat";
import { FileDrop } from "./FileDrop";
import { acceptedAlternatives, adviseFile, askedCodes, splitPicked } from "@/lib/tasks/fileAdvice";

/** Arquivo na fila de envio, com a situação de cada um (o cliente da API não expõe progresso em bytes: enviando → enviado/erro). */
interface Queued { key: string; file: File; status: "pendente" | "enviando" | "enviado" | "erro"; error?: string }

/** Igual ao teto do servidor (`TaskAttachmentService.MAX_BYTES` e `spring.servlet.multipart.max-file-size`). */
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

type ScanStatus = NonNullable<AttachmentView["scanStatus"]>;
const SCAN_TONE: Record<ScanStatus, "success" | "warning" | "danger" | "neutral"> = { LIMPO: "success", PENDENTE: "warning", INFECTADO: "danger", NAO_VERIFICADO: "neutral" };
const SCAN_MARK: Record<ScanStatus, string> = { LIMPO: "✓", PENDENTE: "◷", INFECTADO: "⊘", NAO_VERIFICADO: "○" };

/** Códigos de erro do envio com mensagem própria; os demais caem na mensagem genérica do cliente da API. */
const ERROR_KEYS: Record<string, string> = {
  ARQUIVO_GRANDE_DEMAIS: "tasks.attach.tooBig", ARQUIVO_GRANDE: "tasks.attach.tooBig", TIPO_NAO_PERMITIDO: "tasks.attach.typeNotAllowed",
  TIPO_DIVERGENTE: "tasks.attach.typeMismatch", ANEXO_DUPLICADO: "tasks.attach.duplicate", LIMITE_ANEXOS: "tasks.attach.limit",
  ARQUIVO_INFECTADO: "tasks.attach.infected", ARQUIVO_SUSPEITO: "tasks.attach.suspicious", IMAGEM_GRANDE_DEMAIS: "tasks.attach.imageTooLarge",
  EVIDENCIA_EXISTENTE: "tasks.attach.evidenceExists", TAREFA_BLOQUEADA: "tasks.attach.readOnly", MIDIA_EM_QUARENTENA: "tasks.attach.unavailable",
};

interface EvidenceForm { caption: string; takenAt: string; latitude: string; longitude: string }
const EMPTY_FORM: EvidenceForm = { caption: "", takenAt: "", latitude: "", longitude: "" };

function toMeta(f: EvidenceForm): EvidenceMeta {
  return {
    caption: f.caption.trim() || undefined, takenAt: localDateTimeToIso(f.takenAt),
    latitude: f.latitude.trim() || undefined, longitude: f.longitude.trim() || undefined,
  };
}

function useErrorText() {
  const { t } = useI18n();
  return (e: unknown) => (e instanceof ApiError && ERROR_KEYS[e.code] ? t(ERROR_KEYS[e.code]!) : describeError(e));
}

function ScanTag({ status }: { status: ScanStatus | undefined }) {
  const { t } = useI18n();
  const s = status ?? "PENDENTE";
  return <Tag tone={SCAN_TONE[s]}><span aria-hidden>{SCAN_MARK[s]}</span>{t(`tasks.attach.scan.${s}`)}</Tag>;
}

/** Legenda, data da captura e localização opcional (só preenchida por quem envia; o botão pede a do aparelho de forma explícita). */
function EvidenceFields({ value, onChange, errors, disabled }: { value: EvidenceForm; onChange: (v: EvidenceForm) => void; errors: Record<string, string>; disabled?: boolean }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [locating, setLocating] = useState(false);
  const set = (patch: Partial<EvidenceForm>) => onChange({ ...value, ...patch });
  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) { toast({ title: t("tasks.attach.locationFailed"), tone: "aviso" }); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); set({ latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }); },
      () => { setLocating(false); toast({ title: t("tasks.attach.locationFailed"), tone: "aviso" }); },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }
  return (
    <div className="grid gap-3">
      <Field label={t("tasks.attach.caption")} error={errors.caption}>
        {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} rows={2} maxLength={500} disabled={disabled} value={value.caption} onChange={(e) => set({ caption: e.target.value })} />}
      </Field>
      <Field label={t("tasks.attach.takenAt")} error={errors.takenAt}>
        {({ id, describedBy, invalid }) => <Input id={id} type="datetime-local" aria-describedby={describedBy} invalid={invalid} disabled={disabled} value={value.takenAt} onChange={(e) => set({ takenAt: e.target.value })} />}
      </Field>
      <fieldset className="grid gap-2">
        <legend className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("tasks.attach.location")}</legend>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("tasks.attach.locationHint")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label={t("tasks.attach.latitude")} error={errors.latitude}>
            {({ id, describedBy, invalid }) => <Input id={id} inputMode="decimal" aria-describedby={describedBy} invalid={invalid} disabled={disabled} value={value.latitude} onChange={(e) => set({ latitude: e.target.value })} />}
          </Field>
          <Field label={t("tasks.attach.longitude")} error={errors.longitude}>
            {({ id, describedBy, invalid }) => <Input id={id} inputMode="decimal" aria-describedby={describedBy} invalid={invalid} disabled={disabled} value={value.longitude} onChange={(e) => set({ longitude: e.target.value })} />}
          </Field>
        </div>
        <div><Button size="sm" variant="ghost" disabled={disabled || locating} busy={locating} onClick={locate}>{t(locating ? "tasks.attach.locating" : "tasks.attach.useMyLocation")}</Button></div>
      </fieldset>
    </div>
  );
}

function EvidenceSummary({ a }: { a: AttachmentView }) {
  const { t, intl } = useI18n();
  const ev = a.evidence;
  if (!ev) return null;
  return (
    <div className="grid gap-0.5 text-[length:var(--ws-text-body-sm)]" data-testid="evidence-summary">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="success"><span aria-hidden>◆</span>{t("tasks.attach.evidence")}</Tag>
        {ev.hasLocation ? <Tag tone="info"><span aria-hidden>⌖</span>{t("tasks.attach.withLocation")}</Tag> : null}
      </div>
      {ev.caption ? <p className="[overflow-wrap:anywhere]">{ev.caption}</p> : null}
      {ev.takenAt ? <p className="text-ws-text-muted">{t("tasks.attach.takenOn", { date: formatDateTime(ev.takenAt, intl) })}</p> : null}
      {ev.latitude && ev.longitude ? <p className="text-ws-text-muted">{t("tasks.attach.coordinates", { lat: ev.latitude, lon: ev.longitude })}</p> : null}
    </div>
  );
}

/** Abre (imagem) ou baixa o anexo; 423 = ainda em verificação. */
function useOpenAttachment() {
  const { t } = useI18n();
  const { toast } = useToast();
  const errorText = useErrorText();
  return async (a: AttachmentView) => {
    try {
      const blob = await attachmentsApi.content(a.taskId!, a.id!);
      if (isBlob(blob)) openOrDownload(blob, a.fileName ?? "arquivo", !!a.image);
    } catch (e) {
      toast({ title: t("tasks.attach.openFailed"), description: errorText(e), tone: "erro" });
    }
  };
}

/** Seção do detalhe da tarefa. */
export function TaskAttachments({ task }: { task: TaskView }) {
  const { t, intl } = useI18n();
  const { toast } = useToast();
  const errorText = useErrorText();
  const open = useOpenAttachment();
  const fileId = useId();
  const taskId = task.id!;
  const [items, setItems] = useState<AttachmentView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<Queued[]>([]);
  const [pickError, setPickError] = useState<string | null>(null);
  const [asEvidence, setAsEvidence] = useState(false);
  const [form, setForm] = useState<EvidenceForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<AttachmentView | null>(null);
  const [marking, setMarking] = useState<AttachmentView | null>(null);
  const [markForm, setMarkForm] = useState<EvidenceForm>(EMPTY_FORM);
  const [markErrors, setMarkErrors] = useState<Record<string, string>>({});
  const [announce, setAnnounce] = useState("");
  const asked = formatFromView(task);
  const formatText = useFormatText();
  const mismatched = items ? formatMismatch(task, items) : [];

  const load = useCallback(() => {
    setError(null);
    attachmentsApi.list(taskId).then((r) => setItems(Array.isArray(r) ? r : [])).catch((e) => setError(describeError(e)));
  }, [taskId]);
  useEffect(load, [load]);

  /** Executa a ação; 422 com erros por campo vai para `onFields` (junto do campo), o resto vira aviso. Nunca rejeita. */
  async function run(fn: () => Promise<unknown>, ok: string, onFields?: (fields: Record<string, string>) => void) {
    setBusy(true);
    try {
      await fn();
      toast({ title: ok, tone: "sucesso" });
      setAnnounce(ok);
      load();
      return true;
    } catch (e) {
      if (onFields && e instanceof ApiError && e.status === 422 && Object.keys(e.fields).length) onFields(e.fields);
      else toast({ title: t("tasks.attach.failed"), description: errorText(e), tone: "erro" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  /** Escolha (input, câmera ou arrastar): tipo recusado pelo servidor e arquivo grande demais não entram, com o motivo. */
  function pick(picked: File[]) {
    const { ok, refused } = splitPicked(picked, asked);
    const big = ok.filter((f) => f.size > MAX_ATTACHMENT_BYTES);
    const msgs = [
      refused.length ? t("criador2.files.refused", { names: refused.map((f) => f.name).join(", "), types: acceptedAlternatives(asked).join(", ") }) : "",
      big.length ? t("taskForm.files.tooBig", { names: big.map((f) => f.name).join(", ") }) : "",
    ].filter(Boolean);
    setPickError(msgs.length ? msgs.join(" ") : null);
    setErrors({});
    const fresh = ok.filter((f) => f.size <= MAX_ATTACHMENT_BYTES).map((file, i) => ({ key: `${Date.now()}-${i}-${file.name}`, file, status: "pendente" as const }));
    // evidência é uma por envio (legenda e local próprios); anexos vão vários de uma vez
    setQueue((cur) => (asEvidence ? fresh.slice(0, 1) : [...cur.filter((q) => q.status !== "enviado"), ...fresh].slice(0, 20)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const pending = queue.filter((q) => q.status === "pendente" || q.status === "erro");
    if (!pending.length) { setErrors({ file: t("tasks.attach.chooseFile") }); return; }
    setErrors({});
    setBusy(true);
    const mark = (key: string, patch: Partial<Queued>) => setQueue((cur) => cur.map((q) => (q.key === key ? { ...q, ...patch } : q)));
    let sent = 0;
    const list = asEvidence ? pending.slice(0, 1) : pending;
    for (const q of list) {
      mark(q.key, { status: "enviando", error: undefined });
      try {
        await (asEvidence ? attachmentsApi.addEvidence(taskId, q.file, q.file.name, toMeta(form)) : attachmentsApi.upload(taskId, q.file, q.file.name));
        mark(q.key, { status: "enviado" });
        sent += 1;
      } catch (err) {
        if (asEvidence && err instanceof ApiError && err.status === 422 && Object.keys(err.fields).length) setErrors(err.fields);
        mark(q.key, { status: "erro", error: errorText(err) });
      }
    }
    setBusy(false);
    if (sent) {
      const ok = t(asEvidence ? "tasks.attach.evidenceSent" : sent === 1 ? "tasks.attach.sent" : "criador2.upload.sentMany", { n: sent });
      toast({ title: ok, tone: "sucesso" });
      setAnnounce(ok);
      if (asEvidence) setForm(EMPTY_FORM);
      load();
    }
    if (sent < list.length) toast({ title: t("tasks.attach.failed"), description: t("criador2.upload.someFailed", { n: list.length - sent }), tone: "erro" });
  }

  async function confirmMark() {
    if (!marking) return;
    setMarkErrors({});
    const ok = await run(() => attachmentsApi.markEvidence(taskId, marking.id!, toMeta(markForm)), t("tasks.attach.marked"), setMarkErrors);
    if (ok) { setMarking(null); setMarkForm(EMPTY_FORM); }
  }

  async function confirmRemove() {
    const a = removing;
    if (!a) return;
    await run(() => attachmentsApi.remove(taskId, a.id!), t("tasks.attach.removed"));
    setRemoving(null);
  }

  return (
    <Card title={t("tasks.attach.title")}>
      <div className="grid gap-3" data-testid="task-attachments">
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("tasks.attach.hint")}</p>
        {task.editable ? (
          <form className="grid gap-3 rounded-[var(--ws-radius-md)] border border-ws-border p-3" onSubmit={(e) => void submit(e)}>
            <FileDrop label={t("tasks.attach.file")} error={errors.file ?? pickError ?? undefined} disabled={busy} multiple={!asEvidence} onFiles={pick} testId="attach-drop" />
            {queue.length ? (
              <ul className="grid gap-1" aria-label={t("criador2.upload.queue")} aria-live="polite" data-testid="attach-queue">
                {queue.map((q) => {
                  const advice = adviseFile({ name: q.file.name, type: q.file.type }, asked);
                  return (
                    <li key={q.key} className="flex items-center gap-2 text-[length:var(--ws-text-body-sm)]" data-file={q.file.name} data-status={q.status}>
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className="[overflow-wrap:anywhere]">{q.file.name} <span className="text-ws-text-muted">· {formatBytes(q.file.size, intl)}</span></span>
                        {advice.mismatch ? (
                          <span className="rounded-[var(--ws-radius-sm)] bg-ws-warning-soft px-1 text-[length:var(--ws-text-caption)]" data-testid="file-format-advice">
                            <span aria-hidden>! </span>{t("criador2.files.mismatch", { asked: `${t(`taskForm.fmt.familyName.${asked.family}`)} (${askedCodes(asked)})`, got: advice.got })}
                          </span>
                        ) : null}
                        <span className={q.status === "erro" ? "text-[length:var(--ws-text-caption)] text-ws-danger-ink" : "text-[length:var(--ws-text-caption)] text-ws-text-muted"} data-testid="file-upload-status">
                          <span aria-hidden>{q.status === "enviado" ? "✓ " : q.status === "erro" ? "✕ " : q.status === "enviando" ? "◷ " : "○ "}</span>
                          {t(`criador2.upload.${q.status}`)}{q.error ? `: ${q.error}` : ""}
                        </span>
                      </span>
                      {q.status !== "enviando" ? (
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setQueue((cur) => cur.filter((x) => x.key !== q.key))} aria-label={t("tasks.form.remove", { item: q.file.name })}>×</Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <Checkbox checked={asEvidence} onCheckedChange={(v) => { setAsEvidence(v); if (v) setQueue((cur) => cur.filter((q) => q.status !== "enviado").slice(0, 1)); }} disabled={busy} label={t("tasks.attach.asEvidence")} />
            {asEvidence ? <EvidenceFields value={form} onChange={setForm} errors={errors} disabled={busy} /> : null}
            <div><Button type="submit" variant="primary" disabled={busy} busy={busy} aria-describedby={fileId}>{t(asEvidence ? "tasks.attach.sendEvidence" : "tasks.attach.send")}</Button></div>
            <span id={fileId} className="sr-only">{queue.filter((q) => q.status === "pendente").map((q) => `${q.file.name} · ${formatBytes(q.file.size, intl)}`).join("; ")}</span>
          </form>
        ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("tasks.attach.readOnlyNote")}</p>}

        <p className="sr-only" aria-live="polite">{announce}</p>
        {error ? <ErrorState title={t("tasks.attach.loadError")} description={error} onRetry={load} /> : !items ? <LoadingState /> : !items.length ? (
          <p className="text-ws-text-muted">{t("tasks.attach.empty")}</p>
        ) : (
          <>
          {asked.family ? (
            <p role="status" className={`rounded-[var(--ws-radius-md)] border border-ws-border p-2 text-[length:var(--ws-text-body-sm)] ${mismatched.length ? "bg-ws-warning-soft" : "bg-ws-surface-2"}`} data-testid="format-asked">
              <span aria-hidden>{mismatched.length ? "! " : "✓ "}</span>
              {mismatched.length
                ? t(mismatched.length === 1 ? "taskForm.fmt.mismatchOne" : "taskForm.fmt.mismatchMany", { n: mismatched.length, asked: formatText(asked), files: mismatched.map((m) => m.fileName).join(", ") })
                : t("taskForm.fmt.allMatch", { asked: formatText(asked) })}
            </p>
          ) : null}
          <ul className="grid gap-2" aria-label={t("tasks.attach.listLabel")}>
            {items.map((a) => (
              <li key={a.id} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border p-2 sm:grid-cols-[minmax(0,1fr)_auto]" data-testid="attachment-item">
                <div className="grid min-w-0 gap-1">
                  <p className="font-semibold [overflow-wrap:anywhere]"><span aria-hidden>{a.image ? "▣ " : "▤ "}</span>{a.fileName}</p>
                  <AttachmentFormat a={a} asked={a.evidence ? undefined : asked} />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">
                    <span>{formatBytes(a.sizeBytes, intl)}</span>
                    <span>{t("tasks.attach.uploadedOn", { date: formatDateTime(a.createdAt, intl) })}</span>
                    <ScanTag status={a.scanStatus} />
                  </div>
                  <EvidenceSummary a={a} />
                </div>
                <div className="flex flex-wrap content-start gap-1 sm:justify-end">
                  <Button size="sm" variant="ghost" disabled={!a.available} title={a.available ? undefined : t("tasks.attach.unavailable")} onClick={() => void open(a)}>
                    {t(a.image ? "tasks.attach.open" : "tasks.attach.download")}
                  </Button>
                  {task.editable ? (
                    <>
                      {a.evidence ? (
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => attachmentsApi.removeEvidence(taskId, a.evidence!.id!), t("tasks.attach.unmarked"))}>{t("tasks.attach.unmark")}</Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setMarkForm(EMPTY_FORM); setMarkErrors({}); setMarking(a); }}>{t("tasks.attach.markEvidence")}</Button>
                      )}
                      <Button size="sm" variant="danger" disabled={busy} onClick={() => setRemoving(a)}>{t("tasks.attach.remove")}</Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          </>
        )}
      </div>

      <Dialog open={!!removing} onOpenChange={(o) => { if (!o) setRemoving(null); }} title={t("tasks.attach.removeTitle")}
        description={removing ? t("tasks.attach.removeConfirm", { name: removing.fileName ?? "" }) : undefined}>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>{t("tasks.detail.cancel")}</Button>
          <Button variant="danger" disabled={busy} busy={busy} onClick={() => void confirmRemove()}>
            {t("tasks.attach.remove")}
          </Button>
        </div>
      </Dialog>

      <Dialog open={!!marking} onOpenChange={(o) => { if (!o) setMarking(null); }} title={marking ? t("tasks.attach.markTitle", { name: marking.fileName ?? "" }) : t("tasks.attach.markEvidence")}>
        <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); void confirmMark(); }}>
          <EvidenceFields value={markForm} onChange={setMarkForm} errors={markErrors} disabled={busy} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setMarking(null)}>{t("tasks.detail.cancel")}</Button>
            <Button type="submit" variant="primary" disabled={busy} busy={busy}>{t("tasks.attach.markEvidence")}</Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}

type MineFilter = "all" | "evidences" | "images" | "documents";
const MINE_FILTERS: readonly MineFilter[] = ["all", "evidences", "images", "documents"];
const matchesMine = (a: AttachmentView, f: MineFilter) => f === "all" || (f === "evidences" ? !!a.evidence : f === "images" ? !!a.image : !a.image);

function loadMineError(e: unknown, t: (k: string) => string) {
  if (e instanceof ApiError && (e.status === 401 || e.status === 0)) return t("tasks.list.needSession");
  return describeError(e);
}

/** Página /attachments: anexos e evidências das minhas tarefas, com o link para cada tarefa. */
export function MyAttachments() {
  const { t, intl } = useI18n();
  const open = useOpenAttachment();
  const [items, setItems] = useState<AttachmentView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MineFilter>("all");
  const [family, setFamily] = useState<FormatFamilyId | "">("");
  const load = useCallback(() => {
    setError(null);
    attachmentsApi.mine(200).then((r) => setItems(Array.isArray(r) ? r : [])).catch((e) => setError(loadMineError(e, t)));
  }, [t]);
  useEffect(load, [load]);

  if (error) return <ErrorState title={t("attachments.loadError")} description={error} onRetry={load} />;
  if (!items) return <LoadingState />;
  if (!items.length) {
    return <EmptyState title={t("attachments.empty")} description={t("attachments.emptyHint")} action={<Button variant="primary" href="/tasks">{t("attachments.goToTasks")}</Button>} />;
  }
  const familyOf = (a: AttachmentView) => attachmentFormat(a)?.format.family ?? "";
  const families = FORMAT_FAMILIES.filter((f) => items.some((a) => familyOf(a) === f));
  const shown = items.filter((a) => matchesMine(a, filter) && (!family || familyOf(a) === family));
  return (
    <div className="grid gap-3" data-testid="my-attachments">
      <p className="text-ws-text-muted">{t("attachments.intro")}</p>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("attachments.filterLabel")}>
        {MINE_FILTERS.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "ghost"} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {t(`attachments.filter.${f}`, { n: items.filter((a) => matchesMine(a, f)).length })}
          </Button>
        ))}
      </div>
      {families.length ? (
        <div className="max-w-xs">
          <Field label={t("taskForm.fmt.filterFamily")} hint={t("taskForm.fmt.filterHint")}>
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} value={family} onChange={(e) => setFamily(e.target.value as FormatFamilyId | "")} data-testid="attachments-family"
                options={[{ value: "", label: t("taskForm.fmt.allFamilies") }, ...families.map((f) => ({ value: f, label: `${t(`taskForm.fmt.familyName.${f}`)} (${items.filter((a) => familyOf(a) === f).length})` }))]} />
            )}
          </Field>
        </div>
      ) : null}
      <p aria-live="polite" className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(shown.length === 1 ? "attachments.countOne" : "attachments.countMany", { n: shown.length })}</p>
      {shown.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-[length:var(--ws-text-body-sm)]">
            <caption className="sr-only">{t("attachments.tableCaption")}</caption>
            <thead>
              <tr className="border-b border-ws-border text-ws-text-muted">
                <th scope="col" className="py-2 pr-3 font-semibold">{t("attachments.col.file")}</th>
                <th scope="col" className="py-2 pr-3 font-semibold">{t("attachments.col.task")}</th>
                <th scope="col" className="py-2 pr-3 font-semibold">{t("attachments.col.date")}</th>
                <th scope="col" className="py-2 pr-3 font-semibold">{t("attachments.col.size")}</th>
                <th scope="col" className="py-2 pr-3 font-semibold">{t("attachments.col.status")}</th>
                <th scope="col" className="py-2 font-semibold"><span className="sr-only">{t("attachments.col.actions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <tr key={a.id} className="border-b border-ws-border align-top" data-testid="my-attachment-row">
                  <th scope="row" className="py-2 pr-3 font-normal">
                    <span className="block font-semibold [overflow-wrap:anywhere]"><span aria-hidden>{a.image ? "▣ " : "▤ "}</span>{a.fileName}</span>
                    <AttachmentFormat a={a} />
                    <EvidenceSummary a={a} />
                  </th>
                  <td className="py-2 pr-3 [overflow-wrap:anywhere]"><Link href={`/tasks/${a.taskId}`}>{a.taskTitle}</Link></td>
                  <td className="py-2 pr-3">{formatDateTime(a.createdAt, intl)}</td>
                  <td className="py-2 pr-3">{formatBytes(a.sizeBytes, intl)}</td>
                  <td className="py-2 pr-3"><ScanTag status={a.scanStatus} /></td>
                  <td className="py-2">
                    <Button size="sm" variant="ghost" disabled={!a.available} title={a.available ? undefined : t("tasks.attach.unavailable")} onClick={() => void open(a)}>
                      {t(a.image ? "tasks.attach.open" : "tasks.attach.download")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-ws-text-muted">{t("attachments.noMatch")}</p>}
    </div>
  );
}
