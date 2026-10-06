package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.decisao.analise.RiskSeverity;

import java.util.UUID;

/** Risco (§4.2). A severidade é calculada pela matriz probabilidade × impacto (§6.6), nunca digitada — por isso não há coluna. */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_risks", rfs = {"RF29", "RF43"}, migration = 22,
        doc = "Riscos (filho da decisão → CASCADE); dono RESTRICT; alternativa e inferência de IA SET NULL. Severidade calculada (sem coluna).",
        indexes = {"decision_id, status", "alternative_id"})
public record DecisionRisk(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr(value = "título", len = 200) String title,
        @Attr(value = "descrição", opt = true, sql = "TEXT") String description,
        @Attr(value = "alternativa (nulo = risco da decisão)", opt = true, ref = "decision_alternatives", onDelete = OnDelete.SET_NULL) UUID alternativeId,
        @Attr("probabilidade") Likelihood likelihood,
        @Attr("impacto") DecisionLevel impact,
        @Attr(value = "mitigação", opt = true, sql = "TEXT") String mitigation,
        @Attr(value = "dono", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID ownerUserId,
        @Attr(value = "fonte", def = "'MANUAL'") RiskSource source,
        @Attr(value = "estado", def = "'ABERTO'") RiskStatus status,
        @Attr(value = "origem", def = "'HUMANO'") ContentOrigin origin,
        @Attr(value = "inferência de IA", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId) {

    /** Severidade pela matriz §6.6. */
    public DecisionLevel severity() {
        return RiskSeverity.of(likelihood, impact);
    }
}
