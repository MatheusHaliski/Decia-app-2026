/**
 * Prévia fantasma na viewport 3D (RF74): desenha, numa camada da sobreposição pública de `Viewport3D`, a cópia "depois" de cada
 * sugestão pendente — malha translúcida (opacidade ajustável), caixa de contorno e o rótulo "✦ n" da lista. Fica fora da cena
 * principal: não entra no path tracer, na captura PNG nem no GLB, não é escolhida pelo clique (não está em `pickables`) e não
 * altera o modelo. Cores dos tokens do tema (`--ws-ai-spark`, `--ws-ai-spark-ink`, `--ws-surface-1`).
 */
import {
  Box3, Box3Helper, CanvasTexture, Color, Group, Mesh, MeshBasicMaterial, Sprite, SpriteMaterial, SRGBColorSpace, Vector3,
} from "three";
import type { GhostRender } from "../ghost";
import { primitiveGeometry } from "./geometry-factory";
import { applyTransform } from "./scene-adapter";

const FALLBACK = { spark: new Color(0.78, 0.53, 0.06), ink: new Color(0.56, 0.38, 0.04), surface: new Color(1, 1, 1) };

function token(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function tokenColor(name: string, fallback: Color): Color {
  const value = token(name, "");
  try {
    return value ? new Color().setStyle(value) : fallback.clone();
  } catch {
    return fallback;
  }
}

/** Rótulo "✦ n" como sprite de tamanho constante na tela. */
function labelSprite(n: number): Sprite | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  canvas.width = 96;
  canvas.height = 48;
  ctx.fillStyle = token("--ws-surface-1", FALLBACK.surface.getStyle());
  ctx.strokeStyle = token("--ws-ai-spark", FALLBACK.spark.getStyle());
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(2, 2, 92, 44, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = token("--ws-ai-spark-ink", FALLBACK.ink.getStyle());
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`✦ ${n}`, 48, 25);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const sprite = new Sprite(new SpriteMaterial({ map: texture, depthTest: false, transparent: true, sizeAttenuation: false }));
  sprite.scale.set(0.09, 0.045, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export class GhostOverlay {
  private readonly fill = new MeshBasicMaterial({ transparent: true, depthWrite: false });
  private parts: { dispose(): void }[] = [];

  constructor(private readonly layer: Group, private readonly requestRender: () => void) {
    this.fill.color.copy(tokenColor("--ws-ai-spark", FALLBACK.spark));
  }

  /** Troca as cópias desenhadas; `opacity` de 0 a 1. Sem cópias, a camada fica vazia. */
  set(ghosts: readonly GhostRender[], opacity: number): void {
    this.clear();
    this.fill.opacity = Math.min(1, Math.max(0.05, opacity));
    const edge = tokenColor("--ws-ai-spark-ink", FALLBACK.ink);
    const labelled = new Set<number>();
    for (const g of ghosts) {
      const mesh = new Mesh(primitiveGeometry(g.object.kind), this.fill);
      mesh.name = `ghost:${g.key}`;
      mesh.raycast = () => undefined; // nunca intercepta o ponteiro
      applyTransform(mesh, g.object);
      mesh.updateMatrixWorld(true);
      const box = new Box3().setFromObject(mesh);
      const outline = new Box3Helper(box, edge);
      this.layer.add(mesh, outline);
      this.parts.push({ dispose: () => { mesh.removeFromParent(); outline.removeFromParent(); outline.geometry.dispose(); (outline.material as { dispose(): void }).dispose(); } });
      if (labelled.has(g.n)) continue;
      labelled.add(g.n);
      const sprite = labelSprite(g.n);
      if (!sprite) continue;
      sprite.position.copy(box.getCenter(new Vector3())).setY(box.max.y + 0.12);
      this.layer.add(sprite);
      this.parts.push({ dispose: () => { sprite.removeFromParent(); sprite.material.map?.dispose(); sprite.material.dispose(); } });
    }
    this.requestRender();
  }

  clear(): void {
    this.parts.forEach((p) => p.dispose());
    this.parts = [];
  }

  dispose(): void {
    this.clear();
    this.fill.dispose();
    this.layer.removeFromParent();
  }
}
