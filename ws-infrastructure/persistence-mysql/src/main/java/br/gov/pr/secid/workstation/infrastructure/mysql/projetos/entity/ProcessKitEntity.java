package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity;

import br.gov.pr.secid.workstation.domain.acervo.ProcessTag;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.UUID;

/**
 * Entidade JPA de {@code process_kits} (ProcessKit — 3 Criador de Projetos; RF21, RF40, RF43). Gerada pelo SchemaGenerator
 * a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como
 * String; JSON como String.
 */
@Entity
@Table(name = "process_kits")
public class ProcessKitEntity extends AuditableEntity {

    @Column(name = "owner_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID ownerId;

    @Column(name = "department_id", columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "emoji")
    private String emoji;

    @Enumerated(EnumType.STRING)
    @Column(name = "process_tag")
    private ProcessTag processTag;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    private Visibility visibility;

    @Column(name = "offered_in_counter", nullable = false)
    private boolean offeredInCounter;

    @Column(name = "seal_ids_json", columnDefinition = "JSON")
    private String sealIdsJson;

    @Column(name = "remix_count", nullable = false)
    private int remixCount;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(UUID ownerId) {
        this.ownerId = ownerId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getEmoji() {
        return emoji;
    }

    public void setEmoji(String emoji) {
        this.emoji = emoji;
    }

    public ProcessTag getProcessTag() {
        return processTag;
    }

    public void setProcessTag(ProcessTag processTag) {
        this.processTag = processTag;
    }

    public Visibility getVisibility() {
        return visibility;
    }

    public void setVisibility(Visibility visibility) {
        this.visibility = visibility;
    }

    public boolean isOfferedInCounter() {
        return offeredInCounter;
    }

    public void setOfferedInCounter(boolean offeredInCounter) {
        this.offeredInCounter = offeredInCounter;
    }

    public String getSealIdsJson() {
        return sealIdsJson;
    }

    public void setSealIdsJson(String sealIdsJson) {
        this.sealIdsJson = sealIdsJson;
    }

    public int getRemixCount() {
        return remixCount;
    }

    public void setRemixCount(int remixCount) {
        this.remixCount = remixCount;
    }

    public long getVersion() {
        return version;
    }
}
