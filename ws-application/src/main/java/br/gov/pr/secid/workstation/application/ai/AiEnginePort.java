package br.gov.pr.secid.workstation.application.ai;

import br.gov.pr.secid.workstation.domain.ia.AiProvider;

/**
 * Um motor de inferência: remoto (CLAUDE/GEMINI, no módulo ai-providers atrás de {@code ws.ai.remote-enabled}) ou o motor LOCAL.
 * Só o {@link AiGateway} chama esta porta — nunca um serviço de RF direto —, para que classificação, mascaramento, orçamento e trilha
 * valham em toda chamada (D-69).
 */
public interface AiEnginePort {

    AiProvider provider();

    /** Remoto = sai da infraestrutura da SECID (tudo que não é LOCAL). */
    default boolean remote() {
        return provider() != AiProvider.LOCAL;
    }

    Completion complete(String prompt, int maxOutputTokens);

    /** Resposta do motor; tokens podem ser nulos quando o motor não informa. */
    record Completion(String text, String model, Integer inputTokens, Integer outputTokens) {
    }
}
