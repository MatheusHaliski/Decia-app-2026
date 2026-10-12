"use client";
/**
 * Delegar (= "atribuir" do RF18.CA03; RF10 chefe → equipe; RF46 pelo chat): busca de pessoas da mesma empresa
 * (autocomplete por nome, @usuário ou sigla), mensagem opcional (≤ 1000) e prazo opcional → `Assignment PROPOSTA` +
 * notificação ao destinatário. Pessoas que não podem receber aparecem desabilitadas com o motivo (classificação,
 * duplicata, já responsável…). Também: diálogo de motivo para Recusar / Retornar (RF18.CA04/CA05).
 */
import { useMemo, useState } from "react";
import { Button, Dialog, Field, Input, SelectList, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import {
  DELEGATE_MESSAGE_MAX, GIVE_BACK_MIN, REASON_MAX, delegate, delegateCandidates, departmentById, giveBack, itemOf, recipientPermission,
} from "@/lib/social/rules";
import type { CardViewModel } from "@/lib/social/view-model";
import { useSocial } from "./context";
import { ACTION_SYMBOL } from "./meta";

export function DelegateDialog({ open, onOpenChange, vm }: { open: boolean; onOpenChange: (o: boolean) => void; vm: CardViewModel }) {
  const { t } = useI18n();
  const { state, viewerId, run, reason, now } = useSocial();
  const [query, setQuery] = useState("");
  const [to, setTo] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const item = itemOf(state, vm.ref);
  const options = useMemo(() => {
    if (!item) return [];
    return delegateCandidates(state, viewerId, query).map((p) => {
      const perm = recipientPermission(state, viewerId, item, p.id);
      const dept = departmentById(state, p.departmentId);
      return { id: p.id, title: `${p.fullName} · @${p.username}`, subtitle: [p.jobTitle, dept?.acronym].filter(Boolean).join(" · "), disabledReason: perm.ok ? undefined : reason(perm) };
    });
  }, [state, viewerId, query, item, reason]);
  const reset = () => { setQuery(""); setTo([]); setMessage(""); setDue(""); setError(null); };
  const submit = () => {
    if (!to[0]) { setError(t("social.delegate.pickSomeone")); return; }
    const r = run((s, v, at) => delegate(s, v, vm.ref, { toUserId: to[0]!, message, dueAt: due || null }, at), "social.toast.delegated", { name: state.people.find((p) => p.id === to[0])?.fullName ?? "" });
    if (r.ok) { reset(); onOpenChange(false); } else setError(reason(r.error));
  };
  const today = now.toISOString().slice(0, 10);
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }} title={<><span aria-hidden>{ACTION_SYMBOL.delegate} </span>{t("social.delegate.title")}</>} description={t("social.delegate.description", { title: vm.title })} className="w-[min(92vw,34rem)]">
      <div className="grid gap-3" data-testid="delegate-dialog">
        <Field label={t("social.delegate.search")} hint={t("social.delegate.searchHint")}>
          {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} leading="buscar" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("social.delegate.searchPlaceholder")} autoComplete="off" data-testid="delegate-search" />}
        </Field>
        {options.length ? (
          <SelectList label={t("social.delegate.people")} options={options} value={to} onChange={(v) => { setTo(v); setError(null); }} className="max-h-56 overflow-auto" />
        ) : (
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("social.delegate.noPeople")}</p>
        )}
        <Field label={t("social.delegate.message")} hint={t("social.common.chars", { n: message.length, max: DELEGATE_MESSAGE_MAX })}>
          {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} value={message} maxLength={DELEGATE_MESSAGE_MAX} onChange={(e) => setMessage(e.target.value)} className="min-h-20" data-testid="delegate-message" />}
        </Field>
        <Field label={t("social.delegate.due")} hint={t("social.delegate.dueHint")}>
          {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="date" min={today} value={due} onChange={(e) => setDue(e.target.value)} data-testid="delegate-due" />}
        </Field>
        {error ? <p role="alert" className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">{error}</p> : null}
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("social.delegate.flowNote")}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => onOpenChange(false)}>{t("social.common.cancel")}</Button>
          <Button variant="primary" onClick={submit} data-testid="delegate-confirm">{t("social.delegate.confirm")}</Button>
        </div>
      </div>
    </Dialog>
  );
}

/** Diálogo de motivo (Recusar: obrigatório; Retornar/Devolver: ≥ 20 caracteres — RF18.CA04/CA05). */
export function ReasonDialog({ open, onOpenChange, title, description, min, confirmLabel, onConfirm, testId }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; min: number; confirmLabel: string; onConfirm: (reason: string) => boolean; testId: string;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const short = text.trim().length < min;
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setText(""); setTouched(false); } }} title={title} description={description}>
      <div className="grid gap-3" data-testid={testId}>
        <Field label={t("social.reason.label")} required hint={t("social.reason.hint", { min, n: text.trim().length, max: REASON_MAX })} error={touched && short ? t("social.reason.tooShort", { min }) : undefined}>
          {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} value={text} maxLength={REASON_MAX} onChange={(e) => setText(e.target.value)} data-testid={`${testId}-text`} />}
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => onOpenChange(false)}>{t("social.common.cancel")}</Button>
          <Button variant="danger" data-testid={`${testId}-confirm`} onClick={() => { setTouched(true); if (!short && onConfirm(text)) { setText(""); setTouched(false); onOpenChange(false); } }}>{confirmLabel}</Button>
        </div>
      </div>
    </Dialog>
  );
}

/** "Retornar" da barra social: devolve a atribuição ACEITA com motivo (RF18.CA05). */
export function GiveBackDialog({ open, onOpenChange, vm }: { open: boolean; onOpenChange: (o: boolean) => void; vm: CardViewModel }) {
  const { t } = useI18n();
  const { run } = useSocial();
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("social.giveBack.title")}
      description={t("social.giveBack.description", { title: vm.title, name: vm.delegation?.from.name ?? "" })}
      min={GIVE_BACK_MIN}
      confirmLabel={t("social.action.giveBack")}
      testId="giveback-dialog"
      onConfirm={(why) => run((s, v, now) => giveBack(s, v, vm.ref, why, now), "social.toast.givenBack").ok}
    />
  );
}
