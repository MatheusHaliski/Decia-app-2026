"use client";
/**
 * `/messages` e `/messages/[conversationId]` (RF46). No laboratório (`NEXT_PUBLIC_WS_LAB=on`) ou fora do provider de sessão a página
 * continua o esqueleto DEMO de sempre (RfPage com os CAs); com o provider fora do laboratório, as mensagens reais (`MessagesView`).
 */
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";
import { useOptionalCurrentUser } from "@/lib/session/CurrentUserProvider";
import { labMode } from "@/lib/viewer/lab";
import { MessagesView } from "./MessagesView";

const LIST_PAGE = pageByRoute("/messages")!;
const CONVERSATION_PAGE = pageByRoute("/messages/[conversationId]")!;

export function MessagesPage({ conversationId }: { conversationId?: string }) {
  const session = useOptionalCurrentUser();
  if (!session || labMode()) {
    return conversationId ? <RfPage page={CONVERSATION_PAGE} subtitle={conversationId} /> : <RfPage page={LIST_PAGE} />;
  }
  return <MessagesView conversationId={conversationId} />;
}
