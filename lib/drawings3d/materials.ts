/**
 * Catálogo de materiais fisicamente baseados (PBR) do Drawings 3D (RF63). Dados puros: a fábrica em `engine/material-factory`
 * transforma cada preset num `MeshPhysicalMaterial` compartilhado (Flyweight — um material por preset, reaproveitado por todos os
 * objetos que o usam). Os valores seguem medições publicadas de materiais reais: metal com `metalness` 1 e cor = refletância
 * especular (F0) do metal; dielétricos com IOR real (vidro 1,52; cerâmica 1,5; água 1,33) e refletância de ~4 %.
 */
export type MaterialFamily = "metal" | "vidro" | "ceramica" | "madeira" | "pedra" | "plastico" | "tecido" | "borracha";
export type ProceduralTexture = "madeira" | "concreto" | "escovado" | "marmore" | null;
/** Cor em RGB linear (0–1), o espaço em que a luz soma — e em que se publicam F0 de metais e albedo medidos. */
export type LinearRGB = readonly [number, number, number];

export interface MaterialPreset {
  id: string;
  labelKey: string;
  family: MaterialFamily;
  /** Cor base (albedo) em RGB linear. Em metais é a refletância especular F0. */
  color: LinearRGB;
  metalness: number;
  roughness: number;
  /** Índice de refração (dielétricos). */
  ior?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  /** Transmissão (0–1): vidro e líquidos. */
  transmission?: number;
  /** Espessura do volume (m) para a refração e a absorção. */
  thickness?: number;
  /** Cor absorvida ao atravessar o volume e distância (m) até ela dominar (lei de Beer–Lambert). */
  attenuationColor?: LinearRGB;
  attenuationDistance?: number;
  sheen?: number;
  sheenColor?: LinearRGB;
  sheenRoughness?: number;
  anisotropy?: number;
  specularIntensity?: number;
  texture: ProceduralTexture;
}

export const MATERIALS: readonly MaterialPreset[] = [
  { id: "aco-escovado", labelKey: "d3.mat.aco", family: "metal", color: [0.56, 0.57, 0.58], metalness: 1, roughness: 0.24, anisotropy: 0.45, texture: "escovado" },
  { id: "aluminio", labelKey: "d3.mat.aluminio", family: "metal", color: [0.738, 0.761, 0.791], metalness: 1, roughness: 0.22, texture: null },
  { id: "ouro", labelKey: "d3.mat.ouro", family: "metal", color: [1, 0.546, 0.093], metalness: 1, roughness: 0.14, texture: null },
  { id: "cobre", labelKey: "d3.mat.cobre", family: "metal", color: [0.888, 0.352, 0.195], metalness: 1, roughness: 0.2, texture: null },
  { id: "cromo", labelKey: "d3.mat.cromo", family: "metal", color: [0.807, 0.823, 0.839], metalness: 1, roughness: 0.04, texture: null },
  { id: "vidro", labelKey: "d3.mat.vidro", family: "vidro", color: [1, 1, 1], metalness: 0, roughness: 0.02, ior: 1.52, transmission: 1, thickness: 1, attenuationColor: [0.791, 0.905, 0.871], attenuationDistance: 3, specularIntensity: 1, texture: null },
  { id: "vidro-fosco", labelKey: "d3.mat.vidroFosco", family: "vidro", color: [1, 1, 1], metalness: 0, roughness: 0.35, ior: 1.52, transmission: 1, thickness: 1, texture: null },
  { id: "ceramica-esmaltada", labelKey: "d3.mat.ceramica", family: "ceramica", color: [0.014, 0.076, 0.191], metalness: 0, roughness: 0.42, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.04, texture: null },
  { id: "porcelana", labelKey: "d3.mat.porcelana", family: "ceramica", color: [0.905, 0.88, 0.823], metalness: 0, roughness: 0.3, ior: 1.5, clearcoat: 0.8, clearcoatRoughness: 0.06, texture: null },
  { id: "marmore", labelKey: "d3.mat.marmore", family: "pedra", color: [0.839, 0.823, 0.791], metalness: 0, roughness: 0.18, ior: 1.49, clearcoat: 0.5, clearcoatRoughness: 0.1, texture: "marmore" },
  { id: "madeira-carvalho", labelKey: "d3.mat.carvalho", family: "madeira", color: [0.392, 0.198, 0.078], metalness: 0, roughness: 0.55, ior: 1.53, clearcoat: 0.35, clearcoatRoughness: 0.3, texture: "madeira" },
  { id: "concreto", labelKey: "d3.mat.concreto", family: "pedra", color: [0.332, 0.323, 0.301], metalness: 0, roughness: 0.92, ior: 1.5, texture: "concreto" },
  { id: "plastico-abs", labelKey: "d3.mat.plastico", family: "plastico", color: [0.687, 0.041, 0.024], metalness: 0, roughness: 0.38, ior: 1.46, texture: null },
  { id: "borracha", labelKey: "d3.mat.borracha", family: "borracha", color: [0.011, 0.011, 0.012], metalness: 0, roughness: 0.85, ior: 1.52, texture: null },
  { id: "veludo", labelKey: "d3.mat.veludo", family: "tecido", color: [0.105, 0.01, 0.027], metalness: 0, roughness: 0.9, sheen: 1, sheenColor: [0.694, 0.258, 0.366], sheenRoughness: 0.45, texture: null },
];

export const materialById = (id: string): MaterialPreset => MATERIALS.find((m) => m.id === id) ?? MATERIALS[0]!;

/** Regras físicas que todo preset precisa respeitar (testadas): valores no intervalo e metal sem transmissão. */
export function physicallyPlausible(m: MaterialPreset): boolean {
  const unit = (v: number | undefined) => v === undefined || (v >= 0 && v <= 1);
  const iorOk = m.ior === undefined || (m.ior >= 1 && m.ior <= 2.333);
  const metalRule = m.metalness === 1 ? !m.transmission : true;
  const inUnitCube = (c: LinearRGB | undefined) => c === undefined || c.every((v) => Number.isFinite(v) && v >= 0 && v <= 1);
  return inUnitCube(m.color) && inUnitCube(m.attenuationColor) && inUnitCube(m.sheenColor) && unit(m.metalness) && unit(m.roughness) && unit(m.clearcoat) && unit(m.transmission)
    && unit(m.sheen) && unit(m.anisotropy) && iorOk && metalRule;
}

/** Cor CSS de amostra (o quadradinho do inspetor) direto do valor linear, sem converter para hex. */
export const swatchCss = (c: LinearRGB) => `color(srgb-linear ${c[0]} ${c[1]} ${c[2]})`;
