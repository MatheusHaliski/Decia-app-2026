"use client";
/** Lista de objetos da cena (com recuo pela hierarquia); clicar seleciona — o mesmo efeito de clicar na viewport. */
import { Button, Card } from "@/components/ui";
import type { Scene3D, SceneObject } from "@/lib/drawings3d/model";
import type { Editor3D } from "@/lib/drawings3d/useEditor3D";
import { useI18n } from "@/lib/i18n/useI18n";

/** Ordem de exibição em árvore: pais antes dos filhos, com a profundidade (ciclo e pai ausente caem na raiz). */
export function outlineRows(scene: Scene3D): { object: SceneObject; depth: number }[] {
  const ids = new Set(scene.objects.map((o) => o.id));
  const children = new Map<string, SceneObject[]>();
  const roots: SceneObject[] = [];
  for (const o of scene.objects) {
    if (o.parentId && ids.has(o.parentId) && o.parentId !== o.id) children.set(o.parentId, [...(children.get(o.parentId) ?? []), o]);
    else roots.push(o);
  }
  const rows: { object: SceneObject; depth: number }[] = [];
  const seen = new Set<string>();
  const visit = (o: SceneObject, depth: number) => {
    if (seen.has(o.id)) return;
    seen.add(o.id);
    rows.push({ object: o, depth });
    (children.get(o.id) ?? []).forEach((c) => visit(c, depth + 1));
  };
  roots.forEach((r) => visit(r, 0));
  scene.objects.forEach((o) => visit(o, 0)); // órfãos de ciclo
  return rows;
}

export function Outliner3D({ editor }: { editor: Editor3D }) {
  const { t } = useI18n();
  const rows = outlineRows(editor.scene);
  return (
    <Card padding="sm" className="grid gap-2">
      <h2 className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("d3.objects")}</h2>
      {rows.length === 0 ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("d3.noObjects")}</p> : (
        <ul className="grid max-h-64 gap-0.5 overflow-auto" data-testid="d3-outliner">
          {rows.map(({ object, depth }) => (
            <li key={object.id} style={{ paddingInlineStart: `${depth * 0.75}rem` }}>
              <Button
                size="sm"
                variant={object.id === editor.selectedId ? "secondary" : "ghost"}
                aria-pressed={object.id === editor.selectedId}
                className="w-full justify-start truncate"
                onClick={() => editor.select(object.id === editor.selectedId ? null : object.id)}
              >
                {object.name}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
