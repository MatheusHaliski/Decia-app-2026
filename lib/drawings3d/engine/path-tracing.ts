/**
 * Path tracing progressivo (modo fotorrealista). Carrega `three-gpu-pathtracer` sob demanda (o pacote só chega a quem escolhe o
 * modo) e acumula amostras enquanto a câmera está parada: cada amostra lança raios que quicam até `bounces` vezes pela cena,
 * o que produz iluminação global, refração e cáusticas no vidro, sombras de área macias e reflexos entre objetos — a física que o
 * rasterizador só aproxima. Ao mexer a câmera ou editar a cena a imagem volta ao render rasterizado e recomeça a convergir.
 */
import type { Camera, DirectionalLight, Scene, WebGLRenderer } from "three";
import type { WebGLPathTracer } from "three-gpu-pathtracer";
import type { QualityStrategy } from "../quality";

type Settings = Exclude<QualityStrategy["pathTracing"], false>;

export class ProgressivePathTracer {
  private tracer: WebGLPathTracer | null = null;
  private building: Promise<void> | null = null;
  private pendingRebuild = false;
  private ready = false;
  private disposed = false;

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly settings: Settings,
    private readonly rasterize: () => void,
  ) {}

  get samples(): number {
    return this.ready && this.tracer ? Math.floor(this.tracer.samples) : 0;
  }
  get target(): number {
    return this.settings.targetSamples;
  }
  get converged(): boolean {
    return this.samples >= this.settings.targetSamples;
  }
  get isReady(): boolean {
    return this.ready;
  }

  private async load(): Promise<WebGLPathTracer> {
    if (this.tracer) return this.tracer;
    const { WebGLPathTracer } = await import("three-gpu-pathtracer");
    const t = new WebGLPathTracer(this.renderer);
    t.bounces = this.settings.bounces;
    t.transmissiveBounces = this.settings.transmissiveBounces;
    t.filterGlossyFactor = this.settings.filterGlossyFactor;
    t.minSamples = this.settings.minSamples;
    t.renderDelay = 120;
    t.fadeDuration = 350;
    t.multipleImportanceSampling = true;
    t.tiles.set(2, 2);
    t.rasterizeSceneCallback = () => this.rasterize();
    this.tracer = t;
    return t;
  }

  /**
   * (Re)constrói a BVH da cena. A luz-chave direcional existe só para as sombras do rasterizador: no path tracer o softbox do
   * HDRI já ilumina e sombreia de verdade, então ela é zerada nos uniforms do traçador (e mantida no rasterizado).
   */
  rebuild(scene: Scene, camera: Camera, keyLight: DirectionalLight): Promise<void> {
    if (this.building) {
      this.pendingRebuild = true;
      return this.building;
    }
    this.building = (async () => {
      const t = await this.load();
      if (this.disposed) return;
      // BVH síncrona: sem worker (o CSP só libera workers blob: e a cena de um editor é pequena — dezenas de ms)
      t.setScene(scene, camera);
      const intensity = keyLight.intensity;
      keyLight.intensity = 0;
      t.updateLights();
      keyLight.intensity = intensity;
      this.ready = true;
    })().catch(() => {
      this.ready = false; // falhou (memória, extensão ausente): fica no rasterizado em vez de quebrar a viewport
    }).finally(() => {
      this.building = null;
      if (this.pendingRebuild && !this.disposed) {
        this.pendingRebuild = false;
        void this.rebuild(scene, camera, keyLight);
      }
    });
    return this.building;
  }

  cameraMoved(): void {
    if (this.ready) this.tracer?.updateCamera();
  }

  /** Desenha um quadro; enquanto a BVH não está pronta, cai no rasterizado. */
  render(): void {
    if (this.ready && this.tracer && !this.building) this.tracer.renderSample();
    else this.rasterize();
  }

  dispose(): void {
    this.disposed = true;
    this.tracer?.dispose();
    this.tracer = null;
  }
}
