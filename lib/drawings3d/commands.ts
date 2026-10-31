/**
 * Edição por comandos (padrão Command): cada alteração da cena é um objeto com `apply` e `revert`, e o `History` guarda a pilha de
 * desfazer/refazer. Assim a viewport, o inspetor e os atalhos de teclado disparam a MESMA ação, e desfazer não depende de quem a
 * originou. Comandos operam sobre o modelo imutável (`Scene3D`) e devolvem uma cena nova.
 */
import { objectById, sanitizeTransform, subtreeIds, type Scene3D, type SceneObject, type Transform } from "./model";

export interface Command3D {
  /** Chave i18n do rótulo ("Desfazer mover…"). */
  readonly labelKey: string;
  apply(scene: Scene3D): Scene3D;
  revert(scene: Scene3D): Scene3D;
}

const replace = (scene: Scene3D, id: string, patch: (o: SceneObject) => SceneObject): Scene3D => ({
  objects: scene.objects.map((o) => (o.id === id ? patch(o) : o)),
});

export class AddObject implements Command3D {
  readonly labelKey = "d3.cmd.add";
  constructor(private readonly object: SceneObject) {}
  apply(scene: Scene3D): Scene3D {
    return objectById(scene, this.object.id) ? scene : { objects: [...scene.objects, this.object] };
  }
  revert(scene: Scene3D): Scene3D {
    return { objects: scene.objects.filter((o) => o.id !== this.object.id) };
  }
}

/** Remove o objeto com toda a sua subárvore e devolve exatamente os mesmos objetos, na mesma ordem, ao desfazer. */
export class RemoveObject implements Command3D {
  readonly labelKey = "d3.cmd.remove";
  private removed: { index: number; object: SceneObject }[] = [];
  constructor(private readonly id: string) {}
  apply(scene: Scene3D): Scene3D {
    const ids = subtreeIds(scene, this.id);
    this.removed = scene.objects.map((object, index) => ({ index, object })).filter(({ object }) => ids.has(object.id));
    return { objects: scene.objects.filter((o) => !ids.has(o.id)) };
  }
  revert(scene: Scene3D): Scene3D {
    const objects = [...scene.objects];
    for (const { index, object } of this.removed) objects.splice(Math.min(index, objects.length), 0, object);
    return { objects };
  }
}

export class SetTransform implements Command3D {
  readonly labelKey = "d3.cmd.transform";
  private before: Transform | null = null;
  constructor(private readonly id: string, private readonly next: Transform) {}
  apply(scene: Scene3D): Scene3D {
    const current = objectById(scene, this.id);
    if (!current) return scene;
    this.before = current.transform;
    return replace(scene, this.id, (o) => ({ ...o, transform: sanitizeTransform(this.next, o.transform) }));
  }
  revert(scene: Scene3D): Scene3D {
    const before = this.before;
    return before ? replace(scene, this.id, (o) => ({ ...o, transform: before })) : scene;
  }
}

/** Troca de propriedade simples (material, nome): guarda o valor anterior para desfazer. */
abstract class SetField<K extends "materialId" | "name"> implements Command3D {
  abstract readonly labelKey: string;
  private before: SceneObject[K] | null = null;
  constructor(private readonly id: string, private readonly field: K, private readonly value: SceneObject[K]) {}
  apply(scene: Scene3D): Scene3D {
    const current = objectById(scene, this.id);
    if (!current) return scene;
    this.before = current[this.field];
    return replace(scene, this.id, (o) => ({ ...o, [this.field]: this.value }));
  }
  revert(scene: Scene3D): Scene3D {
    const before = this.before;
    return before === null ? scene : replace(scene, this.id, (o) => ({ ...o, [this.field]: before }));
  }
}

export class SetMaterial extends SetField<"materialId"> {
  readonly labelKey = "d3.cmd.material";
  constructor(id: string, materialId: string) {
    super(id, "materialId", materialId);
  }
}

export class Rename extends SetField<"name"> {
  readonly labelKey = "d3.cmd.rename";
  constructor(id: string, name: string) {
    super(id, "name", name.trim().slice(0, 80) || "Objeto");
  }
}

/** Pilha de desfazer/refazer com teto de memória; executar um comando novo descarta o "refazer". */
export class History {
  private undoStack: Command3D[] = [];
  private redoStack: Command3D[] = [];
  constructor(private readonly limit = 200) {}

  execute(scene: Scene3D, command: Command3D): Scene3D {
    const next = command.apply(scene);
    if (next === scene) return scene;
    this.undoStack.push(command);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    return next;
  }

  undo(scene: Scene3D): Scene3D {
    const command = this.undoStack.pop();
    if (!command) return scene;
    this.redoStack.push(command);
    return command.revert(scene);
  }

  redo(scene: Scene3D): Scene3D {
    const command = this.redoStack.pop();
    if (!command) return scene;
    this.undoStack.push(command);
    return command.apply(scene);
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  get undoLabelKey() {
    return this.undoStack.at(-1)?.labelKey ?? null;
  }
  get redoLabelKey() {
    return this.redoStack.at(-1)?.labelKey ?? null;
  }
}
