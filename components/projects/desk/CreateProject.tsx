"use client";
/**
 * Criar projeto (RF5 / RF21 / RF30): em branco, a partir de um modelo (o projeto da aula ou um por tipo de demanda, montado com os
 * modelos de área do Acervo) ou pelo Autopiloto, a partir de uma demanda bruta. Cria no repositório (DEMO: memória desta aba) e
 * abre a Mesa do projeto novo, já com a versão 1 anotada.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, Input, RadioCards, Select, useToast } from "@/components/ui";
import { DEMO_CURRENT_USER_ID } from "@/lib/decia/fixtures";
import { useI18n } from "@/lib/i18n/useI18n";
import { todayIso } from "@/lib/projects/autopilot/dates";
import { blankProject, newProjectId, PROJECT_TEMPLATE_IDS, projectFromTemplate, type ProjectTemplateId } from "@/lib/projects/autopilot/proposal";
import { demoProjectRepository, type CreateProjectResult, type ProjectRepository } from "@/lib/projects/repository";
import { APPROACHES, PROJECT_AREAS, type Approach, type ProjectArea, type ProjectModel } from "@/lib/projects/types";

export interface CreateProjectProps {
  repo?: ProjectRepository;
  actorId?: string;
  now?: () => Date;
  onCreated?: (projectId: string) => void;
}

export function CreateProject({ repo, actorId = DEMO_CURRENT_USER_ID, now = () => new Date(), onCreated }: CreateProjectProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const today = todayIso(now());
  const [blank, setBlank] = useState<{ title: string; area: ProjectArea; approach: Approach; start: string }>({ title: "", area: "SOFTWARE", approach: "HIBRIDO", start: today });
  const [tpl, setTpl] = useState<ProjectTemplateId>("tipo-ti");
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
    <div className="grid gap-[var(--ws-space-3)] lg:grid-cols-3" data-create-project>
      <Card as="section" padding="md" aria-labelledby="new-blank" className="grid content-start gap-3">
        <h3 id="new-blank" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("projectNew.blank.title")}</h3>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("projectNew.blank.hint")}</p>
        <form className="grid gap-3" onSubmit={(e) => {
          e.preventDefault();
          if (!blank.title.trim()) return;
          create((id) => blankProject({ id, title: blank.title, area: blank.area, approach: blank.approach, startDate: blank.start, actorId, now: now() }));
        }}>
          <Field label={t("projectNew.field.title")} required>
            {({ id }) => <Input id={id} value={blank.title} onChange={(e) => setBlank({ ...blank, title: e.target.value })} required />}
          </Field>
          <Field label={t("projectNew.field.area")} hint={t("projectNew.field.areaHint")}>
            {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={blank.area} onChange={(e) => setBlank({ ...blank, area: e.target.value as ProjectArea })} options={PROJECT_AREAS.map((a) => ({ value: a, label: t(`tasks.area.${a}`) }))} />}
          </Field>
          <Field label={t("projectNew.field.approach")}>
            {({ id }) => <Select id={id} value={blank.approach} onChange={(e) => setBlank({ ...blank, approach: e.target.value as Approach })} options={APPROACHES.map((a) => ({ value: a, label: t(`pm.approach.${a}`) }))} />}
          </Field>
          <Field label={t("projectNew.field.start")}>
            {({ id }) => <Input id={id} type="date" value={blank.start} onChange={(e) => e.target.value && setBlank({ ...blank, start: e.target.value })} />}
          </Field>
          <div><Button type="submit" variant="primary" icon="criar-projeto" disabled={!blank.title.trim()}>{t("projectNew.blank.cta")}</Button></div>
        </form>
      </Card>

      <Card as="section" padding="md" aria-labelledby="new-template" className="grid content-start gap-3">
        <h3 id="new-template" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("projectNew.template.title")}</h3>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("projectNew.template.hint")}</p>
        <form className="grid gap-3" onSubmit={(e) => {
          e.preventDefault();
          create((id) => projectFromTemplate(tpl, { id, title: tplTitle, startDate: tplStart, actorId, now: now(), templateLabel: t(`projectNew.template.${tpl}.name`) }));
        }}>
          <RadioCards label={t("projectNew.template.label")} value={tpl} onValueChange={(v) => setTpl(v as ProjectTemplateId)} columns={1}
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
