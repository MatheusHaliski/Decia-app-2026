"use client";
/**
 * Mensagens diretas reais (RF46; Onda 7) — `/messages` e `/messages/{id}` fora do laboratório. Lista das minhas conversas por atividade
 * (última mensagem, não lidas), conversa aberta com paginação por cursor ("carregar anteriores"), compositor (Enter envia, Shift+Enter
 * quebra a linha, contador de caracteres), edição e remoção das próprias mensagens, sair de grupo e nova conversa com busca de pessoas.
 * Entrega quase em tempo real por polling leve (`changes?since=`) a cada 5 s com a aba visível — parado com a aba oculta, retomado na
 * volta. Texto sempre como texto (nunca HTML; links aparecem como texto). Estados: sem sessão, carregando, erro, vazio e 404 (conversa
 * inexistente ou de que a pessoa não participa — a mesma resposta). No celular (≤ md) mostra a lista OU a conversa.
 */
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ProfileAvatar } from "@/components/account/ProfileAvatar";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge, Button, Card, EmptyState, ErrorState, Link, LoadingState, Textarea, cn } from "@/components/ui";
import { ApiError, describeError } from "@/lib/api/client";
import { loginUrl } from "@/lib/auth/next";
import { useI18n } from "@/lib/i18n/useI18n";
import {
  MESSAGE_MAX, PAGE_SIZE, charCount, mergeMessages, messagesApi, othersOf, personName, sendable,
  type ConversationView, type MessageView, type ParticipantView,
} from "@/lib/messages/client";
import { setUnread } from "@/lib/messages/unread";
import { useCurrentUser } from "@/lib/session/CurrentUserProvider";
import { NewConversationDialog } from "./NewConversationDialog";

/** Polling da conversa aberta (aba visível). */
export const POLL_MS = 5_000;
/** Releitura da lista de conversas (aba visível). */
export const LIST_REFRESH_MS = 20_000;

type Translate = ReturnType<typeof useI18n>["t"];

// ------------------------------------------------------------------------------------------------ apoio

/** Nome da conversa: 1:1 → a outra pessoa; grupo → título ou os nomes. */
export function conversationName(c: ConversationView, t: Translate, intl: string): string {
  const others = othersOf(c);
  if (c.kind === "GRUPO") {
    if (c.title?.trim()) return c.title.trim();
    const names = others.map((p) => personName(p, t("dm.removedAccount")));
    return names.length ? new Intl.ListFormat(intl, { style: "long", type: "conjunction" }).format(names) : t("dm.groupUntitled");
  }
  return personName(others[0], t("dm.removedAccount"));
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Hora (hoje) ou data curta (outros dias). */
function shortWhen(iso: string, intl: string) {
  const d = new Date(iso);
  return sameDay(d, new Date())
    ? new Intl.DateTimeFormat(intl, { hour: "2-digit", minute: "2-digit" }).format(d)
    : new Intl.DateTimeFormat(intl, { day: "2-digit", month: "2-digit" }).format(d);
}

const fullWhen = (iso: string, intl: string) => new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

const visible = () => typeof document === "undefined" || document.visibilityState === "visible";
/** Depois do próximo desenho (rolagem); sem requestAnimationFrame (testes), no próximo ciclo. */
const afterPaint = (fn: () => void) => { if (typeof requestAnimationFrame === "function") requestAnimationFrame(fn); else setTimeout(fn, 0); };

// ------------------------------------------------------------------------------------------------ lista de conversas

type ListState = { status: "loading" | "ready" | "error"; items: ConversationView[]; error: string | null };

function useConversationList() {
  const [state, setState] = useState<ListState>({ status: "loading", items: [], error: null });
  const [tick, setTick] = useState(0);
  const loaded = useRef(false);

  useEffect(() => {
    const ctrl = new AbortController();
    if (!loaded.current) setState((s) => ({ ...s, status: "loading" }));
    messagesApi.list(50, ctrl.signal).then(
      (items) => { if (!ctrl.signal.aborted) { loaded.current = true; setState({ status: "ready", items: items ?? [], error: null }); } },
      (e: unknown) => {
        if (ctrl.signal.aborted) return;
        // releitura que falha mantém a lista na tela
        setState((s) => (loaded.current ? s : { status: "error", items: [], error: describeError(e) }));
      },
    );
    return () => ctrl.abort();
  }, [tick]);

  useEffect(() => {
    const refresh = () => { if (visible()) setTick((x) => x + 1); };
    const id = window.setInterval(refresh, LIST_REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", refresh); };
  }, []);

  const reload = useCallback(() => setTick((x) => x + 1), []);
  /** Atualiza uma conversa e a leva para o topo se houve atividade nova. */
  const patch = useCallback((id: string, change: Partial<ConversationView>) => {
    setState((s) => {
      const items = s.items.map((c) => (c.id === id ? { ...c, ...change } : c));
      items.sort((a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt));
      return { ...s, items };
    });
  }, []);
  const upsert = useCallback((c: ConversationView) => {
    setState((s) => ({ ...s, status: "ready", items: [c, ...s.items.filter((x) => x.id !== c.id)] }));
  }, []);
  const remove = useCallback((id: string) => setState((s) => ({ ...s, items: s.items.filter((c) => c.id !== id) })), []);
  return { ...state, reload, patch, upsert, remove };
}

function ConversationList({ list, activeId, onNew }: { list: ReturnType<typeof useConversationList>; activeId?: string; onNew: () => void }) {
  const { t, intl } = useI18n();
  if (list.status === "loading") return <LoadingState label={t("dm.loadingList")} />;
  if (list.status === "error") return <ErrorState title={t("dm.listError")} description={list.error ?? undefined} onRetry={list.reload} />;
  if (!list.items.length) {
    return (
      <EmptyState compact moji="vazio" title={t("dm.emptyTitle")} description={t("dm.emptyDescription")}
        action={<Button variant="primary" size="sm" onClick={onNew}>{t("dm.new")}</Button>} />
    );
  }
  return (
    <ul className="grid gap-0.5" aria-labelledby="dm-list-heading" data-testid="dm-conversations">
      {list.items.map((c) => {
        const name = conversationName(c, t, intl);
        const other = c.kind === "DIRETA" ? othersOf(c)[0] : undefined;
        const last = c.lastMessage;
        const preview = !last ? t("dm.noMessagesYet") : last.deleted ? t("dm.removed") : last.preview ?? "";
        const mineLast = !!last && c.participants.some((p) => p.self && p.id === last.authorId);
        const active = c.id === activeId;
        return (
          <li key={c.id}>
            <Link href={`/messages/${c.id}`} variant="card" aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-3 p-2", active && "bg-ws-accent-soft", c.unread > 0 && "font-semibold")} data-testid="dm-conversation">
              <ProfileAvatar name={name} src={other?.avatarUrl} size={40} />
              <span className="grid min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <time dateTime={c.lastActivityAt} className="shrink-0 text-[length:var(--ws-text-caption)] font-normal text-ws-text-muted">
                    {shortWhen(c.lastActivityAt, intl)}
                  </time>
                </span>
                <span className={cn("truncate text-[length:var(--ws-text-body-sm)]", c.unread > 0 ? "text-ws-text" : "font-normal text-ws-text-muted")}>
                  {mineLast && !last?.deleted ? `${t("dm.you")}: ` : ""}{preview}
                </span>
              </span>
              {c.unread > 0 ? (
                <Badge count className="shrink-0" aria-hidden>{c.unread > 99 ? "99+" : c.unread}</Badge>
              ) : null}
              {c.unread > 0 ? <span className="sr-only">{t("dm.unreadCount", { n: c.unread })}</span> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ------------------------------------------------------------------------------------------------ compositor

function messageError(e: unknown, t: Translate): string {
  if (e instanceof ApiError) {
    if (e.code === "MENSAGEM_LONGA") return t("dm.composer.tooLong", { max: MESSAGE_MAX });
    if (e.code === "MENSAGEM_VAZIA") return t("dm.composer.empty");
    if (e.code === "CONVERSA_SEM_DESTINATARIO") return t("dm.noRecipients");
    if (e.code === "MENSAGEM_APAGADA") return t("dm.alreadyRemoved");
    if (e.status === 404) return t("dm.notFoundTitle");
  }
  return describeError(e);
}

/** Enter envia; Shift+Enter (ou composição de IME) quebra a linha. */
function enterSends(e: KeyboardEvent<HTMLTextAreaElement>, submit: () => void) {
  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
    e.preventDefault();
    submit();
  }
}

function Composer({ onSend }: { onSend: (text: string) => Promise<void> }) {
  const { t, intl } = useI18n();
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = sendable(text);
  const count = charCount(text.trim());
  const fmt = new Intl.NumberFormat(intl);

  const submit = async () => {
    if (!s.ok || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSend(s.text);
      setText("");
    } catch (e) {
      setError(messageError(e, t));
    } finally {
      setBusy(false);
      ref.current?.focus();
    }
  };

  return (
    <form className="grid gap-1.5 border-t border-ws-border p-[var(--ws-space-3)]" onSubmit={(e: FormEvent) => { e.preventDefault(); void submit(); }}
      data-testid="dm-composer">
      <label htmlFor={id} className="sr-only">{t("dm.composer.label")}</label>
      <Textarea id={id} ref={ref} rows={2} value={text} placeholder={t("dm.composer.placeholder")} invalid={s.over}
        aria-describedby={`${id}-hint ${id}-count`} onChange={(e) => { setText(e.target.value); setError(null); }}
        onKeyDown={(e) => enterSends(e, () => void submit())} className="max-h-48 min-h-12 resize-y" data-testid="dm-input" />
      <div className="flex flex-wrap items-center gap-2">
        <p id={`${id}-hint`} className="min-w-0 flex-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("dm.composer.hint")}</p>
        <span id={`${id}-count`} className={cn("font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] tabular-nums",
          s.over ? "font-semibold text-ws-danger-ink" : "text-ws-text-muted")} data-testid="dm-count">
          {t("dm.composer.count", { n: fmt.format(count), max: fmt.format(MESSAGE_MAX) })}
        </span>
        <Button type="submit" variant="primary" size="sm" busy={busy} disabled={!s.ok} data-testid="dm-send">{t("dm.composer.send")}</Button>
      </div>
      {s.over ? <p className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">{t("dm.composer.tooLong", { max: fmt.format(MESSAGE_MAX) })}</p> : null}
      {error ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] font-medium text-ws-danger-ink" data-testid="dm-send-error">{error}</p> : null}
    </form>
  );
}

// ------------------------------------------------------------------------------------------------ mensagem

function MessageItem({ m, author, conversationId, onChanged }: {
  m: MessageView; author: string; conversationId: string; onChanged: (m: MessageView) => void;
}) {
  const { t, intl } = useI18n();
  const editId = useId();
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [draft, setDraft] = useState(m.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (mode === "edit") editRef.current?.focus(); }, [mode]);

  const run = async (call: () => Promise<MessageView>) => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await call());
      setMode("view");
    } catch (e) {
      setError(messageError(e, t));
    } finally {
      setBusy(false);
    }
  };
  const draftOk = sendable(draft);
  const save = () => { if (draftOk.ok && !busy) void run(() => messagesApi.edit(conversationId, m.id, draftOk.text)); };

  return (
    <li className={cn("flex", m.mine ? "justify-end" : "justify-start")} data-testid="dm-message">
      <div className={cn("grid max-w-[min(85%,40rem)] gap-1 rounded-[var(--ws-radius-md)] px-3 py-2",
        m.mine ? "bg-ws-accent-soft" : "bg-ws-surface-2")}>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
          <span className="font-semibold text-ws-text">{m.mine ? t("dm.you") : author}</span>
          {" · "}<time dateTime={m.sentAt}>{fullWhen(m.sentAt, intl)}</time>
          {m.edited ? <> · <span>{t("dm.edited")}</span></> : null}
        </p>
        {m.deleted ? (
          <p className="italic text-ws-text-muted" data-testid="dm-removed">{t("dm.removed")}</p>
        ) : mode === "edit" ? (
          <form className="grid gap-1.5" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <label htmlFor={editId} className="sr-only">{t("dm.editLabel")}</label>
            <Textarea id={editId} ref={editRef} value={draft} rows={2} invalid={draftOk.over} className="min-h-12"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setMode("view"); setDraft(m.body ?? ""); } else enterSends(e, save); }} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setMode("view"); setDraft(m.body ?? ""); }}>{t("common.cancel")}</Button>
              <Button size="sm" variant="primary" type="submit" busy={busy} disabled={!draftOk.ok}>{t("dm.save")}</Button>
            </div>
          </form>
        ) : (
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]" data-testid="dm-body">{m.body}</p>
        )}
        {m.mine && !m.deleted && mode === "view" ? (
          <div className="flex flex-wrap justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => { setDraft(m.body ?? ""); setMode("edit"); }}
              aria-label={t("dm.editAria", { when: fullWhen(m.sentAt, intl) })}>{t("dm.edit")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("confirmDelete")}
              aria-label={t("dm.deleteAria", { when: fullWhen(m.sentAt, intl) })}>{t("dm.delete")}</Button>
          </div>
        ) : null}
        {mode === "confirmDelete" ? (
          <div className="flex flex-wrap items-center justify-end gap-2" role="group" aria-label={t("dm.deleteConfirm")}>
            <span className="text-[length:var(--ws-text-body-sm)]">{t("dm.deleteConfirm")}</span>
            <Button size="sm" variant="ghost" onClick={() => setMode("view")} autoFocus>{t("common.cancel")}</Button>
            <Button size="sm" variant="danger" busy={busy} onClick={() => void run(() => messagesApi.remove(conversationId, m.id))}
              data-testid="dm-confirm-delete">{t("dm.delete")}</Button>
          </div>
        ) : null}
        {error ? <p role="alert" className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">{error}</p> : null}
      </div>
    </li>
  );
}

// ------------------------------------------------------------------------------------------------ conversa aberta

type PaneLoad = "loading" | "ok" | "notFound" | "signin" | "error";

function ConversationPane({ id, onActivity, onRead, onLeft }: {
  id: string;
  onActivity: (id: string, change: Partial<ConversationView>) => void;
  onRead: (id: string) => void;
  onLeft: (id: string) => void;
}) {
  const { t, intl } = useI18n();
  const [load, setLoad] = useState<PaneLoad>("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [conv, setConv] = useState<ConversationView | null>(null);
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [older, setOlder] = useState<"idle" | "loading" | "error">("idle");
  const [announcement, setAnnouncement] = useState("");
  const [leaving, setLeaving] = useState<"idle" | "confirm" | "busy">("idle");
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const since = useRef<string | null>(null);
  const messagesRef = useRef<MessageView[]>([]);
  messagesRef.current = messages;
  const scroller = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const toBottom = () => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; };
  const nearBottom = () => { const el = scroller.current; return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80; };

  const markRead = useCallback(() => {
    messagesApi.markRead(id).then((s) => { setUnread(s); onRead(id); }, () => { /* tenta de novo na próxima chegada */ });
  }, [id, onRead]);

  // abrir: conversa + primeira página
  useEffect(() => {
    const ctrl = new AbortController();
    setLoad("loading");
    Promise.all([messagesApi.get(id, ctrl.signal), messagesApi.page(id, null, PAGE_SIZE, ctrl.signal)]).then(
      ([c, page]) => {
        if (ctrl.signal.aborted) return;
        setConv(c);
        setMessages(mergeMessages([], page.items));
        setCursor(page.nextCursor ?? null);
        since.current = page.serverTime;
        setLoad("ok");
      },
      (e: unknown) => {
        if (ctrl.signal.aborted) return;
        if (e instanceof ApiError && e.status === 404) setLoad("notFound");
        else if (e instanceof ApiError && e.status === 401) setLoad("signin");
        else { setError(describeError(e)); setLoad("error"); }
      },
    );
    return () => ctrl.abort();
  }, [id, attempt]);

  // aberta: lida, foco no título e rolagem para o fim
  useEffect(() => {
    if (load !== "ok") return;
    markRead();
    heading.current?.focus();
    toBottom();
  }, [load, markRead]);

  // polling leve com a aba visível; parado com a aba oculta e retomado na volta
  useEffect(() => {
    if (load !== "ok") return;
    let stopped = false;
    let inflight = false;
    const poll = async () => {
      if (stopped || inflight || !visible() || !since.current) return;
      inflight = true;
      try {
        const ch = await messagesApi.changes(id, since.current);
        if (stopped) return;
        since.current = ch.serverTime;
        let incoming = ch.items;
        if (ch.truncated) incoming = [...incoming, ...(await messagesApi.page(id, null, PAGE_SIZE)).items];
        if (!incoming.length) return;
        const known = new Set(messagesRef.current.map((m) => m.id));
        const fresh = incoming.filter((m) => !known.has(m.id));
        const stick = nearBottom();
        setMessages((cur) => mergeMessages(cur, incoming));
        const fromOthers = fresh.filter((m) => !m.mine && !m.deleted);
        if (fromOthers.length) {
          const last = fromOthers[fromOthers.length - 1]!;
          const who = personName(conv?.participants.find((p) => p.id === last.authorId), t("dm.someone"));
          setAnnouncement(fromOthers.length === 1 ? t("dm.announceOne", { who }) : t("dm.announceMany", { n: fromOthers.length }));
          markRead();
        }
        const newest = fresh[fresh.length - 1];
        if (newest) {
          onActivity(id, { lastActivityAt: newest.sentAt, lastMessage: { id: newest.id, authorId: newest.authorId, preview: newest.body ?? null,
            deleted: newest.deleted, sentAt: newest.sentAt }, unread: 0 });
        }
        if (stick) afterPaint(toBottom);
      } catch (e) {
        if (!stopped && e instanceof ApiError && e.status === 404) setLoad("notFound");
      } finally {
        inflight = false;
      }
    };
    const timer = window.setInterval(() => void poll(), POLL_MS);
    const onVisibility = () => { if (visible()) void poll(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stopped = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [load, id, conv, markRead, onActivity, t]);

  const loadOlder = async () => {
    if (!cursor || older === "loading") return;
    setOlder("loading");
    const el = scroller.current;
    const before = el ? el.scrollHeight - el.scrollTop : 0;
    try {
      const page = await messagesApi.page(id, cursor, PAGE_SIZE);
      setMessages((cur) => mergeMessages(cur, page.items));
      setCursor(page.nextCursor ?? null);
      setOlder("idle");
      // mantém a mensagem que estava visível no lugar
      afterPaint(() => { if (el) el.scrollTop = el.scrollHeight - before; });
    } catch {
      setOlder("error");
    }
  };

  const send = async (text: string) => {
    const m = await messagesApi.send(id, text);
    setMessages((cur) => mergeMessages(cur, [m]));
    onActivity(id, { lastActivityAt: m.sentAt, unread: 0, lastMessage: { id: m.id, authorId: m.authorId, preview: m.body ?? null, deleted: false,
      sentAt: m.sentAt } });
    afterPaint(toBottom);
  };

  const changed = (m: MessageView) => setMessages((cur) => mergeMessages(cur, [m]));

  const leave = async () => {
    setLeaving("busy");
    setLeaveError(null);
    try {
      await messagesApi.leave(id);
      onLeft(id);
    } catch (e) {
      setLeaveError(describeError(e));
      setLeaving("confirm");
    }
  };

  if (load === "loading") return <Card className="grid min-h-[24rem] place-items-center"><LoadingState label={t("dm.loadingConversation")} /></Card>;
  if (load === "notFound") {
    return (
      <Card data-testid="dm-not-found">
        <EmptyState moji="vazio" title={t("dm.notFoundTitle")} description={t("dm.notFoundDescription")}
          action={<Button href="/messages">{t("dm.backToList")}</Button>} />
      </Card>
    );
  }
  if (load === "signin") return <SignIn next={`/messages/${id}`} />;
  if (load === "error" || !conv) {
    return <ErrorState title={t("dm.conversationError")} description={error ?? undefined} onRetry={() => setAttempt((n) => n + 1)} />;
  }

  const name = conversationName(conv, t, intl);
  const others = othersOf(conv);
  const nameOf = (authorId: string) => personName(conv.participants.find((p: ParticipantView) => p.id === authorId), t("dm.someone"));
  const members = conv.kind === "GRUPO"
    ? new Intl.ListFormat(intl, { style: "long", type: "conjunction" }).format(conv.participants.filter((p) => p.active)
      .map((p) => (p.self ? t("dm.you") : personName(p, t("dm.removedAccount")))))
    : others[0]?.username ? `@${others[0].username}` : "";

  return (
    <Card padding="none" className="flex h-[min(78dvh,52rem)] min-h-[24rem] flex-col overflow-hidden" data-testid="dm-conversation-pane">
      <header className="flex items-center gap-3 border-b border-ws-border p-[var(--ws-space-3)]">
        <Link href="/messages" variant="plain" className="shrink-0 rounded-[var(--ws-radius-sm)] px-1 text-[length:var(--ws-text-body-sm)] font-semibold md:hidden">
          <span aria-hidden>← </span>{t("dm.backToList")}
        </Link>
        <ProfileAvatar name={name} src={conv.kind === "DIRETA" ? others[0]?.avatarUrl : null} size={36} />
        <div className="grid min-w-0 flex-1">
          <h2 ref={heading} tabIndex={-1} className="truncate font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]"
            data-testid="dm-conversation-title">{name}</h2>
          {members ? <p className="truncate text-[length:var(--ws-text-caption)] text-ws-text-muted">{members}</p> : null}
        </div>
        {conv.kind === "GRUPO" && leaving === "idle" ? (
          <Button size="sm" variant="ghost" onClick={() => setLeaving("confirm")}>{t("dm.leave")}</Button>
        ) : null}
      </header>
      {leaving !== "idle" ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-ws-border bg-ws-surface-2 p-[var(--ws-space-3)]" role="group" aria-label={t("dm.leaveConfirm")}>
          <span className="min-w-0 flex-1 text-[length:var(--ws-text-body-sm)]">{t("dm.leaveConfirm")}</span>
          <Button size="sm" variant="ghost" onClick={() => setLeaving("idle")} autoFocus>{t("common.cancel")}</Button>
          <Button size="sm" variant="danger" busy={leaving === "busy"} onClick={() => void leave()} data-testid="dm-confirm-leave">{t("dm.leave")}</Button>
          {leaveError ? <p role="alert" className="w-full text-[length:var(--ws-text-caption)] text-ws-danger-ink">{leaveError}</p> : null}
        </div>
      ) : null}

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto p-[var(--ws-space-3)]" role="region" aria-label={t("dm.messagesRegion", { name })} tabIndex={0}>
        {cursor ? (
          <div className="mb-2 flex justify-center">
            <Button size="sm" variant="ghost" busy={older === "loading"} onClick={() => void loadOlder()} data-testid="dm-older">
              {older === "error" ? t("dm.olderRetry") : t("dm.older")}
            </Button>
          </div>
        ) : null}
        {messages.length ? (
          <ol className="grid gap-2" aria-label={t("dm.messagesList")} data-testid="dm-messages">
            {messages.map((m) => <MessageItem key={m.id} m={m} author={nameOf(m.authorId)} conversationId={id} onChanged={changed} />)}
          </ol>
        ) : (
          <EmptyState compact moji="ok" title={t("dm.firstTitle")} description={t("dm.firstDescription", { name })} />
        )}
      </div>
      <p className="sr-only" aria-live="polite" data-testid="dm-announcer">{announcement}</p>

      {conv.canSend ? <Composer onSend={send} /> : (
        <p className="border-t border-ws-border p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="dm-cannot-send">
          {t("dm.noRecipients")}
        </p>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------------------------------------ página

function SignIn({ next }: { next: string }) {
  const { t } = useI18n();
  return (
    <EmptyState moji="vazio" title={t("dm.signInTitle")} description={t("dm.signInHint")}
      action={<Button variant="primary" href={loginUrl(next)} data-testid="dm-sign-in">{t("nav.login")}</Button>} />
  );
}

function Inbox({ conversationId }: { conversationId?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const list = useConversationList();
  const [newOpen, setNewOpen] = useState(false);
  const { patch, remove, upsert } = list;
  const onRead = useCallback((id: string) => patch(id, { unread: 0 }), [patch]);
  const onLeft = useCallback((id: string) => { remove(id); router.push("/messages"); }, [remove, router]);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-4)]">
      <PageHeader title={t("nav.messages")} glyph="sessao-decia" rfs={["RF46"]} description={t("dm.pageDescription")}
        actions={<Button variant="primary" size="sm" onClick={() => setNewOpen(true)} data-testid="dm-new">{t("dm.new")}</Button>} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-4)] md:grid-cols-[minmax(15rem,22rem)_minmax(0,1fr)]">
        <section aria-labelledby="dm-list-heading" className={cn("min-w-0", conversationId && "hidden md:block")}>
          <h2 id="dm-list-heading" className="sr-only">{t("dm.listTitle")}</h2>
          <Card padding="sm"><ConversationList list={list} activeId={conversationId} onNew={() => setNewOpen(true)} /></Card>
        </section>
        <section aria-label={t("dm.openConversation")} className={cn("min-w-0", !conversationId && "hidden md:block")}>
          {conversationId ? (
            <ConversationPane key={conversationId} id={conversationId} onActivity={patch} onRead={onRead} onLeft={onLeft} />
          ) : (
            <Card><EmptyState moji="ok" title={t("dm.pickTitle")} description={t("dm.pickDescription")} /></Card>
          )}
        </section>
      </div>
      <NewConversationDialog open={newOpen} onOpenChange={setNewOpen}
        onStarted={(c) => { upsert(c); router.push(`/messages/${c.id}`); }} />
    </div>
  );
}

/** Mensagens reais: pede a sessão; com sessão, a caixa de conversas (e a conversa aberta, se houver id). */
export function MessagesView({ conversationId }: { conversationId?: string }) {
  const { status } = useCurrentUser();
  if (status === "loading") return <LoadingState />;
  if (status !== "authenticated") return <SignIn next={conversationId ? `/messages/${conversationId}` : "/messages"} />;
  return <Inbox conversationId={conversationId} />;
}
