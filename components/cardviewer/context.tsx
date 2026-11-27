"use client";
/**
 * Dados compartilhados pelas janelas do visualizador: o alvo, a conta (para as preferências locais), o "hoje" e o card resolvido —
 * tarefa (API ou DEMO, com os anexos/evidências carregados UMA vez para Arquivos, Prévia, Atividade e Melhorias) ou projeto.
 */
import { createContext, useContext } from "react";
import type { ProjectSubject, TaskSubject } from "@/lib/cardviewer/subject";
import type { ViewerTarget } from "@/lib/cardviewer/url";
import type { DecisionAggregate } from "@/lib/decia/types";
import type { SocialState } from "@/lib/social/types";
import type { AttachmentView, EvidenceView, TaskView } from "@/lib/tasks/client";

export interface TaskFiles {
  /** `none` = fonte sem arquivos na API (DEMO) */
  status: "loading" | "ok" | "error" | "none";
  attachments: AttachmentView[];
  evidences: EvidenceView[];
  error?: string;
  reload: () => void;
}

export interface TaskData {
  subject: TaskSubject;
  /** visão da API (só tarefa real): base dos PUTs de "aplicar sugestão" e dos envios */
  view?: TaskView;
  setView: (v: TaskView) => void;
  files: TaskFiles;
  social?: { state: SocialState; viewerId: string | null };
}

export interface ProjectData { subject: ProjectSubject; decisions: readonly DecisionAggregate[] }

export interface ViewerContextValue {
  target: ViewerTarget;
  account: string;
  today: string;
  task?: TaskData;
  project?: ProjectData;
}

const Ctx = createContext<ViewerContextValue | null>(null);
export const ViewerDataProvider = Ctx.Provider;

export function useViewerData(): ViewerContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useViewerData fora do visualizador de card");
  return v;
}
