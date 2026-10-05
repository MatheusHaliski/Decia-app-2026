package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Resumo analítico (RF11) — TAXONOMIA §5.9; base da decisão (RF12), cita conformidade (RF32.CA05) e Memória (RF33). */
@DomainEntity(context = "5 DECIA sessão", table = "analytical_summaries", rfs = {"RF11", "RF12", "RF29", "RF31", "RF32", "RF33"}, migration = 14,
        doc = "Resumos versionados por sessão (filho → CASCADE).",
        uniques = {"session_id, version_number"})
public record AnalyticalSummary(
        @Attr("identificador") UUID id,
        @Attr(value = "sessão", ref = "decia_sessions", onDelete = OnDelete.CASCADE) UUID sessionId,
        @Attr("versão") int versionNumber,
        @Attr("gerado em") Instant generatedAt,
        @Attr(value = "argumentos", opt = true) String argumentsJson,
        @Attr(value = "consensos", opt = true) String consensusJson,
        @Attr(value = "divergências", opt = true) String divergencesJson,
        @Attr(value = "riscos", opt = true) String risksJson,
        @Attr(value = "pontos de atenção", opt = true) String attentionPointsJson,
        @Attr(value = "recomendações [{text, affectedTaskIds, affectedProjectIds, planAxisId, citations[]}] (RF29.CA08)", opt = true)
        String recommendationsJson,
        @Attr(value = "critérios de avaliação", opt = true) String evaluationCriteriaJson,
        @Attr(value = "conformidade citada (RF32.CA05)", opt = true, ref = "compliance_results", onDelete = OnDelete.SET_NULL) UUID complianceResultId,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId,
        @Attr(value = "estado", def = "'RASCUNHO'") SummaryStatus status) {
}
