package br.gov.pr.secid.workstation.domain.common;

import java.util.UUID;

/** Referência polimórfica {@code (targetType, targetId)} usada por reações, comentários, salvos e compartilhamentos (RF26, RF27). */
public record TargetRef(TargetType targetType, UUID targetId) {

    public TargetRef {
        if (targetType == null || targetId == null) {
            throw new IllegalArgumentException("VALIDACAO: targetType e targetId são obrigatórios");
        }
    }
}
