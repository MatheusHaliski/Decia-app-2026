package br.gov.pr.secid.workstation.domain.identity;

/**
 * Origem de uma conta de usuário (Bloco 2, baseline de dados). Separa pessoas reais de contas criadas por
 * seed/demonstração/sistema, para que pontos, rankings e métricas (RF42–RF45) nunca contem contas sintéticas.
 */
public enum AccountOrigin {
    /** Pessoa real cadastrada pelo fluxo normal (RF1) ou login institucional (RF2). */
    REAL,
    /** Conta criada por seed de testes automatizados; nunca pontua nem aparece em rankings. */
    TEST_SEED,
    /** Conta de demonstração (ambiente dev/homologação); dados fictícios, sem efeito em métricas oficiais. */
    DEMO,
    /** Conta técnica do próprio sistema (jobs, IA, migrações); não representa uma pessoa. */
    SYSTEM;

    /** Só contas reais entram em pontos, rankings, Hype e métricas de gestão. */
    public boolean countsForMetrics() {
        return this == REAL;
    }
}
