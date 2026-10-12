package br.gov.pr.secid.workstation.domain.projetos;

import br.gov.pr.secid.workstation.domain.acervo.ProcessTag;
import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.Visibility;

import java.util.UUID;

/** Kit de Processo (= FAI Cápsula) — TAXONOMIA §3.10 (RF21; oferecido no Balcão RF40; métricas RF43). */
@DomainEntity(context = "3 Criador de Projetos", table = "process_kits", rfs = {"RF21", "RF40", "RF43"}, migration = 12, versioned = true,
        doc = "Kits de tarefas-modelo por processo. Dono → CASCADE.",
        indexes = {"owner_id", "department_id, process_tag"})
public record ProcessKit(
        @Attr("identificador") UUID id,
        @Attr(value = "dono", ref = "users", onDelete = OnDelete.CASCADE) UUID ownerId,
        @Attr(value = "departamento", opt = true, ref = "departments", onDelete = OnDelete.RESTRICT) UUID departmentId,
        @Attr(value = "nome", len = 160) String name,
        @Attr(value = "descrição", opt = true, sql = "TEXT") String description,
        @Attr(value = "emoji", opt = true, len = 16) String emoji,
        @Attr(value = "processo", opt = true) ProcessTag processTag,
        @Attr(value = "visibilidade", def = "'PRIVADA'") Visibility visibility,
        @Attr("oferecido no Balcão") boolean offeredInCounter,
        @Attr(value = "chancelas (cache)", opt = true) String sealIdsJson,
        @Attr("remixes") int remixCount) {
}
