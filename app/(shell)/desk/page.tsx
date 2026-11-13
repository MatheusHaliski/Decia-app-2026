"use client";
// /desk — Mesa de Trabalho do perfil (RF21/RF22; Matriz A §2.2): "Minha mesa" com os projetos desta aba, os rascunhos do
// Autopiloto e o "criar projeto", mantendo a prévia da skin (RF22, RF38.CA08) e da arte de fundo (RF23/RF3, D-37); "Mesa da
// equipe" com os projetos por fase. Rota do RF30: `/desk?draft=<id>` abre a proposta do Autopiloto em modo rascunho (sub-aba própria).
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DraftDesk } from "@/components/projects/desk/DraftDesk";
import { MyDesk, TeamBoard } from "@/components/projects/desk/MyDesk";
import { RfPage } from "@/components/shell/RfPage";
import { LoadingState } from "@/components/ui";
import { DESK_TABS, type SubTab } from "@/lib/nav/matrix";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/desk")!;
const DRAFT_TAB: SubTab = { slug: "rascunho", labelKey: "deskHome.draft.tab" };

function Desk() {
  const draft = useSearchParams().get("draft");
  return (
    <RfPage
      page={PAGE}
      tabs={draft ? [DRAFT_TAB, ...DESK_TABS] : undefined}
      renderTab={(slug) => (slug === "rascunho" && draft ? <DraftDesk draftId={draft} /> : slug === "equipe" ? <TeamBoard /> : <MyDesk />)}
    />
  );
}

export default function DeskPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Desk />
    </Suspense>
  );
}
