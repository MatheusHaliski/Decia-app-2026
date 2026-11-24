"use client";
// /admin — Gestão do sistema (RF18, RF28, RF43). A aba "IA do sistema" traz a política de IA da organização (RF51, D-136/D-156):
// teto de autonomia das sessões do DECIA e o padrão das novas. Pedido do dono do produto (12/11/2026): ADMIN e EMPRESA editam
// essa política — a EMPRESA vê /admin no menu com SÓ essa aba (as demais têm `hiddenFor: EMPRESA` no registro e seguem exclusivas
// do ADMIN, ABAS_POR_PERFIL §6.9).
import { useMounted } from "@/components/decia/hooks";
import { OrgAiPolicyPanel } from "@/components/decia/session";
import { RfPage } from "@/components/shell/RfPage";
import { LoadingState } from "@/components/ui";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/admin")!;
const AI_TAB = "ia";

export default function Page() {
  const mounted = useMounted();
  return (
    <RfPage
      page={PAGE}
      renderTab={(slug) => (slug === AI_TAB ? (mounted ? <OrgAiPolicyPanel /> : <LoadingState />) : undefined)}
    />
  );
}
