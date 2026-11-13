// /projects/[id]/edit — Mesa de Trabalho do projeto (RF22): quadro por fases, canvas conectado, linha do tempo, abas da
// disciplina de Gestão de Projetos de TI e janela segmentada com o feedback da IA. Dados DEMO em memória até a API de projetos.
import { WorkspaceClient } from "./WorkspaceClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspaceClient projectId={id} />;
}
