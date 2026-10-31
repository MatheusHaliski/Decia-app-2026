/**
 * Fachada da viewport 3D (Facade): a interface React conversa só com esta classe — `setScene`, `setSelection`, `setQuality`,
 * `capture`, `exportGlb` — e não conhece renderer, câmera, pós-processamento, gizmo nem path tracer. Por dentro ela coordena o
 * palco (`stage`), o adaptador do modelo (`scene-adapter`), o pipeline de pós (`post`) e o traçador progressivo (`path-tracing`).
 * O gizmo e a caixa de seleção ficam numa cena de sobreposição desenhada por cima, fora do path tracer e do tone mapping.
 */
import { Box3, Box3Helper, Color, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3, type WebGLRenderer } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import type { Scene3D, Transform } from "../model";
import { QUALITY, type QualityId, type QualityStrategy } from "../quality";
import { disposeGeometries } from "./geometry-factory";
import { disposeMaterials } from "./material-factory";
import { ProgressivePathTracer } from "./path-tracing";
import { PostPipeline } from "./post";
import { OBJECT_ID, readTransform, SceneAdapter } from "./scene-adapter";
import { applyShadowQuality, createRenderer, createStage, type Stage } from "./stage";
import { disposeTextures } from "./textures";

export type GizmoMode = "translate" | "rotate" | "scale";
export type RenderMode = "raster" | "pathtracing" | "preparing";

export interface ViewportStats {
  mode: RenderMode;
  samples: number;
  targetSamples: number;
}

export interface ViewportCallbacks {
  onSelect(id: string | null): void;
  onTransformCommit(id: string, transform: Transform): void;
  onStats?(stats: ViewportStats): void;
}

/** Cor de destaque do tema (token `--ws-accent`) para a caixa de seleção; laranja do Work Station se o token não estiver legível. */
function accentColor(): Color {
  const fallback = new Color(0.75, 0.15, 0.01);
  if (typeof document === "undefined") return fallback;
  const token = getComputedStyle(document.documentElement).getPropertyValue("--ws-accent").trim();
  try {
    return token ? new Color().setStyle(token) : fallback;
  } catch {
    return fallback;
  }
}

export class Viewport3D {
  private readonly renderer: WebGLRenderer;
  private readonly stage: Stage;
  private readonly camera = new PerspectiveCamera(32, 1, 0.05, 200);
  private readonly orbit: OrbitControls;
  private readonly gizmo: TransformControls;
  private readonly overlay = new Scene();
  private readonly selectionBox = new Box3Helper(new Box3(), accentColor());
  private readonly adapter: SceneAdapter;
  private quality: QualityStrategy = QUALITY.alta;
  private post: PostPipeline;
  private tracer: ProgressivePathTracer | null = null;
  private size = { width: 1, height: 1 };
  private dirty = true;
  private raf = 0;
  private selectedId: string | null = null;
  private pointerDown: { x: number; y: number } | null = null;
  private lastStats = "";
  private disposed = false;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly callbacks: ViewportCallbacks) {
    this.renderer = createRenderer(canvas);
    this.stage = createStage();
    this.adapter = new SceneAdapter(this.stage.content);
    this.camera.position.set(2.5, 1.75, 4.6);
    this.orbit = new OrbitControls(this.camera, canvas);
    this.orbit.target.set(-0.1, 0.4, 0.05);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.12;
    this.orbit.minDistance = 0.6;
    this.orbit.maxDistance = 25;
    this.orbit.maxPolarAngle = Math.PI / 2 - 0.02; // não atravessa o piso
    this.orbit.addEventListener("change", this.onCameraChange);
    this.gizmo = new TransformControls(this.camera, canvas);
    this.gizmo.setSize(0.9);
    this.gizmo.addEventListener("dragging-changed", this.onDragging);
    this.gizmo.addEventListener("objectChange", this.onGizmoChange);
    this.overlay.add(this.gizmo.getHelper(), this.selectionBox);
    this.selectionBox.visible = false;
    applyShadowQuality(this.stage, this.quality);
    this.post = new PostPipeline(this.renderer, this.stage.scene, this.camera, this.quality, 1, 1);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    this.orbit.update();
    this.loop();
  }

  // ——— API para a interface ———

  setScene(scene: Scene3D): void {
    this.adapter.sync(scene);
    this.refreshSelection();
    this.sceneChanged();
  }

  setSelection(id: string | null): void {
    this.selectedId = id;
    this.refreshSelection();
    this.dirty = true;
  }

  setGizmoMode(mode: GizmoMode): void {
    this.gizmo.setMode(mode);
    this.dirty = true;
  }

  setQuality(id: QualityId): void {
    const q = QUALITY[id];
    if (q === this.quality) return;
    this.quality = q;
    this.applyPixelRatio();
    applyShadowQuality(this.stage, q);
    this.post.dispose();
    this.post = new PostPipeline(this.renderer, this.stage.scene, this.camera, q, this.size.width, this.size.height);
    this.post.setSize(this.size.width, this.size.height, this.renderer.getPixelRatio());
    this.tracer?.dispose();
    this.tracer = q.pathTracing ? new ProgressivePathTracer(this.renderer, q.pathTracing, () => this.post.render()) : null;
    this.sceneChanged();
  }

  resize(width: number, height: number): void {
    this.size = { width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)) };
    this.camera.aspect = this.size.width / this.size.height;
    this.camera.updateProjectionMatrix();
    this.applyPixelRatio();
    this.post.setSize(this.size.width, this.size.height, this.renderer.getPixelRatio());
    this.tracer?.cameraMoved();
    this.dirty = true;
  }

  /** Enquadra todos os objetos (ou o selecionado) na câmera, mantendo a direção de vista. */
  frame(onlySelected = false): void {
    const target = onlySelected ? this.adapter.meshOf(this.selectedId) : this.stage.content;
    if (!target) return;
    const box = new Box3().setFromObject(target);
    if (box.isEmpty()) return;
    const center = box.getCenter(new Vector3());
    const radius = box.getSize(new Vector3()).length() / 2;
    const fov = (this.camera.fov * Math.PI) / 180;
    const distance = Math.min(this.orbit.maxDistance, Math.max(this.orbit.minDistance, (radius / Math.sin(fov / 2)) * 1.05));
    const dir = this.camera.position.clone().sub(this.orbit.target).normalize();
    this.orbit.target.copy(center);
    this.camera.position.copy(center).addScaledVector(dir, distance);
    this.orbit.update();
    this.onCameraChange();
  }

  /** PNG do quadro atual na resolução da tela (sem gizmo nem caixa de seleção). */
  capture(): string {
    this.renderMain();
    const png = this.canvas.toDataURL("image/png");
    this.dirty = true; // o próximo quadro devolve o gizmo e a caixa de seleção à tela
    return png;
  }

  async exportGlb(): Promise<Blob> {
    const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
    const result = await new GLTFExporter().parseAsync(this.stage.content, { binary: true });
    return new Blob([result as ArrayBuffer], { type: "model/gltf-binary" });
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.orbit.dispose();
    this.gizmo.detach();
    this.gizmo.dispose();
    this.tracer?.dispose();
    this.post.dispose();
    this.adapter.dispose();
    this.stage.dispose();
    disposeMaterials();
    disposeGeometries();
    disposeTextures();
    this.renderer.dispose();
  }

  // ——— interno ———

  private applyPixelRatio(): void {
    const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(Math.min(dpr, this.quality.maxPixelRatio));
    this.renderer.setSize(this.size.width, this.size.height, false);
  }

  private sceneChanged(): void {
    this.dirty = true;
    void this.tracer?.rebuild(this.stage.scene, this.camera, this.stage.keyLight).then(() => { this.dirty = true; });
  }

  private refreshSelection(): void {
    const mesh = this.adapter.meshOf(this.selectedId);
    if (mesh) {
      if (this.gizmo.object !== mesh) this.gizmo.attach(mesh);
      this.selectionBox.box.setFromObject(mesh);
      this.selectionBox.visible = true;
    } else {
      this.gizmo.detach();
      this.selectionBox.visible = false;
    }
  }

  private readonly onCameraChange = () => {
    this.tracer?.cameraMoved();
    this.dirty = true;
  };

  private readonly onDragging = (event: { value: unknown }) => {
    this.orbit.enabled = !event.value;
    const mesh = this.gizmo.object;
    const id = mesh?.userData[OBJECT_ID] as string | undefined;
    if (!event.value && mesh && id) this.callbacks.onTransformCommit(id, readTransform(mesh));
  };

  private readonly onGizmoChange = () => {
    const mesh = this.gizmo.object;
    if (mesh) this.selectionBox.box.setFromObject(mesh);
    this.tracer?.cameraMoved(); // volta ao rasterizado enquanto arrasta; a BVH é refeita no commit
    this.dirty = true;
  };

  private readonly onPointerDown = (e: PointerEvent) => {
    this.pointerDown = { x: e.clientX, y: e.clientY };
  };

  private readonly onPointerUp = (e: PointerEvent) => {
    const start = this.pointerDown;
    this.pointerDown = null;
    if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5 || this.gizmo.dragging) return;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = ray.intersectObjects(this.adapter.pickables, false)[0];
    this.callbacks.onSelect((hit?.object.userData[OBJECT_ID] as string | undefined) ?? null);
  };

  private renderMain(): void {
    if (this.tracer && !this.gizmo.dragging) this.tracer.render();
    else this.post.render();
  }

  private renderOverlay(): void {
    const r = this.renderer;
    r.autoClear = false;
    r.clearDepth();
    r.render(this.overlay, this.camera);
    r.autoClear = true;
  }

  private readonly loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const moved = this.orbit.update();
    const converging = !!this.tracer && !this.tracer.converged;
    if (!moved && !this.dirty && !converging) return;
    this.dirty = false;
    this.renderMain();
    this.renderOverlay();
    this.emitStats();
  };

  private emitStats(): void {
    const t = this.tracer;
    const stats: ViewportStats = t
      ? { mode: t.isReady ? "pathtracing" : "preparing", samples: t.samples, targetSamples: t.target }
      : { mode: "raster", samples: 0, targetSamples: 0 };
    const key = `${stats.mode}:${stats.samples}`;
    if (key === this.lastStats) return;
    this.lastStats = key;
    this.callbacks.onStats?.(stats);
  }
}
