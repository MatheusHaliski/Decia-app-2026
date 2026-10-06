package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.util.UUID;

/** Critério escolhido por decisão, nunca universal (§4.2). {@code weightPct} em 0–100; a soma 100 ± 0,01 é regra da matriz (§6.1). */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_criteria", rfs = {"RF29", "RF31"}, migration = 22,
        doc = "Critérios (filho da decisão → CASCADE); inferência de IA SET NULL. Peso DECIMAL(5,2) em 0–100. Único (decisão, nome).",
        uniques = {"decision_id, name"}, indexes = {"decision_id, position"},
        checks = {"weight_pct IS NULL OR weight_pct BETWEEN 0 AND 100", "position >= 0"})
public record DecisionCriterion(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr(value = "nome", len = 120) String name,
        @Attr(value = "descrição", opt = true, len = 1000) String description,
        @Attr(value = "direção (só dica de interface)", def = "'MAIOR_MELHOR'") CriterionDirection direction,
        @Attr(value = "peso %", opt = true, sql = "DECIMAL(5,2)") BigDecimal weightPct,
        @Attr(value = "chave do catálogo de critérios", opt = true, len = 60) String catalogKey,
        @Attr(value = "origem", def = "'HUMANO'") ContentOrigin origin,
        @Attr(value = "inferência de IA", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId,
        @Attr("posição") int position) {

    public DecisionCriterion {
        DecisionRules.weight(weightPct);
    }
}
