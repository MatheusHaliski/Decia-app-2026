/**
 * Contrato comum dos painéis da Mesa de Trabalho (RF22). Todo painel recebe o MESMO modelo e só o altera por `dispatch` — é o
 * que mantém quadro, canvas, linha do tempo e abas sincronizados (uma edição em qualquer lugar aparece em todos, inclusive na
 * outra metade da janela segmentada).
 */
import type { CommandResult, ProjectCommand } from "@/lib/projects/commands";
import type { LinkedDecision, WorkspaceTab } from "@/lib/projects/metrics";
import type { CanvasRef, ProjectModel } from "@/lib/projects/types";

export type PeopleDirectory = Readonly<Record<string, { name: string }>>;

/** Abertura de decisões de governança no DECIA, fornecida pela área de trabalho (que conhece o repositório do DECIA). */
export interface DeciaActions {
  openGate: (phase: ProjectModel["currentPhase"]) => void;
  openChange: (changeId: string) => void;
  openSelection: () => void;
  /** link para a decisão no DECIA */
  decisionHref: (decisionId: string) => string;
  /** estado da decisão no DECIA (chave de `decia.status.*`, ex.: "EM_DELIBERACAO", "DECIDIDA") */
  decisionStatus: (decisionId: string) => string | undefined;
}

export interface PanelProps {
  model: ProjectModel;
  /** aplica um comando; em erro a área de trabalho mostra o aviso — o painel recebe o resultado e pode reagir */
  dispatch: (cmd: ProjectCommand) => CommandResult;
  people: PeopleDirectory;
  /** projeto arquivado (RF22.CA06) ou perfil sem edição: só leitura */
  readOnly: boolean;
  /** navega para outra aba da Mesa (o feedback e os portões usam para "abrir onde corrigir") */
  goTo?: (tab: WorkspaceTab) => void;
  /** item selecionado, compartilhado entre as duas metades da janela segmentada (destaque cruzado) */
  selected?: CanvasRef | null;
  onSelect?: (ref: CanvasRef | null) => void;
  /** decisões de governança no DECIA (portões, mudanças, seleção) */
  decia?: DeciaActions;
  /** decisões do DECIA (para os indicadores de participação nas decisões ligadas ao projeto) */
  decisions?: readonly LinkedDecision[];
}

export const nameOf = (people: PeopleDirectory, id?: string) => (id ? (people[id]?.name ?? id) : "—");

/** Formatadores no idioma da interface (`intl` de `useI18n`). */
export const fmt = {
  money: (intl: string, v: number | null | undefined) =>
    v === null || v === undefined || !Number.isFinite(v) ? "—" : new Intl.NumberFormat(intl, { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v),
  number: (intl: string, v: number | null | undefined, digits = 2) =>
    v === null || v === undefined || !Number.isFinite(v) ? "—" : new Intl.NumberFormat(intl, { maximumFractionDigits: digits }).format(v),
  percent: (intl: string, v: number | null | undefined, digits = 0) =>
    v === null || v === undefined || !Number.isFinite(v) ? "—" : new Intl.NumberFormat(intl, { style: "percent", maximumFractionDigits: digits }).format(v),
  date: (intl: string, iso: string | undefined) => (iso ? new Intl.DateTimeFormat(intl, { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`)) : "—"),
};
