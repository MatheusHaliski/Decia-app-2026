"use client";
/**
 * Painel da prévia fantasma no editor 3D (RF74 sobre RF51): modo de autonomia, pedido explícito, opacidade, lista das mudanças
 * propostas com aceitar/rejeitar uma a uma ou todas, lote do modo Assistido e o motivo de cada recusa automática. Na lista,
 * Enter aceita a sugestão em foco e Escape a rejeita; Tab segue a navegação normal (RF74.CA08).
 */
import type { KeyboardEvent } from "react";
import { Badge, Button, Card, Input, Select, Tag, cn } from "@/components/ui";
import { AUTONOMY_MODES, type AutonomyMode } from "@/lib/ai/autonomy";
import { pendingItems3D, type Ghost3DItem } from "@/lib/drawings3d/ghost";
import type { Ghost3D } from "@/lib/drawings3d/useGhost3D";
import { useI18n } from "@/lib/i18n/useI18n";

const CAPTION = "text-[length:var(--ws-text-caption)] text-ws-text-muted";
const Spark = () => <span aria-hidden className="mr-1 text-ws-ai-spark-ink">✦</span>;

export function GhostPanel3D({ g }: { g: Ghost3D }) {
  const { t } = useI18n();
  const { proposal, policy, caps } = g;
  const pending = pendingItems3D(proposal);
  const pendingIds = pending.map((i) => i.suggestion.id);

  const status = (item: Ghost3DItem) => {
    const reason = item.status === "RECUSADA" && item.reason ? `: ${g.refusalText(item.reason)}` : "";
    return `${t(`d3.ghost.status.${item.status}`)}${reason}`;
  };
  const onItemKey = (e: KeyboardEvent<HTMLLIElement>, item: Ghost3DItem) => {
    if (e.target !== e.currentTarget || item.status !== "PENDENTE") return;
    if (e.key !== "Enter" && e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation(); // Escape não limpa a seleção do editor
    if (e.key === "Enter") g.accept([item.suggestion.id]);
    else g.reject([item.suggestion.id]);
  };

  return (
    <Card as="section" padding="sm" aria-labelledby="d3-ghost-h" className="border-ws-ai-spark" data-testid="d3-ghost-panel">
      <h2 id="d3-ghost-h" className="text-[length:var(--ws-text-body-sm)] font-semibold">
        <Spark />
        {t("d3.ghost.title")}
      </h2>
      <p className={cn(CAPTION, "mb-2")}>{t("d3.ghost.heuristic")}</p>
      <div className="grid gap-1.5">
        <Select
          aria-label={t("d3.ghost.mode")}
          value={policy.mode}
          onChange={(e) => g.changeModeTo(e.target.value as AutonomyMode)}
          data-testid="d3-ghost-mode"
          options={AUTONOMY_MODES.map((mode) => ({
            value: mode,
            label: mode === "AGENTE" ? t("d3.ghost.agentOption", { mode: t(`aiAutonomy.${mode}`) }) : t(`aiAutonomy.${mode}`),
            disabled: mode === "AGENTE" && policy.mode !== "AGENTE",
          }))}
        />
        <p className={CAPTION}>{t(`aiAutonomy.${policy.mode}Hint`)} {t("d3.ghost.policyVersion", { version: policy.version })}</p>
        {caps.unavailable ? (
          <p className="rounded-[var(--ws-radius-sm)] bg-ws-warning-soft px-2 py-1 text-[length:var(--ws-text-caption)] text-ws-warning-ink" data-testid="d3-ghost-unavailable">
            {t(caps.unavailable === "AGENTE" ? "d3.ghost.agentUnavailable" : "d3.ghost.manualOff")}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="spark" onClick={g.requestSuggestions} disabled={!caps.onRequest} data-testid="d3-ghost-request">
            <Spark />
            {t("d3.ghost.request")}
          </Button>
          {caps.spontaneous ? <Badge tone="spark">{t("d3.ghost.auto")}</Badge> : null}
        </div>
        <label className="grid gap-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">
          <span>{t("d3.ghost.opacity", { value: g.opacity })}</span>
          <Input type="range" min={20} max={80} step={5} value={g.opacity} onChange={(e) => g.setOpacity(Number(e.target.value))} className="min-h-0 px-0" data-testid="d3-ghost-opacity" />
        </label>
      </div>

      {proposal ? (
        <div className="mt-2 grid gap-2">
          <p className={CAPTION} data-testid="d3-ghost-meta">
            {t("d3.ghost.meta", { revision: proposal.baseRevision, version: proposal.policyVersion, pending: pending.length, total: proposal.items.length })}
          </p>
          {proposal.items.length ? (
            <ol className="grid max-h-80 gap-1.5 overflow-auto" aria-label={t("d3.ghost.list")}>
              {proposal.items.map((item, idx) => {
                const s = item.suggestion;
                const open = item.status === "PENDENTE";
                const text = g.labelText(s.label);
                return (
                  <li
                    key={s.id}
                    tabIndex={open ? 0 : -1}
                    onKeyDown={(e) => onItemKey(e, item)}
                    aria-label={`${idx + 1}. ${text} — ${status(item)}`}
                    className={cn(
                      "grid gap-1 rounded-[var(--ws-radius-sm)] border p-2 text-[length:var(--ws-text-body-sm)] focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]",
                      open ? "border-ws-ai-spark bg-ws-ai-spark-soft" : "border-ws-border bg-ws-surface-2 opacity-80",
                    )}
                    data-testid={`d3-ghost-item-${s.id}`}
                    data-status={item.status}
                  >
                    <div className="flex items-start gap-2">
                      <Badge tone="spark" className="shrink-0">✦ {idx + 1}</Badge>
                      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{text}</span>
                    </div>
                    <p className={CAPTION}>{t(`d3.ghost.kind.${s.kind}`)}</p>
                    {open ? (
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="spark" onClick={() => g.accept([s.id])} aria-label={t("d3.ghost.acceptAria", { n: idx + 1 })}>{t("d3.ghost.accept")}</Button>
                        <Button size="sm" variant="ghost" onClick={() => g.reject([s.id])} aria-label={t("d3.ghost.rejectAria", { n: idx + 1 })}>{t("d3.ghost.reject")}</Button>
                      </div>
                    ) : (
                      <p className="text-[length:var(--ws-text-caption)]">
                        <Tag tone={item.status === "ACEITA" ? "success" : item.status === "RECUSADA" ? "danger" : "neutral"}>{t(`d3.ghost.status.${item.status}`)}</Tag>
                        {item.status === "RECUSADA" && item.reason ? <span className="ml-1 text-ws-text-muted">{g.refusalText(item.reason)}</span> : null}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={CAPTION}>{t("d3.ghost.none")}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {caps.batch ? (
              <Button size="sm" variant="spark" onClick={g.applyAssisted} disabled={!pending.length} data-testid="d3-ghost-assisted">{t("d3.ghost.applyAssisted")}</Button>
            ) : null}
            <Button size="sm" onClick={() => g.accept(pendingIds)} disabled={!pending.length} data-testid="d3-ghost-accept-all">{t("d3.ghost.acceptAll")}</Button>
            <Button size="sm" variant="ghost" onClick={() => g.reject(pendingIds)} disabled={!pending.length} data-testid="d3-ghost-reject-all">{t("d3.ghost.rejectAll")}</Button>
          </div>
          {caps.batch ? <p className={CAPTION}>{t("d3.ghost.assistedHint")}</p> : null}
        </div>
      ) : (
        <p className={cn(CAPTION, "mt-2")}>{t(caps.spontaneous ? "d3.ghost.waiting" : "d3.ghost.empty")}</p>
      )}
      <p className="sr-only" aria-live="polite" data-testid="d3-ghost-live">{g.announcement}</p>
    </Card>
  );
}
