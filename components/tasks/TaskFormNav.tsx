"use client";
/**
 * Índice do criador de tarefas: preenchimento geral (seções completas ÷ seções exibidas) e um atalho por seção com o estado em texto e
 * marca (✓ completa · ◐ em andamento · ○ vazia · ! com erro) — nunca só por cor. Ativar um atalho rola até a seção e põe o foco nela.
 */
import { Button, PercentBar } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { SectionState, TaskSectionId } from "@/lib/tasks/formRules";

const MARK: Record<SectionState, string> = { done: "✓", partial: "◐", empty: "○", error: "!" };

export const sectionDomId = (id: string) => `task-sec-${id}`;

export function focusSection(id: string) {
  const el = document.getElementById(sectionDomId(id));
  if (!el) return;
  el.scrollIntoView?.({ block: "start", behavior: "smooth" });
  el.focus({ preventScroll: true });
}

export function TaskFormNav({ sections, states, done, total, percent }: {
  sections: readonly TaskSectionId[]; states: Record<TaskSectionId, SectionState>; done: number; total: number; percent: number;
}) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("taskForm.nav.label")} className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-3" data-testid="task-form-nav">
      <PercentBar value={percent} label={t("taskForm.nav.progress", { done, total })} size="sm" />
      <ol className="flex flex-wrap gap-1">
        {sections.map((s, i) => (
          <li key={s} data-section={s} data-state={states[s]}>
            <Button
              size="sm" variant="ghost" onClick={() => focusSection(s)}
              className={states[s] === "error" ? "text-ws-danger-ink" : states[s] === "done" ? "text-ws-success-ink" : undefined}
            >
              <span aria-hidden>{MARK[states[s]]}</span>
              <span>{i + 1}. {t(`taskForm.section.${s}`)}</span>
              <span className="sr-only"> — {t(`taskForm.state.${states[s]}`)}</span>
            </Button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
