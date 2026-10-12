package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.decisao.analise.SnapshotCanonicalizer;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Snapshot imutável do que se sabia no momento (G7, §6.12): {@code contentJson} é o JSON canônico (chaves ordenadas, sem espaços) e
 * {@code contentSha256} o seu SHA-256. Append-only: nunca é atualizado; re-hash diferente = adulteração ({@link #isIntact()}).
 */
@DomainEntity(context = "5b DECIA decisão estruturada", appendOnly = true,
        table = "decision_snapshots", rfs = {"RF29", "RF33"}, migration = 22, audit = Audit.NONE,
        doc = "APPEND-ONLY. Decisão RESTRICT (não se apaga decisão com histórico) e autor RESTRICT. Conteúdo canônico + SHA-256 (G7).",
        uniques = {"decision_id, version_number"}, indexes = {"decision_id, kind, taken_at"},
        checks = {"CHAR_LENGTH(content_sha256) = 64", "version_number > 0",
                "confidence_pct IS NULL OR (confidence_pct BETWEEN 0 AND 100 AND MOD(confidence_pct, 5) = 0)"})
public record DecisionSnapshot(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.RESTRICT) UUID decisionId,
        @Attr("momento (decisão/reabertura/checkpoint)") SnapshotKind kind,
        @Attr("versão (1, 2, …)") int versionNumber,
        @Attr("tirado em") Instant takenAt,
        @Attr(value = "tirado por", ref = "users", onDelete = OnDelete.RESTRICT) UUID takenByUserId,
        @Attr(value = "conteúdo canônico (JSON)", sql = "MEDIUMTEXT") String contentJson,
        @Attr(value = "SHA-256 do conteúdo canônico", sql = "CHAR(64)") String contentSha256,
        @Attr(value = "motivo", sql = "TEXT") String rationale,
        @Attr("confiança (0–100, passo 5)") Integer confidencePct,
        @Attr(value = "rótulo da alternativa selecionada", opt = true, len = 4) String selectedAlternativeLabel,
        @Attr(value = "versão do modelo de pontuação", len = 40) String modelVersion) {

    public DecisionSnapshot {
        if (versionNumber <= 0) {
            throw DecisionRules.invalid("versionNumber começa em 1");
        }
        if (contentSha256 == null || !contentSha256.matches("[0-9a-f]{64}")) {
            throw DecisionRules.invalid("contentSha256 deve ter 64 hexadecimais minúsculos");
        }
        DecisionRules.confidence(confidencePct, "confidencePct");
    }

    /** Cria o snapshot a partir do conteúdo (mapa JSON-compatível): canoniza e calcula o hash; o conteúdo nunca muda depois. */
    public static DecisionSnapshot of(UUID id, UUID decisionId, SnapshotKind kind, int versionNumber, Instant takenAt, UUID takenByUserId,
                                      Map<String, ?> content, String rationale, Integer confidencePct, String selectedAlternativeLabel) {
        String canonical = SnapshotCanonicalizer.canonical(content);
        return new DecisionSnapshot(id, decisionId, kind, versionNumber, takenAt, takenByUserId, canonical, SnapshotCanonicalizer.sha256(canonical),
                rationale, confidencePct, selectedAlternativeLabel, DecisionRules.SCORING_MODEL_VERSION);
    }

    /** Verdadeiro quando o SHA-256 do conteúdo gravado ainda bate com o hash gravado (teste-guarda de adulteração, §6.12). */
    public boolean isIntact() {
        return SnapshotCanonicalizer.sha256(contentJson).equals(contentSha256);
    }
}
