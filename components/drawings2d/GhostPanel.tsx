"use client";
/**
 * Painel da prévia fantasma (RF74 sobre RF51): modo de autonomia, pedido explícito, lista das mudanças propostas com
 * aceitar/rejeitar uma a uma ou todas, lote revisado no modo Assistido e o motivo de cada recusa automática. Na lista,
 * Enter aceita a sugestão em foco e Escape a rejeita; Tab segue a navegação normal (RF74.CA08).
 */
import type { KeyboardEvent } from "react";
import { Badge, Button, Card, Input, Select, Tag, cn } from "@/components/ui";
import { AUTONOMY_MODES, type AutonomyMode } from "@/lib/ai/autonomy";
import { explainRefusal, regionNames } from "@/lib/drawings2d/explain";
import { pendingItems, type GhostItem } from "@/lib/drawings2d/ghost";
import { SparkMark } from "./icons";
import type { EditorModel } from "./useEditorModel";

const CAPTION = "text-[length:var(--ws-text-caption)] text-ws-text-muted";

export function GhostPanel({ m }: { m: EditorModel }) {
  const { t, doc, explain, proposal, policy, caps } = m;
  if (!doc || !explain) return null;
  const pending = pendingItems(proposal);
  const pendingIds = pending.map((i) => i.suggestion.id);
  const layerName = (id: string) => doc.layers.find((l) => l.id === id)?.name ?? id;

  const status = (item: GhostItem) => {
    if (item.status === "PENDENTE") return t("drw2d.ghost.status.PENDENTE");
    const reason = item.reason ? ` ${explainRefusal(item.reason, explain)}` : "";
    return `${t(`drw2d.ghost.status.${item.status}`)}${item.status === "RECUSADA" ? reason : ""}`;
  };
  const onItemKey = (e: KeyboardEvent<HTMLLIElement>, item: GhostItem) => {
    if (e.target !== e.currentTarget || item.status !== "PENDENTE") return;
    if (e.key === "Enter") {
      e.preventDefault();
      m.accept([item.suggestion.id]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      m.reject([item.suggestion.id]);
    }
  };

  return (
    <Card as="section" padding="sm" aria-labelledby="drw2d-ghost-h" className="border-ws-ai-spark" data-testid="ghost-panel">
      <h3 id="drw2d-ghost-h" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body)] font-semibold">
        <SparkMark className="mr-1" />
        {t("drw2d.ghost.title")}
      </h3>
      <p className={cn(CAPTION, "mb-2")}>{t("drw2d.ghost.heuristic")}</p>
      <div className="grid gap-1.5">
        <Select
          aria-label={t("drw2d.ghost.mode")}
          value={policy.mode}
          onChange={(e) => m.changeModeTo(e.target.value as AutonomyMode)}
          data-testid="ghost-mode"
          options={AUTONOMY_MODES.map((mode) => ({ value: mode, label: mode === "AGENTE" ? t("drw2d.ghost.agentOption", { mode: t(`aiAutonomy.${mode}`) }) : t(`aiAutonomy.${mode}`), disabled: mode === "AGENTE" && policy.mode !== "AGENTE" }))}
        />
        <p className={CAPTION}>{t(`aiAutonomy.${policy.mode}Hint`)} {t("drw2d.ghost.policyVersion", { version: policy.version })}</p>
        {caps.unavailable ? (
          <p className="rounded-[var(--ws-radius-sm)] bg-ws-warning-soft px-2 py-1 text-[length:var(--ws-text-caption)] text-ws-warning-ink" data-testid="ghost-unavailable">
            {t(caps.unavailable === "AGENTE" ? "drw2d.ghost.agentUnavailable" : "drw2d.ghost.manualOff")}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="spark" onClick={m.requestSuggestions} disabled={!caps.onRequest} data-testid="ghost-request">
            <SparkMark />
            {t("drw2d.ghost.request")}
          </Button>
          {caps.spontaneous ? <Badge tone="spark">{t("drw2d.ghost.auto")}</Badge> : null}
        </div>
        <label className="grid gap-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">
          <span>{t("drw2d.ghost.opacity", { value: m.ghostOpacity })}</span>
          <Input type="range" min={20} max={80} step={5} value={m.ghostOpacity} onChange={(e) => m.setGhostOpacity(Number(e.target.value))} className="min-h-0 px-0" />
        </label>
      </div>

      {proposal ? (
        <div className="mt-2 grid gap-2">
          <p className={CAPTION} data-testid="ghost-meta">
            {t("drw2d.ghost.meta", { revision: proposal.baseRevision, version: proposal.policyVersion, pending: pending.length, total: proposal.items.length })}
          </p>
          {proposal.items.length ? (
            <ol className="grid gap-1.5" aria-label={t("drw2d.ghost.list")}>
              {proposal.items.map((item, idx) => {
                const s = item.suggestion;
                const open = item.status === "PENDENTE";
                return (
                  <li
                    key={s.id}
                    tabIndex={open ? 0 : -1}
                    onKeyDown={(e) => onItemKey(e, item)}
                    aria-label={`${idx + 1}. ${m.labelText(s.label)} — ${status(item)}`}
                    className={cn(
                      "grid gap-1 rounded-[var(--ws-radius-sm)] border p-2 text-[length:var(--ws-text-body-sm)] focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]",
                      open ? "border-ws-ai-spark bg-ws-ai-spark-soft" : "border-ws-border bg-ws-surface-2 opacity-80",
                    )}
                    data-testid={`ghost-item-${s.id}`}
                    data-status={item.status}
                  >
                    <div className="flex items-start gap-2">
                      <Badge tone="spark" className="shrink-0">✦ {idx + 1}</Badge>
                      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{m.labelText(s.label)}</span>
                    </div>
                    <p className={CAPTION}>{t(`drw2d.sug.kind.${s.kind}`)} · {layerName(s.layerId)} · {regionNames(explain.state, s.regionIds)}</p>
                    {open ? (
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="spark" onClick={() => m.accept([s.id])} aria-label={t("drw2d.ghost.acceptAria", { n: idx + 1 })}>{t("drw2d.ghost.accept")}</Button>
                        <Button size="sm" variant="ghost" onClick={() => m.reject([s.id])} aria-label={t("drw2d.ghost.rejectAria", { n: idx + 1 })}>{t("drw2d.ghost.reject")}</Button>
                      </div>
                    ) : (
                      <p className="text-[length:var(--ws-text-caption)]">
                        <Tag tone={item.status === "ACEITA" ? "success" : item.status === "RECUSADA" ? "danger" : "neutral"}>{t(`drw2d.ghost.status.${item.status}`)}</Tag>
                        {item.status === "RECUSADA" && item.reason ? <span className="ml-1 text-ws-text-muted">{explainRefusal(item.reason, explain)}</span> : null}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={CAPTION}>{t("drw2d.ghost.none")}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {caps.batch ? (
              <Button size="sm" variant="spark" onClick={m.applyAssisted} disabled={!pending.length} data-testid="ghost-assisted">{t("drw2d.ghost.applyAssisted")}</Button>
            ) : null}
            <Button size="sm" onClick={() => m.accept(pendingIds)} disabled={!pending.length} data-testid="ghost-accept-all">{t("drw2d.ghost.acceptAll")}</Button>
            <Button size="sm" variant="ghost" onClick={() => m.reject(pendingIds)} disabled={!pending.length}>{t("drw2d.ghost.rejectAll")}</Button>
          </div>
          {caps.batch ? <p className={CAPTION}>{t("drw2d.ghost.assistedHint")}</p> : null}
        </div>
      ) : (
        <p className={cn(CAPTION, "mt-2")}>{t(caps.spontaneous ? "drw2d.ghost.waiting" : "drw2d.ghost.empty")}</p>
      )}
    </Card>
  );
}
