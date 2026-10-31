/**
 * Pós-processamento (Decorator sobre o render): cada passe envolve o anterior. Render HDR em meia precisão com MSAA → oclusão de
 * ambiente GTAO (o escurecimento suave nos cantos e contatos que a luz de ambiente sozinha não faz) → saída com tone mapping
 * (PBR Neutral) e conversão para sRGB. A estratégia de qualidade decide quais passes entram. Sem bloom de propósito: em foto de
 * produto o halo espalha o realce do metal e apaga a faixa escura que o faz parecer metal (comparado em captura de tela).
 */
import { HalfFloatType, WebGLRenderTarget, type Camera, type Scene, type WebGLRenderer } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import type { QualityStrategy } from "../quality";

export class PostPipeline {
  private readonly composer: EffectComposer;
  private readonly gtao: GTAOPass | null = null;

  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera, q: QualityStrategy, width: number, height: number) {
    const pr = renderer.getPixelRatio();
    const target = new WebGLRenderTarget(Math.max(1, width * pr), Math.max(1, height * pr), { type: HalfFloatType, samples: q.msaaSamples });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    if (q.ambientOcclusion) {
      const gtao = new GTAOPass(scene, camera, width, height);
      gtao.blendIntensity = 0.85;
      gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.4, thickness: 1, scale: 1, samples: 16 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
      this.composer.addPass(gtao);
      this.gtao = gtao;
    }
    this.composer.addPass(new OutputPass());
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
  }

  render(): void {
    this.composer.render();
  }

  dispose(): void {
    this.gtao?.dispose();
    this.composer.passes.forEach((p) => p.dispose());
    this.composer.dispose();
  }
}
