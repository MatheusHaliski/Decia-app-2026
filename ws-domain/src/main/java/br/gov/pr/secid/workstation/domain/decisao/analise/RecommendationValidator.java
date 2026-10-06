package br.gov.pr.secid.workstation.domain.decisao.analise;

import br.gov.pr.secid.workstation.domain.common.DomainRuleException;
import br.gov.pr.secid.workstation.domain.common.MiniJson;

import java.util.ArrayList;
import java.util.List;

/**
 * Recomendação crítica, não eco (§7): nunca "escolha B" sem os quatro porquês. Rejeita ({@code RECOMENDACAO_INCOMPLETA}, com os campos em
 * falta em {@code details}) quando falta raciocínio, quando {@code supportingJson} ou {@code contradictingJson} não é um array JSON com ao menos
 * um item (o que sustenta E o que contradiz), quando {@code criticalAssumptionIdsJson} não é um array JSON (pode ser vazio) ou quando faltam
 * limitações / "o que mudaria a resposta".
 */
public final class RecommendationValidator {

    public static final String RECOMENDACAO_INCOMPLETA = "RECOMENDACAO_INCOMPLETA";

    private RecommendationValidator() {
    }

    public static void validate(String reasoningMd, String supportingJson, String contradictingJson, String criticalAssumptionIdsJson,
                                String limitationsMd, String whatWouldChangeMd) {
        List<String> missing = new ArrayList<>();
        if (blank(reasoningMd)) {
            missing.add("reasoningMd");
        }
        if (arraySize(supportingJson) < 1) {
            missing.add("supportingJson");
        }
        if (arraySize(contradictingJson) < 1) {
            missing.add("contradictingJson");
        }
        if (arraySize(criticalAssumptionIdsJson) < 0) {
            missing.add("criticalAssumptionIdsJson");
        }
        if (blank(limitationsMd)) {
            missing.add("limitationsMd");
        }
        if (blank(whatWouldChangeMd)) {
            missing.add("whatWouldChangeMd");
        }
        if (!missing.isEmpty()) {
            throw new DomainRuleException(RECOMENDACAO_INCOMPLETA,
                    "recomendação precisa responder o que sustenta, o que contradiz, que premissas importam e o que mudaria a resposta", missing);
        }
    }

    /** Tamanho do array JSON, ou −1 quando nulo, malformado ou não array; itens nulos ou texto em branco não contam. */
    private static int arraySize(String json) {
        if (blank(json)) {
            return -1;
        }
        Object v;
        try {
            v = MiniJson.parse(json);
        } catch (IllegalArgumentException e) {
            return -1;
        }
        if (!(v instanceof List<?> list)) {
            return -1;
        }
        int n = 0;
        for (Object o : list) {
            if (o != null && !(o instanceof String s && s.isBlank())) {
                n++;
            }
        }
        return n;
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
