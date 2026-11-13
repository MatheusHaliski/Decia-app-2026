"use client";
// /admin — Gestão do sistema (RF18, RF28, RF43). A aba "IA do sistema" traz a política de IA da organização (RF51, D-136/D-156):
// teto de autonomia das sessões do DECIA e o padrão das novas. Pedido do dono do produto (12/11/2026): ADMIN e EMPRESA editam
// essa política — a EMPRESA entra em /admin SÓ por essa aba (as demais seguem exclusivas do ADMIN, ABAS_POR_PERFIL §6.9).
import { useMemo } from "react";
import { useMounted } from "@/components/decia/hooks";
import { OrgAiPolicyPanel } from "@/components/decia/session";
import { RfPage } from "@/components/shell/RfPage";
import { LoadingState } from "@/components/ui";
import { pageByRoute, type PageEntry } from "@/lib/pages/registry";
import { useViewer } from "@/lib/viewer/ViewerProvider";

const PAGE = pageByRoute("/admin")!;
const AI_TAB = "ia";

/** Para a EMPRESA: a mesma página, com acesso só à aba de IA (o registro continua dizendo que /admin é do ADMIN). */
const COMPANY_PAGE: PageEntry = {
  ...PAGE,
  access: { ...PAGE.access, EMPRESA: "E" },
  tabs: (PAGE.tabs ?? []).filter((tab) => tab.slug === AI_TAB),
};

export default function Page() {
  const { profile } = useViewer();
  const mounted = useMounted();
  const page = useMemo(() => (profile === "EMPRESA" ? COMPANY_PAGE : PAGE), [profile]);
  return (
    <RfPage
      page={page}
      renderTab={(slug) => (slug === AI_TAB ? (mounted ? <OrgAiPolicyPanel /> : <LoadingState />) : undefined)}
    />
  );
}
