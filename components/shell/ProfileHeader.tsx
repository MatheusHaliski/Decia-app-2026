"use client";
import { SocialProfileHeader, useMounted, useSocial } from "@/components/social";
import { Skeleton } from "@/components/ui";
import { personById, personByUsername } from "@/lib/social/rules";
import { toProfileHeaderViewModel } from "@/lib/social/view-model";

/**
 * Cabeçalho do perfil (Matriz B linha "Cabeçalho"): avatar, nome, cargo, empresa, departamento (monograma) e contadores
 * REAIS do view model da rede social (tarefas, projetos, decisões, seguidores, DECIA Points só do dono, Hype conforme
 * `hypeVisibility`). Sem `username` = o próprio perfil do viewer. Dados DEMO até a API (lib/social/repository.ts).
 */
export function ProfileHeader({ username }: { username?: string }) {
  const { state, viewerId } = useSocial();
  const mounted = useMounted();
  if (!mounted) return <Skeleton className="h-28 w-full" />;
  const ownerId = username ? personByUsername(state, username)?.id : personById(state, viewerId)?.id;
  const vm = ownerId ? toProfileHeaderViewModel(state, viewerId, ownerId) : null;
  return vm ? <SocialProfileHeader vm={vm} /> : null;
}
