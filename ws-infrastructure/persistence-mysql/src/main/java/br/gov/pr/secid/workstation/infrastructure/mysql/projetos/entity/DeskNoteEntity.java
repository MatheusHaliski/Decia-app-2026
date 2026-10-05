package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.projetos.DeskScope;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Entidade JPA de {@code desk_notes} (DeskNote — 3 Criador de Projetos; RF21, RF22). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "desk_notes")
public class DeskNoteEntity extends AuditableEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "desk_scope", nullable = false)
    private DeskScope deskScope;

    @Column(name = "scope_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID scopeId;

    @Column(name = "author_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID authorId;

    @Column(name = "content_md", nullable = false, columnDefinition = "TEXT")
    private String contentMd;

    @Column(name = "color")
    private String color;

    @Column(name = "canvas_x", nullable = false)
    private BigDecimal canvasX;

    @Column(name = "canvas_y", nullable = false)
    private BigDecimal canvasY;

    @Column(name = "canvas_scale", nullable = false)
    private BigDecimal canvasScale;

    @Column(name = "canvas_rotation", nullable = false)
    private BigDecimal canvasRotation;

    @Column(name = "canvas_layer", nullable = false)
    private int canvasLayer;

    @Column(name = "pinned", nullable = false)
    private boolean pinned;

    @Column(name = "active", nullable = false)
    private boolean active;

    public DeskScope getDeskScope() {
        return deskScope;
    }

    public void setDeskScope(DeskScope deskScope) {
        this.deskScope = deskScope;
    }

    public UUID getScopeId() {
        return scopeId;
    }

    public void setScopeId(UUID scopeId) {
        this.scopeId = scopeId;
    }

    public UUID getAuthorId() {
        return authorId;
    }

    public void setAuthorId(UUID authorId) {
        this.authorId = authorId;
    }

    public String getContentMd() {
        return contentMd;
    }

    public void setContentMd(String contentMd) {
        this.contentMd = contentMd;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public BigDecimal getCanvasX() {
        return canvasX;
    }

    public void setCanvasX(BigDecimal canvasX) {
        this.canvasX = canvasX;
    }

    public BigDecimal getCanvasY() {
        return canvasY;
    }

    public void setCanvasY(BigDecimal canvasY) {
        this.canvasY = canvasY;
    }

    public BigDecimal getCanvasScale() {
        return canvasScale;
    }

    public void setCanvasScale(BigDecimal canvasScale) {
        this.canvasScale = canvasScale;
    }

    public BigDecimal getCanvasRotation() {
        return canvasRotation;
    }

    public void setCanvasRotation(BigDecimal canvasRotation) {
        this.canvasRotation = canvasRotation;
    }

    public int getCanvasLayer() {
        return canvasLayer;
    }

    public void setCanvasLayer(int canvasLayer) {
        this.canvasLayer = canvasLayer;
    }

    public boolean isPinned() {
        return pinned;
    }

    public void setPinned(boolean pinned) {
        this.pinned = pinned;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
