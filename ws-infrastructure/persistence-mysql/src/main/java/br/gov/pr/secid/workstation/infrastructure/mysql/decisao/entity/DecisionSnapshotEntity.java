package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity;

import br.gov.pr.secid.workstation.domain.decisao.SnapshotKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_snapshots} (DecisionSnapshot — 5b DECIA decisão estruturada; RF29, RF33). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_snapshots")
public class DecisionSnapshotEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "decision_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID decisionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private SnapshotKind kind;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "taken_at", nullable = false)
    private Instant takenAt;

    @Column(name = "taken_by_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID takenByUserId;

    @Column(name = "content_json", nullable = false, columnDefinition = "MEDIUMTEXT")
    private String contentJson;

    @Column(name = "content_sha256", nullable = false)
    private String contentSha256;

    @Column(name = "rationale", nullable = false, columnDefinition = "TEXT")
    private String rationale;

    @Column(name = "confidence_pct")
    private Integer confidencePct;

    @Column(name = "selected_alternative_label")
    private String selectedAlternativeLabel;

    @Column(name = "model_version", nullable = false)
    private String modelVersion;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getDecisionId() {
        return decisionId;
    }

    public void setDecisionId(UUID decisionId) {
        this.decisionId = decisionId;
    }

    public SnapshotKind getKind() {
        return kind;
    }

    public void setKind(SnapshotKind kind) {
        this.kind = kind;
    }

    public int getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(int versionNumber) {
        this.versionNumber = versionNumber;
    }

    public Instant getTakenAt() {
        return takenAt;
    }

    public void setTakenAt(Instant takenAt) {
        this.takenAt = takenAt;
    }

    public UUID getTakenByUserId() {
        return takenByUserId;
    }

    public void setTakenByUserId(UUID takenByUserId) {
        this.takenByUserId = takenByUserId;
    }

    public String getContentJson() {
        return contentJson;
    }

    public void setContentJson(String contentJson) {
        this.contentJson = contentJson;
    }

    public String getContentSha256() {
        return contentSha256;
    }

    public void setContentSha256(String contentSha256) {
        this.contentSha256 = contentSha256;
    }

    public String getRationale() {
        return rationale;
    }

    public void setRationale(String rationale) {
        this.rationale = rationale;
    }

    public Integer getConfidencePct() {
        return confidencePct;
    }

    public void setConfidencePct(Integer confidencePct) {
        this.confidencePct = confidencePct;
    }

    public String getSelectedAlternativeLabel() {
        return selectedAlternativeLabel;
    }

    public void setSelectedAlternativeLabel(String selectedAlternativeLabel) {
        this.selectedAlternativeLabel = selectedAlternativeLabel;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }
}
