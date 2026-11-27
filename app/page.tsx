import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_HINT_COOKIE } from "@/lib/auth/guard";

/**
 * A raiz decide a home: com sessão (cookie-sinal `ws_rt_h`, o mesmo do middleware) vai para "Hoje" (Tarefa do Dia, primeiros passos e
 * atalhos); sem sessão, para o Mural (primeiro destino público da barra inferior, ABAS_POR_PERFIL §2.6). O Mural continua a um clique
 * na tela Hoje.
 */
export default async function HomePage() {
  const store = await cookies();
  redirect(store.get(SESSION_HINT_COOKIE)?.value === "1" ? "/today" : "/mural");
}
