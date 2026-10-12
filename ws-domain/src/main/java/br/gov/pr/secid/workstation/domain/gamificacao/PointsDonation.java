package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Doação de DECIA Points entre pessoas (RF42.CA09, limite mensal da empresa) — TAXONOMIA §7.7. */
@DomainEntity(context = "8 Gamificação", table = "points_donations", rfs = {"RF42"}, migration = 17, audit = Audit.CREATED,
        doc = "Doações (par de lançamentos). RESTRICT em pessoas e lançamentos.",
        indexes = {"from_user_id, month_key", "to_user_id, month_key"}, checks = {"points > 0", "from_user_id <> to_user_id"})
public record PointsDonation(
        @Attr("identificador") UUID id,
        @Attr(value = "doador", ref = "users", onDelete = OnDelete.RESTRICT) UUID fromUserId,
        @Attr(value = "beneficiário", ref = "users", onDelete = OnDelete.RESTRICT) UUID toUserId,
        @Attr("pontos") int points,
        @Attr(value = "mensagem", opt = true, len = 300) String message,
        @Attr(value = "lançamento de débito", ref = "decia_points_ledger", onDelete = OnDelete.RESTRICT) UUID ledgerDebitId,
        @Attr(value = "lançamento de crédito", ref = "decia_points_ledger", onDelete = OnDelete.RESTRICT) UUID ledgerCreditId,
        @Attr(value = "mês (AAAA-MM) para o limite", sql = "CHAR(7)") String monthKey) {

    public PointsDonation {
        if (points <= 0) {
            throw new IllegalArgumentException("VALIDACAO: points > 0");
        }
        if (fromUserId.equals(toUserId)) {
            throw new IllegalArgumentException("VALIDACAO: doação para si mesmo");
        }
    }
}
