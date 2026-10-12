"use client";
/**
 * Detalhe da tarefa (`/tasks/[id]`, RF41.CA03/RF17.CA04/RF19): card no layout ampliado com a barra social completa, o
 * histórico de delegações (RF18.CA06) e o fio de comentários. Item fora da visibilidade → 403; id que não está na
 * memória desta aba (ex.: remix criado antes de recarregar) → estado vazio com volta ao Acervo.
 */
import { useRef } from "react";
import { Button, Card, EmptyState, ErrorState, LoadingState, Tag } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { assignmentsOf, canView, personById, taskById } from "@/lib/social/rules";
import { toTaskCardViewModel } from "@/lib/social/view-model";
import { CommentThread } from "./CommentThread";
import { useMounted, useSocial } from "./context";
import { formatDay } from "./meta";
import { TaskSchemeCard } from "./TaskSchemeCard";

export function TaskDetail({ taskId }: { taskId: string }) {
  const { t, intl } = useI18n();
  const { state, viewerId, now } = useSocial();
  const mounted = useMounted();
  const textarea = useRef<HTMLTextAreaElement>(null);
  if (!mounted) return <LoadingState />;
  const task = taskById(state, taskId);
  if (!task) {
    return <EmptyState title={t("social.task.notInMemory")} description={t("social.task.notInMemoryHint")} action={<Button variant="primary" href="/profile?tab=acervo">{t("social.task.backToAcervo")}</Button>} />;
  }
  if (!canView(state, viewerId, { kind: "TASK", task })) {
    return <ErrorState title={t("forbidden.title")} description={t("social.error.ACESSO_NEGADO")} code="403 ACESSO_NEGADO" />;
  }
  const vm = toTaskCardViewModel(state, viewerId, task, now);
  const history = assignmentsOf(state, vm.ref);
  const owner = task.ownerId === viewerId;
  return (
    <div className="grid gap-[var(--ws-space-5)]" data-testid="task-detail">
      <TaskSchemeCard
        vm={vm}
        layout="expanded"
        onComment={() => { textarea.current?.focus(); textarea.current?.scrollIntoView({ block: "center" }); }}
        primaryAction={owner ? <Button size="sm" href={`/tasks/${task.id}/edit`}>{t("social.task.edit")}</Button> : null}
      />
      {history.length ? (
        <Card title={t("social.task.history")} eyebrow="RF18.CA06" data-testid="assignment-history">
          <ol className="grid gap-2">
            {history.map((a) => (
              <li key={a.id} className="flex min-w-0 flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]">
                <Tag tone={a.status === "ACEITA" ? "success" : a.status === "PROPOSTA" ? "warning" : "danger"}>{t(`social.assignmentStatus.${a.status}`)}</Tag>
                <span className="min-w-0 [overflow-wrap:anywhere]">{t("social.task.historyLine", { from: personById(state, a.fromUserId)?.fullName ?? "", to: personById(state, a.toUserId)?.fullName ?? "", date: formatDay(a.createdAt, intl) })}</span>
                {a.reason ? <span className="w-full text-ws-text-muted [overflow-wrap:anywhere]">“{a.reason}”</span> : null}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
      <Card padding="lg"><CommentThread target={vm.ref} textareaRef={textarea} /></Card>
    </div>
  );
}
