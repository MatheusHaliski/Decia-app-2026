"use client";
import { RfPage } from "@/components/shell/RfPage";
import { DailyTask } from "@/components/tasks/DailyTask";
import { Glyph, Link, type GlyphName } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";
import { FirstSteps } from "./FirstSteps";

const PAGE = pageByRoute("/today")!;

interface Shortcut { id: string; href: string; glyph: GlyphName }
/** Atalhos da tela Hoje; o Mural fica por último, como segunda opção de entrada. */
export const TODAY_SHORTCUTS: readonly Shortcut[] = [
  { id: "newTask", href: "/tasks/new", glyph: "criar-tarefa" },
  { id: "tasks", href: "/tasks", glyph: "acervo" },
  { id: "desk", href: "/desk", glyph: "mesa" },
  { id: "decia", href: "/decia", glyph: "sessao-decia" },
  { id: "mural", href: "/mural", glyph: "mural" },
];

/**
 * Tela "Hoje" (home de quem tem sessão): a Tarefa do Dia (components/tasks/DailyTask, RF44), os primeiros passos (dispensáveis,
 * guardados nas preferências) e atalhos para o que mais se usa — com o Mural como segunda opção.
 */
export function TodayView() {
  const { t } = useI18n();
  return (
    <RfPage page={PAGE} noEmpty hideCas>
      <div className="grid gap-[var(--ws-space-5)] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-[var(--ws-space-5)]">
          <DailyTask />
          <FirstSteps />
        </div>
        <nav aria-labelledby="today-shortcuts" className="grid content-start gap-2">
          <h2 id="today-shortcuts" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("guide.today.shortcuts")}</h2>
          <ul className="grid gap-2">
            {TODAY_SHORTCUTS.map((s) => (
              <li key={s.id}>
                <Link href={s.href} variant="card" className="flex items-center gap-3 border border-ws-border p-3 hover:border-ws-accent" data-testid={`today-shortcut-${s.id}`}>
                  <Glyph name={s.glyph} variant="clay" size={36} decorative />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{t(`guide.today.shortcut.${s.id}`)}</span>
                    <span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`guide.today.shortcut.${s.id}Hint`)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </RfPage>
  );
}
