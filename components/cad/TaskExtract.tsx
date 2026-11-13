"use client";
/**
 * `/tasks/[id]/extrair` (RF34): bancada de extração a partir de uma tarefa DESENHO_TECNICO ou DOCUMENTO. Tarefa persistida
 * (UUID) vem da API e oferece os anexos legíveis (.dxf/.ifc/.glb/.dwg), baixados do próprio servidor do Work Station e lidos
 * no navegador; tarefa de exemplo (t-*) vem da rede social DEMO e o arquivo é escolhido no computador. Só o dono extrai (403),
 * tipo errado responde 422 VALIDACAO e tarefa invisível responde como inexistente (404), como o backend.
 */
import { useEffect, useState } from "react";
import { useMounted, useSocial } from "@/components/social/context";
import { RfPage } from "@/components/shell/RfPage";
import { ViewerProfileSelect } from "@/components/shell/UserPanel";
import { Badge, Button, Card, EmptyState, ErrorState, Link, LoadingState } from "@/components/ui";
import { ApiError, describeError } from "@/lib/api/client";
import { readableTaskFiles, taskFileContent, type TaskFile } from "@/lib/cad/taskFiles";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";
import { canView, taskById } from "@/lib/social/rules";
import { tasksApi, type TaskView } from "@/lib/tasks/client";
import { ExtractWorkbench } from "./ExtractWorkbench";

const PAGE = pageByRoute("/tasks/[id]/extrair")!;
export const EXTRACTABLE_TYPES: readonly string[] = ["DESENHO_TECNICO", "DOCUMENTO"];

interface Source {
  id: string;
  title: string;
  type: string;
  format: string | null;
  demo: boolean;
}

function SourceCard({ source }: { source: Source }) {
  const { t } = useI18n();
  const hint = source.type === "DOCUMENTO" ? "cad.task.documentHint" : source.format === "dwg" ? "cad.task.dwgHint" : "cad.task.pickHint";
  return (
    <Card padding="sm" data-testid="cad-source">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{t("cad.task.source")}</span>
        <Badge tone="neutral">{t(`social.taskType.${source.type}`)}</Badge>
        {source.format ? <Badge tone="info">.{source.format}</Badge> : null}
        {source.demo ? <Badge tone="neutral" title={t("social.demoHint")}>{t("decia.demo")}</Badge> : null}
      </div>
      <p className="mt-1 font-semibold [overflow-wrap:anywhere]">{source.title}</p>
      <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(hint)}</p>
      <Link href={`/tasks/${source.id}`} className="mt-1 inline-block text-[length:var(--ws-text-body-sm)]">{t("cad.task.back")}</Link>
    </Card>
  );
}

function WrongType({ source }: { source: Source }) {
  const { t } = useI18n();
  return (
    <>
      <SourceCard source={source} />
      <ErrorState
        title={t("cad.task.wrongType")}
        description={t("cad.task.wrongTypeHint", { type: t(`social.taskType.${source.type}`) })}
        code="422 VALIDACAO"
        action={<Button size="sm" href="/tasks/extrair">{t("cad.task.useLoose")}</Button>}
      />
    </>
  );
}

function DemoTaskExtract({ taskId }: { taskId: string }) {
  const { t } = useI18n();
  const { state, viewerId } = useSocial();
  const mounted = useMounted();
  if (!mounted) return <LoadingState />;
  const task = taskById(state, taskId);
  if (!task) {
    return <EmptyState title={t("social.task.notInMemory")} description={t("social.task.notInMemoryHint")} action={<Button variant="primary" href="/profile?tab=acervo">{t("social.task.backToAcervo")}</Button>} />;
  }
  if (!canView(state, viewerId, { kind: "TASK", task })) {
    return <ErrorState title={t("tasks.detail.notFound")} description={t("tasks.detail.notFoundHint")} code="404 NAO_ENCONTRADO" />;
  }
  const source: Source = { id: task.id, title: task.title, type: task.type, format: task.format, demo: true };
  if (!EXTRACTABLE_TYPES.includes(task.type)) return <WrongType source={source} />;
  if (task.ownerId !== viewerId) {
    return (
      <>
        <SourceCard source={source} />
        <ErrorState
          title={t("cad.task.notOwner")}
          description={t("cad.task.notOwnerHint")}
          code="403 ACESSO_NEGADO"
          action={<div className="flex items-center gap-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("viewer.switchHint")} <ViewerProfileSelect /></div>}
        />
      </>
    );
  }
  return (
    <>
      <SourceCard source={source} />
      <ExtractWorkbench sourceTask={{ id: task.id, title: task.title }} />
    </>
  );
}

function PersistedTaskExtract({ taskId }: { taskId: string }) {
  const { t } = useI18n();
  const [task, setTask] = useState<TaskView | null>(null);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [error, setError] = useState<{ title: string; text: string; code?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    tasksApi
      .get(taskId)
      .then((v) => {
        if (!alive) return;
        setTask(v);
        if (EXTRACTABLE_TYPES.includes(v.type ?? "") && v.editable !== false) void readableTaskFiles(taskId).then((f) => alive && setFiles(f));
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof ApiError && e.status === 404
          ? { title: t("tasks.detail.notFound"), text: t("tasks.detail.notFoundHint"), code: "404 NAO_ENCONTRADO" }
          : { title: t("cad.task.loadError"), text: describeError(e) });
      });
    return () => {
      alive = false;
    };
  }, [taskId, t, attempt]);

  if (error) return <ErrorState title={error.title} description={error.text} code={error.code} onRetry={error.code ? undefined : () => { setError(null); setAttempt((n) => n + 1); }} />;
  if (!task) return <LoadingState />;
  const source: Source = { id: taskId, title: task.title ?? "", type: task.type ?? "", format: null, demo: false };
  if (!EXTRACTABLE_TYPES.includes(source.type)) return <WrongType source={source} />;
  if (task.editable === false) {
    return (
      <>
        <SourceCard source={source} />
        <ErrorState title={t("cad.task.notOwner")} description={t("cad.task.notOwnerApiHint")} code="403 ACESSO_NEGADO" />
      </>
    );
  }
  return (
    <>
      <SourceCard source={source} />
      <ExtractWorkbench sourceTask={{ id: taskId, title: source.title }} attachments={files} fetchAttachment={(f) => taskFileContent(taskId, f.id)} />
    </>
  );
}

/** Página `/tasks/[id]/extrair` (cliente): moldura RfPage + bancada a partir da tarefa. */
export function TaskExtractPage({ taskId, persisted }: { taskId: string; persisted: boolean }) {
  return (
    <RfPage page={PAGE} subtitle={taskId} noEmpty>
      {persisted ? <PersistedTaskExtract taskId={taskId} /> : <DemoTaskExtract taskId={taskId} />}
    </RfPage>
  );
}
