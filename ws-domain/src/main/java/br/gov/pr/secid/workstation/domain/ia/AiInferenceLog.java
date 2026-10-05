package br.gov.pr.secid.workstation.domain.ia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.AiMode;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Trilha de cada chamada de IA (= FAI) — TAXONOMIA §10.1; tabela criada no V2 (APPEND-ONLY, RESTRICT). Lida em RF18, RF28 e todo RF com IA. */
@DomainEntity(context = "10 IA do sistema", table = "ai_inference_log", rfs = {"RF43", "RF7", "RF11", "RF18", "RF28", "RF30", "RF33", "RF34"},
        migration = 2, audit = Audit.CREATED,
        doc = "V2: append-only; user_id/reviewed_by RESTRICT; capability sem CHECK (cresce por RF); department_id ganha FK RESTRICT no V10.")
public record AiInferenceLog(
        @Attr("identificador") UUID id,
        @Attr(value = "usuário (nulo = job do sistema)", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID userId,
        @Attr(value = "departamento", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "capacidade", len = 40) AiCapability capability,
        @Attr(value = "RF que chamou", opt = true, len = 10) String hostRf,
        @Attr("provedor") AiProvider provider,
        @Attr(value = "modelo", opt = true, len = 80) String model,
        @Attr(value = "modo", def = "'ECONOMIA'") AiMode mode,
        @Attr(value = "latência ms", opt = true, sql = "INT UNSIGNED") Integer latencyMs,
        @Attr(value = "tokens de entrada", opt = true, sql = "INT UNSIGNED") Integer inputTokens,
        @Attr(value = "tokens de saída", opt = true, sql = "INT UNSIGNED") Integer outputTokens,
        @Attr(value = "custo estimado USD", opt = true, sql = "DECIMAL(10, 6)") BigDecimal estimatedCostUsd,
        @Attr("resultado") InferenceResult result,
        @Attr("usou fallback") boolean fallbackUsed,
        @Attr(value = "campos mascarados (LGPD)", opt = true) String maskedFieldsJson,
        @Attr(value = "resumo da entrada", opt = true) String inputSummaryJson,
        @Attr(value = "resumo da saída", opt = true, sql = "TEXT") String outputSummary,
        @Attr(value = "confiança", opt = true, sql = "DECIMAL(4, 3)") BigDecimal confidence,
        @Attr(value = "revisor humano", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID reviewedBy,
        @Attr(value = "revisado em", opt = true) Instant reviewedAt,
        @Attr(value = "fonte da cota", opt = true) QuotaSource quotaSource,
        @Attr(value = "correlação", opt = true, len = 64) String correlationId) {
}
