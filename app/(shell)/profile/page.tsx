"use client";
// Meu perfil (Matriz B, ABAS_POR_PERFIL §3): 15 sub-abas; EMPRESA some com 5/9/13/14/15 e renomeia 6/11/12 (§7.d).
import { ProfileHeader } from "@/components/shell/ProfileHeader";
import { RfPage } from "@/components/shell/RfPage";
import { useI18n } from "@/lib/i18n/useI18n";
import { PROFILE_TABS, pageByRoute } from "@/lib/pages/registry";
import { useViewer } from "@/lib/viewer/ViewerProvider";

const PAGE = pageByRoute("/profile")!;

export default function ProfilePage() {
  const { t } = useI18n();
  const { profile } = useViewer();
  return (
    <RfPage
      page={PAGE}
      tabLabel={(tb) => {
        const pt = PROFILE_TABS.find((x) => x.slug === tb.slug);
        return pt && profile === "EMPRESA" && pt.companyLabelKey ? t(pt.companyLabelKey) : t(tb.labelKey);
      }}
    >
      <ProfileHeader />
    </RfPage>
  );
}
