"use client";
// Página-esqueleto gerada para a rota /departments/[slug]/team (ABAS_POR_PERFIL.md / docs/diagramas). Conteúdo real chega no RF correspondente.
import { useParams } from "next/navigation";
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/departments/[slug]/team")!;

export default function Page() {
  const params = useParams<{ slug: string }>();
  return <RfPage page={PAGE} subtitle={params.slug} />;
}
