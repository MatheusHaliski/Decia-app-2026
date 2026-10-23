package br.gov.pr.secid.workstation.domain.acervo;

/**
 * Área profissional da tarefa (auditoria 17/10/2026; Onda Acervo, V36). Define só quais extensões opcionais o criador oferece:
 * nenhuma área obriga campos de outra (ex.: repositório de código só aparece em SOFTWARE).
 */
public enum WorkArea {
    SOFTWARE, ADMINISTRACAO, DESIGN, PESQUISA, MARKETING, PLANEJAMENTO, ENGENHARIA, JURIDICO, OUTRA
}
