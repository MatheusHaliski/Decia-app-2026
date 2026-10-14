# Completar e prever traçados — contrato de implementação

## Letters

O alcance da revisão e o alcance da continuação são controles separados.

| Nível de revisão | Alcance permitido |
| --- | --- |
| 1 | Ortografia; não trocar estilo, argumento ou estrutura |
| 2 | Gramática, concordância, regência e sintaxe com revisão |
| 3 | Reescrever parágrafo selecionado, preservando intenção |
| 4 | Reestruturar documento completo, com comparação e recuperação |

No modo Completar, selecionar Palavra, Frase, Parágrafo ou Continuação do documento. A proposta aparece após o cursor como prévia; aceitar insere somente naquele ponto. Rejeitar preserva o texto. Cada proposta ancora revisão, posição e contexto original; editar ou mover o cursor invalida a proposta. Não completar fatos, referências bibliográficas ou resultados inexistentes como se fossem verificados. IA remota exige consentimento, classificação e limite de consumo. Debounce não autoriza chamadas pagas ilimitadas.

## Drawings

Completar respeita o objeto, estrutura ou região travada. Escopos: detalhe, objeto/pessoa, região pequena e região ancestral. Completar uma região maior considera seus descendentes; não modifica objetos fora dela. Uma pessoa pode conter rosto, olhos, lábios e membros; móveis podem conter puxadores, dobradiças e superfícies. Essas estruturas são propostas editáveis, não medidas certificadas.

A previsão de traçado tem duas etapas distintas:

1. Hipótese geométrica local: arco circular ou continuação linear, sem enviar movimentos para serviços externos. Mostra pontos e linha tracejada; exige aceitar. Implementada em `lib/studio/stroke-prediction.ts` e `components/studio/GeometryComposer.tsx`.
2. Interpretação semântica por IA: intenção, câmera, traçado observado, objeto e região autorizada orientam uma proposta estruturada. Ainda pendente de integração e validação. Um círculo não basta para concluir que há uma igreja; uma linha vertical não basta para concluir que há um poste.

Na vista superior de uma cúpula, a hipótese circular pode completar o contorno. Na vista frontal de um poste, o modelo semântico poderá oferecer braço e luminária como alternativas de pontos; deverá explicar a hipótese e permitir escolher ou rejeitar. Vista, unidades e proporções integram o contexto. Nunca apresentar plausibilidade heurística como probabilidade calibrada.

## Estado e verificações

O detector local inclui correção da proporção do canvas, rejeição de entrada inválida, limiar mínimo de arco, teste de resíduos e limite de pontos dentro da área. Os pontos previstos só são incorporados por ação explícita. Testes cobrem arco, linha e rejeição de entrada irregular. Letters possui endpoint estruturado de continuação, prévia e aplicação no cursor; suas verificações desta fase usam provider simulado. O canvas 2D oferece modo Completar para seleção ou área/camada, usando o fluxo existente de propostas remotas. Assets possuem conclusão determinística de detalhes compatíveis no escopo, claramente identificada como local. O reconhecimento semântico automático de traçados e a conclusão remota de estruturas 3D arbitrárias permanecem pendentes.
