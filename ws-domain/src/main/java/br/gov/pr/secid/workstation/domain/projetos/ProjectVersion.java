package br.gov.pr.secid.workstation.domain.projetos;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Versão do projeto (RF22.CA02/CA06) — TAXONOMIA §3.4; cada alteração estrutural gera uma. */
@DomainEntity(context = "3 Criador de Projetos", table = "project_versions", rfs = {"RF22", "RF31"}, migration = 12, audit = Audit.CREATED,
        doc = "Histórico de versões (append-only por projeto). Autor RESTRICT; restauração/cenário de origem SET NULL.",
        uniques = {"project_id, version_number"})
public record ProjectVersion(
        @Attr("identificador") UUID id,
        @Attr(value = "projeto", ref = "project_schemes", onDelete = OnDelete.CASCADE) UUID projectId,
        @Attr("número") int versionNumber,
        @Attr(value = "autor", ref = "users", onDelete = OnDelete.RESTRICT) UUID authorId,
        @Attr(value = "diff legível", opt = true) String diffJson,
        @Attr("snapshot completo") String snapshotJson,
        @Attr(value = "motivo (obrigatório ao reabrir)", opt = true, len = 500) String reason,
        @Attr(value = "restaurada da versão", opt = true, ref = "project_versions", onDelete = OnDelete.SET_NULL) UUID restoredFromVersionId,
        @Attr(value = "cenário aplicado (RF31)", opt = true, ref = "project_scenarios", onDelete = OnDelete.SET_NULL) UUID sourceScenarioId) {
}
