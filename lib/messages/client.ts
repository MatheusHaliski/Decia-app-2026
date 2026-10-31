/**
 * Mensagens diretas reais (RF46; Onda 7): cliente de `/api/conversations`. Regras do servidor: conversa 1:1 ou em grupo pequeno só entre
 * pessoas ativas da mesma empresa (outra empresa, conta não ativa ou inexistente → a mesma recusa 422 PARTICIPANTE_INDISPONIVEL); a 1:1 de
 * um par é única (iniciar de novo devolve a mesma, 200); só participantes leem e escrevem (quem não participa recebe 404, igual a uma
 * conversa inexistente); texto puro de até 4000 caracteres, nunca HTML; editar e apagar só a própria mensagem. A entrega quase em tempo
 * real é por polling leve: `changes(since)` com o `serverTime` da leitura anterior.
 */
import { api, qs } from "@/lib/api/client";

// Tipos escritos à mão — espelham os DTOs de ws-web/ws-application (ConversationService.*View); trocar pelo tipo gerado
// (`components["schemas"][…]` de lib/api/schema.d.ts) quando o contrato OpenAPI for regenerado.

/** Espelha o DTO ParticipantView; trocar pelo tipo gerado. */
export interface ParticipantView { id: string; username?: string | null; name?: string | null; avatarUrl?: string | null; self: boolean; active: boolean }
/** Espelha o DTO LastMessageView; trocar pelo tipo gerado. */
export interface LastMessageView { id: string; authorId: string; preview?: string | null; deleted: boolean; sentAt: string }
/** Espelha o DTO ConversationView; trocar pelo tipo gerado. */
export interface ConversationView {
  id: string;
  kind: "DIRETA" | "GRUPO";
  title?: string | null;
  participants: ParticipantView[];
  lastMessage?: LastMessageView | null;
  unread: number;
  lastActivityAt: string;
  canSend: boolean;
}
/** Espelha o DTO MessageView; trocar pelo tipo gerado. */
export interface MessageView {
  id: string;
  conversationId: string;
  authorId: string;
  body?: string | null;
  mine: boolean;
  edited: boolean;
  deleted: boolean;
  sentAt: string;
  editedAt?: string | null;
  changedAt: string;
}
/** Espelha o DTO MessagePage; trocar pelo tipo gerado. */
export interface MessagePage { items: MessageView[]; nextCursor?: string | null; serverTime: string }
/** Espelha o DTO MessageChanges; trocar pelo tipo gerado. */
export interface MessageChanges { items: MessageView[]; serverTime: string; truncated: boolean }
/** Espelha o DTO UnreadSummary; trocar pelo tipo gerado. */
export interface UnreadSummary { conversations: number; messages: number }

/** Limite do servidor (caracteres). */
export const MESSAGE_MAX = 4000;
/** Participantes de um grupo, contando quem inicia. */
export const GROUP_MAX = 10;
export const TITLE_MAX = 160;
export const PAGE_SIZE = 30;

const conv = (id: string) => `/api/conversations/${encodeURIComponent(id)}`;

export const messagesApi = {
  list: (limit = 50, signal?: AbortSignal) => api.get<ConversationView[]>(`/api/conversations${qs({ limit })}`, { signal }),
  unread: (signal?: AbortSignal) => api.get<UnreadSummary>("/api/conversations/unread", { signal }),
  /** 201 = nova; 200 = a conversa 1:1 que já existia. */
  start: (participantIds: string[], title?: string) => api.post<ConversationView>("/api/conversations", { participantIds, title: title || undefined }),
  get: (id: string, signal?: AbortSignal) => api.get<ConversationView>(conv(id), { signal }),
  page: (id: string, before?: string | null, limit = PAGE_SIZE, signal?: AbortSignal) =>
    api.get<MessagePage>(`${conv(id)}/messages${qs({ before, limit })}`, { signal }),
  changes: (id: string, since: string, signal?: AbortSignal) => api.get<MessageChanges>(`${conv(id)}/messages/changes${qs({ since })}`, { signal }),
  send: (id: string, body: string) => api.post<MessageView>(`${conv(id)}/messages`, { body }),
  edit: (id: string, messageId: string, body: string) => api.put<MessageView>(`${conv(id)}/messages/${encodeURIComponent(messageId)}`, { body }),
  remove: (id: string, messageId: string) => api.delete<MessageView>(`${conv(id)}/messages/${encodeURIComponent(messageId)}`),
  markRead: (id: string) => api.post<UnreadSummary>(`${conv(id)}/read`, {}),
  leave: (id: string) => api.delete<void>(`${conv(id)}/participants/me`),
};

/** Tamanho em caracteres como o servidor conta (pontos de código, não unidades UTF-16): emoji conta 1. */
export const charCount = (s: string) => [...s].length;

/** O que o servidor faria com o texto: sem espaços nas pontas; vazio não envia. */
export function sendable(raw: string): { text: string; ok: boolean; over: boolean } {
  const text = raw.trim();
  const over = charCount(text) > MESSAGE_MAX;
  return { text, ok: text.length > 0 && !over, over };
}

/** Junta mensagens novas ou alteradas (por id) à lista, em ordem cronológica (sentAt é único e crescente por conversa). */
export function mergeMessages(current: readonly MessageView[], incoming: readonly MessageView[]): MessageView[] {
  if (!incoming.length) return current as MessageView[];
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) {
    const prev = byId.get(m.id);
    // nunca volta uma versão mais nova para uma mais antiga (respostas fora de ordem)
    if (!prev || Date.parse(m.changedAt) >= Date.parse(prev.changedAt)) byId.set(m.id, m);
  }
  return [...byId.values()].sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt) || a.id.localeCompare(b.id));
}

/** As outras pessoas da conversa (sem quem vê). */
export const othersOf = (c: ConversationView) => c.participants.filter((p) => !p.self);

/** Nome exibido de uma pessoa da conversa (conta removida volta sem nome). */
export const personName = (p: ParticipantView | undefined, fallback: string) => p?.name?.trim() || (p?.username ? `@${p.username}` : fallback);
