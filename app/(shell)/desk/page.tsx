"use client";
// Mesa de Trabalho (RF21/RF22; Matriz A §2.2): esqueleto com a prévia real da Mesa — skin (RF22, RF38.CA08) e arte de
// fundo (RF23/RF3, D-37) vêm das preferências do usuário e mudam na hora.
import { BackgroundArt, Button, Tag } from "@/components/ui";
import { RfPage } from "@/components/shell/RfPage";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";

const PAGE = pageByRoute("/desk")!;

export default function DeskPage() {
  const { t } = useI18n();
  const { prefs } = usePreferences();
  return (
    <RfPage page={PAGE}>
      <BackgroundArt skin={prefs.deskSkin} backgroundId={prefs.backgroundId} minHeight="14rem" className="shadow-ws-clay">
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="neutral" filled>{t(`deskSkin.${prefs.deskSkin}`)}</Tag>
            <Tag tone="accent">{t(`background.${prefs.backgroundId}`)}</Tag>
          </div>
          <p className="max-w-prose text-[length:var(--ws-text-body-sm)] font-medium">{t("desk.preview")}</p>
          <div><Button size="sm" href="/settings?tab=aparencia">{t("desk.changeInSettings")}</Button></div>
        </div>
      </BackgroundArt>
    </RfPage>
  );
}
