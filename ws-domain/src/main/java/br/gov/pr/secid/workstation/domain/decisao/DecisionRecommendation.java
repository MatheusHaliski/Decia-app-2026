package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.decisao.analise.RecommendationValidator;

import java.util.UUID;

/**
 * Recomendação — crítica, não eco (§7). Responde obrigatoriamente: o que sustenta, o que contradiz, que premissas importam, o que mudaria a
 * resposta + limitações; sem conteúdo em {@code supportingJson} E em {@code contradictingJson} é rejeitada ({@link RecommendationValidator}).
 * MODELO = líder determinística da matriz (§6.1); IA = sugestão com ✦.
 */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_recommendations", rfs = {"RF29", "RF43"}, migration = 22,
        doc = "Recomendações (filho da decisão → CASCADE); alternativa e inferência de IA SET NULL. Os 4 porquês são obrigatórios no domínio.",
        indexes = {"decision_id, status"})
public record DecisionRecommendation(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr(value = "alternativa recomendada", opt = true, ref = "decision_alternatives", onDelete = OnDelete.SET_NULL) UUID alternativeId,
        @Attr("fonte (modelo/IA)") RecommendationSource source,
        @Attr(value = "raciocínio (Markdown)", sql = "TEXT") String reasoningMd,
        @Attr("o que sustenta") String supportingJson,
        @Attr("o que contradiz") String contradictingJson,
        @Attr("premissas críticas") String criticalAssumptionIdsJson,
        @Attr(value = "limitações (Markdown)", sql = "TEXT") String limitationsMd,
        @Attr(value = "o que mudaria a resposta (Markdown)", sql = "TEXT") String whatWouldChangeMd,
        @Attr(value = "versão do modelo", len = 40) String modelVersion,
        @Attr(value = "inferência de IA", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId,
        @Attr(value = "estado", def = "'SUGERIDA'") RecommendationStatus status) {

    public DecisionRecommendation {
        RecommendationValidator.validate(reasoningMd, supportingJson, contradictingJson, criticalAssumptionIdsJson, limitationsMd, whatWouldChangeMd);
    }
}
