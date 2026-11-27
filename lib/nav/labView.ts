"use client";
/**
 * Modo laboratório × modo produto na interface (auditoria "Informação e guia da interface"). O jargão interno — CAs ("O que esta
 * aba vai fazer"), chips de RF, nota de matriz/rota/arquivo, célula de acesso por perfil, "proposta" do ABAS_POR_PERFIL, código
 * 403 ACESSO_NEGADO — só aparece no laboratório.
 *
 * Laboratório = a mesma regra do ViewerProvider: `NEXT_PUBLIC_WS_LAB=on` (D-146) ou fora do CurrentUserProvider (testes de
 * componente e o laboratório isolado). Com o app de verdade (CurrentUserProvider montado e lab desligado) vale o modo produto.
 * Não exige o ViewerProvider: dá para usar em qualquer componente do shell.
 */
import { useOptionalCurrentUser } from "@/lib/session/CurrentUserProvider";
import { labMode } from "@/lib/viewer/lab";

export function useLabView(): boolean {
  const current = useOptionalCurrentUser();
  return !current || labMode();
}
