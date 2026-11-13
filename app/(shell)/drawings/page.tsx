"use client";
// /drawings (RF57–RF74). Duas vistas em abas (aba na URL, `?vista=3d`): "2D colaborativo" (padrão — RF66 reservas
// transacionais entre abas e RF74 prévia fantasma, DEMO) e "3D" (RF60–RF63). Cada editor é carregado só no navegador e só
// quando a aba abre: three.js e o path tracer não pesam na vista 2D nem nas outras rotas. Os CAs dos RFs seguem abaixo.
import dynamic from "next/dynamic";
import { LoadingState, Tabs } from "@/components/ui";
import { RfPage } from "@/components/shell/RfPage";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/drawings")!;

const Editor2D = dynamic(() => import("@/components/drawings2d/Editor2D"), { ssr: false, loading: () => <LoadingState /> });
const Editor3D = dynamic(() => import("@/components/drawings3d/Editor3D"), { ssr: false, loading: () => <LoadingState /> });

export default function Page() {
  const { t } = useI18n();
  return (
    <RfPage page={PAGE} noEmpty>
      <Tabs
        label={t("drw2d.views")}
        param="vista"
        tabs={[
          { slug: "2d", label: t("drw2d.tab2d") },
          { slug: "3d", label: t("drw2d.tab3d") },
        ]}
      >
        {(active) => (active === "3d" ? <Editor3D /> : <Editor2D />)}
      </Tabs>
    </RfPage>
  );
}
