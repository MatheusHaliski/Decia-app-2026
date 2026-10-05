package br.gov.pr.secid.workstation.domain.rastro;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.time.Instant;
import java.util.UUID;

/** Histórico salvo da sessão (RF17) — TAXONOMIA §11.3; JSON/PDF em S3 com checksum; lido em RF18, RF33. */
@DomainEntity(context = "6 Rastro de Decisão", table = "session_archives", rfs = {"RF17", "RF18", "RF33"}, migration = 15, audit = Audit.NONE,
        store = Store.MYSQL_S3,
        doc = "Um arquivo por sessão encerrada. RESTRICT na sessão (o histórico segura a sessão); mídias SET NULL.",
        indexes = {"archived_at"})
public record SessionArchive(
        @Attr("identificador") UUID id,
        @Attr(value = "sessão", ref = "decia_sessions", onDelete = OnDelete.RESTRICT, unique = true) UUID sessionId,
        @Attr(value = "exportação JSON", opt = true, ref = "media_objects", onDelete = OnDelete.SET_NULL) UUID exportJsonMediaId,
        @Attr(value = "exportação PDF", opt = true, ref = "media_objects", onDelete = OnDelete.SET_NULL) UUID exportPdfMediaId,
        @Attr("mensagens arquivadas") int messageCount,
        @Attr(value = "SHA-256 do export", sql = "CHAR(64)") String checksum,
        @Attr("arquivada em") Instant archivedAt,
        @Attr("encerrada sem decisão") boolean closedWithoutDecision,
        @Attr(value = "motivo do encerramento", opt = true, len = 500) String closeReason,
        @Attr(value = "snapshot analítico", opt = true) String analyticsSnapshotJson) {
}
