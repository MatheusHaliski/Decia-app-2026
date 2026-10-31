"use client";
/**
 * Nova conversa (RF46): busca de pessoas da própria empresa pela mesma API da aba PESSOAS (`peopleApi.search`, ≥ 2 caracteres, só contas
 * ativas, sem a própria pessoa), escolha de uma (conversa 1:1, reaproveitada se já existir) ou mais pessoas (grupo de até 10, título
 * opcional). A recusa do servidor (outra empresa, conta não ativa) volta como uma mensagem só, sem dizer quem nem por quê.
 */
import { useEffect, useState, type FormEvent } from "react";
import { ProfileAvatar } from "@/components/account/ProfileAvatar";
import { Button, Checkbox, Dialog, Field, Input } from "@/components/ui";
import { ApiError, describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { GROUP_MAX, messagesApi, TITLE_MAX, type ConversationView } from "@/lib/messages/client";
import { normalizeQuery, peopleApi, type PersonView } from "@/lib/people/client";

export const NEW_CONVERSATION_DEBOUNCE_MS = 250;

type Search = { kind: "idle" } | { kind: "loading" } | { kind: "ok"; people: PersonView[] } | { kind: "error"; message: string };

export interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: (conversation: ConversationView) => void;
}

const nameOf = (p: PersonView) => p.name?.trim() || `@${p.username ?? ""}`;

export function NewConversationDialog({ open, onOpenChange, onStarted }: NewConversationDialogProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ kind: "idle" });
  const [picked, setPicked] = useState<PersonView[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // novo começo a cada abertura
  useEffect(() => {
    if (!open) return;
    setQuery(""); setSearch({ kind: "idle" }); setPicked([]); setTitle(""); setError(null); setBusy(false);
  }, [open]);

  useEffect(() => {
    const { q, searchable } = normalizeQuery(query);
    if (!open || !searchable) { setSearch({ kind: "idle" }); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setSearch({ kind: "loading" });
      peopleApi.search(q, undefined, ctrl.signal).then(
        (people) => { if (!ctrl.signal.aborted) setSearch({ kind: "ok", people: people ?? [] }); },
        (e: unknown) => { if (!ctrl.signal.aborted) setSearch({ kind: "error", message: describeError(e) }); },
      );
    }, NEW_CONVERSATION_DEBOUNCE_MS);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query, open]);

  const isPicked = (id: string | undefined) => picked.some((p) => p.id === id);
  const full = picked.length + 1 >= GROUP_MAX;
  const toggle = (p: PersonView, on: boolean) => {
    setError(null);
    setPicked((l) => (on ? (l.some((x) => x.id === p.id) || l.length + 1 >= GROUP_MAX ? l : [...l, p]) : l.filter((x) => x.id !== p.id)));
  };
  const group = picked.length > 1;
  const titleTooLong = [...title.trim()].length > TITLE_MAX;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!picked.length || busy || titleTooLong) return;
    setBusy(true);
    setError(null);
    try {
      const c = await messagesApi.start(picked.map((p) => p.id ?? ""), group ? title.trim() : undefined);
      onStarted(c);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError && err.code === "PARTICIPANTE_INDISPONIVEL" ? t("dm.new.unavailable")
        : err instanceof ApiError && err.code === "GRUPO_GRANDE" ? t("dm.new.tooMany", { n: GROUP_MAX }) : describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const results = search.kind === "ok" ? search.people : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("dm.new.title")} description={t("dm.new.description", { n: GROUP_MAX })}>
      <form className="grid gap-[var(--ws-space-3)]" onSubmit={submit} noValidate data-testid="new-conversation-form">
        <Field label={t("dm.new.searchLabel")} hint={t("dm.new.searchHint")}>
          {({ id, describedBy }) => (
            <Input id={id} aria-describedby={describedBy} type="search" leading="buscar" value={query} autoComplete="off"
              onChange={(e) => setQuery(e.target.value)} data-testid="new-conversation-search" />
          )}
        </Field>

        {picked.length ? (
          <div className="grid gap-1">
            <p className="text-[length:var(--ws-text-body-sm)] font-semibold" id="dm-picked-label">{t("dm.new.picked", { n: picked.length })}</p>
            <ul className="flex flex-wrap gap-1.5" aria-labelledby="dm-picked-label">
              {picked.map((p) => (
                <li key={p.id}>
                  <Button size="sm" variant="default" onClick={() => toggle(p, false)} aria-label={t("dm.new.remove", { name: nameOf(p) })}>
                    {nameOf(p)} <span aria-hidden>×</span>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div aria-live="polite" className="min-h-6 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">
          {search.kind === "loading" ? t("dm.new.searching") : null}
          {search.kind === "error" ? <span className="text-ws-danger-ink">{search.message}</span> : null}
          {search.kind === "ok" && !results.length ? t("dm.new.noResults") : null}
          {search.kind === "ok" && results.length ? t("dm.new.results", { n: results.length }) : null}
        </div>
        {results.length ? (
          <ul className="grid max-h-64 gap-0.5 overflow-auto rounded-[var(--ws-radius-md)] border border-ws-border p-1" aria-label={t("dm.new.resultsLabel")}
            data-testid="new-conversation-results">
            {results.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-1">
                <ProfileAvatar name={nameOf(p)} src={p.avatarUrl} size={28} />
                <Checkbox
                  className="min-w-0 flex-1"
                  checked={isPicked(p.id)}
                  disabled={!isPicked(p.id) && full}
                  onCheckedChange={(on) => toggle(p, on)}
                  label={<span className="[overflow-wrap:anywhere]">{nameOf(p)}</span>}
                  hint={p.jobTitle ? `@${p.username ?? ""} · ${p.jobTitle}` : `@${p.username ?? ""}`}
                />
              </li>
            ))}
          </ul>
        ) : null}

        {group ? (
          <Field label={t("dm.new.groupTitle")} hint={t("dm.new.groupTitleHint", { n: TITLE_MAX })} error={titleTooLong ? t("dm.new.titleTooLong", { n: TITLE_MAX }) : undefined}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} invalid={invalid} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TITLE_MAX + 20} />
            )}
          </Field>
        ) : null}

        {error ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] font-medium text-ws-danger-ink" data-testid="new-conversation-error">{error}</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary" busy={busy} disabled={!picked.length || titleTooLong} data-testid="new-conversation-submit">
            {group ? t("dm.new.startGroup") : t("dm.new.start")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
