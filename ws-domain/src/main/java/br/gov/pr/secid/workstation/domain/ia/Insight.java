package br.gov.pr.secid.workstation.domain.ia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Insight gerado pela IA sobre métricas do sistema (RF43 §2–4; D-12: a IA só interpreta) — TAXONOMIA §10.4. */
@DomainEntity(context = "10 IA do sistema", table = "insights", rfs = {"RF43", "RF19", "RF21"}, migration = 21,
        doc = "Insights por escopo (acervo, perfil, equipe, projeto). Sem FK no escopo (polimórfico).",
        indexes = {"scope, scope_id, generated_at", "dismissed_at"})
public record Insight(
        @Attr("identificador") UUID id,
        @Attr("escopo") InsightScope scope,
        @Attr("id do escopo") UUID scopeId,
        @Attr(value = "tipo", len = 60) String kind,
        @Attr(value = "título", len = 200) String title,
        @Attr(value = "corpo em Markdown", sql = "TEXT") String bodyMd,
        @Attr(value = "métricas [{metricCode, value, formula, source, proxy}]", opt = true) String metricRefsJson,
        @Attr(value = "ações de 1 clique", opt = true) String actionsJson,
        @Attr(value = "severidade", def = "'INFO'") InsightSeverity severity,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId,
        @Attr(value = "descartado em", opt = true) Instant dismissedAt,
        @Attr("gerado em") Instant generatedAt) {
}
