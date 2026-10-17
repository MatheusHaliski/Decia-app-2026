package br.gov.pr.secid.workstation.application.acervo;

/** Itens das listas do briefing, compartilhados por entrada e saída da API. */
public final class TaskBriefParts {
    private TaskBriefParts() {
    }

    /** Entregável: o que será produzido. */
    public record Deliverable(String text) {
    }

    /** Critério de conclusão verificável; {@code done} marca o que já foi atendido. */
    public record Criterion(String text, boolean done) {
    }

    /** Referência externa ou interna (http/https). */
    public record Reference(String label, String url) {
    }
}
