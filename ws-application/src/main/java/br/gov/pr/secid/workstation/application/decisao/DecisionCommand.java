package br.gov.pr.secid.workstation.application.decisao;

import br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceNature;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceStance;
import br.gov.pr.secid.workstation.domain.decisao.OutcomeResult;
import br.gov.pr.secid.workstation.domain.decisao.RelevanceLevel;

/**
 * Um comando sobre a decisão (lote de {@code POST /api/decisions/{id}/commands}). Forma plana: cada tipo usa só os seus campos. Ids de
 * alternativa/critério são o UUID de um filho DESTA decisão ou o {@code ref} dado por um ADD_* anterior no mesmo lote (o cliente cria a
 * alternativa e já dá nota nela numa ida só). Ação exigida por tipo (BFLA, 03 §8):
 * <ul>
 *   <li>{@link Type#TRANSITION} — EDIT ({@code to = REABERTA} vira REOPEN; DECIDIDA só por DECIDE);</li>
 *   <li>{@link Type#ADD_ALTERNATIVE}, {@link Type#ADD_CRITERION}, {@link Type#SET_WEIGHT}, {@link Type#ADD_EVIDENCE} — EDIT_STRUCTURE;</li>
 *   <li>{@link Type#SET_SCORE} — ASSESS ({@code score} nulo remove a nota de quem pede);</li>
 *   <li>{@link Type#DECIDE} — DECIDE (guarda §6.10 + snapshot DECISAO); {@link Type#REOPEN} — REOPEN (snapshot REABERTURA);</li>
 *   <li>{@link Type#RECORD_OUTCOME} — EDIT (resultado único; move para RESOLVIDA).</li>
 * </ul>
 */
public record DecisionCommand(Type type, String ref, DecisionLifecycle to, String title, Boolean doNothing, String name, String criterionId,
                              Double weightPct, String alternativeId, Integer score, String rationale, Integer confidencePct,
                              Boolean warningsConfirmed, OutcomeResult result, String summary, EvidenceNature nature, String sourceLabel,
                              RelevanceLevel reliability, EvidenceStance stance) {

    public enum Type { TRANSITION, REOPEN, ADD_ALTERNATIVE, ADD_CRITERION, SET_WEIGHT, SET_SCORE, ADD_EVIDENCE, DECIDE, RECORD_OUTCOME }

    public static DecisionCommand transition(DecisionLifecycle to) {
        return new DecisionCommand(Type.TRANSITION, null, to, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                null, null);
    }

    public static DecisionCommand reopen(String rationale) {
        return new DecisionCommand(Type.REOPEN, null, null, null, null, null, null, null, null, null, rationale, null, null, null, null, null, null,
                null, null);
    }

    public static DecisionCommand addAlternative(String ref, String title, boolean doNothing) {
        return new DecisionCommand(Type.ADD_ALTERNATIVE, ref, null, title, doNothing, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null);
    }

    public static DecisionCommand addCriterion(String ref, String name) {
        return new DecisionCommand(Type.ADD_CRITERION, ref, null, null, null, name, null, null, null, null, null, null, null, null, null, null,
                null, null, null);
    }

    public static DecisionCommand setWeight(String criterionId, Double weightPct) {
        return new DecisionCommand(Type.SET_WEIGHT, null, null, null, null, null, criterionId, weightPct, null, null, null, null, null, null, null,
                null, null, null, null);
    }

    public static DecisionCommand setScore(String alternativeId, String criterionId, Integer score) {
        return new DecisionCommand(Type.SET_SCORE, null, null, null, null, null, criterionId, null, alternativeId, score, null, null, null, null,
                null, null, null, null, null);
    }

    public static DecisionCommand addEvidence(String title, EvidenceNature nature, String sourceLabel, RelevanceLevel reliability,
                                              String alternativeId, EvidenceStance stance) {
        return new DecisionCommand(Type.ADD_EVIDENCE, null, null, title, null, null, null, null, alternativeId, null, null, null, null, null, null,
                nature, sourceLabel, reliability, stance);
    }

    public static DecisionCommand decide(String alternativeId, String rationale, Integer confidencePct, boolean warningsConfirmed) {
        return new DecisionCommand(Type.DECIDE, null, null, null, null, null, null, null, alternativeId, null, rationale, confidencePct,
                warningsConfirmed, null, null, null, null, null, null);
    }

    public static DecisionCommand recordOutcome(OutcomeResult result, String summary) {
        return new DecisionCommand(Type.RECORD_OUTCOME, null, null, null, null, null, null, null, null, null, null, null, null, result, summary,
                null, null, null, null);
    }
}
