"use client";
// Conversa aberta (RF46): fora do laboratório e com sessão, a conversa real ao lado da lista (no celular, só a conversa); no laboratório,
// o esqueleto DEMO com o id no título.
import { useParams } from "next/navigation";
import { MessagesPage } from "@/components/messages/MessagesPage";

export default function Page() {
  const params = useParams<{ conversationId: string }>();
  return <MessagesPage conversationId={params.conversationId} />;
}
