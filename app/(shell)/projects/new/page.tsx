"use client";
// /projects/new — Criar Projeto (RF5/RF20): assistente completo em passos (TAP, partes interessadas, equipe e RACI, abordagem, cronograma,
// orçamento, riscos, governança e acesso, revisão) e, ao lado, os atalhos de sempre — a partir de um modelo (o projeto da aula ou um por
// tipo de demanda, com os modelos de área do Acervo) ou pelo Autopiloto (RF30). O projeto nasce no repositório DEMO desta aba e abre
// na Mesa (RF22).
import { CreateProject } from "@/components/projects/desk/CreateProject";
import { ProjectWizard } from "@/components/projects/wizard/ProjectWizard";
import { RfPage } from "@/components/shell/RfPage";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/projects/new")!;

export default function Page() {
  const { t } = useI18n();
  return (
    <RfPage page={PAGE} noEmpty>
      <div className="grid gap-[var(--ws-space-6)]">
        <ProjectWizard />
        <section aria-labelledby="new-shortcuts" className="grid gap-[var(--ws-space-3)]">
          <h2 id="new-shortcuts" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("projectForm.shortcuts")}</h2>
          <CreateProject hideBlank />
        </section>
      </div>
    </RfPage>
  );
}
