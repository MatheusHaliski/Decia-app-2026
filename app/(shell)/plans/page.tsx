"use client";
// Página-esqueleto gerada para a rota /plans (ABAS_POR_PERFIL.md / docs/diagramas). Conteúdo real chega no RF correspondente.
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/plans")!;

export default function Page() {
  return <RfPage page={PAGE} />;
}
