"use client";
/**
 * Comentários (RF26.CA03, RF19): lista em ordem cronológica, respostas de um nível (D-91), editar/excluir os próprios
 * (o chefe do departamento do item também exclui), exclusão lógica ("comentário removido" quando há respostas),
 * @menções, limite de caracteres com contador e estado vazio. Visitante vê a lista mas precisa entrar para comentar.
 */
import { useState, type Ref } from "react";
import { Avatar, Button, EmptyState, Field, Link, Textarea, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { COMMENT_MAX, addComment, canDeleteComment, canInteract, deleteComment, editComment, itemOf, personById, threadOf } from "@/lib/social/rules";
import type { Comment, TargetRef } from "@/lib/social/types";
import { useSocial } from "./context";
import { relativeTime } from "./meta";

function Composer({ onSubmit, initial = "", label, submitLabel, onCancel, autoFocus, textareaRef, testId }: {
  onSubmit: (text: string) => boolean; initial?: string; label: string; submitLabel: string; onCancel?: () => void; autoFocus?: boolean; textareaRef?: Ref<HTMLTextAreaElement>; testId: string;
}) {
  const { t } = useI18n();
  const [text, setText] = useState(initial);
  const over = text.length > COMMENT_MAX;
  const empty = !text.trim();
  return (
    <form
      className="grid gap-2"
      data-testid={testId}
      onSubmit={(e) => { e.preventDefault(); if (!empty && !over && onSubmit(text)) setText(""); }}
    >
      <Field label={label} hint={t("social.common.chars", { n: text.length, max: COMMENT_MAX })} error={over ? t("social.error.COMENTARIO_LONGO") : undefined}>
        {({ id, describedBy, invalid }) => (
          <Textarea id={id} ref={textareaRef} aria-describedby={describedBy} invalid={invalid} value={text} autoFocus={autoFocus} onChange={(e) => setText(e.target.value)} placeholder={t("social.comments.placeholder")} className="min-h-20" data-testid={`${testId}-text`} />
        )}
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? <Button size="sm" onClick={onCancel}>{t("social.common.cancel")}</Button> : null}
        <Button size="sm" variant="primary" type="submit" disabled={empty || over} data-testid={`${testId}-submit`}>{submitLabel}</Button>
      </div>
    </form>
  );
}

function CommentItem({ c, target, reply = false }: { c: Comment; target: TargetRef; reply?: boolean }) {
  const { t, intl } = useI18n();
  const { state, viewerId, run, now } = useSocial();
  const [mode, setMode] = useState<null | "edit" | "reply">(null);
  const author = personById(state, c.authorId);
  const mine = c.authorId === viewerId;
  const item = itemOf(state, target);
  const canReply = !!item && canInteract(state, viewerId, item).ok && !reply;
  const removable = canDeleteComment(state, viewerId, c);
  const renderText = (text: string) => text.split(/(@[a-z0-9][a-z0-9._-]*[a-z0-9])/gi).map((part, i) => (part.startsWith("@") && c.mentions.includes(part.slice(1).toLowerCase()) ? <Link key={i} href={`/u/${part.slice(1).toLowerCase()}`}>{part}</Link> : <span key={i}>{part}</span>));
  return (
    <li className={cn("grid gap-1.5", reply && "ml-6 border-l-2 border-ws-border pl-3 sm:ml-10")} data-testid="comment" data-comment-id={c.id}>
      <div className="flex min-w-0 items-start gap-2">
        <Avatar name={author?.fullName ?? c.authorId} size={28} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 text-[length:var(--ws-text-body-sm)]">
            {author ? <Link href={`/u/${author.username}`} variant="plain" className="font-semibold hover:underline">{author.fullName}</Link> : null}
            <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{relativeTime(c.createdAt, now, intl)}{c.editedAt ? ` · ${t("social.comments.edited")}` : ""}</span>
          </p>
          {!c.active ? (
            <p className="text-[length:var(--ws-text-body-sm)] italic text-ws-text-muted" data-testid="comment-removed">{t("social.comments.removed")}</p>
          ) : mode === "edit" ? (
            <Composer testId="comment-edit" initial={c.contentMd} label={t("social.comments.editLabel")} submitLabel={t("social.comments.save")} autoFocus onCancel={() => setMode(null)} onSubmit={(text) => { const ok = run((s, v, at) => editComment(s, v, c.id, text, at)).ok; if (ok) setMode(null); return ok; }} />
          ) : (
            <p className="whitespace-pre-wrap text-[length:var(--ws-text-body-sm)] [overflow-wrap:anywhere]">{renderText(c.contentMd)}</p>
          )}
          {c.active && mode !== "edit" ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {canReply ? <Button size="sm" variant="ghost" className="min-h-0 px-2 py-0.5" onClick={() => setMode(mode === "reply" ? null : "reply")} data-testid="comment-reply">{t("social.comments.reply")}</Button> : null}
              {mine ? <Button size="sm" variant="ghost" className="min-h-0 px-2 py-0.5" onClick={() => setMode("edit")} data-testid="comment-edit-open">{t("social.comments.edit")}</Button> : null}
              {removable ? <Button size="sm" variant="ghost" className="min-h-0 px-2 py-0.5 text-ws-danger-ink" onClick={() => run((s, v) => deleteComment(s, v, c.id), "social.toast.commentDeleted")} data-testid="comment-delete">{t("social.comments.delete")}</Button> : null}
            </div>
          ) : null}
        </div>
      </div>
      {mode === "reply" ? (
        <div className="ml-9">
          <Composer testId="comment-reply-form" label={t("social.comments.replyTo", { name: author?.fullName ?? "" })} submitLabel={t("social.comments.sendReply")} autoFocus onCancel={() => setMode(null)} onSubmit={(text) => { const ok = run((s, v, at) => addComment(s, v, target, text, at, c.id)).ok; if (ok) setMode(null); return ok; }} />
        </div>
      ) : null}
    </li>
  );
}

export function CommentThread({ target, textareaRef }: { target: TargetRef; textareaRef?: Ref<HTMLTextAreaElement> }) {
  const { t } = useI18n();
  const { state, viewerId, run, reason } = useSocial();
  const item = itemOf(state, target);
  const thread = threadOf(state, target);
  const perm = item ? canInteract(state, viewerId, item) : ({ ok: false, reason: "NAO_ENCONTRADO" } as const);
  const total = thread.reduce((n, x) => n + (x.comment.active ? 1 : 0) + x.replies.length, 0);
  return (
    <section id="comentarios" aria-labelledby="comments-title" className="grid gap-4 scroll-mt-24" data-testid="comment-thread">
      <h2 id="comments-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("social.comments.title", { n: total })}</h2>
      {perm.ok ? (
        <Composer testId="comment-new" textareaRef={textareaRef} label={t("social.comments.newLabel")} submitLabel={t("social.comments.send")} onSubmit={(text) => run((s, v, at) => addComment(s, v, target, text, at), "social.toast.commented").ok} />
      ) : (
        <p className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-3 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{reason(perm)}</p>
      )}
      {thread.length ? (
        <ol className="grid gap-4" aria-label={t("social.comments.listLabel")}>
          {thread.map((n) => (
            <li key={n.comment.id} className="grid gap-3">
              <ul className="grid gap-3">
                <CommentItem c={n.comment} target={target} />
                {n.replies.map((r) => <CommentItem key={r.id} c={r} target={target} reply />)}
              </ul>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState moji="vazio" title={t("social.comments.emptyTitle")} description={t("social.comments.emptyDescription")} />
      )}
    </section>
  );
}
