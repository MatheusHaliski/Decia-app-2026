"use client";
/**
 * Histórico de versões da Mesa (RF22.CA02) com "voltar a esta versão": cada alteração estrutural é uma versão (autor, data e resumo
 * legível); mover cartões no canvas não gera versão (RF22.CA03), mas o ajuste aparece na versão vigente e volta junto com ela —
 * o histórico e as posições andam sincronizados. Voltar gera uma versão NOVA (nada se perde); pede confirmação e só vale para
 * versões com retrato guardado (as anteriores a esta aba, no DEMO, não têm).
 */
import { useState } from "react";
import { Button, Sheet, Tag } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ProjectModel, ProjectSnapshot } from "@/lib/projects/types";
import { versionSummary } from "../common";
import { nameOf, type PeopleDirectory } from "../shared";

export interface VersionHistoryProps {
  model: ProjectModel;
  people: PeopleDirectory;
  /** pode voltar versões (quem edita e com o projeto não arquivado) */
  canRestore: boolean;
  /** retrato guardado de uma versão (repositório); sem ele, a versão não pode ser restaurada */
  snapshotOf?: (n: number) => ProjectSnapshot | undefined;
  onRestore: (n: number, snapshot: ProjectSnapshot) => boolean;
}

export function VersionHistory({ model, people, canRestore, snapshotOf, onRestore }: VersionHistoryProps) {
  const { t, intl } = useI18n();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<number | null>(null);
  const when = new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "short" });
  const versions = [...model.versions].sort((a, b) => b.number - a.number);
  return (
    <>
      <Button size="sm" variant="ghost" icon="acervo" aria-haspopup="dialog" onClick={() => setOpen(true)} data-testid="version-history-open">
        {t("projectPage.history.open", { n: model.version })}
      </Button>
      <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirm(null); }} side="right" title={t("projectPage.history.title")} description={t("projectPage.history.hint")}>
        <ol aria-label={t("projectPage.history.title")} className="grid gap-2" data-version-history>
          {versions.map((v) => {
            const current = v.number === model.version;
            const snap = !current && canRestore ? snapshotOf?.(v.number) : undefined;
            return (
              <li key={v.number} data-version={v.number} className="grid gap-1 border-b border-ws-border pb-2 text-[length:var(--ws-text-body-sm)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-[family-name:var(--ws-font-mono)] font-bold tabular-nums">{t("pm.ctl.history.version", { n: v.number })}</span>
                  {current ? <Tag tone="accent" filled>{t("projectPage.history.current")}</Tag> : null}
                  <span className="min-w-0 flex-1 break-words">{versionSummary(t, v)}</span>
                </div>
                <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
                  {nameOf(people, v.actorId)} · <time dateTime={v.at}>{when.format(new Date(v.at))}</time>
                </p>
                {v.layoutMoves ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted" data-layout-moves>{t("projectPage.history.layoutMoves", { n: v.layoutMoves })}</p> : null}
                {!current && canRestore ? (
                  confirm === v.number ? (
                    <div role="group" aria-label={t("projectPage.history.confirmLabel", { n: v.number })} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft p-2">
                      <p>{t("projectPage.history.confirm", { n: v.number, next: model.version + 1 })}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="primary" onClick={() => {
                          if (snap && onRestore(v.number, snap)) {
                            setConfirm(null);
                            setOpen(false);
                          }
                        }}>{t("projectPage.history.confirmButton", { n: v.number })}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>{t("pm.ui.cancel")}</Button>
                      </div>
                    </div>
                  ) : snap ? (
                    <div><Button size="sm" onClick={() => setConfirm(v.number)} aria-label={t("projectPage.history.restoreOf", { n: v.number })}>{t("projectPage.history.restore")}</Button></div>
                  ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("projectPage.history.noSnapshot")}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </Sheet>
    </>
  );
}
