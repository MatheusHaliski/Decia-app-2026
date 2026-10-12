"use client";
// Página-esqueleto gerada para a rota /tasks/new (ABAS_POR_PERFIL.md / docs/diagramas). Conteúdo real chega no RF correspondente.
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/tasks/new")!;

export default function Page() {
  return <RfPage page={PAGE} />;
}
