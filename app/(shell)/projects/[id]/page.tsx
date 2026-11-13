// /projects/[id] — visão geral do projeto (RF7/RF29/RF13/RF10): resumo, fase, indicadores do motor (CPM, PERT, valor agregado),
// últimas versões e os atalhos para a Mesa de Trabalho (RF22), o Simulador (RF31) e o Espelho (RF32). Dados DEMO da aba.
import { ProjectOverviewPage } from "@/components/projects/desk/ProjectOverview";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectOverviewPage projectId={id} />;
}
