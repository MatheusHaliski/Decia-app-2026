# Fundamentação — referências e verificações concretas

17/10/2026. Cada referência abaixo foi usada como critério de verificação, não como citação decorativa. A rubrica de notas (pesos 30/20/15/15/10/10) é **específica deste projeto** e não é uma escala oficial de Nielsen, da W3C ou de Amershi et al.

## Fontes

- **[NIELSEN]** Nielsen, J. *10 Usability Heuristics for User Interface Design*. Nielsen Norman Group, 1994, revisado em 2020. <https://www.nngroup.com/articles/ten-usability-heuristics/>
- **[WCAG22]** W3C. *Web Content Accessibility Guidelines (WCAG) 2.2*. Recomendação W3C, 5/10/2023, atualizada em 12/12/2024. <https://www.w3.org/TR/WCAG22/>
- **[AMERSHI]** Amershi, S. et al. *Guidelines for Human-AI Interaction*. CHI 2019, Paper 3. <https://doi.org/10.1145/3290605.3300233>. Resumo da Microsoft: <https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/>

## Heurísticas de Nielsen → verificação

| Heurística | O que foi verificado no Work Station | Resultado / onde |
|---|---|---|
| H1 Visibilidade do estado do sistema | O usuário sabe se o trabalho foi salvo, o que a IA está fazendo e o estado da decisão? | DECIA gravava mudanças de pesos e critérios sem exibi-las → bloco **Alterações registradas** (P07). Páginas de tarefa/projeto são esqueletos sem estado salvo (P03). |
| H2 Correspondência com o mundo real | Os rótulos de estado correspondem à linguagem do trabalho? | "Disponível/Em uso" → **A realizar/Em andamento**; publicação separada de execução (P10). |
| H3 Controle e liberdade | É possível desfazer, interromper e reverter? | Agente sem parada → `stopAgentRun` e encerramento ao trocar o modo (P08). Sugestão da IA alternava ACEITA↔DESCARTADA sem rastro → transição única (P06). |
| H4 Consistência e padrões | Um mesmo conceito tem um só nome? | "Modo de IA" era custo, e não autonomia → renomeado **Motor e custo da IA** (P08). |
| H5 Prevenção de erros | O sistema impede o erro antes de ele acontecer? | Patch de Drawings podia ignorar a reserva de outro usuário → porta única `authorizePatch` (P05). `setStatus` permitia saltar o ciclo → validação (P06). |
| H6 Reconhecer em vez de lembrar | As opções e consequências estão visíveis? | Cada modo de autonomia descreve a ação concreta permitida (P08). |
| H7 Flexibilidade e eficiência | Atalhos e alternativas para quem é experiente | **Não verificado**: não há editor de Drawings/Letters operando na aplicação. |
| H8 Estética e design minimalista | Densidade e hierarquia dos cards | Cabeçalho do perfil ganhou o contador Seguindo e passou de 6 para 7 colunas (P04); hierarquia de cards fica para P2. |
| H9 Reconhecer, diagnosticar e recuperar-se de erros | A mensagem diz o motivo e o caminho? | Botões de IA indisponíveis após a decisão exibem o motivo e o caminho "reabra a decisão" (P06). |
| H10 Ajuda e documentação | Há ajuda contextual? | O RfPage mostra o texto do RF; isso é documentação de requisito, não ajuda de tarefa (P03). |

## WCAG 2.2 → verificação

| Critério | Verificação | Resultado |
|---|---|---|
| 1.3.1 Informações e relações | A lista de alterações e a linha do tempo usam `<ol>` com `aria-label` | Atendido nos blocos novos do DECIA. |
| 1.4.1 Uso de cor | O estado do card não depende só de cor | O rótulo textual acompanha o tom (Tag + texto). |
| 1.4.3 Contraste (mínimo) | Texto em badges e cards | **Não remedido nesta rodada**: sem medição automática em navegador para os componentes alterados (pendência P2). |
| 2.1.1 Teclado | Ações novas (pedir sugestões, escolher modo) são `<button>`/radio nativos | Atendido: Radix RadioGroup e Button. |
| 2.4.11 Foco não obscurecido (mínimo) | Foco visível nas telas novas | **Não verificado** em navegador nesta rodada. |
| 2.5.7 Movimentos de arrastar | Drawings precisa de alternativa a arrastar (mover, redimensionar, laço) | **Lacuna**: não há editor; o modelo `selectInBounds`/`selectInPolygon` aceita coordenadas numéricas, mas não há UI. Registrado em P11. |
| 2.5.8 Tamanho do alvo (mínimo) 24×24 px | Botões `size="sm"` | Não medido nesta rodada. |
| 3.3.1 Identificação de erro / 3.3.3 Sugestão | Erros de transição de estado da tarefa | Códigos `TAREFA_TRANSICAO_INVALIDA`/`TAREFA_BLOQUEIO_SEM_CAUSA` alinhados ao backend; mensagem de UI depende do formulário (pendente P03). |
| 3.3.7 Entrada redundante | Formulário de tarefa não deve pedir de novo o que já se sabe | Pendente: não há formulário (P03). |

## Diretrizes de Amershi et al. → verificação

| Diretriz | Verificação | Resultado |
|---|---|---|
| G1 Deixar claro o que o sistema pode fazer | Modo de autonomia descreve a ação concreta | Implementado (P08). |
| G2 Deixar claro quão bem pode fazer | Qualidade real da IA | **Não verificado**: nenhum motor de IA registrado em produção (`AiProvidersConfig` vazio); nenhuma chamada paga. |
| G3 Momento certo, conforme o contexto | Sugestões espontâneas só quando o modo permite | DECIA respeita o modo: Sugestões mostra; Sob solicitação exige pedido; Manual desliga (P08). |
| G7 Permitir invocar sob demanda | Botão "Mostrar sugestões da IA" | Implementado (P08). |
| G8 Permitir dispensar facilmente | Descartar sugestão | Existente; agora só a partir de SUGERIDA (P06). |
| G9 Permitir corrigir facilmente | Reverter alteração da IA | Assistido exige ponto de restauração; implementação de UI pendente (sem editor). |
| G10 Escopo em caso de dúvida | IA sem seleção não altera a camada inteira | `IA_SEM_SELECAO` (P05). |
| G11 Explicar por que fez o que fez | Motivo das recomendações | DECIA exibe "o que mudaria a recomendação" e limitações; Letters/Drawings sem UI. |
| G13 Aprender com o comportamento | — | Não aplicável nesta rodada. |
| G15 Feedback granular | Aceite/descartar por sugestão | Existente no DECIA. |
| G16 Comunicar consequências das ações | Troca de modo avisa participantes e invalida propostas | `ModeChangeNotice` + versão da política (P08). |
| G17 Controle global | Usuário define o comportamento padrão da IA | Autonomia padrão em Configurações (P08). |
| G18 Notificar mudanças | Mudança de política comunicada a todos | `notify` = todos os participantes exceto quem mudou (P08). |
