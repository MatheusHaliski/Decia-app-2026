package br.gov.pr.secid.workstation.domain.institutional;

import br.gov.pr.secid.workstation.domain.common.MiniJson;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Checklist tipado de {@code ApprovalRequest.criteriaJson} (RF28.CA10/CA16, D-19): {@code [{code, mandatory, auto, checked, checkedBy,
 * checkedAt}]}. Aprovar exige todo critério {@code mandatory} com {@code checked = true} ({@code 409 CRITERIOS_PENDENTES}); checklist
 * ausente ou vazio também é pendência (nada foi conferido).
 */
public record ApprovalCriteria(List<Criterion> items) {

    public ApprovalCriteria {
        items = List.copyOf(items);
    }

    /** Um critério conferido pelo analista; {@code auto} é o resultado da verificação automática (nulo = sem verificação). */
    public record Criterion(String code, boolean mandatory, CriterionAuto auto, boolean checked, String checkedBy, String checkedAt) {

        public Criterion {
            if (code == null || code.isBlank()) {
                throw new IllegalArgumentException("VALIDACAO: critério sem code");
            }
        }
    }

    public static ApprovalCriteria empty() {
        return new ApprovalCriteria(List.of());
    }

    /** Lê o JSON (nulo/vazio → lista vazia); forma inválida → {@code JSON_INVALIDO}/{@code VALIDACAO}. */
    public static ApprovalCriteria parse(String json) {
        if (json == null || json.isBlank()) {
            return empty();
        }
        List<Criterion> out = new ArrayList<>();
        for (Object item : MiniJson.parseArray(json)) {
            if (!(item instanceof Map<?, ?> m)) {
                throw new IllegalArgumentException("VALIDACAO: critério precisa ser objeto");
            }
            Object autoRaw = m.get("auto");
            if (m.get("code") == null) {
                throw new IllegalArgumentException("VALIDACAO: critério sem code: " + m);
            }
            out.add(new Criterion(str(m.get("code")), bool(m.get("mandatory")), autoRaw == null ? null : CriterionAuto.valueOf(str(autoRaw)),
                    bool(m.get("checked")), m.get("checkedBy") == null ? null : str(m.get("checkedBy")),
                    m.get("checkedAt") == null ? null : str(m.get("checkedAt"))));
        }
        return new ApprovalCriteria(out);
    }

    /** Códigos dos critérios obrigatórios ainda não marcados (vazio = pode aprovar, desde que haja checklist). */
    public List<String> pendingMandatoryCodes() {
        return items.stream().filter(c -> c.mandatory() && !c.checked()).map(Criterion::code).toList();
    }

    public boolean allMandatoryChecked() {
        return !items.isEmpty() && pendingMandatoryCodes().isEmpty();
    }

    /** Quantidade de motivos em {@code reasonsJson} (array de códigos ou objetos); JSON inválido → {@code VALIDACAO}. */
    public static int countReasons(String reasonsJson) {
        if (reasonsJson == null || reasonsJson.isBlank()) {
            return 0;
        }
        try {
            return MiniJson.parseArray(reasonsJson).size();
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("VALIDACAO: reasonsJson precisa ser um array JSON (" + ex.getMessage() + ")", ex);
        }
    }

    private static String str(Object o) {
        if (!(o instanceof String s)) {
            throw new IllegalArgumentException("VALIDACAO: esperado texto, veio " + o);
        }
        return s;
    }

    private static boolean bool(Object o) {
        return Boolean.TRUE.equals(o);
    }
}
