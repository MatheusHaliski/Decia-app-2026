"use client";
/**
 * Criar projeto (RF5 / RF21 / RF30): em branco, a partir de um modelo (o projeto da aula ou um por tipo de demanda, montado com os
 * modelos de área do Acervo) ou pelo Autopiloto, a partir de uma demanda bruta. Cria no repositório (DEMO: memória desta aba) e
 * abre a Mesa do projeto novo, já com a versão 1 anotada.
 * Com profissão preferida (só da própria pessoa, D-147), a área e o modelo já vêm pela categoria da profissão (`areaDefaults.ts`):
 * engenharia → obra, administração → contratação, jurídico → ato normativo, TI → sistema; fora de TI a Mesa não cobra a governança de TI.
 * "Criar em branco" desabilitado diz por quê, visível e ligado ao botão por `aria-describedby`.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Field, Input, RadioCards, Select, Tag, useToast } from "@/components/ui";
import { DEMO_CURRENT_USER_ID } from "@/lib/decia/fixtures";
import { useI18n } from "@/lib/i18n/useI18n";
import { todayIso } from "@/lib/projects/autopilot/dates";
import { blankProject, newProjectId, PROJECT_TEMPLATE_IDS, projectFromTemplate, type ProjectTemplateId } from "@/lib/projects/autopilot/proposal";
import { demoProjectRepository, type CreateProjectResult, type ProjectRepository } from "@/lib/projects/repository";
import { APPROACHES, isItProject, PROJECT_AREAS, type Approach, type ProjectArea, type ProjectModel } from "@/lib/projects/types";
import { useOptionalPreferences } from "@/lib/preferences/PreferencesProvider";
import { GENERIC_DEFAULTS, projectDefaultsFor, templateAreaOverride } from "./areaDefaults";

export interface CreateProjectProps {
  repo?: ProjectRepository;
  actorId?: string;
  now?: () => Date;
  onCreated?: (projectId: string) => void;
  /** sem o cartão "Em branco" (em `/projects/new` o assistente completo faz esse papel) */
  hideBlank?: boolean;
}

/** Marca de que a sugestão veio da profissão preferida (só a própria pessoa vê; trocável). */
function FromOccupation() {
  const { t } = useI18n();
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-[length:var(--ws-text-caption)]" data-testid="from-occupation">
      <Tag tone="accent"><span aria-hidden>🔒</span>{t("career.fromProfession")}</Tag>
      <span className="text-ws-text-muted">{t("profissao2.desk.fromOccupationHint")}</span>
    </p>
  );
}

export function CreateProject({ repo, actorId = DEMO_CURRENT_USER_ID, now = () => new Date(), onCreated, hideBlank }: CreateProjectProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const today = todayIso(now());
  const prefs = useOptionalPreferences();
  const occupation = prefs?.prefs.preferredOccupation ?? null;
  const defaults = occupation ? projectDefaultsFor(occupation) : GENERIC_DEFAULTS;
  const [blank, setBlank] = useState<{ title: string; area: ProjectArea; approach: Approach; start: string }>({ title: "", area: defaults.area, approach: defaults.approach, start: today });
  const [tpl, setTpl] = useState<ProjectTemplateId>(defaults.template);
  // as preferências chegam depois do 1º render: enquanto a pessoa não escolheu, a área e o modelo seguem a profissão
  const touched = useRef({ area: false, tpl: false });
  useEffect(() => {
    if (!touched.current.area) setBlank((b) => ({ ...b, area: defaults.area, approach: defaults.approach }));
    if (!touched.current.tpl) setTpl(defaults.template);
  }, [defaults.area, defaults.approach, defaults.template]);
  const blankReason = blank.title.trim() ? null : t("profissao2.desk.blankReason");
  const [tplTitle, setTplTitle] = useState("");
  const [tplStart, setTplStart] = useState(today);

  const create = (build: (id: string) => ProjectModel) => {
    const store = repo ?? demoProjectRepository();
    if (!store.create) {
      toast({ title: t("projectNew.error"), tone: "erro" });
      return;
    }
    const r: CreateProjectResult = store.create(build(newProjectId("p", now())));
    if (!r.ok) {
      toast({ title: t("projectNew.error"), description: r.error, tone: "erro" });
      return;
    }
    toast({ title: t("projectNew.created", { title: r.model.title }), tone: "sucesso" });
    (onCreated ?? ((id: string) => router.push(`/projects/${id}/edit`)))(r.model.id);
  };

  return (
    <div className={hideBlank ? "grid gap-[var(--ws-space-3)] lg:grid-cols-2" : "grid gap-[var(--ws-space-3)] lg:grid-cols-3"} data-create-project>
      {hideBlank ? null : <Card as="section" padding="md" aria-labelledby="new-blank" className="grid content-start gap-3">
        <h3 id="new-blank" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("projectNew.blank.title")}</h3>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("projectNew.blank.hint")}</p>
        <form className="grid gap-3" onSubmit={(e) => {
          e.preventDefault();
          if (blankReason) return;
          create((id) => blankProject({ id, title: blank.title, area: blank.area, approach: blank.approach, startDate: blank.start, actorId, now: now() }));
        }}>
          <Field label={t("projectNew.field.title")} required>
            {({ id }) => <Input id={id} value={blank.title} onChange={(e) => setBlank({ ...blank, title: e.target.value })} required />}
          </Field>
          <Field label={t("projectNew.field.area")} hint={t("projectNew.field.areaHint")}>
            {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={blank.area} onChange={(e) => { touched.current.area = true; setBlank({ ...blank, area: e.target.value as ProjectArea }); }} options={PROJECT_AREAS.map((a) => ({ value: a, label: t(`tasks.area.${a}`) }))} data-testid="blank-area" />}
          </Field>
          {defaults.fromOccupation && blank.area === defaults.area ? <FromOccupation /> : null}
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid="blank-governance">
            {t(isItProject({ area: blank.area }) ? "profissao2.desk.governanceIt" : "profissao2.desk.governanceOther")}
          </p>
          <Field label={t("projectNew.field.approach")}>
            {({ id }) => <Select id={id} value={blank.approach} onChange={(e) => setBlank({ ...blank, approach: e.target.value as Approach })} options={APPROACHES.map((a) => ({ value: a, label: t(`pm.approach.${a}`) }))} />}
          </Field>
          <Field label={t("projectNew.field.start")}>
            {({ id }) => <Input id={id} type="date" value={blank.start} onChange={(e) => e.target.value && setBlank({ ...blank, start: e.target.value })} />}
          </Field>
          <div className="grid gap-1">
            <div><Button type="submit" variant="primary" icon="criar-projeto" disabled={!!blankReason} aria-describedby={blankReason ? "new-blank-reason" : undefined}>{t("projectNew.blank.cta")}</Button></div>
            {blankReason ? <p id="new-blank-reason" className="text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid="blank-reason"><span aria-hidden>ⓘ </span>{blankReason}</p> : null}
          </div>
        </form>
      </Card>}

      <Card as="section" padding="md" aria-labelledby="new-template" className="grid content-start gap-3">
        <h3 id="new-template" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("projectNew.template.title")}</h3>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("projectNew.template.hint")}</p>
        <form className="grid gap-3" onSubmit={(e) => {
          e.preventDefault();
          create((id) => {
            const model = projectFromTemplate(tpl, { id, title: tplTitle, startDate: tplStart, actorId, now: now(), templateLabel: t(`projectNew.template.${tpl}.name`) });
            const area = templateAreaOverride(tpl, defaults);
            return area ? { ...model, area } : model;
          });
        }}>
          {defaults.fromOccupation && tpl === defaults.template ? <FromOccupation /> : null}
          <RadioCards label={t("projectNew.template.label")} value={tpl} onValueChange={(v) => { touched.current.tpl = true; setTpl(v as ProjectTemplateId); }} columns={1}
            options={PROJECT_TEMPLATE_IDS.map((id) => ({ value: id, label: t(`projectNew.template.${id}.name`), hint: t(`projectNew.template.${id}.hint`) }))} />
          <Field label={t("projectNew.field.title")} hint={t("projectNew.template.titleHint", { name: t(`projectNew.template.${tpl}.name`) })}>
            {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={tplTitle} onChange={(e) => setTplTitle(e.target.value)} />}
          </Field>
          {tpl !== "aula-decia" ? (
            <Field label={t("projectNew.field.start")}>
              {({ id }) => <Input id={id} type="date" value={tplStart} onChange={(e) => e.target.value && setTplStart(e.target.value)} />}
            </Field>
          ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("projectNew.template.aulaDates")}</p>}
          <div><Button type="submit" variant="primary" icon="criar-projeto">{t("projectNew.template.cta")}</Button></div>
        </form>
      </Card>

      <Card as="section" padding="md" aria-labelledby="new-autopilot" className="grid content-start gap-3">
        <h3 id="new-autopilot" className="flex items-center gap-2 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">
          <span aria-hidden className="text-ws-ai-spark-ink">✦</span>{t("projectNew.autopilot.title")}
        </h3>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("projectNew.autopilot.hint")}</p>
        <ul className="grid list-disc gap-1 pl-5 text-[length:var(--ws-text-body-sm)]">
          <li>{t("projectNew.autopilot.p1")}</li>
          <li>{t("projectNew.autopilot.p2")}</li>
          <li>{t("projectNew.autopilot.p3")}</li>
        </ul>
        <div><Button variant="spark" href="/autopilot">{t("projectNew.autopilot.cta")}</Button></div>
      </Card>
    </div>
  );
}
