"use client";
// /lab/anatomias: zonas dos cards, layouts, lacre, estilos de fundo e skins (docs/design-system/ANATOMIAS_E_ESTUDIO.md,
// wireframe docs/lab/anatomias.html). Componentes reais do DS acima; o wireframe estático embaixo como referência.
import { BackgroundArt, Badge, Card, DESK_SKIN_CLASS, Glyph, Tag } from "@/components/ui";
import { LabEmbed } from "@/components/shell/LabEmbed";
import { PageHeader } from "@/components/shell/PageHeader";
import { useI18n } from "@/lib/i18n/useI18n";

const SKINS = Object.keys(DESK_SKIN_CLASS) as (keyof typeof DESK_SKIN_CLASS)[];

export default function AnatomiasLab() {
  const { t } = useI18n();
  return (
    <div className="grid gap-[var(--ws-space-5)]">
      <PageHeader title={t("lab.anatomias")} glyph="mesa" rfs={["RF38", "RF11"]} description={t("lab.anatomiasDescription")} eyebrow={t("common.lab")} />
      <Card title={t("lab.deskSkins")} eyebrow="RF22 · RF38.CA08">
        <div className="grid gap-3 sm:grid-cols-4">
          {SKINS.map((s) => (
            <BackgroundArt key={s} skin={s} minHeight="7rem">
              <Tag tone="neutral" filled>{t(`deskSkin.${s}`)}</Tag>
            </BackgroundArt>
          ))}
        </div>
      </Card>
      <Card title={t("lab.cardZones")} eyebrow="ANATOMIA_CARDS.md">
        <div className="grid gap-3 md:grid-cols-3">
          {(["compact", "list", "expanded"] as const).map((layout) => (
            <div key={layout} className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-dashed border-ws-border p-3 text-[length:var(--ws-text-caption)]">
              <div className="flex items-center justify-between"><Badge>{layout}</Badge><Glyph name="chancela" size={18} decorative /></div>
              <div className="h-16 rounded-[var(--ws-radius-md)] bg-ws-surface-2" aria-hidden />
              <p className="font-semibold text-ws-text">{t("lab.cardTitleSample")}</p>
              <div className="flex gap-1"><Tag tone="accent" dashed>RASCUNHO</Tag><Tag tone="info">DOCUMENTO</Tag></div>
            </div>
          ))}
        </div>
      </Card>
      <LabEmbed file="anatomias.html" title={t("lab.anatomias")} source="docs/lab/anatomias.html" />
    </div>
  );
}
