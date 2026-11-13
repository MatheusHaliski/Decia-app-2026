"use client";
/**
 * Plano de desenvolvimento da profissão (pedido do produto "Plano de Desenvolvimento e Carreira por Categoria Acadêmica"; RF75.CA05,
 * RF81.CA04): as tarefas-guia da profissão preferida na ordem de prioridade do pacote, cada uma com "criar esta tarefa" (abre o
 * criador com o modelo) e o progresso das que a pessoa já fez (tarefas do Acervo com `extensions.guidedTask`).
 *  • Só o dono vê (D-147): o componente só é montado em tela pessoal, com a profissão das preferências da própria pessoa.
 *  • D-153: pacote em `pesquisa` aparece só como conteúdo informativo "em revisão por especialistas"; nada de status, versão ou código
 *    da tarefa-guia (o título, o tempo, o nível e o editor bastam).
 *  • Progresso por evidência ("2 de 6 concluídas"), sem percentual, score ou ranking (RF75.CA08).
 * Hoje fica no criador de tarefas (a aba Carreira do perfil, RF75 n.16, ainda não existe no registro); pronto para ser montado lá.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Link, Tag, type Tone } from "@/components/ui";
import { packFor, type ProductPack } from "@/lib/career/packs";
import { developmentPlan, nextPlanItem, type PlanStatus, type PlanTaskInput } from "@/lib/career/plan";
import { baseLocale } from "@/lib/i18n/state";
import { useI18n } from "@/lib/i18n/useI18n";
import { fieldByCode } from "@/lib/tasks/areas";
import { tasksApi } from "@/lib/tasks/client";
import type { TaskTemplate } from "@/lib/tasks/templates";

const STATUS_TONE: Record<PlanStatus, Tone> = { CONCLUIDA: "success", EM_ANDAMENTO: "info", A_FAZER: "neutral" };
const STATUS_MARK: Record<PlanStatus, string> = { CONCLUIDA: "✓", EM_ANDAMENTO: "◐", A_FAZER: "○" };

export interface DevelopmentPlanProps {
  /** profissão preferida da própria pessoa (código do ramo) */
  fieldCode: string;
  /** no criador: aplica o modelo ali mesmo; sem isto, "criar esta tarefa" abre `/tasks/new?modelo=` */
  onUse?: (tpl: TaskTemplate) => void;
  /** tarefas para medir o progresso; sem isto, as da pessoa vêm da API quando o plano é aberto */
  tasks?: readonly PlanTaskInput[];
  defaultOpen?: boolean;
}

type TasksState = "idle" | "loading" | "ok" | "unavailable";

export function DevelopmentPlanPanel({ fieldCode, onUse, tasks: given, defaultOpen = false }: DevelopmentPlanProps) {
  const { t, locale } = useI18n();
  const lang = baseLocale(locale) as "pt-BR" | "en" | "es";
  const field = fieldByCode(fieldCode);
  const [open, setOpen] = useState(defaultOpen);
  const [pp, setPp] = useState<ProductPack | null | undefined>(undefined);
  const [fetched, setFetched] = useState<readonly PlanTaskInput[]>([]);
  const [fetchState, setFetchState] = useState<TasksState>("idle");
  const tasks = given ?? fetched;
  const tasksState: TasksState = given ? "ok" : fetchState;

  // o pacote só é baixado quando o plano é aberto (cada pacote é um pedaço separado do bundle)
  useEffect(() => {
    if (!open || !field) return;
    let alive = true;
    setPp(undefined);
    packFor(field.code, "pesquisa")
      .then((p) => { if (alive) setPp(p); })
      .catch(() => { if (alive) setPp(null); });
    return () => { alive = false; };
  }, [open, field]);

  // as tarefas da pessoa só são lidas uma vez, quando o plano é aberto (sem sessão, o progresso fica indisponível)
  const fetching = useRef(false);
  useEffect(() => {
    if (!open || given || fetching.current) return;
    fetching.current = true;
    setFetchState("loading");
    tasksApi.mine(100)
      .then((list) => { setFetched(list); setFetchState("ok"); })
      .catch(() => setFetchState("unavailable"));
  }, [open, given]);

  const plan = useMemo(() => (pp && field ? developmentPlan(pp.pack, field.code, field.area, tasks) : null), [pp, field, tasks]);
  const next = plan ? nextPlanItem(plan) : undefined;
  if (!field) return null;
  const fieldLabel = field.label[lang];

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]"
      data-testid="development-plan"
    >
      <summary className="flex cursor-pointer select-none flex-wrap items-center gap-2 text-[length:var(--ws-text-body)] font-semibold">
        <span className="min-w-0 flex-1">{t("career.plan.title", { field: fieldLabel })}</span>
        <Tag tone="neutral"><span aria-hidden>🔒</span>{t("career.onlyYou")}</Tag>
      </summary>
      <div className="mt-2 grid gap-2 text-[length:var(--ws-text-body-sm)]">
        <p className="text-ws-text-muted">{t("career.plan.intro", { field: fieldLabel, area: t(`tasks.area.${field.area}`) })}</p>
        {pp === undefined ? <p className="text-ws-text-muted" aria-live="polite">{t("career.plan.loading")}</p> : null}
        {pp === null ? <p className="text-ws-text-muted">{t("career.plan.unavailable")}</p> : null}
        {pp?.inReview ? (
          <p className="flex flex-wrap items-center gap-2" data-testid="plan-in-review">
            <Tag tone="warning"><span aria-hidden>!</span>{t("career.inReview")}</Tag>
            <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("career.inReviewHint")}</span>
          </p>
        ) : null}
        {plan ? (
          <>
            <p aria-live="polite" data-testid="plan-progress">
              {tasksState === "ok" ? t("career.plan.progress", { done: plan.done, total: plan.total, started: plan.started })
                : tasksState === "unavailable" ? t("career.plan.progressUnavailable", { total: plan.total })
                : t("career.plan.progressLoading", { total: plan.total })}
              {next ? ` ${t("career.plan.next", { title: next.template.title })}` : plan.total ? ` ${t("career.plan.allDone")}` : ""}
            </p>
            <ol className="grid gap-1.5" aria-label={t("career.plan.listLabel", { field: fieldLabel })}>
              {plan.items.map((item) => (
                <li key={item.template.id} data-plan-item={item.template.id} data-status={item.status} className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 px-2.5 py-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Tag tone={STATUS_TONE[item.status]}><span aria-hidden>{STATUS_MARK[item.status]}</span>{t(`career.plan.status.${item.status}`)}</Tag>
                    <span className="min-w-0 flex-1 font-semibold">{item.template.title}</span>
                  </div>
                  <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
                    {[
                      t(`career.plan.editor.${item.editor}`),
                      item.template.effort,
                      item.template.level ? t(`tasks.assist.level.${item.template.level}`) : null,
                      item.computerOnly ? t("career.plan.computerOnly") : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.status !== "CONCLUIDA" ? (
                      onUse ? (
                        <Button size="sm" variant="secondary" onClick={() => onUse(item.template)} aria-label={t("career.plan.createNamed", { title: item.template.title })}>{t("career.plan.create")}</Button>
                      ) : (
                        <Button size="sm" variant="secondary" href={`/tasks/new?modelo=${encodeURIComponent(item.template.id)}`} aria-label={t("career.plan.createNamed", { title: item.template.title })}>{t("career.plan.create")}</Button>
                      )
                    ) : null}
                    {item.taskId ? <Link href={`/tasks/${item.taskId}`}>{t("career.plan.openTask")}</Link> : null}
                  </div>
                </li>
              ))}
            </ol>
            {plan.withoutModel ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("career.plan.withoutModel", { n: plan.withoutModel })}</p> : null}
            <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("career.plan.privacy")}</p>
          </>
        ) : null}
      </div>
    </details>
  );
}
