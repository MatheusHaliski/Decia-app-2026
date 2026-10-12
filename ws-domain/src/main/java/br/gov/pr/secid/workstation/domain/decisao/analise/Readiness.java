package br.gov.pr.secid.workstation.domain.decisao.analise;

import br.gov.pr.secid.workstation.domain.decisao.DecisionComplexity;

import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;

/**
 * Prontidão (§6.7): checklist por complexidade, cada item OK/ALERTA/FALTA (itens "—" do spec não entram). Resultado: FALTA em
 * pergunta/responsável/alternativas → NAO_PRONTA; FALTA só de evidência → PRECISA_DE_EVIDENCIA; só ALERTAs → PRONTA_PARA_REVISAO; tudo OK →
 * PRONTA_PARA_DECIDIR. FALTA em outro item exigido (critérios, matriz, premissas, riscos em PROFUNDA) também dá NAO_PRONTA — o spec não diz,
 * e "pronta" com item exigido em falta contradiria a tabela (D-53).
 */
public final class Readiness {

    static final int MIN_QUESTION_CHARS = 15;

    private Readiness() {
    }

    public enum Item { PERGUNTA, RESPONSAVEL, ALTERNATIVAS, CRITERIOS, MATRIZ, EVIDENCIA, PREMISSAS, RISCOS }

    public enum Check { OK, ALERTA, FALTA }

    public enum Level { NAO_PRONTA, PRECISA_DE_EVIDENCIA, PRONTA_PARA_REVISAO, PRONTA_PARA_DECIDIR }

    /**
     * Fatos do registro.
     *
     * @param question                  pergunta decisória
     * @param hasOwner                  responsável definido
     * @param activeAlternatives        alternativas ATIVAS (inclui "não agir")
     * @param criteriaCount             critérios cadastrados
     * @param keyCriterionText          critério-chave em texto (RAPIDA)
     * @param weightsValid              {@code weightingEnabled} e pesos válidos (§6.1)
     * @param matrixComplete            nenhuma alternativa ativa incompleta
     * @param leaderEvidenceAtLeastModerate força da evidência da líder ≥ MODERADA (§6.5)
     * @param criticalAssumptionsTreated premissas críticas nenhuma INVALIDADA e nenhuma NAO_VALIDADA
     * @param leaderRisksAssessed       ≥ 1 risco avaliado para a líder
     */
    public record Input(DecisionComplexity complexity, String question, boolean hasOwner, int activeAlternatives, int criteriaCount,
                        String keyCriterionText, boolean weightsValid, boolean matrixComplete, boolean leaderEvidenceAtLeastModerate,
                        boolean criticalAssumptionsTreated, boolean leaderRisksAssessed) {
        public Input {
            Objects.requireNonNull(complexity, "complexity");
        }
    }

    public record Result(Level level, Map<Item, Check> checklist) {
        public Result {
            checklist = Collections.unmodifiableMap(new EnumMap<>(checklist));
        }
    }

    /** Pergunta definida: ≥ 15 caracteres (sem espaços nas pontas) e termina com "?". */
    public static boolean questionDefined(String question) {
        if (question == null) {
            return false;
        }
        String q = question.strip();
        return q.length() >= MIN_QUESTION_CHARS && q.endsWith("?");
    }

    public static Result evaluate(Input in) {
        Map<Item, Check> c = new EnumMap<>(Item.class);
        c.put(Item.PERGUNTA, ok(questionDefined(in.question())));
        c.put(Item.RESPONSAVEL, ok(in.hasOwner()));
        c.put(Item.ALTERNATIVAS, ok(in.activeAlternatives() >= 2));
        DecisionComplexity cx = in.complexity();
        switch (cx) {
            case RAPIDA -> c.put(Item.CRITERIOS, ok(in.criteriaCount() >= 1 || in.keyCriterionText() != null && !in.keyCriterionText().isBlank()));
            case PADRAO -> c.put(Item.CRITERIOS, ok(in.criteriaCount() >= 2));
            case PROFUNDA -> c.put(Item.CRITERIOS, ok(in.criteriaCount() >= 2 && in.weightsValid()));
            default -> throw new IllegalStateException("complexidade desconhecida: " + cx);
        }
        if (cx != DecisionComplexity.RAPIDA) {
            boolean deep = cx == DecisionComplexity.PROFUNDA;
            c.put(Item.MATRIZ, ok(in.matrixComplete()));
            c.put(Item.EVIDENCIA, softOrHard(in.leaderEvidenceAtLeastModerate(), deep));
            c.put(Item.PREMISSAS, softOrHard(in.criticalAssumptionsTreated(), deep));
            c.put(Item.RISCOS, softOrHard(in.leaderRisksAssessed(), deep));
        }
        return new Result(level(c), c);
    }

    private static Level level(Map<Item, Check> c) {
        boolean otherMissing = c.entrySet().stream().anyMatch(e -> e.getKey() != Item.EVIDENCIA && e.getValue() == Check.FALTA);
        if (otherMissing) {
            return Level.NAO_PRONTA;
        }
        if (c.get(Item.EVIDENCIA) == Check.FALTA) {
            return Level.PRECISA_DE_EVIDENCIA;
        }
        return c.containsValue(Check.ALERTA) ? Level.PRONTA_PARA_REVISAO : Level.PRONTA_PARA_DECIDIR;
    }

    private static Check ok(boolean condition) {
        return condition ? Check.OK : Check.FALTA;
    }

    private static Check softOrHard(boolean condition, boolean required) {
        if (condition) {
            return Check.OK;
        }
        return required ? Check.FALTA : Check.ALERTA;
    }
}
