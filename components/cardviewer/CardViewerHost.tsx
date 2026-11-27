"use client";
/**
 * Visualizador de card montado uma vez no shell: lê `?ver=tarefa:<id>` / `?ver=projeto:<id>` da URL e resolve o card.
 *  • tarefa com id UUID → API real (`GET /api/tasks/{id}`, depois anexos e evidências);
 *  • outra tarefa → rede social DEMO (Mural, perfil), com a mesma regra de visibilidade do detalhe (invisível = inexistente);
 *  • projeto → modelo da Mesa (DEMO, motores CPM/EVM) ou, se não houver, o esquema do Mural (DEMO).
 * Escape/fechar remove o parâmetro e devolve o foco ao card.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Dialog, ErrorState, LoadingState } from "@/components/ui";
import { useSocial } from "@/components/social/context";
import { ApiError, describeError } from "@/lib/api/client";
import { subjectFromSocial, subjectFromView, type ProjectSubject } from "@/lib/cardviewer/subject";
import type { ViewerTarget } from "@/lib/cardviewer/url";
import { demoRepository } from "@/lib/decia/repository";
import { useI18n } from "@/lib/i18n/useI18n";
import { demoProjectRepository, useProject, type ProjectRepository } from "@/lib/projects/repository";
import { canView, projectById, taskById } from "@/lib/social/rules";
import { attachmentsApi, isPersistedTaskId, tasksApi, type AttachmentView, type EvidenceView, type TaskView } from "@/lib/tasks/client";
import { localTodayIso } from "@/lib/tasks/legalDeadline";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { CardViewer } from "./CardViewer";
import type { TaskFiles, ViewerContextValue } from "./context";
import { closeCardViewer, useViewerTarget } from "./open";

export interface CardViewerHostProps {
  /** só testes/lab: relógio e repositório de projetos */
  today?: string;
  projectRepo?: ProjectRepository;
}

export function CardViewerHost(props: CardViewerHostProps) {
  const target = useViewerTarget();
  if (!target) return null;
  return <Resolved key={`${target.kind}:${target.id}`} target={target} {...props} />;
}

function Resolved({ target, today: fixedToday, projectRepo }: CardViewerHostProps & { target: ViewerTarget }) {
  const { user } = useViewer();
  const [today] = useState(() => fixedToday ?? localTodayIso());
  const base = { target, account: user.username, today };
  if (target.kind === "tarefa") return isPersistedTaskId(target.id) ? <ApiTask base={base} /> : <SocialTask base={base} />;
  return <Project base={base} repo={projectRepo ?? demoProjectRepository()} />;
}

type Base = Pick<ViewerContextValue, "target" | "account" | "today">;

/** Casca do diálogo enquanto carrega ou quando falha: Escape e fechar continuam funcionando. */
function Shell({ base, children }: { base: Base; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <Dialog open size="full" onOpenChange={(o) => { if (!o) closeCardViewer(base.target); }} title={t(`cardviewer.title.${base.target.kind}`)} description={t("cardviewer.loadingHint")}>
      {children}
    </Dialog>
  );
}

function loadError(e: unknown, t: (k: string) => string) {
  if (e instanceof ApiError && (e.status === 401 || e.status === 0)) return t("cardviewer.needSession");
  return describeError(e);
}

function ApiTask({ base }: { base: Base }) {
  const { t } = useI18n();
  const id = base.target.id;
  const [view, setView] = useState<TaskView | null>(null);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [files, setFiles] = useState<Omit<TaskFiles, "reload">>({ status: "loading", attachments: [], evidences: [] });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    tasksApi.get(id)
      .then((v) => { if (alive) setView(v); })
      .catch((e) => { if (alive) setError({ text: loadError(e, t), notFound: e instanceof ApiError && (e.status === 404 || e.status === 403) }); });
    return () => { alive = false; };
  }, [id, t]);

  useEffect(() => {
    let alive = true;
    setFiles((f) => ({ ...f, status: "loading" }));
    Promise.all([attachmentsApi.list(id), attachmentsApi.evidences(id).catch(() => [] as EvidenceView[])])
      .then(([a, e]) => { if (alive) setFiles({ status: "ok", attachments: Array.isArray(a) ? (a as AttachmentView[]) : [], evidences: Array.isArray(e) ? e : [] }); })
      .catch((e) => { if (alive) setFiles({ status: "error", attachments: [], evidences: [], error: loadError(e, t) }); });
    return () => { alive = false; };
  }, [id, t, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  const subject = useMemo(() => (view ? subjectFromView(view) : null), [view]);

  if (error) {
    return (
      <Shell base={base}>
        <ErrorState title={error.notFound ? t("tasks.detail.notFound") : t("cardviewer.loadError")} description={error.text}
          action={<Button size="sm" onClick={() => closeCardViewer(base.target)}>{t("common.close")}</Button>} />
      </Shell>
    );
  }
  if (!view || !subject) return <Shell base={base}><LoadingState /></Shell>;
  return <CardViewer value={{ ...base, task: { subject, view, setView, files: { ...files, reload } } }} />;
}

const NO_FILES: TaskFiles = { status: "none", attachments: [], evidences: [], reload: () => undefined };

function SocialTask({ base }: { base: Base }) {
  const { t } = useI18n();
  const { state, viewerId } = useSocial();
  const task = taskById(state, base.target.id);
  if (!task || !canView(state, viewerId, { kind: "TASK", task })) {
    return <Shell base={base}><ErrorState title={t("tasks.detail.notFound")} description={t("tasks.detail.notFoundHint")} /></Shell>;
  }
  const subject = subjectFromSocial(state, task, viewerId);
  return <CardViewer value={{ ...base, task: { subject, setView: () => undefined, files: NO_FILES, social: { state, viewerId } } }} />;
}

function Project({ base, repo }: { base: Base; repo: ProjectRepository }) {
  const { t } = useI18n();
  const model = useProject(base.target.id, repo);
  const { state, viewerId } = useSocial();
  const social = model ? undefined : projectById(state, base.target.id);
  const decisions = useMemo(() => (model ? model.decisionIds.map((d) => demoRepository().get(d)).filter((x): x is NonNullable<typeof x> => !!x) : []), [model]);
  let subject: ProjectSubject | null = null;
  if (model) subject = { kind: "projeto", source: "DEMO", variant: "MESA", model };
  else if (social && canView(state, viewerId, { kind: "PROJECT", project: social })) subject = { kind: "projeto", source: "DEMO", variant: "MURAL", project: social, state };
  if (!subject) return <Shell base={base}><ErrorState title={t("cardviewer.projectNotFound")} description={t("tasks.detail.notFoundHint")} /></Shell>;
  return <CardViewer value={{ ...base, project: { subject, decisions } }} />;
}
