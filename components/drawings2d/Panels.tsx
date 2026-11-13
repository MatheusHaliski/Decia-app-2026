"use client";
/**
 * Painéis do editor 2D: regiões e reservas (estado em texto e ícone, renovar/liberar com o token vigente), camadas
 * (ativa e visibilidade por pessoa), pessoas presentes (nome e cor por extenso) e histórico com desfazer.
 */
import { Badge, Button, Card, Checkbox, Select, Switch, Tag, cn } from "@/components/ui";
import { ALL_LAYERS } from "@/lib/pieces/collab";
import { isPresent } from "@/lib/drawings2d/engine";
import { lockSummary } from "@/lib/drawings2d/explain";
import { regionDepth, regionTree, shapeById } from "@/lib/drawings2d/model";
import { describeEntry } from "./describe";
import { LockIcon, SparkMark } from "./icons";
import { PRESENCE } from "./tokens";
import { TTL_OPTIONS, type EditorModel } from "./useEditorModel";

const H3 = "font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body)] font-semibold";
const CAPTION = "text-[length:var(--ws-text-caption)] text-ws-text-muted";

export function RegionsPanel({ m }: { m: EditorModel }) {
  const { t, doc, locks, meId, explain, now } = m;
  if (!doc || !explain) return null;
  const active = doc.layers.find((l) => l.id === m.view.activeLayerId);
  const layerLabel = m.reserveLayer === ALL_LAYERS ? t("drw2d.allLayers") : (doc.layers.find((l) => l.id === m.layerForReserve)?.name ?? m.layerForReserve);
  return (
    <Card as="section" padding="sm" aria-labelledby="drw2d-regions-h" data-testid="regions-panel">
      <h3 id="drw2d-regions-h" className={H3}>{t("drw2d.regions.title")}</h3>
      <p className={cn(CAPTION, "mb-2")}>{t("drw2d.regions.hint")}</p>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <Select
          aria-label={t("drw2d.regions.layer")}
          value={m.reserveLayer}
          onChange={(e) => m.setReserveLayer(e.target.value)}
          options={[
            { value: "", label: t("drw2d.regions.activeLayer", { layer: active?.name ?? "" }) },
            { value: ALL_LAYERS, label: t("drw2d.allLayers") },
            ...doc.layers.filter((l) => !l.locked && l.id !== m.view.activeLayerId).map((l) => ({ value: l.id, label: l.name })),
          ]}
        />
        <Select
          aria-label={t("drw2d.regions.ttl")}
          value={String(m.ttl)}
          onChange={(e) => m.setTtl(Number(e.target.value))}
          options={TTL_OPTIONS.map((ms) => ({ value: String(ms), label: t("drw2d.regions.ttlOption", { seconds: ms / 1000 }) }))}
        />
      </div>
      <ul className="grid gap-1.5" aria-label={t("drw2d.regions.list")}>
        {regionTree(doc).map((r) => {
          const exact = locks.filter((l) => l.regionIds.includes(r.id));
          const inner = locks.some((l) => l.regionIds.some((x) => x.startsWith(r.id + "/")));
          const outer = locks.some((l) => l.regionIds.some((x) => r.id.startsWith(x + "/")));
          const focused = m.focusRegion === r.id;
          return (
            <li key={r.id} className="grid gap-1 rounded-[var(--ws-radius-sm)] border border-ws-border p-1.5" style={{ marginLeft: `${regionDepth(r.id) * 0.9}rem` }} data-testid={`region-${r.id}`} data-state={exact.length ? (exact.some((l) => l.ownerId === meId) ? "MINHA" : "ALHEIA") : "LIVRE"}>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button size="sm" variant={focused ? "secondary" : "ghost"} aria-pressed={focused} onClick={() => m.setFocusRegion(focused ? null : r.id)} title={t("drw2d.regions.focus")}>
                  {r.name}
                  {r.kind === "GRUPO" ? <span className={CAPTION}>({t("drw2d.regions.group")})</span> : null}
                </Button>
                <Button size="sm" className="ml-auto" onClick={() => m.reserveRegion(r.id)} aria-label={t("drw2d.regions.reserveAria", { region: r.name, layer: layerLabel })} data-testid={`reserve-${r.id}`}>
                  {t("drw2d.regions.reserve")}
                </Button>
              </div>
              {exact.length === 0 ? (
                <p className={CAPTION}>
                  <LockIcon locked={false} /> {t("drw2d.regions.free")}
                  {inner ? ` · ${t("drw2d.regions.hasInner")}` : ""}
                  {outer ? ` · ${t("drw2d.regions.insideReserved")}` : ""}
                </p>
              ) : (
                exact.map((lock) => {
                  const mine = lock.ownerId === meId;
                  const color = explain.state.participants[lock.ownerId]?.color ?? "blue";
                  const seconds = Math.max(0, Math.ceil((lock.expiresAt - now) / 1000));
                  return (
                    <div key={lock.id ?? lock.ownerId} className={cn("flex flex-wrap items-center gap-1.5 rounded-[var(--ws-radius-sm)] px-1.5 py-1 text-[length:var(--ws-text-caption)]", PRESENCE[color].chip)} data-testid="lock-row">
                      <LockIcon locked />
                      <span className="min-w-0 flex-1">
                        {t("drw2d.regions.reservedBy", { summary: lockSummary(lock, explain) })} · {t("drw2d.regions.remaining", { seconds })}
                        {lock.token ? ` · ${t("drw2d.regions.token", { token: lock.token })}` : ""}
                      </span>
                      {mine ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => m.renew(lock)} aria-label={t("drw2d.regions.renewAria", { region: r.name })}>{t("drw2d.regions.renew")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => m.release(lock)} aria-label={t("drw2d.regions.releaseAria", { region: r.name })}>{t("drw2d.regions.release")}</Button>
                        </>
                      ) : null}
                    </div>
                  );
                })
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function LayersPanel({ m }: { m: EditorModel }) {
  const { t, doc, view } = m;
  if (!doc) return null;
  return (
    <Card as="section" padding="sm" aria-labelledby="drw2d-layers-h" data-testid="layers-panel">
      <h3 id="drw2d-layers-h" className={H3}>{t("drw2d.layer.title")}</h3>
      <ul className="grid gap-1">
        {[...doc.layers].sort((a, b) => b.depth - a.depth).map((l) => {
          const active = l.id === view.activeLayerId;
          return (
            <li key={l.id} className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" variant={active ? "secondary" : "ghost"} aria-pressed={active} disabled={l.locked} onClick={() => m.setActiveLayer(l.id)} title={l.locked ? t("drw2d.layer.lockedHint", { layer: l.name }) : t("drw2d.layer.activate")}>
                {l.name}
              </Button>
              {active ? <Badge tone="accent">{t("drw2d.layer.active")}</Badge> : null}
              {l.locked ? <Tag><LockIcon locked /> {t("drw2d.layer.locked")}</Tag> : null}
              <Checkbox className="ml-auto" checked={!view.hiddenLayerIds.includes(l.id)} onCheckedChange={() => m.toggleLayerVisible(l.id)} label={t("drw2d.layer.show", { layer: l.name })} />
            </li>
          );
        })}
      </ul>
      <p className={CAPTION}>{t("drw2d.layer.hint")}</p>
    </Card>
  );
}

export function PeoplePanel({ m }: { m: EditorModel }) {
  const { t, snap, doc, state, now } = m;
  if (!snap || !doc || !state) return null;
  const activity = (p: (typeof snap.peers)[number]) => {
    if (p.activity) return m.labelText(p.activity);
    const sel = p.selection.map((id) => shapeById(doc, id)?.name).filter(Boolean);
    if (sel.length) return t("drw2d.people.selecting", { name: sel.join(", ") });
    return p.cursor ? t("drw2d.people.viewing") : t("drw2d.people.idle");
  };
  const peers = snap.peers.filter((p) => p.id !== snap.me.id);
  const away = Object.values(state.participants).filter((p) => p.id !== snap.me.id && !peers.some((x) => x.id === p.id) && isPresent(p, now));
  return (
    <Card as="section" padding="sm" aria-labelledby="drw2d-people-h" data-testid="people-panel">
      <h3 id="drw2d-people-h" className={H3}>{t("drw2d.people.title", { count: peers.length + 1 })}</h3>
      <ul className="grid gap-1 text-[length:var(--ws-text-body-sm)]">
        <li className="flex items-center gap-2">
          <span className={cn("size-2.5 shrink-0 rounded-full", PRESENCE[snap.me.color].dot)} aria-hidden />
          <span className="font-semibold">{snap.me.name}</span>
          <span className={CAPTION}>{t("drw2d.people.you")} · {t(`drw2d.color.${snap.me.color}`)}</span>
        </li>
        {peers.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2" data-testid={`peer-${p.id}`}>
            <span className={cn("size-2.5 shrink-0 rounded-full", PRESENCE[p.color]?.dot)} aria-hidden />
            <span className="font-semibold">{p.name}</span>
            {p.kind === "SIMULADA" ? <Tag tone="warning">{t("drw2d.people.simulated")}</Tag> : null}
            <span className={CAPTION}>{t(`drw2d.color.${p.color}`)} · {activity(p)}</span>
          </li>
        ))}
        {away.map((p) => (
          <li key={p.id} className={cn("flex items-center gap-2", CAPTION)}>
            <span className={cn("size-2.5 shrink-0 rounded-full opacity-50", PRESENCE[p.color]?.dot)} aria-hidden />
            {p.name} · {t("drw2d.people.connecting")}
          </li>
        ))}
      </ul>
      <Switch checked={state.botEnabled !== false} onCheckedChange={(on) => m.setBotEnabled(on)} label={t("drw2d.people.bot")} hint={t(snap.hostingBot ? "drw2d.people.botHere" : "drw2d.people.botHint")} />
      <p className={CAPTION}>{t(snap.transport === "broadcast" ? "drw2d.sync.broadcast" : "drw2d.sync.local")}</p>
    </Card>
  );
}

export function HistoryPanel({ m }: { m: EditorModel }) {
  const { t, snap, state, explain } = m;
  if (!snap || !state || !explain) return null;
  const entries = [...state.log].reverse().slice(0, 12);
  return (
    <Card as="section" padding="sm" aria-labelledby="drw2d-history-h" data-testid="history-panel">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h3 id="drw2d-history-h" className={H3}>{t("drw2d.history.title")}</h3>
        <span className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" onClick={m.undo} disabled={!snap.canUndo} title={snap.undoLabel ? t("drw2d.undoWhat", { what: m.labelText(snap.undoLabel) }) : undefined}>{t("drw2d.undo")}</Button>
          <Button size="sm" variant="ghost" onClick={m.redo} disabled={!snap.canRedo} title={snap.redoLabel ? t("drw2d.redoWhat", { what: m.labelText(snap.redoLabel) }) : undefined}>{t("drw2d.redo")}</Button>
        </span>
      </div>
      <p className={cn(CAPTION, "mb-1")}>{t("drw2d.history.hint")}</p>
      {entries.length ? (
        <ol className="grid max-h-64 gap-1 overflow-y-auto text-[length:var(--ws-text-caption)]" aria-label={t("drw2d.history.list")}>
          {entries.map((e) => (
            <li key={e.seq} className="flex gap-1.5">
              <span className="shrink-0 tabular-nums text-ws-text-faint">{m.time(e.at)}</span>
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {e.origin === "IA" ? <SparkMark className="mr-1" /> : null}
                {describeEntry(e, explain)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={CAPTION}>{t("drw2d.history.empty")}</p>
      )}
    </Card>
  );
}
