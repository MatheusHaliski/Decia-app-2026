"use client";
// Página-esqueleto gerada para a rota /companies/[slug]/manage/departments (ABAS_POR_PERFIL.md / docs/diagramas). Conteúdo real chega no RF correspondente.
import { useParams } from "next/navigation";
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/companies/[slug]/manage/departments")!;

export default function Page() {
  const params = useParams<{ slug: string }>();
  return <RfPage page={PAGE} subtitle={params.slug} />;
}
