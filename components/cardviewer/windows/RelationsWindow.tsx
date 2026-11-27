"use client";
/**
 * Janela "Relações": o que está ligado ao card — tarefas e projetos (abrem no próprio visualizador), dependências, decisões do DECIA,
 * chancelas e o modelo/fonte de origem. Só o que os dados têm; o que a API ainda não expõe aparece como "sem dados", nunca inventado.
 */
import type { ReactNode } from "react";
import { Button, Link, Tag } from "@/components/ui";
import { isHttpsUrl } from "@/lib/cardviewer/files";
import { originGroup } from "@/lib/cardviewer/subject";
import type { ViewerKind } from "@/lib/cardviewer/url";
import { linkedDecisions, useDecisions } from "@/lib/decia/repository";
import { useDecisionSource } from "@/lib/decia/useDecisionRepository";
import { useI18n } from "@/lib/i18n/useI18n";
import { taskById } from "@/lib/social/rules";
import { useViewerData } from "../context";
import { openCardViewer } from "../open";

function Group({ title, children, empty }: { title: string; children?: ReactNode; empty?: boolean }) {
  const { t } = useI18n();
  return (
    <section className="grid gap-1.5" aria-label={title}>
      <h4 className="text-[length:var(--ws-text-caption)] font-semibold uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{title}</h4>
      {empty ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-faint">{t("cardviewer.rel.none")}</p> : <ul className="grid gap-1 text-[length:var(--ws-text-body-sm)]">{children}</ul>}
    </section>
  );
}

function OpenCard({ kind, id, label }: { kind: ViewerKind; id: string; label: string }) {
  const { t } = useI18n();
  return (
    <Button size="sm" variant="ghost" className="h-auto min-h-0 justify-start whitespace-normal py-1 text-left" aria-label={t("cardviewer.rel.openIn", { title: label })} onClick={(e) => openCardViewer({ kind, id }, e.currentTarget)}>
      <span aria-hidden>{kind === "tarefa" ? "▤ " : "◫ "}</span>{label}
    </Button>
  );
}

/** Decisões da fonte única (API com sessão, DEMO no laboratório): a de origem do card e as que têm vínculo de trabalho com ele. */
function Decisions({ ids: origin, linkedTo }: { ids: readonly string[]; linkedTo?: { type: "TAREFA" | "PROJETO"; id: string } }) {
  const { t } = useI18n();
  const { repo } = useDecisionSource();
  const list = useDecisions(repo);
  const linked = linkedTo ? linkedDecisions(list, linkedTo.type, linkedTo.id).map((a) => a.decision.id) : [];
  const ids = [...new Set([...origin, ...linked])];
  return (
    <Group title={t("cardviewer.rel.decisions")} empty={!ids.length}>
      {ids.map((id) => {
        const d = repo.get(id)?.decision;
        return (
          <li key={id} className="flex flex-wrap items-center gap-1.5">
            <Link href={`/decia/decisoes/${id}`}>{d?.title ?? id}</Link>
            {d ? <Tag tone={d.status === "DECIDIDA" || d.status === "RESOLVIDA" ? "success" : "info"}>{t(`decia.status.${d.status}`)}</Tag> : null}
          </li>
        );
      })}
    </Group>
  );
}

export function RelationsWindow() {
  const { t } = useI18n();
  const { task, project } = useViewerData();

  if (task) {
    const s = task.subject;
    const social = task.social?.state;
    const projects = social ? social.projects.filter((p) => p.taskIds.includes(s.id)) : [];
    const remixes = social ? social.remixes.filter((r) => r.sourceType === "TASK" && r.sourceId === s.id) : [];
    const original = social && s.originalTaskId ? taskById(social, s.originalTaskId) : undefined;
    const decisionIds = s.sourceKind === "DECIA" && s.sourceRef ? [s.sourceRef] : [];
    return (
      <div className="grid gap-4" data-testid="window-relacoes">
        <Group title={t("cardviewer.rel.origin")}>
          <li>{t(`cardviewer.origin.${s.sourceKind ? originGroup(s.sourceKind) : "MANUAL"}`)}{s.linkMode ? ` · ${t(`cardviewer.linkMode.${s.linkMode}`)}` : ""}</li>
          {original ? <li><OpenCard kind="tarefa" id={original.id} label={t("cardviewer.rel.remixOf", { title: original.title })} /></li> : null}
          {s.sourceRef && !original && s.sourceKind !== "DECIA" ? <li className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] [overflow-wrap:anywhere]">{s.sourceRef}</li> : null}
        </Group>
        <Group title={t("cardviewer.rel.dependencies")} empty={!s.blockedByTaskId}>
          {s.blockedByTaskId ? <li><OpenCard kind="tarefa" id={s.blockedByTaskId} label={t("cardviewer.rel.blockedBy", { id: s.blockedByTaskId.slice(0, 8) })} /></li> : null}
        </Group>
        <Group title={t("cardviewer.rel.projects")} empty={!projects.length}>
          {projects.map((p) => <li key={p.id}><OpenCard kind="projeto" id={p.id} label={p.title} /></li>)}
        </Group>
        {social ? (
          <Group title={t("cardviewer.rel.remixes")} empty={!remixes.length}>
            {remixes.map((r) => { const x = taskById(social, r.resultId); return x ? <li key={r.id}><OpenCard kind="tarefa" id={x.id} label={x.title} /></li> : null; })}
          </Group>
        ) : null}
        <Decisions ids={decisionIds} linkedTo={{ type: "TAREFA", id: s.id }} />
        <Group title={t("cardviewer.rel.seals")} empty={!s.seals.length}>
          {s.seals.map((x) => <li key={x.label}><Tag tone="success"><span aria-hidden>◆ </span>{t(`cardviewer.rel.seal.${x.issuer === "EMPRESA" ? "EMPRESA" : "CHEFE"}`, { label: x.label })}</Tag></li>)}
        </Group>
        <Group title={t("cardviewer.rel.references")} empty={!s.references.some((r) => isHttpsUrl(r.url))}>
          {s.references.filter((r) => isHttpsUrl(r.url)).map((r) => <li key={r.url}><Link href={r.url} target="_blank" rel="noopener noreferrer">{r.label || r.url}</Link></li>)}
        </Group>
        {!task.social ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("cardviewer.rel.apiNote")}</p> : null}
      </div>
    );
  }

  if (project) {
    const p = project.subject;
    if (p.variant === "MURAL") {
      const pr = p.project;
      return (
        <div className="grid gap-4" data-testid="window-relacoes">
          <Group title={t("cardviewer.rel.origin")}><li>{t(`cardviewer.schemeOrigin.${pr.origin}`)}</li></Group>
          <Group title={t("cardviewer.rel.tasks")} empty={!pr.taskIds.length}>
            {pr.taskIds.map((id) => { const x = taskById(p.state, id); return x ? <li key={id}><OpenCard kind="tarefa" id={id} label={x.title} /></li> : null; })}
          </Group>
          {pr.originalProjectId ? <Group title={t("cardviewer.rel.remixOrigin")}><li><OpenCard kind="projeto" id={pr.originalProjectId} label={p.state.projects.find((x) => x.id === pr.originalProjectId)?.title ?? pr.originalProjectId} /></li></Group> : null}
          <Group title={t("cardviewer.rel.seals")} empty={!pr.seals.length}>
            {pr.seals.map((x) => <li key={x.label}><Tag tone="success"><span aria-hidden>◆ </span>{t(`cardviewer.rel.seal.${x.issuer}`, { label: x.label })}</Tag></li>)}
          </Group>
        </div>
      );
    }
    const m = p.model;
    const code = (id: string) => m.tasks.find((x) => x.id === id)?.code ?? id;
    return (
      <div className="grid gap-4" data-testid="window-relacoes">
        <Group title={t("cardviewer.rel.origin")}>
          <li>{m.origin ? t(`cardviewer.schemeOrigin.${m.origin.kind}`) : t("cardviewer.schemeOrigin.CRIAR_PROJETO")}{m.origin?.label ? ` · ${m.origin.label}` : ""}</li>
          {(m.origin?.credits ?? []).map((c) => <li key={c.id}>{t("cardviewer.rel.templateCredit", { title: c.title })}</li>)}
        </Group>
        <Decisions ids={m.decisionIds} linkedTo={{ type: "PROJETO", id: m.id }} />
        <Group title={t("cardviewer.rel.gates")} empty={!m.gates.length}>
          {m.gates.map((g) => <li key={g.phase} className="flex flex-wrap items-center gap-1.5">{t(`pm.phase.${g.phase}`)} <Tag tone={g.outcome === "APROVADO" ? "success" : g.outcome === "PENDENTE" ? "neutral" : "warning"}>{t(`pm.gateOutcome.${g.outcome}`)}</Tag></li>)}
        </Group>
        <Group title={t("cardviewer.rel.dependencies")} empty={!m.dependencies.length}>
          {m.dependencies.slice(0, 12).map((d) => <li key={d.id} className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)]">{t("cardviewer.rel.dep", { from: code(d.from), to: code(d.to), type: d.type, lag: d.lagDays })}</li>)}
          {m.dependencies.length > 12 ? <li className="text-ws-text-muted">{t("cardviewer.rel.more", { n: m.dependencies.length - 12 })}</li> : null}
        </Group>
        <Group title={t("cardviewer.rel.changes")} empty={!m.changes.length}>
          {m.changes.map((c) => <li key={c.id} className="flex flex-wrap items-center gap-1.5"><span className="font-[family-name:var(--ws-font-mono)]">{c.code}</span> {c.title} <Tag>{t(`pm.changeStatus.${c.status}`)}</Tag></li>)}
        </Group>
        <Group title={t("cardviewer.rel.tasks")} empty={!m.tasks.length}>
          {m.tasks.slice(0, 15).map((x) => <li key={x.id}><span className="font-[family-name:var(--ws-font-mono)] text-ws-text-muted">{x.code}</span> {x.title} · <span className="text-ws-text-muted">{t(`pm.status.${x.status}`)}</span></li>)}
          {m.tasks.length > 15 ? <li className="text-ws-text-muted">{t("cardviewer.rel.more", { n: m.tasks.length - 15 })}</li> : null}
        </Group>
      </div>
    );
  }
  return null;
}
