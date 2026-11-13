/**
 * Dono do saldo de DECIA Points (RF42) a partir de quem está vendo. A conta EMPRESA não acumula pontos (ABAS_POR_PERFIL §7.d) e o
 * visitante não tem conta. No laboratório, o EMPREGADO "Pessoa Exemplo" é a mesma pessoa que o DECIA usa como participante
 * (`DEMO_CURRENT_USER_ID` de lib/decia/fixtures — o teste confere que os dois continuam iguais): os ganhos de participação que a
 * sessão credita aparecem no mesmo saldo. Os demais perfis usam o próprio nome de usuário. A constante fica copiada aqui para o
 * shell (ficha DP da barra) não carregar as fixtures do DECIA.
 */
import type { ViewerUser } from "@/lib/viewer/profiles";

/** Nome de usuário do EMPREGADO do laboratório (lib/viewer/profiles). */
export const LAB_PERSON_USERNAME = "pessoa.exemplo";
/** Participante "Pessoa Exemplo" do DECIA (= `DEMO_CURRENT_USER_ID`). */
export const LAB_PERSON_ID = "u-pessoa";

export function pointsHolderOf(user: Pick<ViewerUser, "profile" | "username">): string | null {
  if (user.profile === "EMPRESA" || user.profile === "VISITANTE") return null;
  if (!user.username) return null;
  return user.username === LAB_PERSON_USERNAME ? LAB_PERSON_ID : user.username;
}
