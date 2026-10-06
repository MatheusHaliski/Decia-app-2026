"use client";
// Página-esqueleto da rota /agents (RF48 Agentes — Copilot de testes; ABAS_POR_PERFIL.md / docs/diagramas/RF48): modos de
// tela (RF48.CA18), catálogo por fase e as ferramentas do dossiê em abas (RF48.CA13–CA17: Encontrar · Ler com mapa ·
// Extrair · Lista de termos, as mesmas do RF47 com escopo do dossiê) e "Abrir no Encontrar" (RF48.CA19). Conteúdo real
// chega no RF48.
import { useState } from "react";
import { AreaPreview, EXTRACT_AREA_ITEMS, LIST_AREA_ITEMS, READ_AREA_ITEMS } from "@/components/shell/AreaPreview";
import { RfPage } from "@/components/shell/RfPage";
import { DossierLink } from "@/components/shell/DossierLink";
import { Card, RadioCards } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/agents")!;
/** RF48.CA18: Mesa de testes · Assistente passo a passo · Carteira de contratos · Matriz de testes. */
const AGENT_VIEW_MODES = ["mesa", "assistente", "carteira", "matriz"] as const;

export default function Page() {
  const { t } = useI18n();
  // esqueleto: o modo fica só nesta visita; salvar por pessoa é do RF48.CA18
  const [mode, setMode] = useState<string>("mesa");
  return (
    <RfPage
      page={PAGE}
      actions={<DossierLink to="/find" labelKey="agents.openInFind" testId="agents-open-in-find" />}
      renderTab={(slug) => {
        if (slug === "encontrar-no-dossie") return <AreaPreview testId="agents-area-encontrar" titleKey="agents.area.encontrar.title" descriptionKey="agents.area.encontrar.description" itemKeys={["find.area.encontrar.contexto", "find.area.encontrar.agrupar", "agents.area.encontrar.vincular"]} />;
        if (slug === "ler-com-mapa") return <AreaPreview testId="agents-area-ler" titleKey="agents.area.ler.title" descriptionKey="agents.area.ler.description" itemKeys={[READ_AREA_ITEMS[0], "agents.area.ler.mapa", "agents.area.encontrar.vincular"]} />;
        if (slug === "extrair-do-dossie") return <AreaPreview testId="agents-area-extrair" titleKey="agents.area.extrair.title" descriptionKey="agents.area.extrair.description" itemKeys={EXTRACT_AREA_ITEMS} />;
        if (slug === "lista-de-termos") return <AreaPreview testId="agents-area-lista" titleKey="agents.area.lista.title" descriptionKey="agents.area.lista.description" itemKeys={LIST_AREA_ITEMS} />;
        return undefined;
      }}
    >
      <Card padding="sm" data-testid="agents-view-modes" className="grid gap-2">
        <RadioCards
          label={t("agents.mode.label")}
          value={mode}
          onValueChange={setMode}
          columns={4}
          options={AGENT_VIEW_MODES.map((m) => ({ value: m, label: t(`agents.mode.${m}`), hint: t(`agents.mode.${m}Hint`) }))}
        />
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("agents.mode.note")}</p>
      </Card>
    </RfPage>
  );
}
