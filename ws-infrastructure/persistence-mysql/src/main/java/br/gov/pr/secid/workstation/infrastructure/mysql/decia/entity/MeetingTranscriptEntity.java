package br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Entidade JPA de {@code meeting_transcripts} (MeetingTranscript — 5 DECIA sessão; RF37). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "meeting_transcripts")
public class MeetingTranscriptEntity extends AuditableEntity {

    @Column(name = "meeting_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID meetingId;

    @Column(name = "text_enc", nullable = false, columnDefinition = "LONGTEXT")
    private String textEnc;

    @Column(name = "segments_json", columnDefinition = "JSON")
    private String segmentsJson;

    @Column(name = "language", nullable = false)
    private String language;

    @Column(name = "provider")
    private String provider;

    public UUID getMeetingId() {
        return meetingId;
    }

    public void setMeetingId(UUID meetingId) {
        this.meetingId = meetingId;
    }

    public String getTextEnc() {
        return textEnc;
    }

    public void setTextEnc(String textEnc) {
        this.textEnc = textEnc;
    }

    public String getSegmentsJson() {
        return segmentsJson;
    }

    public void setSegmentsJson(String segmentsJson) {
        this.segmentsJson = segmentsJson;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }
}
