package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Hype Score do perfil (RF45; D-12 determinístico) — TAXONOMIA §9.8. Único (userId, scoreDate); 0–1000. */
@DomainEntity(context = "8 Gamificação", table = "profile_hype_scores", rfs = {"RF45", "RF19", "RF28", "RF43", "RF3"}, migration = 17, audit = Audit.CREATED,
        doc = "Hype diário por pessoa (dono → CASCADE). Único (user, date); idempotente por chave.",
        uniques = {"user_id, score_date", "idempotency_key"}, checks = {"score BETWEEN 0 AND 1000"})
public record ProfileHypeScore(
        @Attr("identificador") UUID id,
        @Attr(value = "pessoa", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr("dia") LocalDate scoreDate,
        @Attr(value = "pontuação 0–1000", sql = "SMALLINT UNSIGNED") int score,
        @Attr(value = "faixa", len = 40) String bandCode,
        @Attr("blocos {producao 25, reconhecimentoSocial 25, participacaoDecia 25, eficienciaImpacto 15, reconhecimentosChancelas 10}") String blocksJson,
        @Attr(value = "priors bayesianos", opt = true) String bayesianPriorsJson,
        @Attr(value = "meia-vida em dias", def = "180") int halfLifeDays,
        @Attr(value = "percentil no departamento", opt = true, sql = "DECIMAL(5,2)") BigDecimal percentileInDept,
        @Attr(value = "eventos que mais ajudaram", opt = true) String topPositiveEventsJson,
        @Attr(value = "eventos que mais pesaram", opt = true) String topNegativeEventsJson,
        @Attr(value = "sugestões", opt = true) String suggestionsJson,
        @Attr("versão dos pesos") int weightsVersion,
        @Attr(value = "inferência (texto explicativo)", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId,
        @Attr(value = "chave idempotente", len = 120) String idempotencyKey) {

    public ProfileHypeScore {
        if (score < 0 || score > 1000) {
            throw new IllegalArgumentException("VALIDACAO: score entre 0 e 1000");
        }
    }
}
