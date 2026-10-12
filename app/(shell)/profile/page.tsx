"use client";
// Meu perfil (RF6; Matriz B, ABAS_POR_PERFIL §3): 15 sub-abas; EMPRESA some com 5/9/13/14/15 e renomeia 6/11/12 (§7.d).
// Funcional sobre o repositório DEMO da rede social (lib/social): Acervo Digital, Projetos, salvos, Decisões e "Delegadas a mim".
import { ProfileView } from "@/components/social";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/profile")!;

export default function ProfilePage() {
  return <ProfileView page={PAGE} />;
}
