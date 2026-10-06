import { redirect } from "next/navigation";

/** A raiz leva ao Mural (primeiro destino da barra inferior, ABAS_POR_PERFIL §2.6). A home provisória do Bloco 1 saiu com o shell. */
export default function HomePage() {
  redirect("/mural");
}
