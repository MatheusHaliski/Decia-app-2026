"use client";
import { Button, Card, Checkbox, Link, PercentBar } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { STEPS, dismiss, isAutoDone, isStepDone, progressOf, toggleStep } from "./steps";

/**
 * Checklist "Primeiros passos" da tela Hoje: completar o perfil, escolher a profissão, criar a primeira tarefa a partir de um modelo
 * e abrir as Melhorias de um card. Cada passo tem um link; o progresso fica nas preferências (servidor com sessão, aba sem ela).
 * Dispensável: "Dispensar" esconde a lista e "Mostrar primeiros passos" a traz de volta.
 */
export function FirstSteps() {
  const { t } = useI18n();
  const { prefs, update } = usePreferences();
  const { done, total } = progressOf(prefs);

  if (prefs.onboarding.dismissed) {
    return (
      <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">
        <Button variant="ghost" size="sm" onClick={() => update({ onboarding: dismiss(prefs.onboarding, false) })} data-testid="first-steps-restore">
          {t("guide.steps.restore")}
        </Button>
      </p>
    );
  }

  const finished = done === total;
  return (
    <Card
      as="section"
      aria-labelledby="first-steps-title"
      data-testid="first-steps"
      className="grid gap-3"
    >
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 id="first-steps-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("guide.steps.title")}</h2>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{finished ? t("guide.steps.finished") : t("guide.steps.intro")}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => update({ onboarding: dismiss(prefs.onboarding) })} data-testid="first-steps-dismiss">
          {t("guide.steps.dismiss")}
        </Button>
      </div>
      <PercentBar value={(done / total) * 100} label={t("guide.steps.progress", { done, total })} tone={finished ? "success" : "accent"} size="sm" />
      <p className="sr-only" aria-live="polite">{t("guide.steps.progress", { done, total })}</p>
      <ol className="grid gap-2">
        {STEPS.map((s) => {
          const auto = isAutoDone(s.id, prefs);
          const checked = isStepDone(s.id, prefs);
          return (
            <li key={s.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-2" data-step={s.id} data-done={checked || undefined}>
              <Checkbox
                className="min-w-0 flex-1 basis-56"
                checked={checked}
                disabled={auto}
                onCheckedChange={(v) => update({ onboarding: toggleStep(prefs.onboarding, s.id, v) })}
                label={<>{t(`guide.steps.${s.key}.title`)} <span className="text-ws-text-muted">· {checked ? t("guide.steps.done") : t("guide.steps.todo")}</span></>}
                hint={auto ? t("guide.steps.autoHint") : t(`guide.steps.${s.key}.hint`)}
              />
              <Link href={s.href} className="text-[length:var(--ws-text-body-sm)] font-semibold">{t(`guide.steps.${s.key}.cta`)}</Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
