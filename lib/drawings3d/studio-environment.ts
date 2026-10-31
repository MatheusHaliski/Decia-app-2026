/**
 * HDRI de estúdio fotográfico gerado no código (sem baixar arquivos de terceiros): mapa equirretangular em alta faixa dinâmica com
 * softboxes (luz principal, preenchimento, recorte e faixa superior) sobre um gradiente de céu e chão. A MESMA textura ilumina o
 * render rasterizado (PBR com IBL) e o path tracer (que amostra por importância as regiões mais brilhantes) — por isso os dois
 * modos têm a mesma luz e os reflexos dos materiais mostram painéis de luz retangulares, como numa foto de produto real.
 */
export interface Softbox {
  /** Azimute (graus, 0 = frente da câmera, positivo para a direita) e elevação (graus acima do horizonte) do centro. */
  azimuth: number;
  elevation: number;
  /** Meia largura e meia altura angulares (graus). */
  halfWidth: number;
  halfHeight: number;
  /** Radiância (cd/m² relativa) e cor linear. */
  intensity: number;
  color: readonly [number, number, number];
}

export const STUDIO_SOFTBOXES: readonly Softbox[] = [
  { azimuth: -40, elevation: 38, halfWidth: 16, halfHeight: 11, intensity: 16, color: [1, 0.97, 0.92] }, // principal
  { azimuth: 62, elevation: 18, halfWidth: 20, halfHeight: 14, intensity: 2, color: [0.92, 0.96, 1] }, // preenchimento
  { azimuth: 165, elevation: 52, halfWidth: 9, halfHeight: 16, intensity: 10, color: [1, 1, 1] }, // recorte (contraluz alto, acima do ciclorama)
  { azimuth: 0, elevation: 80, halfWidth: 60, halfHeight: 6, intensity: 2.5, color: [1, 1, 1] }, // faixa superior
];

const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Diferença angular em graus no intervalo (-180, 180]. */
const angleDelta = (a: number, b: number) => ((((a - b) % 360) + 540) % 360) - 180;

/**
 * Radiância RGBA (linear, float) de um mapa equirretangular `width × height` no layout do three.js e do path tracer
 * (`EquirectangularReflectionMapping`, `flipY = false`): u = atan2(z, x)/2π + 0,5 e linha 0 = nadir. O azimute dos softboxes é
 * medido a partir de +Z (o lado da câmera inicial), positivo para +X. Bordas suavizadas (difusor real); fundo escuro de estúdio,
 * para que os reflexos mostrem os painéis com contraste, com um leve bounce quente do chão.
 */
export function studioEnvironment(width = 1024, height = 512, softboxes: readonly Softbox[] = STUDIO_SOFTBOXES): Float32Array {
  const data = new Float32Array(width * height * 4);
  const rad = Math.PI / 180;
  for (let y = 0; y < height; y += 1) {
    const elevation = ((y + 0.5) / height) * 180 - 90;
    const sinE = Math.sin(elevation * rad);
    const up = Math.max(0, sinE), down = Math.max(0, -sinE);
    // gradiente: teto 0,2 → horizonte 0,12 → chão 0,04 com bounce quente (estúdio escuro: quem ilumina são os softboxes)
    const base = [0.12 + 0.08 * up - 0.085 * down + 0.008 * down, 0.12 + 0.08 * up - 0.085 * down + 0.003 * down, 0.125 + 0.085 * up - 0.09 * down];
    const cosE = Math.cos(elevation * rad);
    for (let x = 0; x < width; x += 1) {
      const theta = ((x + 0.5) / width - 0.5) * 2 * Math.PI; // atan2(z, x)
      const azimuth = Math.atan2(Math.cos(theta), Math.sin(theta)) / rad; // a partir de +Z, positivo para +X
      let r = base[0]!, g = base[1]!, b = base[2]!;
      for (const box of softboxes) {
        const dx = Math.abs(angleDelta(azimuth, box.azimuth)) * cosE;
        const dy = Math.abs(elevation - box.elevation);
        const w = (1 - smooth(box.halfWidth * 0.8, box.halfWidth, dx)) * (1 - smooth(box.halfHeight * 0.8, box.halfHeight, dy)) * box.intensity;
        r += w * box.color[0];
        g += w * box.color[1];
        b += w * box.color[2];
      }
      const i = (y * width + x) * 4;
      data[i] = Math.max(0, r);
      data[i + 1] = Math.max(0, g);
      data[i + 2] = Math.max(0, b);
      data[i + 3] = 1;
    }
  }
  return data;
}

/** Direção (unitária) de um azimute/elevação no mesmo referencial do mapa — usada para alinhar a luz direcional ao softbox. */
export function directionOf(azimuth: number, elevation: number): [number, number, number] {
  const rad = Math.PI / 180;
  const c = Math.cos(elevation * rad);
  return [Math.sin(azimuth * rad) * c, Math.sin(elevation * rad), Math.cos(azimuth * rad) * c];
}
