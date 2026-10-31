/**
 * Palco de estúdio fotográfico: renderer calibrado (sRGB, tone mapping Khronos PBR Neutral — a curva feita para foto de produto,
 * que preserva a cor de base e comprime só os realces), iluminação por imagem com o HDRI de estúdio de `studio-environment`,
 * uma luz-chave direcional alinhada ao softbox principal (só para as sombras no modo rasterizado) e um ciclorama curvo e fosco.
 */
import {
  Color, DataTexture, DataUtils, DirectionalLight, EquirectangularReflectionMapping, Group,
  BufferGeometry, Float32BufferAttribute, HalfFloatType, LinearFilter, LinearSRGBColorSpace, Mesh, MeshPhysicalMaterial, NeutralToneMapping, PCFShadowMap, RGBAFormat,
  Scene, SRGBColorSpace, WebGLRenderer,
} from "three";
import type { QualityStrategy } from "../quality";
import { directionOf, STUDIO_SOFTBOXES, studioEnvironment } from "../studio-environment";

export const BACKDROP_NAME = "ws-ciclorama";

/** Textura HDR equirretangular (meia precisão) — formato que o rasterizador (via PMREM interno) e o path tracer aceitam. */
export function environmentTexture(width = 1024, height = 512): DataTexture {
  const linear = studioEnvironment(width, height);
  const half = new Uint16Array(linear.length);
  for (let i = 0; i < linear.length; i += 1) half[i] = DataUtils.toHalfFloat(Math.min(linear[i]!, 65000));
  const tex = new DataTexture(half, width, height, RGBAFormat, HalfFloatType);
  tex.mapping = EquirectangularReflectionMapping;
  tex.colorSpace = LinearSRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
  renderer.outputColorSpace = SRGBColorSpace;
  // Khronos PBR Neutral: curva feita para foto de produto — cor de base fiel (o ouro continua ouro) e realces sem desbotar
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap; // com `shadow.radius` o PCF filtra a borda (penumbra macia)
  return renderer;
}

/**
 * Ciclorama: piso que sobe em curva suave até virar parede ao fundo (atrás da cena, em -Z) — o horizonte some, como num estúdio de
 * produto. A parede para em 5 m (35° vistos do centro) para não tapar os softboxes no path tracer, que respeita oclusão.
 */
function backdrop(): Mesh {
  const back = 7, cove = 2.5, top = 5, front = 25, halfWidth = 25;
  const profile: [number, number][] = [[front, 0], [-(back - cove), 0]];
  for (let i = 1; i <= 24; i += 1) {
    const a = (i / 24) * (Math.PI / 2);
    profile.push([-(back - cove) - Math.sin(a) * cove, cove - Math.cos(a) * cove]);
  }
  profile.push([-back, top]);
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  profile.forEach(([z, y], i) => {
    positions.push(-halfWidth, y, z, halfWidth, y, z);
    uvs.push(0, i / (profile.length - 1), 1, i / (profile.length - 1));
    if (i > 0) {
      const p = (i - 1) * 2, c = i * 2;
      index.push(p, p + 1, c, p + 1, c + 1, c);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const material = new MeshPhysicalMaterial({ name: BACKDROP_NAME, color: new Color(0.51, 0.48, 0.43) /* cinza quente fosco, albedo ~0,5 */, roughness: 0.92, metalness: 0 });
  const mesh = new Mesh(geometry, material);
  mesh.name = BACKDROP_NAME;
  mesh.receiveShadow = true;
  return mesh;
}

export interface Stage {
  scene: Scene;
  /** Grupo onde o adaptador põe os objetos da pessoa (e que o exportador GLB salva). */
  content: Group;
  keyLight: DirectionalLight;
  environment: DataTexture;
  dispose(): void;
}

export function createStage(): Stage {
  const scene = new Scene();
  const environment = environmentTexture();
  scene.environment = environment;
  scene.background = new Color(0.27, 0.25, 0.23); // além do ciclorama (câmera girada para trás)
  scene.add(backdrop());

  const key = STUDIO_SOFTBOXES[0]!;
  const [dx, dy, dz] = directionOf(key.azimuth, key.elevation);
  const keyLight = new DirectionalLight(new Color(key.color[0], key.color[1], key.color[2]), 1.4);
  keyLight.position.set(dx * 12, dy * 12, dz * 12);
  keyLight.castShadow = true;
  const cam = keyLight.shadow.camera;
  cam.left = -4; cam.right = 4; cam.top = 4; cam.bottom = -4; cam.near = 1; cam.far = 30;
  keyLight.shadow.bias = -0.0002;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight, keyLight.target);

  const content = new Group();
  content.name = "ws-conteudo";
  scene.add(content);

  return {
    scene, content, keyLight, environment,
    dispose() {
      environment.dispose();
      scene.traverse((o) => {
        if (o instanceof Mesh && o.name === BACKDROP_NAME) {
          o.geometry.dispose();
          (o.material as MeshPhysicalMaterial).dispose();
        }
      });
      keyLight.shadow.map?.dispose();
    },
  };
}

/** Aplica a parte de iluminação da estratégia de qualidade (resolução e suavidade da sombra). */
export function applyShadowQuality(stage: Stage, q: QualityStrategy): void {
  const shadow = stage.keyLight.shadow;
  if (shadow.mapSize.x !== q.shadowMapSize) {
    shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
    shadow.map?.dispose();
    shadow.map = null;
  }
  shadow.radius = q.shadowRadius;
  shadow.blurSamples = Math.max(8, q.shadowRadius * 4);
}
