package br.gov.pr.secid.workstation.domain.plataforma;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/**
 * Varredura/quarentena de um objeto de mídia (Bloco 5, D-67; motor real na Q-165). Uma linha por objeto: nasce PENDENTE (ou
 * NAO_VERIFICADO com a porta no-op) e só LIMPO libera o binário quando o antivírus é obrigatório.
 */
@DomainEntity(context = "12 Plataforma", table = "media_scans", rfs = {"RF20", "RF34", "RF38", "RF41"}, migration = 24, audit = Audit.CREATED,
        doc = "Quarentena/antivírus por objeto de mídia (filho de media_objects → CASCADE); única por media_id. Tipo detectado por magic bytes.",
        indexes = {"status, created_at"})
public record MediaScan(
        @Attr("identificador") UUID id,
        @Attr(value = "objeto de mídia", ref = "media_objects", onDelete = OnDelete.CASCADE, unique = true) UUID mediaId,
        @Attr(value = "situação da varredura", def = "'PENDENTE'") MediaScanStatus status,
        @Attr(value = "tipo detectado (magic bytes)", len = 20) String detectedType,
        @Attr(value = "motor de antivírus", opt = true, len = 40) String engine,
        @Attr(value = "ameaça detectada", opt = true, len = 200) String threatName,
        @Attr(value = "varrido em", opt = true) Instant scannedAt) {

    public boolean servable(boolean antivirusRequired) {
        return status != null && status.servable(antivirusRequired);
    }
}
