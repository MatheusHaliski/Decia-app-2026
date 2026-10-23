"use client";
// Página-esqueleto gerada para a rota /drawings (ABAS_POR_PERFIL.md / docs/diagramas). Conteúdo real chega no RF correspondente (PLANO_ONDAS 17/10/2026).
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/drawings")!;

export default function Page() {
  return <RfPage page={PAGE} />;
}
