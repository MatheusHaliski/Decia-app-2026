/**
 * Notificações reais (RF27; auditoria 17/10/2026): cliente de `/api/notifications` tipado pelo contrato OpenAPI e a tradução de cada
 * notificação do servidor para a linha do sino. O texto é montado aqui pelo tipo e pelo payload, no idioma da pessoa; o título em
 * português gravado pelo servidor só aparece para tipos que o front ainda não conhece.
 */
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { publicationOf, workStatusOf } from "@/lib/tasks/status";
import type { TaskStateName } from "@/lib/tasks/client";
import type { AppNotification } from "./mock";

export type NotificationView = components["schemas"]["NotificationView"];

export const notificationsApi = {
  list: (limit = 30) => api.get<NotificationView[]>(`/api/notifications?limit=${limit}`),
  unreadCount: () => api.get<{ count: number }>("/api/notifications/unread-count"),
  markRead: (id: string) => api.post<void>(`/api/notifications/${encodeURIComponent(id)}/read`, {}),
  markAllRead: () => api.post<{ updated: number }>("/api/notifications/read-all", {}),
};

const TASK_STATES: readonly string[] = ["RASCUNHO", "DISPONIVEL", "EM_USO", "BLOQUEADA", "CONCLUIDA", "ARQUIVADA", "MODELO_PUBLICO", "OFERECIDA"];

/** Chave do texto de mudança de estado: pelo eixo de execução, ou "publicado" para modelo público e oferta. */
export function taskStateKey(to: string | undefined): string {
  if (!to || !TASK_STATES.includes(to)) return "notif.task.changed";
  const state = to as TaskStateName;
  const ws = workStatusOf(state);
  return ws ? `notif.task.${ws}` : publicationOf(state) ? "notif.task.PUBLICADO" : "notif.task.changed";
}

/**
 * Converte a notificação da API na linha do sino. Sem nome de quem agiu (conta removida), `who` fica vazio e a linha mostra "Alguém"
 * no idioma da pessoa. Os links levam ao recurso: tarefa → `/tasks/{id}`; segurança da conta → Configurações › Conta.
 */
export function toAppNotification(n: NotificationView, now: number): AppNotification {
  const p = n.payload ?? {};
  const who = n.actorName || "";
  const minutesAgo = n.createdAt ? Math.max(0, (now - Date.parse(n.createdAt)) / 60_000) : 0;
  const base = { id: n.id ?? "", read: !!n.read, minutesAgo };
  const taskHref = n.resourceType === "task" && n.resourceId ? `/tasks/${n.resourceId}` : "/notifications";
  switch (n.type) {
    case "ATRIBUICAO_PROPOSTA":
      return { ...base, kind: "ATRIBUICAO", titleKey: "notif.task.responsible", vars: { who, title: p.taskTitle ?? "" }, href: taskHref };
    case "TRANSICAO": {
      const blocked = p.to === "BLOQUEADA" && p.reason;
      return {
        ...base, kind: "TAREFA", titleKey: blocked ? "notif.task.blockedWithReason" : taskStateKey(p.to),
        vars: { who, title: p.taskTitle ?? "", reason: p.reason ?? "" }, href: taskHref,
      };
    }
    case "PRAZO_PROXIMO":
    case "PRAZO_VENCIDO":
      return { ...base, kind: "PRAZO", ...deadlineText(n.type, p), href: taskHref, dateVars: ["date"] };
    case "MENSAGEM_DIRETA": {
      // RF46: uma notificação por (remetente, conversa) até ser lida; nunca traz o texto da mensagem
      const group = p.conversationKind === "GRUPO";
      const titleKey = !group ? "notif.dm.direct" : p.conversationTitle ? "notif.dm.group" : "notif.dm.groupUntitled";
      return { ...base, kind: "MENCAO", titleKey, vars: { who, title: p.conversationTitle ?? "" },
        href: n.resourceType === "conversation" && n.resourceId ? `/messages/${n.resourceId}` : "/messages" };
    }
    case "SISTEMA":
      if (p.event === "TWO_FACTOR_ENABLED" || p.event === "TWO_FACTOR_DISABLED") {
        return { ...base, kind: "SEGURANCA", titleKey: p.event === "TWO_FACTOR_ENABLED" ? "notif.security.twoFactorOn" : "notif.security.twoFactorOff",
          href: "/settings?tab=conta" };
      }
      return { ...base, kind: "SISTEMA", titleKey: "notif.fallback", vars: { title: n.title ?? "" }, href: "/notifications" };
    default:
      return { ...base, kind: "SISTEMA", titleKey: "notif.fallback", vars: { title: n.title ?? "" }, href: "/notifications" };
  }
}

/**
 * Aviso diário de prazo (RF41.CA04; `DeadlineReminderJob` no servidor): o payload traz só título e datas — `taskTitle`, `dueAt`
 * (AAAA-MM-DD), `days` (faltam, ou há quantos venceu) e `source` (TAREFA ou LEGAL). Chave por tipo, origem e dias.
 */
export function deadlineText(type: "PRAZO_PROXIMO" | "PRAZO_VENCIDO", p: Record<string, string>): Pick<AppNotification, "titleKey" | "vars"> {
  const legal = p.source === "LEGAL" ? "Legal" : "";
  const days = Number.parseInt(p.days ?? "", 10);
  const n = Number.isFinite(days) && days >= 0 ? days : 0;
  const vars = { title: p.taskTitle ?? "", date: p.dueAt ?? "", n };
  if (type === "PRAZO_VENCIDO") return { titleKey: `prazosdiarios.notif.overdue${legal}`, vars };
  if (n === 0) return { titleKey: `prazosdiarios.notif.today${legal}`, vars };
  return { titleKey: n === 1 ? `prazosdiarios.notif.soonOne${legal}` : `prazosdiarios.notif.soon${legal}`, vars };
}
