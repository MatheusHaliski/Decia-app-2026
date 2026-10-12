package br.gov.pr.secid.workstation.domain.decisao.analise;

import br.gov.pr.secid.workstation.domain.decisao.DecisionRules;

/** Faixa da confiança humana (§6.9, G11 sem precisão falsa): BAIXA &lt; 40 ≤ MEDIA &lt; 70 ≤ ALTA; entrada 0–100 em passos de 5. */
public enum ConfidenceBand {
    BAIXA, MEDIA, ALTA;

    public static ConfidenceBand of(int pct) {
        DecisionRules.confidence(pct, "confidencePct");
        if (pct < 40) {
            return BAIXA;
        }
        return pct < 70 ? MEDIA : ALTA;
    }
}
