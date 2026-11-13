"use client";
/**
 * Resumo da leitura: arquivo, formato, tamanho, contagens, unidade (de onde veio e troca, no DXF e no GLB), avisos da leitura
 * e as perdas de fidelidade — o que foi descartado, aproximado ou achatado — antes de qualquer aceite (RF70.CA06).
 */
import { Badge, Card, Field, Select, Tag } from "@/components/ui";
import type { ParsedCad } from "@/lib/cad/read";
import type { CadAlert, CadLoss, Takeoff } from "@/lib/cad/types";
import { SELECTABLE_UNITS, type LengthUnitId } from "@/lib/cad/units";
import type { CadText } from "./useCadText";

export interface ReadSummaryProps {
  parsed: ParsedCad;
  takeoff: Takeoff;
  /** conferências recalculadas com as correções */
  checks: readonly CadAlert[];
  unitChoice: LengthUnitId | null;
  onUnit: (u: LengthUnitId | null) => void;
  text: CadText;
}

const LOSS_KINDS: CadLoss["kind"][] = ["DESCARTADO", "APROXIMADO", "ACHATADO"];
const LOSS_TONE = { DESCARTADO: "danger", APROXIMADO: "warning", ACHATADO: "info" } as const;

export function ReadSummary({ parsed, takeoff, checks, unitChoice, onUnit, text }: ReadSummaryProps) {
  const { t } = text;
  const fact = (code: string) => takeoff.facts.find((f) => f.code === code)?.n ?? 0;
  const facts =
    takeoff.format === "DXF" ? t("cad.facts.DXF", { entities: fact("ENTIDADES"), layers: fact("CAMADAS"), blocks: fact("BLOCOS"), rooms: fact("AMBIENTES"), dims: fact("COTAS"), texts: fact("TEXTOS") })
      : takeoff.format === "IFC" ? t("cad.facts.IFC", { elements: fact("ELEMENTOS"), storeys: fact("PAVIMENTOS"), spaces: fact("AMBIENTES"), records: fact("REGISTROS") })
        : t("cad.facts.GLB", { meshes: fact("MALHAS"), triangles: fact("TRIANGULOS"), nodes: fact("NOS") });
  const alerts = [...takeoff.alerts, ...checks];
  const unit = takeoff.unit;
  const unitOptions = [
    { value: "", label: t(takeoff.format === "GLB" ? "cad.wb.unitGlbDefault" : "cad.wb.unitFromFile") },
    ...SELECTABLE_UNITS.map((u) => ({ value: u, label: t(`cad.unit.${u}`) })),
  ];

  return (
    <Card padding="md" data-testid="cad-summary">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{parsed.format}</Badge>
        <h2 className="min-w-0 flex-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold [overflow-wrap:anywhere]">{parsed.fileName}</h2>
        <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{text.bytes(parsed.sizeBytes)}</span>
        <Badge tone="info" title={t("cad.wb.localHint")}>{t("cad.wb.local")}</Badge>
      </div>
      <p className="mt-2 text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="cad-facts">{facts}</p>

      {unit ? (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <p className="min-w-0 flex-1 text-[length:var(--ws-text-body-sm)]" data-testid="cad-unit">
            <span className="font-semibold">{t("cad.wb.unit")}:</span> {t(`cad.unit.${unit.id}`)} · {t(`cad.unitOrigin.${unit.origin}`)}
          </p>
          {takeoff.unitEditable ? (
            <Field label={t("cad.wb.unitChange")} className="min-w-[14rem]">
              {({ id }) => (
                <Select id={id} value={unitChoice ?? ""} options={unitOptions} onChange={(e) => onUnit(e.target.value ? (e.target.value as LengthUnitId) : null)} data-testid="cad-unit-select" />
              )}
            </Field>
          ) : null}
        </div>
      ) : null}

      <section aria-labelledby="cad-alerts" className="mt-4 grid gap-2">
        <h3 id="cad-alerts" className="text-[length:var(--ws-text-body)] font-semibold">{t("cad.wb.alertsTitle", { n: alerts.length })}</h3>
        {alerts.length ? (
          <ul className="grid gap-1.5" data-testid="cad-alerts" aria-live="polite">
            {alerts.map((a, i) => (
              <li key={`${a.code}-${i}`} data-alert={a.code} className="flex gap-2 rounded-[var(--ws-radius-md)] bg-ws-warning-soft px-3 py-2 text-[length:var(--ws-text-body-sm)] text-ws-text">
                <span aria-hidden className="text-ws-warning-ink">⚠</span>
                <span className="min-w-0 [overflow-wrap:anywhere]">{text.alert(a)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("cad.wb.noAlerts")}</p>
        )}
      </section>

      <section aria-labelledby="cad-losses" className="mt-4 grid gap-2" data-testid="cad-losses">
        <h3 id="cad-losses" className="text-[length:var(--ws-text-body)] font-semibold">{t("cad.wb.lossesTitle")}</h3>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("cad.wb.lossesHint")}</p>
        {takeoff.losses.length ? (
          <ul className="grid gap-1.5">
            {LOSS_KINDS.flatMap((k) =>
              takeoff.losses.filter((l) => l.kind === k).map((l) => (
                <li key={`${k}-${l.code}`} data-loss={l.code} className="flex flex-wrap items-start gap-2 text-[length:var(--ws-text-body-sm)]">
                  <Tag tone={LOSS_TONE[k]}>{t(`cad.lossKind.${k}`)}</Tag>
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{text.loss(l)}</span>
                </li>
              )),
            )}
          </ul>
        ) : (
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("cad.wb.noLosses")}</p>
        )}
      </section>
    </Card>
  );
}
