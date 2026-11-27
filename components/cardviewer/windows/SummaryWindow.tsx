"use client";
/**
 * Janela "Resumo preciso": os fatos calculados pelo sistema (D-12) — estado, prioridade, responsável, prazos com dias restantes,
 * versão, origem, classificação, critérios; no projeto, fase, % concluído, próximo marco, caminho crítico, IDC/IDP/EAC, riscos e
 * mudanças. Cada fato diz "de onde vem". Nada é estimado aqui.
 */
import { PercentBar, Tag } from "@/components/ui";
import { DEADLINE_MARK, formatIsoDate } from "@/lib/tasks/legalDeadline";
import { formatDateTime } from "@/lib/tasks/files";
import { projectFacts, taskFacts, type Fact } from "@/lib/cardviewer/subject";
import { useI18n } from "@/lib/i18n/useI18n";
import { useViewerData } from "../context";

function FactValue({ f }: { f: Fact }) {
  const { t, intl } = useI18n();
  switch (f.type) {
    case "label": return <>{t(f.key, f.vars)}</>;
    case "text": return <span className="[overflow-wrap:anywhere]">{f.text}</span>;
    case "date": return <>{f.date ? (f.date.length > 10 ? formatDateTime(f.date, intl) : formatIsoDate(f.date, intl)) : "—"}</>;
    case "list": return f.items.length ? <span className="font-[family-name:var(--ws-font-mono)] [overflow-wrap:anywhere]">{f.items.join(" → ")}</span> : <>—</>;
    case "number": {
      if (f.value === null) return <span className="text-ws-text-muted">{t("cardviewer.fact.noData")}</span>;
      const nf = f.money
        ? new Intl.NumberFormat(intl, { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
        : new Intl.NumberFormat(intl, { minimumFractionDigits: f.digits, maximumFractionDigits: f.digits });
      return <>{nf.format(f.value)}</>;
    }
    case "progress":
      if (f.percent === null) return <span className="text-ws-text-muted">{t("cardviewer.fact.noCriteria")}</span>;
      return <PercentBar value={f.percent} size="sm" label={t("cardviewer.fact.progressOf", { done: f.done, total: f.total })} />;
    case "deadline": {
      const date = formatIsoDate(f.date, intl);
      if (f.status === "FECHADA") return <>{date} · <span className="text-ws-text-muted">{t("cardviewer.days.closed")}</span></>;
      const tone = f.status === "VENCIDA" ? "danger" : f.status === "HOJE" || f.days <= 3 ? "warning" : f.status === "PROXIMA" ? "info" : "neutral";
      const label = f.status === "VENCIDA" ? t("cardviewer.days.overdue", { n: -f.days }) : f.status === "HOJE" ? t("cardviewer.days.today") : t("cardviewer.days.left", { n: f.days });
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {f.legal ? <span aria-hidden>⚖</span> : null}{date}
          <Tag tone={tone}><span aria-hidden>{DEADLINE_MARK[f.status]}</span>{label}</Tag>
        </span>
      );
    }
  }
}

export function SummaryWindow() {
  const { t } = useI18n();
  const { task, project, today } = useViewerData();
  const facts = task ? taskFacts(task.subject, today) : project ? projectFacts(project.subject, today) : [];
  return (
    <div className="grid gap-3" data-testid="window-resumo">
      <dl className="grid gap-2.5">
        {facts.map((f) => (
          <div key={f.id} className="grid gap-0.5 border-b border-ws-border pb-2 last:border-b-0" data-fact={f.id}>
            <dt className="text-[length:var(--ws-text-caption)] font-semibold text-ws-text-muted">{t(`cardviewer.fact.${f.id}`)}</dt>
            <dd className="text-[length:var(--ws-text-body-sm)]"><FactValue f={f} /></dd>
            <dd className="text-[length:var(--ws-text-caption)] text-ws-text-faint" data-from><span aria-hidden>↳ </span><span className="sr-only">{t("cardviewer.from.label")}: </span>{t(f.from)}</dd>
          </div>
        ))}
      </dl>
      {task?.subject.state === "BLOQUEADA" && task.subject.blockReason ? (
        <p className="rounded-[var(--ws-radius-sm)] bg-ws-danger-soft px-2 py-1 text-[length:var(--ws-text-caption)] text-ws-danger-ink"><span aria-hidden>⊘ </span>{t("cardviewer.blocked", { reason: task.subject.blockReason })}</p>
      ) : null}
      {task && task.subject.criteria.length ? (
        <details className="text-[length:var(--ws-text-body-sm)]">
          <summary className="cursor-pointer font-semibold">{t("cardviewer.criteriaList", { n: task.subject.criteria.length })}</summary>
          <ul className="mt-1 grid gap-1">
            {task.subject.criteria.map((c, i) => <li key={i}><span aria-hidden>{c.done ? "☑ " : "☐ "}</span><span className="sr-only">{t(c.done ? "cardviewer.criterionDone" : "cardviewer.criterionOpen")}: </span>{c.text}</li>)}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
