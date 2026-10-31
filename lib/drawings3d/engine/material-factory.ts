/**
 * Fábrica de materiais (Factory Method + Flyweight): cada preset do catálogo (`../materials`) vira UM `MeshPhysicalMaterial`,
 * compartilhado por todos os objetos que o usam. O mesmo material serve ao rasterizador e ao path tracer, que lê os mesmos
 * parâmetros físicos (IOR, transmissão, verniz, sheen, anisotropia) — por isso os dois modos mostram o mesmo vidro e o mesmo metal.
 */
import { Color, MeshPhysicalMaterial, Vector2 } from "three";
import { materialById, type MaterialPreset } from "../materials";
import { proceduralTextures } from "./textures";

const cache = new Map<string, MeshPhysicalMaterial>();

/** Intensidade do relevo do normal map por textura (concreto poroso marca mais que o mármore polido). */
const NORMAL_STRENGTH = { madeira: 0.35, concreto: 0.8, escovado: 0.25, marmore: 0.1 } as const;

function build(preset: MaterialPreset): MeshPhysicalMaterial {
  const m = new MeshPhysicalMaterial({
    name: preset.id,
    color: new Color(...preset.color),
    metalness: preset.metalness,
    roughness: preset.roughness,
    ior: preset.ior ?? 1.5,
    clearcoat: preset.clearcoat ?? 0,
    clearcoatRoughness: preset.clearcoatRoughness ?? 0,
    transmission: preset.transmission ?? 0,
    thickness: preset.thickness ?? 0,
    attenuationColor: new Color(...(preset.attenuationColor ?? [1, 1, 1])),
    attenuationDistance: preset.attenuationDistance ?? Infinity,
    sheen: preset.sheen ?? 0,
    sheenColor: new Color(...(preset.sheenColor ?? [0, 0, 0])),
    sheenRoughness: preset.sheenRoughness ?? 1,
    anisotropy: preset.anisotropy ?? 0,
    specularIntensity: preset.specularIntensity ?? 1,
    envMapIntensity: 1,
  });
  const textures = proceduralTextures(preset.texture);
  if (textures && preset.texture) {
    m.map = textures.map;
    m.roughnessMap = textures.roughnessMap;
    m.normalMap = textures.normalMap;
    const s = NORMAL_STRENGTH[preset.texture];
    m.normalScale = new Vector2(s, s);
  }
  // vidro fica só com a face da frente: no rasterizador, as duas faces refratam em dobro e o vidro sai leitoso; o path tracer
  // trata material transmissivo como volume sólido (entrada e saída) independentemente do `side`
  return m;
}

/** Material compartilhado de um preset (criado na primeira vez). Id desconhecido cai no primeiro preset. */
export function physicalMaterial(id: string): MeshPhysicalMaterial {
  const preset = materialById(id);
  let m = cache.get(preset.id);
  if (!m) {
    m = build(preset);
    cache.set(preset.id, m);
  }
  return m;
}

export function disposeMaterials(): void {
  cache.forEach((m) => m.dispose());
  cache.clear();
}
