package br.gov.pr.secid.workstation.domain.connectors;

import br.gov.pr.secid.workstation.domain.acervo.SourceKind;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;

/**
 * O que um item de um provedor vira no Work Station: a fonte ({@link SourceKind}), o tipo de tarefa, o formato curto da tarefa
 * ({@code gdoc}, {@code docx}… — nulo quando não se aplica) e o que o provedor sabe entregar: {@code pdfExport} — o provedor gera PDF
 * (Drive {@code files.export} dos tipos nativos; Graph {@code ?format=pdf} até o limite de conversão); {@code originalDownload} — dá para
 * baixar o binário original. Pasta e item sem conteúdo baixável só podem ser VINCULADOS.
 */
public record SourceClassification(SourceKind sourceKind, TaskType taskType, String format, boolean folder, boolean pdfExport,
                                   boolean originalDownload) {

    public SourceClassification {
        if (sourceKind == null || taskType == null) {
            throw new IllegalArgumentException("classificação exige sourceKind e taskType");
        }
    }
}
