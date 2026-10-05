package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.identity.DeskSkin;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.UUID;

/**
 * Entidade JPA de {@code team_desks} (TeamDesk — 3 Criador de Projetos; RF21, RF22). Gerada pelo SchemaGenerator a partir
 * do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String;
 * JSON como String.
 */
@Entity
@Table(name = "team_desks")
public class TeamDeskEntity extends AuditableEntity {

    @Column(name = "department_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Column(name = "layout_json", columnDefinition = "JSON")
    private String layoutJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "desk_skin", nullable = false)
    private DeskSkin deskSkin;

    @Column(name = "updated_by", columnDefinition = "BINARY(16)")
    private UUID updatedBy;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public String getLayoutJson() {
        return layoutJson;
    }

    public void setLayoutJson(String layoutJson) {
        this.layoutJson = layoutJson;
    }

    public DeskSkin getDeskSkin() {
        return deskSkin;
    }

    public void setDeskSkin(DeskSkin deskSkin) {
        this.deskSkin = deskSkin;
    }

    public UUID getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(UUID updatedBy) {
        this.updatedBy = updatedBy;
    }

    public long getVersion() {
        return version;
    }
}
