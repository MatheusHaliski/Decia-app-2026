/**
 * Níveis de qualidade de render (padrão Strategy): a viewport recebe uma estratégia e aplica as escolhas dela, sem `if` espalhado.
 * Do mais leve ao fotorrealista:
 * - interativo: sombras simples, sem pós-processamento — para máquinas modestas e edição rápida;
 * - alta: PBR completo, sombras suaves em alta resolução, oclusão de ambiente (GTAO) e antisserrilhado MSAA;
 * - fotorrealista: o mesmo da alta enquanto a câmera se move e, parada, path tracing progressivo (iluminação global com rebotes,
 *   refração real no vidro, cáusticas e sombras de área) que converge para uma imagem de qualidade fotográfica.
 */
export type QualityId = "interativo" | "alta" | "fotorrealista";

export interface QualityStrategy {
  id: QualityId;
  labelKey: string;
  hintKey: string;
  /** Teto do devicePixelRatio (custo quadrático). */
  maxPixelRatio: number;
  shadowMapSize: number;
  /** Raio do desfoque da sombra (PCF suave). */
  shadowRadius: number;
  msaaSamples: number;
  ambientOcclusion: boolean;
  pathTracing: false | { bounces: number; transmissiveBounces: number; filterGlossyFactor: number; minSamples: number; targetSamples: number };
}

export const QUALITY: Record<QualityId, QualityStrategy> = {
  interativo: {
    id: "interativo", labelKey: "d3.q.interativo", hintKey: "d3.q.interativoHint",
    maxPixelRatio: 1, shadowMapSize: 1024, shadowRadius: 2, msaaSamples: 0, ambientOcclusion: false, pathTracing: false,
  },
  alta: {
    id: "alta", labelKey: "d3.q.alta", hintKey: "d3.q.altaHint",
    maxPixelRatio: 2, shadowMapSize: 4096, shadowRadius: 6, msaaSamples: 4, ambientOcclusion: true, pathTracing: false,
  },
  fotorrealista: {
    id: "fotorrealista", labelKey: "d3.q.foto", hintKey: "d3.q.fotoHint",
    maxPixelRatio: 2, shadowMapSize: 4096, shadowRadius: 6, msaaSamples: 4, ambientOcclusion: true,
    pathTracing: { bounces: 8, transmissiveBounces: 12, filterGlossyFactor: 0.5, minSamples: 3, targetSamples: 512 },
  },
};

export const QUALITY_ORDER: readonly QualityId[] = ["interativo", "alta", "fotorrealista"];

/** Escolha inicial pela capacidade declarada do aparelho (núcleos e memória); a pessoa pode trocar a qualquer momento. */
export function suggestedQuality(hardwareConcurrency: number | undefined, deviceMemoryGb: number | undefined): QualityId {
  const cores = hardwareConcurrency ?? 4;
  const memory = deviceMemoryGb ?? 4;
  if (cores <= 2 || memory <= 2) return "interativo";
  return "alta";
}
