/**
 * Adaptador modelo → three.js (Adapter): recebe o `Scene3D` puro e mantém, dentro do grupo de conteúdo do palco, uma malha por
 * objeto com a mesma hierarquia (`parentId`). Só toca o que mudou: malhas novas nascem, removidas saem, transformações e
 * materiais são reaplicados. Devolve `true` quando a estrutura ou os materiais mudaram (o path tracer precisa reconstruir a BVH).
 */
import { Euler, MathUtils, Mesh, type Group, type Object3D } from "three";
import type { Scene3D, SceneObject } from "../model";
import { primitiveGeometry } from "./geometry-factory";
import { physicalMaterial } from "./material-factory";

export const OBJECT_ID = "wsObjectId";

export class SceneAdapter {
  private readonly meshes = new Map<string, Mesh>();
  constructor(private readonly root: Group) {}

  meshOf(id: string | null | undefined): Mesh | undefined {
    return id ? this.meshes.get(id) : undefined;
  }

  get pickables(): Object3D[] {
    return [...this.meshes.values()];
  }

  /** Sincroniza com o modelo; `true` se algo além de posição mudou (malha nova, removida, reparentada ou material trocado). */
  sync(scene: Scene3D): boolean {
    let structural = false;
    const alive = new Set(scene.objects.map((o) => o.id));
    for (const [id, mesh] of this.meshes) {
      if (alive.has(id)) continue;
      mesh.removeFromParent();
      this.meshes.delete(id);
      structural = true;
    }
    for (const o of scene.objects) {
      let mesh = this.meshes.get(o.id);
      if (!mesh || mesh.userData.kind !== o.kind) {
        mesh?.removeFromParent();
        mesh = new Mesh(primitiveGeometry(o.kind), physicalMaterial(o.materialId));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData[OBJECT_ID] = o.id;
        mesh.userData.kind = o.kind;
        this.meshes.set(o.id, mesh);
        structural = true;
      }
      const material = physicalMaterial(o.materialId);
      if (mesh.material !== material) {
        mesh.material = material;
        structural = true;
      }
      mesh.name = o.name;
      applyTransform(mesh, o);
    }
    // hierarquia: pai inexistente (ou ciclo) cai na raiz — dado corrompido não some da tela
    for (const o of scene.objects) {
      const mesh = this.meshes.get(o.id)!;
      const parent = (o.parentId && !createsCycle(scene, o) && this.meshes.get(o.parentId)) || this.root;
      if (mesh.parent !== parent) {
        parent.add(mesh);
        structural = true;
      }
    }
    return structural;
  }

  dispose(): void {
    this.meshes.forEach((m) => m.removeFromParent());
    this.meshes.clear();
  }
}

function createsCycle(scene: Scene3D, o: SceneObject): boolean {
  const seen = new Set<string>([o.id]);
  let cur = o.parentId;
  while (cur) {
    if (seen.has(cur)) return true;
    seen.add(cur);
    cur = scene.objects.find((x) => x.id === cur)?.parentId;
  }
  return false;
}

const euler = new Euler();
export function applyTransform(target: Object3D, o: SceneObject): void {
  const { position: p, rotation: r, scale: s } = o.transform;
  target.position.set(p[0], p[1], p[2]);
  euler.set(MathUtils.degToRad(r[0]), MathUtils.degToRad(r[1]), MathUtils.degToRad(r[2]), "XYZ");
  target.rotation.copy(euler);
  target.scale.set(s[0], s[1], s[2]);
}

/** Lê de volta a transformação de uma malha (depois de arrastar o gizmo), em graus e com 4 casas. */
export function readTransform(target: Object3D): SceneObject["transform"] {
  const round = (v: number) => Math.round(v * 1e4) / 1e4;
  const deg = (v: number) => round(MathUtils.radToDeg(v));
  return {
    position: [round(target.position.x), round(target.position.y), round(target.position.z)],
    rotation: [deg(target.rotation.x), deg(target.rotation.y), deg(target.rotation.z)],
    scale: [round(target.scale.x), round(target.scale.y), round(target.scale.z)],
  };
}
