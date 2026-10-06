/**
 * Notificações — dados MOCK tipados (D-36) até o RF de notificações ligar `GET /api/notifications`. Tipos conforme a
 * TAXONOMIA (`Notification`, `NotificationType`): menção (RF19.CA03), decisão validada/devolvida (RF29), chancela
 * (RF39.CA12), DECIA Points (RF42), Tarefa do Dia (RF44), atribuição proposta (RF46.CA03), sistema. Textos por chave
 * i18n com variáveis; nenhuma pessoa real.
 */
import type { GlyphName } from "@/components/ui/glyphs/sprite.gen";

export type NotificationKind = "MENCAO" | "DECISAO" | "CHANCELA" | "PONTOS" | "TAREFA_DO_DIA" | "ATRIBUICAO" | "SISTEMA";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  /** chave i18n do título (com {vars}) */
  titleKey: string;
  vars?: Record<string, string | number>;
  /** minutos atrás (relativo ao agora, para o mock ficar sempre "fresco") */
  minutesAgo: number;
  read: boolean;
  href: string;
}

export const KIND_GLYPH: Record<NotificationKind, GlyphName> = {
  MENCAO: "sessao-decia",
  DECISAO: "sessao-decia",
  CHANCELA: "chancela",
  PONTOS: "decia-points",
  TAREFA_DO_DIA: "tarefa-do-dia",
  ATRIBUICAO: "criar-tarefa",
  SISTEMA: "notificacoes",
};

export const MOCK_NOTIFICATIONS: readonly AppNotification[] = [
  { id: "n1", kind: "TAREFA_DO_DIA", titleKey: "notif.dailyTask", vars: { title: "Minuta do plano de mobilidade" }, minutesAgo: 35, read: false, href: "/profile?tab=tarefa-do-dia" },
  { id: "n2", kind: "MENCAO", titleKey: "notif.mention", vars: { who: "@pessoa.exemplo", where: "Orçamento 2027" }, minutesAgo: 120, read: false, href: "/decia/exemplo?tab=conversa" },
  { id: "n3", kind: "DECISAO", titleKey: "notif.decisionValidated", vars: { session: "Orçamento 2027" }, minutesAgo: 60 * 5, read: false, href: "/decia/exemplo?tab=decisao" },
  { id: "n4", kind: "CHANCELA", titleKey: "notif.sealApproved", vars: { issuer: "CPOE" }, minutesAgo: 60 * 26, read: true, href: "/profile?tab=reconhecimentos" },
  { id: "n5", kind: "PONTOS", titleKey: "notif.points", vars: { n: 40 }, minutesAgo: 60 * 30, read: true, href: "/points?tab=extrato" },
  { id: "n6", kind: "ATRIBUICAO", titleKey: "notif.assignment", vars: { who: "@chefe.exemplo", title: "Relatório de vistoria" }, minutesAgo: 60 * 50, read: true, href: "/messages?tab=atribuicoes" },
  { id: "n7", kind: "SISTEMA", titleKey: "notif.system", minutesAgo: 60 * 24 * 3, read: true, href: "/settings?tab=termos" },
];

export const unreadCount = (list: readonly AppNotification[]) => list.filter((n) => !n.read).length;

/** Modo de simulação do lab (localStorage `ws.lab.notifications`): "vazio" · "erro" · "carregando" · padrão = dados mock. */
export type NotificationsSim = "padrao" | "vazio" | "erro" | "carregando";
export const NOTIF_SIM_KEY = "ws.lab.notifications";
export const NOTIF_SIMS: readonly NotificationsSim[] = ["padrao", "vazio", "erro", "carregando"];
export const readSim = (): NotificationsSim => {
  try {
    const v = localStorage.getItem(NOTIF_SIM_KEY);
    return (NOTIF_SIMS as readonly string[]).includes(v ?? "") ? (v as NotificationsSim) : "padrao";
  } catch {
    return "padrao";
  }
};
