package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Reconhecimento / medalha (= FAI cupom/medalha) — TAXONOMIA §6.7 (RF35.CA04, RF28.CA05; perfil RF19; pontos RF42). */
@DomainEntity(context = "8 Gamificação", table = "recognitions", rfs = {"RF35", "RF28", "RF19", "RF39", "RF42"}, migration = 17, audit = Audit.CREATED,
        store = Store.MYSQL_S3,
        doc = "Reconhecimentos emitidos a pessoas. Emissor RESTRICT; recebedor RESTRICT (trilha de mérito).",
        indexes = {"recipient_user_id, issued_at", "issuer_user_id"})
public record Recognition(
        @Attr("identificador") UUID id,
        @Attr(value = "emissor", ref = "users", onDelete = OnDelete.RESTRICT) UUID issuerUserId,
        @Attr(value = "recebedor", ref = "users", onDelete = OnDelete.RESTRICT) UUID recipientUserId,
        @Attr(value = "nome", len = 160) String name,
        @Attr(value = "arte da medalha", opt = true) String medalArtJson,
        @Attr(value = "critério", opt = true, len = 500) String criterion,
        @Attr(value = "origem", def = "'MANUAL'") RecognitionSource source,
        @Attr(value = "id da meta/benefício de origem", opt = true) UUID sourceId,
        @Attr(value = "válido até", opt = true) LocalDate validUntil,
        @Attr("emitido em") Instant issuedAt,
        @Attr(value = "público no Mural", def = "TRUE") boolean publicOnMural,
        @Attr(value = "certificado PDF", opt = true, ref = "media_objects", onDelete = OnDelete.SET_NULL) UUID certificateMediaId) {
}
