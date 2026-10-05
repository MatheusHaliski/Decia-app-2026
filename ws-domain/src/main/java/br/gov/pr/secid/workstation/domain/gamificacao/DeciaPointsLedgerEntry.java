package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Lançamento de DECIA Points (= FAI FaiPointsLedgerEntry) — TAXONOMIA §7.2 (RF42; lido em RF19, RF35, RF39, RF40, RF43, RF45).
 * APPEND-ONLY: estorno é lançamento novo; idempotente por {@code idempotencyKey}. Contas sintéticas nunca pontuam (D-23).
 */
@DomainEntity(context = "8 Gamificação", table = "decia_points_ledger", rfs = {"RF42", "RF19", "RF35", "RF39", "RF40", "RF43", "RF45"}, migration = 17,
        audit = Audit.CREATED, store = Store.MYSQL_REDIS,
        doc = "Extrato de DECIA Points, append-only. RESTRICT em tudo (financeiro): usuário, contraparte, revisor, regra, sessão.",
        indexes = {"user_id, created_at", "user_id, status", "event_code, created_at", "expires_at", "session_id"},
        checks = {"quality_multiplier BETWEEN 0.5 AND 2.0"})
public record DeciaPointsLedgerEntry(
        @Attr("identificador") UUID id,
        @Attr(value = "titular do extrato", ref = "users", onDelete = OnDelete.RESTRICT) UUID userId,
        @Attr("variação (±)") long delta,
        @Attr("evento") PointsEvent eventCode,
        @Attr(value = "tipo da referência", opt = true, len = 40) String refType,
        @Attr(value = "id da referência", opt = true) UUID refId,
        @Attr(value = "sessão DECIA", opt = true, ref = "decia_sessions", onDelete = OnDelete.RESTRICT) UUID sessionId,
        @Attr(value = "versão da regra aplicada", opt = true, ref = "decia_points_rules", onDelete = OnDelete.RESTRICT) UUID ruleVersionId,
        @Attr(value = "multiplicador de qualidade 0,5–2,0", sql = "DECIMAL(3,2)", def = "1.00") BigDecimal qualityMultiplier,
        @Attr(value = "chave idempotente (tipo+idEvento+usuário)", len = 160, unique = true) String idempotencyKey,
        @Attr(value = "situação", def = "'CONFIRMADO'") LedgerStatus status,
        @Attr(value = "motivo da suspensão", opt = true, len = 300) String suspendedReason,
        @Attr(value = "revisor", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID reviewedBy,
        @Attr(value = "contraparte (transferência/doação)", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID counterpartyUserId,
        @Attr(value = "correlação", opt = true, len = 64) String correlationId,
        @Attr(value = "expira em (RF42.CA09)", opt = true) Instant expiresAt) {

    public DeciaPointsLedgerEntry {
        if (qualityMultiplier != null
                && (qualityMultiplier.compareTo(new BigDecimal("0.5")) < 0 || qualityMultiplier.compareTo(new BigDecimal("2.0")) > 0)) {
            throw new IllegalArgumentException("VALIDACAO: qualityMultiplier entre 0,5 e 2,0");
        }
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("VALIDACAO: idempotencyKey obrigatória");
        }
    }

    /** Pontos efetivos: delta × multiplicador, arredondado. */
    public long effectivePoints() {
        if (qualityMultiplier == null) {
            return delta;
        }
        return BigDecimal.valueOf(delta).multiply(qualityMultiplier).setScale(0, java.math.RoundingMode.HALF_UP).longValue();
    }
}
