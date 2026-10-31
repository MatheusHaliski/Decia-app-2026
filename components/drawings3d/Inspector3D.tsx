"use client";
/** Propriedades do objeto selecionado: nome, material PBR e transformação numérica (validada pelo modelo antes de aplicar). */
import { Card, Field, Input, Select } from "@/components/ui";
import { MATERIALS, materialById, swatchCss } from "@/lib/drawings3d/materials";
import type { SceneObject, Transform, Vec3 } from "@/lib/drawings3d/model";
import type { Editor3D } from "@/lib/drawings3d/useEditor3D";
import { useI18n } from "@/lib/i18n/useI18n";

const FIELDS = ["position", "rotation", "scale"] as const;
const AXES = ["x", "y", "z"] as const;

/** Campo numérico que só aplica ao sair ou com Enter (digitar "-" ou "1." não dispara um comando a cada tecla). */
function NumberCell({ label, value, step, onCommit }: { label: string; value: number; step: number; onCommit: (v: number) => void }) {
  const commit = (raw: string) => {
    const v = Number(raw.replace(",", "."));
    if (raw.trim() !== "" && Number.isFinite(v) && v !== value) onCommit(v);
  };
  return (
    <Input
      key={value}
      type="text"
      inputMode="decimal"
      aria-label={label}
      defaultValue={String(value)}
      className="h-8 px-2 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] tabular-nums"
      step={step}
      onBlur={(e) => commit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit(e.currentTarget.value);
        if (e.key === "Escape") e.currentTarget.value = String(value);
      }}
    />
  );
}

function TransformFields({ object, onChange }: { object: SceneObject; onChange: (t: Transform) => void }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-2">
      {FIELDS.map((field) => (
        <fieldset key={field} className="grid gap-1">
          <legend className="text-[length:var(--ws-text-caption)] font-semibold">{t(`d3.${field}`)}</legend>
          <div className="grid grid-cols-3 gap-1">
            {AXES.map((axis, i) => (
              <NumberCell
                key={axis}
                label={`${t(`d3.${field}`)} ${axis.toUpperCase()}`}
                value={object.transform[field][i]!}
                step={field === "rotation" ? 1 : 0.05}
                onCommit={(v) => {
                  const next = [...object.transform[field]] as [number, number, number];
                  next[i] = v;
                  onChange({ ...object.transform, [field]: next as Vec3 });
                }}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export function Inspector3D({ editor }: { editor: Editor3D }) {
  const { t } = useI18n();
  const o = editor.selected;
  return (
    <Card padding="sm" className="grid gap-3" data-testid="d3-inspector">
      <h2 className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("d3.inspector")}</h2>
      {!o ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("d3.noSelection")}</p> : (
        <>
          <Field label={t("d3.name")}>
            {({ id }) => (
              <Input
                id={id}
                key={`${o.id}:${o.name}`}
                defaultValue={o.name}
                maxLength={80}
                onBlur={(e) => e.currentTarget.value.trim() !== o.name && editor.rename(o.id, e.currentTarget.value)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
            )}
          </Field>
          <Field label={t("d3.material")}>
            {({ id }) => (
              <div className="flex items-center gap-2">
                <span aria-hidden className="size-6 shrink-0 rounded-full border border-ws-border" style={{ background: swatchCss(materialById(o.materialId).color) }} />
                <div className="min-w-0 flex-1">
                  <Select
                    id={id}
                    value={o.materialId}
                    data-testid="d3-material"
                    onChange={(e) => editor.setMaterial(o.id, e.target.value)}
                    options={MATERIALS.map((m) => ({ value: m.id, label: t(m.labelKey) }))}
                  />
                </div>
              </div>
            )}
          </Field>
          <TransformFields object={o} onChange={(tr) => editor.setTransform(o.id, tr)} />
        </>
      )}
    </Card>
  );
}
