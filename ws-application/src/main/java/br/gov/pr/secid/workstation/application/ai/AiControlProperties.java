package br.gov.pr.secid.workstation.application.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * {@code ws.ai.*} lido pelos controles de IA (D-68/D-69): {@code WS_AI_REMOTE_ENABLED} (provedor externo só com a flag) e o orçamento
 * diário {@code WS_AI_BUDGET_USER_DAILY_REQUESTS}, {@code WS_AI_BUDGET_USER_DAILY_TOKENS}, {@code WS_AI_BUDGET_COMPANY_DAILY_REQUESTS},
 * {@code WS_AI_BUDGET_COMPANY_DAILY_TOKENS} e o fuso do dia ({@code WS_AI_BUDGET_ZONE}). Valores definitivos: Q-50. Chaves de API
 * ficam só no módulo ai-providers e nunca passam por aqui.
 */
@ConfigurationProperties(prefix = "ws.ai")
public record AiControlProperties(boolean remoteEnabled, Budget budget) {

    public AiControlProperties {
        budget = budget == null ? Budget.defaults() : budget;
    }

    public static AiControlProperties defaults(boolean remoteEnabled) {
        return new AiControlProperties(remoteEnabled, Budget.defaults());
    }

    /** Teto diário por pessoa e por empresa (requisições e tokens estimados entrada + saída). */
    public record Budget(int userDailyRequests, long userDailyTokens, int companyDailyRequests, long companyDailyTokens, String zone) {
        public Budget {
            userDailyRequests = userDailyRequests > 0 ? userDailyRequests : 200;
            userDailyTokens = userDailyTokens > 0 ? userDailyTokens : 200_000L;
            companyDailyRequests = companyDailyRequests > 0 ? companyDailyRequests : 5_000;
            companyDailyTokens = companyDailyTokens > 0 ? companyDailyTokens : 5_000_000L;
            zone = zone == null || zone.isBlank() ? "America/Sao_Paulo" : zone;
        }

        public static Budget defaults() {
            return new Budget(0, 0, 0, 0, null);
        }
    }
}
