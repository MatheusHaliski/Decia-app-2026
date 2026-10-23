// Perfil de terceiros (RF16; Matriz B colunas "terceiros"): só as sub-abas 1–5; a API omite 6–15 e responde 403 (RF16.CA02).
// Fora do laboratório o perfil vem da API (`components/people/PublicProfile`): conta inexistente ou não ativa responde 404 do
// servidor e a tela mostra "perfil não encontrado" sem revelar se a conta existe (RF16.CA01). No laboratório (NEXT_PUBLIC_WS_LAB=on)
// os dados são DEMO (lib/social/fixtures.ts) e um username fora das fixtures dá o 404 da rota.
import { notFound } from "next/navigation";
import { isKnownUsername } from "@/lib/social/fixtures";
import { labMode } from "@/lib/viewer/lab";
import { UserProfileClient } from "./UserProfileClient";

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  let decoded: string;
  try { decoded = decodeURIComponent(username); } catch { notFound(); }
  if (labMode() && !isKnownUsername(username)) notFound();
  return <UserProfileClient username={decoded} />;
}
