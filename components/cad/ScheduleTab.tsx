"use client";
/**
 * Aba Cronograma (RF34.CA03): as oito etapas em sequência fim-início, com a base de cálculo de cada duração (quantidade ÷
 * produtividade de EXEMPLO, área construída como estimativa, duração fixa ou "a definir"), equipes editáveis, datas em dias
 * úteis e uma barra por etapa (decorativa — a tabela tem os mesmos dados).
 */
import { Badge, Field, Input } from "@/components/ui";
import { isIsoDate, type Schedule, type ScheduleItem } from "@/lib/cad/schedule";
import type { StageId } from "@/lib/cad/types";
import { NumberCell } from "./QuantitiesTab";
import type { CadText } from "./useCadText";

export interface ScheduleTabProps {
  schedule: Schedule;
  fileName: string;
  onStart: (iso: string) => void;
  onTeams: (stage: StageId, n: number) => void;
  text: CadText;
}

const TH = "px-2 py-2 font-semibold";
const TD = "px-2 py-2 align-top";
const STATUS_TONE = { CALCULADA: "success", ESTIMADA: "warning", FIXA: "neutral", A_DEFINIR: "danger" } as const;

export function ScheduleTab({ schedule, fileName, onStart, onTeams, text }: ScheduleTabProps) {
  const { t } = text;
  const basis = (i: ScheduleItem): string => {
    const b = i.basis;
    if (b.type === "QUANTIDADE") {
      return b.parts
        .map((p) => t("cad.schedule.basisPart", {
          qty: text.qty(p.quantity, p.unit),
          unit: text.unit(p.unit),
          kinds: p.kinds.map((k) => t(`cad.kind.${k}`)).join(", "),
          perDay: text.n2.format(p.perDay),
        }))
        .join(" + ");
    }
    if (b.type === "AREA") return t("cad.schedule.basisArea", { area: text.n2.format(b.areaM2), perDay: text.n2.format(b.perDay) });
    if (b.type === "FIXA") return t("cad.schedule.basisFixed", { days: b.days });
    return t("cad.schedule.basisNone");
  };
  const total = Math.max(1, schedule.totalDays);

  return (
    <div className="grid gap-[var(--ws-space-3)]">
      <p role="note" className="flex gap-2 rounded-[var(--ws-radius-md)] bg-ws-warning-soft px-3 py-2 text-[length:var(--ws-text-body-sm)] font-semibold text-ws-warning-ink">
        <span aria-hidden>⚠</span>
        <span>{t("cad.schedule.exampleNote")}</span>
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <Field label={t("cad.schedule.start")} hint={t("cad.schedule.startHint")} className="w-56">
          {({ id, describedBy }) => (
            <Input id={id} aria-describedby={describedBy} type="date" value={schedule.start} data-testid="cad-start"
              onChange={(e) => {
                if (isIsoDate(e.target.value)) onStart(e.target.value);
              }} />
          )}
        </Field>
        <p className="min-w-0 flex-1 text-[length:var(--ws-text-body)] font-semibold" aria-live="polite" data-testid="cad-schedule-total">
          {schedule.end
            ? t("cad.schedule.total", { days: schedule.totalDays, start: text.date(schedule.start), end: text.date(schedule.end) })
            : t("cad.schedule.totalNone")}
        </p>
      </div>
      {schedule.undefinedStages.length ? (
        <p className="text-[length:var(--ws-text-body-sm)] font-medium text-ws-danger-ink" role="status">
          <span aria-hidden>⊘ </span>
          {t("cad.schedule.undefined", { stages: schedule.undefinedStages.map((s) => t(`cad.stage.${s}`)).join(", ") })}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1">
        <table className="w-full min-w-[60rem] border-collapse text-[length:var(--ws-text-body-sm)]" data-testid="cad-schedule">
          <caption className="sr-only">{t("cad.schedule.caption", { file: fileName })}</caption>
          <thead className="bg-ws-surface-2 text-left text-[length:var(--ws-text-caption)] text-ws-text-muted">
            <tr>
              <th scope="col" className={TH}>{t("cad.schedule.col.stage")}</th>
              <th scope="col" className={TH}>{t("cad.schedule.col.basis")}</th>
              <th scope="col" className={TH}>{t("cad.schedule.col.teams")}</th>
              <th scope="col" className={`${TH} text-right`}>{t("cad.schedule.col.days")}</th>
              <th scope="col" className={TH}>{t("cad.schedule.col.start")}</th>
              <th scope="col" className={TH}>{t("cad.schedule.col.end")}</th>
              <th scope="col" className={TH}>{t("cad.schedule.col.dependsOn")}</th>
            </tr>
          </thead>
          <tbody>
            {schedule.items.map((i) => (
              <tr key={i.stage} data-stage={i.stage} data-status={i.status} className="border-t border-ws-border">
                <th scope="row" className={`${TD} text-left`}>{t(`cad.stage.${i.stage}`)}</th>
                <td className={TD}>
                  <span className="block">{basis(i)}</span>
                  <Badge tone={STATUS_TONE[i.status]} className="mt-1">{t(`cad.schedule.status.${i.status}`)}</Badge>
                </td>
                <td className={TD}>
                  {i.basis.type === "QUANTIDADE" || i.basis.type === "AREA" ? (
                    <NumberCell value={i.teams} step="1" min={1} max={50} label={t("cad.schedule.teamsOf", { stage: t(`cad.stage.${i.stage}`) })}
                      testId={`cad-teams-${i.stage}`} className="w-20 text-right" onCommit={(v) => onTeams(i.stage, v === null ? 1 : Math.max(1, Math.trunc(v)))} />
                  ) : (
                    <span className="text-ws-text-faint">—</span>
                  )}
                </td>
                <td className={`${TD} text-right tabular-nums`}>{i.days ? text.n0.format(i.days) : t("cad.schedule.toDefine")}</td>
                <td className={TD}>{text.date(i.start)}</td>
                <td className={TD}>{text.date(i.end)}</td>
                <td className={TD}>{i.dependsOn.length ? i.dependsOn.map((d) => t(`cad.stage.${d}`)).join(", ") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-1.5" aria-hidden data-testid="cad-gantt">
        {schedule.items.map((i) => (
          <div key={i.stage} className="grid grid-cols-[minmax(7rem,12rem)_1fr] items-center gap-2 text-[length:var(--ws-text-caption)]">
            <span className="truncate text-ws-text-muted">{t(`cad.stage.${i.stage}`)}</span>
            <span className="relative h-3 rounded-[var(--ws-radius-pill)] bg-ws-surface-2">
              {i.days ? (
                <span
                  className="absolute inset-y-0 rounded-[var(--ws-radius-pill)] bg-ws-accent"
                  style={{ left: `${(i.startDay / total) * 100}%`, width: `${Math.max(1, (i.days / total) * 100)}%` }}
                />
              ) : null}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("cad.schedule.calendarNote")}</p>
    </div>
  );
}
