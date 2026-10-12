// Perfil de terceiros (RF16; Matriz B colunas "terceiros"): só as sub-abas 1–5; a API omite 6–15 e responde 403 (RF16.CA02).
// Username desconhecido → 404 (RF16.CA01, sem enumerar contas). Dados DEMO (lib/social/fixtures.ts).
import { notFound } from "next/navigation";
import { isKnownUsername } from "@/lib/social/fixtures";
import { UserProfileClient } from "./UserProfileClient";

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  if (!isKnownUsername(username)) notFound();
  return <UserProfileClient username={decodeURIComponent(username)} />;
}
