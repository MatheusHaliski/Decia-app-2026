package br.gov.pr.secid.workstation.domain.connectors;

import br.gov.pr.secid.workstation.domain.acervo.SourceKind;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;

/**
 * Link colado aceito pela importação por link: o provedor, a fonte inferida pelo host/caminho, o tipo de tarefa da fonte e o nome do
 * aplicativo (título padrão quando a pessoa não dá um). O endereço em si nunca é buscado pelo servidor.
 */
public record LinkTarget(ConnectorProvider provider, SourceKind sourceKind, TaskType taskType, String appName, String url) {
}
