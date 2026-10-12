package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Créditos de IA comprados/ganhos/consumidos (RF42.CA06, RF39.CA10) — TAXONOMIA §7.6. APPEND-ONLY. */
@DomainEntity(context = "8 Gamificação", table = "ai_credit_ledger", rfs = {"RF42", "RF39", "RF43"}, migration = 17, audit = Audit.CREATED,
        doc = "Extrato de créditos de IA (append-only). user_id/department_id RESTRICT.",
        indexes = {"user_id, created_at", "department_id, created_at", "expires_at"})
public record AiCreditLedgerEntry(
        @Attr("identificador") UUID id,
        @Attr(value = "usuário", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID userId,
        @Attr(value = "departamento (cota compartilhada)", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr("variação (±)") long delta,
        @Attr("origem") AiCreditSource source,
        @Attr(value = "referência (compra, benefício, inferência)", opt = true) UUID refId,
        @Attr(value = "expira em", opt = true) Instant expiresAt) {
}
