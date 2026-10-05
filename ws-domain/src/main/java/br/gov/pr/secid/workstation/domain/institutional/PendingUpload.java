package br.gov.pr.secid.workstation.domain.institutional;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Envio do cadastro antes de existir conta (RF1 bloco B, D-22) — TAXONOMIA §1.15; consumido em RF1/RF3, limpo pelo PendingUploadCleanupJob. */
@DomainEntity(context = "1 Identidade & Acesso", table = "pending_uploads", rfs = {"RF1", "RF3"}, migration = 10, audit = Audit.CREATED,
        doc = "Uploads pendentes do cadastro (avatar/identity/representation), expiram em 24 h; só consumidos uma vez e pelo mesmo kind.",
        indexes = {"expires_at", "consumed_by_user_id"})
public record PendingUpload(
        @Attr("identificador") UUID id,
        @Attr("tipo do envio") UploadKind kind,
        @Attr(value = "chave no storage (pending/… ou restricted/pending/…)", col = "object_key", len = 512, unique = true) String key,
        @Attr(value = "tipo real (magic bytes)", len = 127) String mimeType,
        @Attr("tamanho em bytes") long sizeBytes,
        @Attr(value = "largura", opt = true) Integer width,
        @Attr(value = "altura", opt = true) Integer height,
        @Attr(value = "SHA-256", sql = "CHAR(64)") String sha256,
        @Attr(value = "IP de origem", opt = true, len = 45) String ip,
        @Attr("expira em (+24 h)") Instant expiresAt,
        @Attr(value = "conta que consumiu", opt = true, ref = "users", onDelete = OnDelete.SET_NULL) UUID consumedByUserId,
        @Attr(value = "data do consumo", opt = true) Instant consumedAt) {

    public boolean isConsumed() {
        return consumedAt != null;
    }

    public boolean isExpired(Instant now) {
        return now.isAfter(expiresAt);
    }

    /** O cadastro só aceita upload do mesmo kind, não consumido e não vencido. */
    public boolean consumableAs(UploadKind expected, Instant now) {
        return kind == expected && !isConsumed() && !isExpired(now);
    }
}
