// /projects/[id]/mirror — Espelho de Conformidade e checklists regulatórios (RF32): confronta a estrutura do projeto com
// checklists federais (Lei 14.133/2021, LGPD, LAI, acessibilidade), diretrizes estaduais e municipais de exemplo e o checklist do
// departamento; sugere as tarefas técnicas faltantes na fase certa. Dados DEMO em memória até existir a API de projetos.
import { MirrorClient } from "./MirrorClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MirrorClient projectId={id} />;
}
