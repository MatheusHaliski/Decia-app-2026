package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.util.UUID;

/** Alternativa (positions do IBIS, §4.2). "Não agir" ({@code doNothing}) é alternativa de primeira classe; DESCARTADA exige motivo. */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_alternatives", rfs = {"RF29", "RF11", "RF31", "RF43"}, migration = 22,
        doc = "Alternativas (filho da decisão → CASCADE); cenário do resumo/simulador e inferência de IA SET NULL. Único (decisão, rótulo).",
        uniques = {"decision_id, label"}, indexes = {"decision_id, status, position"},
        checks = {"estimated_cost IS NULL OR estimated_cost >= 0", "estimated_duration_days IS NULL OR estimated_duration_days >= 0", "position >= 0"})
public record DecisionAlternative(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr(value = "rótulo (A, B…)", len = 4) String label,
        @Attr(value = "título", len = 160) String title,
        @Attr(value = "descrição", opt = true, sql = "TEXT") String description,
        @Attr("é \"não agir\"") boolean doNothing,
        @Attr(value = "prós", opt = true) String prosJson,
        @Attr(value = "contras", opt = true) String consJson,
        @Attr(value = "custo estimado", opt = true) BigDecimal estimatedCost,
        @Attr(value = "duração estimada (dias)") Integer estimatedDurationDays,
        @Attr(value = "dependências (Markdown)", opt = true, sql = "TEXT") String dependenciesMd,
        @Attr(value = "estado", def = "'ATIVA'") AlternativeStatus status,
        @Attr(value = "motivo do descarte", opt = true, len = 500) String discardReason,
        @Attr(value = "origem", def = "'HUMANO'") ContentOrigin origin,
        @Attr(value = "inferência de IA", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId,
        @Attr(value = "cenário do resumo da sessão", opt = true, ref = "summary_scenarios", onDelete = OnDelete.SET_NULL) UUID summaryScenarioId,
        @Attr(value = "cenário do simulador (RF31)", opt = true, ref = "project_scenarios", onDelete = OnDelete.SET_NULL) UUID projectScenarioId,
        @Attr("posição") int position) {

    public DecisionAlternative {
        if (status == AlternativeStatus.DESCARTADA && DecisionRules.blank(discardReason)) {
            throw DecisionRules.invalid("alternativa DESCARTADA exige motivo");
        }
    }

    public boolean isActive() {
        return status == AlternativeStatus.ATIVA;
    }
}
