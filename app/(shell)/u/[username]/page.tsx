"use client";
// Perfil de terceiros (RF16; Matriz B colunas "terceiros"): só as sub-abas 1–5; a API omite 6–15 e responde 403 (RF19.CA02).
import { useParams } from "next/navigation";
import { ProfileHeader } from "@/components/shell/ProfileHeader";
import { RfPage } from "@/components/shell/RfPage";
import { PROFILE_TABS, pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/u/[username]")!;
const THIRD_PARTY_TABS = PROFILE_TABS.filter((t) => t.thirdParty);

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  return (
    <RfPage page={PAGE} subtitle={`@${username}`} tabs={THIRD_PARTY_TABS}>
      <ProfileHeader third username={username} />
    </RfPage>
  );
}
