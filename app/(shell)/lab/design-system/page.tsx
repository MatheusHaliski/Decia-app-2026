"use client";
// /lab/design-system (DESIGN_SYSTEM.md §6, RF38): Storybook leve com os componentes REAIS — tokens (swatches lidos do
// CSS computado), tipografia, WS Glyphs e Moji, cada componente em todos os estados, cards. Seletor de tema/densidade/idioma
// é o do shell (barra superior) — a página reage às preferências.
import { useEffect, useState } from "react";
import {
  Avatar, BackgroundArt, Badge, Button, Card, Checkbox, Dialog, EmptyState, ErrorState, Field, GLYPH_NAMES, Glyph, IconButton, Input, LoadingState, MOJI_NAMES, Moji,
  Monogram, PercentBar, Popover, RadioCards, RfChip, Select, SelectList, Sheet, Skeleton, Switch, Tabs, Tag, Textarea, Tooltip, WS_BACKGROUNDS, useToast,
  type ButtonVariant, type Tone,
} from "@/components/ui";
import { PageHeader } from "@/components/shell/PageHeader";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";

const SWATCHES = ["surface-0", "surface-1", "surface-2", "surface-3", "text", "text-muted", "border", "accent", "accent-soft", "success", "warning", "danger", "info", "ai-spark", "node-red", "node-yellow", "node-green", "node-blue", "node-brown", "node-orange", "msg-argument", "msg-divergence", "msg-risk", "msg-consensus", "msg-question"];
const VARIANTS: ButtonVariant[] = ["default", "primary", "gradient", "secondary", "ghost", "danger", "spark"];
const TONES: Tone[] = ["neutral", "accent", "success", "warning", "danger", "info", "spark", "red", "yellow", "green", "blue", "brown", "orange"];
const SECTIONS = ["tokens", "type", "glyphs", "buttons", "badges", "forms", "overlays", "states", "cards"] as const;

function Swatches() {
  const { resolvedTheme } = usePreferences();
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    setValues(Object.fromEntries(SWATCHES.map((s) => [s, cs.getPropertyValue(`--ws-${s}`).trim()])));
  }, [resolvedTheme]);
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
      {SWATCHES.map((s) => (
        <li key={s} className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border p-2">
          <span className="block h-10 rounded-[var(--ws-radius-sm)] border border-ws-border" style={{ background: `var(--ws-${s})` }} aria-hidden />
          <code className="truncate font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)]">--ws-{s}</code>
          <span className="truncate font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] text-ws-text-muted">{values[s] ?? "…"}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DesignSystemLab() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [sw, setSw] = useState(true);
  const [cb, setCb] = useState(false);
  const [radio, setRadio] = useState("a");
  const [list, setList] = useState<string[]>(["t1"]);
  return (
    <div className="grid gap-[var(--ws-space-5)]">
      <PageHeader title={t("lab.designSystem")} glyph="configuracoes" rfs={["RF38"]} description={t("lab.designSystemDescription")} eyebrow={t("common.lab")} />
      <Tabs label={t("lab.sections")} tabs={SECTIONS.map((s) => ({ slug: s, label: t(`lab.section.${s}`) }))} look="pills">
        {(active) => (
          <div className="grid gap-[var(--ws-space-4)]">
            {active === "tokens" ? (
              <Card title={t("lab.section.tokens")} eyebrow="styles/tokens-ws.css">
                <Swatches />
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {WS_BACKGROUNDS.filter((b) => b.id !== "sem-arte").map((b) => <BackgroundArt key={b.id} backgroundId={b.id} minHeight="5rem"><span className="text-[length:var(--ws-text-caption)] font-semibold">{t(b.labelKey)}</span></BackgroundArt>)}
                </div>
              </Card>
            ) : null}
            {active === "type" ? (
              <Card title={t("lab.section.type")}>
                <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-display)] font-semibold leading-[var(--ws-text-display--lh)]">Display · {t("brand.name")}</p>
                <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h1)] font-semibold">H1 · {t("lab.typeSample")}</p>
                <p className="text-[length:var(--ws-text-h2)] font-semibold">H2 · {t("lab.typeSample")}</p>
                <p className="text-[length:var(--ws-text-h3)] font-semibold">H3 · {t("lab.typeSample")}</p>
                <p className="text-[length:var(--ws-text-body-lg)]">Body lg · {t("lab.typeSample")}</p>
                <p className="text-[length:var(--ws-text-body)]">Body · {t("lab.typeSample")}</p>
                <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">Body sm · {t("lab.typeSample")}</p>
                <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-prompt)]">{">_"} prompt · {t("lab.typeSample")}</p>
                <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">Label · {t("lab.typeSample")}</p>
              </Card>
            ) : null}
            {active === "glyphs" ? (
              <>
                <Card title={t("lab.glyphsOutline")} eyebrow="docs/design-system/GLYPHS.md">
                  <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {GLYPH_NAMES.map((g) => <li key={g} className="grid justify-items-center gap-1 text-center text-[length:var(--ws-text-caption)]"><Glyph name={g} size={28} /><span>{g}</span></li>)}
                  </ul>
                </Card>
                <Card title={t("lab.glyphsClay")}>
                  <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {GLYPH_NAMES.map((g) => <li key={g} className="grid justify-items-center gap-1 text-center text-[length:var(--ws-text-caption)]"><Glyph name={g} variant="clay" size={40} /><span>{g}</span></li>)}
                  </ul>
                </Card>
                <Card title={t("lab.mojis")}>
                  <ul className="grid grid-cols-3 gap-3 sm:grid-cols-9">
                    {MOJI_NAMES.map((m) => <li key={m} className="grid justify-items-center gap-1 text-center text-[length:var(--ws-text-caption)]"><Moji name={m} size={48} /><span>{m}</span></li>)}
                  </ul>
                </Card>
              </>
            ) : null}
            {active === "buttons" ? (
              <Card title={t("lab.section.buttons")}>
                <div className="grid gap-3">
                  {VARIANTS.map((v) => (
                    <div key={v} className="flex flex-wrap items-center gap-2">
                      <code className="w-24 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)]">{v}</code>
                      <Button variant={v} size="sm">{t("lab.btn")}</Button>
                      <Button variant={v}>{t("lab.btn")}</Button>
                      <Button variant={v} size="lg" icon="criar-tarefa">{t("lab.btn")}</Button>
                      <Button variant={v} busy>{t("lab.busy")}</Button>
                      <Button variant={v} disabled>{t("lab.disabled")}</Button>
                      <IconButton variant={v} icon="buscar" label={t("nav.search")} />
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
            {active === "badges" ? (
              <Card title={t("lab.section.badges")}>
                <div className="flex flex-wrap gap-2">{TONES.map((tn) => <Badge key={tn} tone={tn}>{tn}</Badge>)}<Badge count>12</Badge><RfChip id="RF38" primary /><RfChip id="RF27" /></div>
                <div className="mt-3 flex flex-wrap gap-2">{TONES.map((tn) => <Tag key={tn} tone={tn}>{tn}</Tag>)}<Tag dashed>RASCUNHO</Tag><Tag tone="accent" pulse>EM_USO</Tag><Tag tone="success" filled>CONCLUÍDA</Tag></div>
                <div className="mt-3 flex flex-wrap items-center gap-2"><Avatar name="Pessoa Exemplo" /><Avatar name="Pessoa Exemplo" node="green" size={40} /><Monogram name="SECID-UTS" monogram="UTS" node="blue" size={40} /><Monogram name="CPOE" monogram="CPO" node="orange" size={48} /></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2"><PercentBar value={35} label={t("lab.percent")} /><PercentBar value={72} label={t("lab.percent")} tone="success" segments={6} /><PercentBar value={100} label={t("lab.percent")} tone="spark" size="sm" /></div>
              </Card>
            ) : null}
            {active === "forms" ? (
              <Card title={t("lab.section.forms")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("lab.field")} hint={t("lab.hint")}>{({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} placeholder={t("lab.placeholder")} />}</Field>
                  <Field label={t("lab.field")} error={t("lab.error")} required>{({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} leading="buscar" />}</Field>
                  <Field label={t("lab.field")}>{({ id }) => <Select id={id} options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} />}</Field>
                  <Field label={t("lab.field")}>{({ id }) => <Textarea id={id} />}</Field>
                </div>
                <Switch checked={sw} onCheckedChange={setSw} label={t("lab.switch")} hint={t("lab.hint")} />
                <Checkbox checked={cb} onCheckedChange={setCb} label={t("lab.checkbox")} />
                <div className="mt-3"><RadioCards label={t("lab.radio")} value={radio} onValueChange={setRadio} options={[{ value: "a", label: "A", glyph: "mesa" }, { value: "b", label: "B", glyph: "acervo" }, { value: "c", label: "C", glyph: "mural", disabled: true }]} /></div>
                <div className="mt-3 max-w-md"><SelectList label={t("lab.selectList")} multiple value={list} onChange={setList} options={[{ id: "t1", title: t("lab.option", { n: 1 }), glyph: "criar-tarefa" }, { id: "t2", title: t("lab.option", { n: 2 }), subtitle: t("lab.hint") }, { id: "t3", title: t("lab.option", { n: 3 }), disabledReason: t("lab.disabledReason") }]} /></div>
              </Card>
            ) : null}
            {active === "overlays" ? (
              <Card title={t("lab.section.overlays")}>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setDialog(true)}>Dialog</Button>
                  <Button onClick={() => setSheet(true)}>Sheet</Button>
                  <Popover label="Popover" trigger={<Button>Popover</Button>}><p className="p-2 text-[length:var(--ws-text-body-sm)]">{t("lab.popoverBody")}</p></Popover>
                  <Tooltip content={t("lab.tooltip")}><Button>Tooltip</Button></Tooltip>
                  <Button variant="spark" onClick={() => toast({ title: t("lab.toastTitle"), description: t("lab.hint"), tone: "ia" })}>Toast</Button>
                  <Button variant="danger" onClick={() => toast({ title: t("lab.toastTitle"), tone: "erro" })}>Toast erro</Button>
                </div>
                <Dialog open={dialog} onOpenChange={setDialog} title={t("lab.dialogTitle")} description={t("lab.hint")}><Button variant="primary" onClick={() => setDialog(false)}>{t("common.close")}</Button></Dialog>
                <Sheet open={sheet} onOpenChange={setSheet} title={t("lab.sheetTitle")} side="right"><p className="text-[length:var(--ws-text-body-sm)]">{t("lab.hint")}</p></Sheet>
              </Card>
            ) : null}
            {active === "states" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <EmptyState title={t("lab.emptyTitle")} description={t("lab.hint")} action={<Button variant="primary" size="sm">{t("lab.btn")}</Button>} />
                <ErrorState description={t("lab.hint")} code="503 SERVICO_INDISPONIVEL" correlationId="c-0000" onRetry={() => undefined} />
                <LoadingState />
                <Card><div aria-busy="true" className="grid gap-3"><Skeleton className="h-6 w-1/2" /><Skeleton lines={4} /><Skeleton className="h-32" /></div></Card>
              </div>
            ) : null}
            {active === "cards" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Card title={t("lab.cardSurface")} eyebrow="surface">{t("lab.hint")}</Card>
                <Card tone="soft" title={t("lab.cardSoft")} eyebrow="soft">{t("lab.hint")}</Card>
                <Card tone="clay" title={t("lab.cardClay")} eyebrow="clay" actions={<Button size="sm">{t("lab.btn")}</Button>}>{t("lab.hint")}</Card>
                <BackgroundArt backgroundId="malha-laranja" minHeight="8rem"><Card tone="glass" title={t("lab.cardGlass")} eyebrow="glass">{t("lab.hint")}</Card></BackgroundArt>
              </div>
            ) : null}
          </div>
        )}
      </Tabs>
    </div>
  );
}
