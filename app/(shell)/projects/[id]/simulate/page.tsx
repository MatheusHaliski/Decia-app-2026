// /projects/[id]/simulate — Simulador de Cenários e Riscos do projeto (RF31): alavancas sobre uma cópia do projeto, impacto no
// prazo (CPM e Monte Carlo com semente fixa) e no custo (valor agregado), comparação de até três cenários (?compare=a,b,c) e envio
// do escolhido à aprovação como solicitação de mudança no DECIA. Dados DEMO em memória até existir a API de projetos.
import { SimulateClient } from "./SimulateClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SimulateClient projectId={id} />;
}
