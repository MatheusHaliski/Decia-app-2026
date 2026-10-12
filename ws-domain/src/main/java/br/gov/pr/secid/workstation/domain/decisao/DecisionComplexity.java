package br.gov.pr.secid.workstation.domain.decisao;

/**
 * Complexidade e divulgação progressiva (§4.4). {@link #suggest} é a sugestão automática (DESIGN PROPOSAL; o usuário sempre pode trocar):
 * impacto ALTO/CRITICO ou ≥ 5 participantes → PROFUNDA; impacto MEDIO ou ≥ 3 alternativas → PADRAO; resto → RAPIDA.
 */
public enum DecisionComplexity {
    RAPIDA, PADRAO, PROFUNDA;

    public static DecisionComplexity suggest(DecisionLevel impact, int participants, int alternatives) {
        if (impact != null && impact.atLeast(DecisionLevel.ALTO) || participants >= 5) {
            return PROFUNDA;
        }
        if (impact == DecisionLevel.MEDIO || alternatives >= 3) {
            return PADRAO;
        }
        return RAPIDA;
    }
}
