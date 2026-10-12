# Work Station: da decisão ao trabalho que destrava outras equipes

Data: 12/10/2026. Análise de produto baseada no board e na documentação do repositório. As conclusões sobre comportamento dos usuários são hipóteses de produto; não houve entrevistas ou experimento de campo nesta etapa.

## O produto que os requisitos descrevem

O Work Station reúne seis ciclos: organizar trabalho pessoal; transformar demandas em projetos; deliberar com evidências pelo DECIA; coordenar pessoas e departamentos; reconhecer contribuições; preservar aprendizado institucional. Sua proposta mais forte é conectar uma decisão explicável a uma execução verificável e a um aprendizado reutilizável.

O empregado precisa saber qual entrega merece atenção, obter ajuda e perceber sua contribuição. O chefe precisa conciliar demanda, capacidade e prioridades sem substituir a autonomia do empregado. O departamento precisa entregar a outra equipe com contexto e critérios claros. A empresa precisa enxergar onde o fluxo perde tempo e decidir conflitos entre prioridades institucionais. Curadores mantêm qualidade e reconhecimentos dentro do escopo delegado.

A documentação já cobre boa parte desse ciclo, mas implementação e especificação são coisas distintas: muitos fluxos ainda não têm entrega persistente ponta a ponta. O novo requisito não resolve essas pendências por sua mera inclusão no backlog.

## Comparação com os requisitos existentes

| Recurso | O que já está previsto | O que permanece sem um contrato operacional explícito |
|---|---|---|
| RF9/RF10 | Equipe e atribuição chefe → empregado | Negociar uma entrega entre duas equipes com aceite de ambas |
| RF21/RF22/RF31 | Projetos, dependências e cenários | Tornar uma dependência externa um compromisso acompanhado durante a execução |
| RF24 | Metas, eixos e indicadores | Escolher quem pode resolver um impedimento concreto e em qual prazo negociado |
| RF29/RF37 | Decisão/reunião → tarefa, responsável e prazo | Coordenar quem depende da entrega e verificar se ela realmente destravou trabalho |
| RF36 | Dossiê na saída, mudança de lotação ou fim da gestão | Cooperar continuamente sem exigir uma transição de pessoas |
| RF35/RF42/RF45 | Reconhecimento, pontos e reputação | Dar visibilidade ao valor de ajudar outra equipe, sem premiar volume de solicitações |
| RF44 | Prioridade diária, WIP pessoal e bloqueios | Aceite bilateral de capacidade e prazo entre departamentos, sem impor trabalho novo |
| RF46 | Comunicação e atribuições | Um objeto verificável de compromisso, entrega, validação e renegociação |

A lacuna identificada é o intervalo entre **“estou bloqueado por outra equipe”** e **“essa equipe aceitou uma entrega que permitirá continuar”**. Tarefa bloqueada e mensagem de chat registram o problema, mas não definem por si só a negociação, a capacidade disponível, o critério de recebimento e a validação do desbloqueio.

## Proposta: RF49 — Pactos de Desbloqueio

Um empregado registra a entrega de que precisa para avançar. O departamento destinatário recebe uma solicitação com contexto mínimo e pode aceitar, sugerir outra data, pedir esclarecimento ou recusar com justificativa. Um responsável aceita executar; a equipe solicitante valida a evidência entregue. O pacto conecta tarefas já existentes e preserva sua autoria e autorização.

A tela individual responde **“Quem eu posso destravar hoje?”**. O chefe vê **“O que minha equipe precisa receber e o que prometeu entregar?”**. A empresa acompanha **“Onde duas prioridades precisam de uma decisão?”**. O engajamento vem de ver uma contribuição virar avanço real de outra equipe, com reconhecimento opcional do solicitante após validação.

### Exemplo

Uma equipe de engenharia precisa publicar um projeto, mas aguarda a validação de uma planilha pela equipe de orçamento. O pacto descreve a versão da planilha, a entrega esperada e seu critério de aceitação. Orçamento sinaliza falta de capacidade para sexta-feira e oferece terça-feira. Engenharia aceita a data ou encaminha o conflito de prioridades aos chefes. Após a entrega, engenharia aceita a evidência e confirma que o trabalho pôde avançar. Se ainda houver problema, devolve com o critério não atendido e mantém o histórico.

A inovação proposta está na ligação entre **dependência real, capacidade negociada, compromisso bilateral e comprovação de desbloqueio** dentro do próprio Work Station. Não se afirma exclusividade de mercado ou invenção inédita; não foi feita pesquisa comparativa de patentes ou de todos os produtos concorrentes.

## Mecânica de engajamento e produtividade

1. Solicitação pequena e acionável: uma entrega, uma justificativa, um destinatário e um critério verificável.
2. Aceite bilateral: proposta de data não equivale a prazo aceito; nomear alguém não equivale à aceitação da pessoa.
3. Fila de cooperação vinculada ao trabalho existente, com limites de compromissos simultâneos definidos pela equipe.
4. Progresso visível ao entregar ajuda: o solicitante confirma o recebimento e o desbloqueio, sem publicação automática em feed.
5. Conflitos de prioridade encaminhados à autoridade competente; a IA pode ajudar a redigir alternativas futuramente, mas não decide, atribui ou acessa conteúdo protegido.

O MVP funciona sem IA e sem consumo adicional de créditos. A hipótese de engajamento é que a utilidade diária e o reconhecimento contextual incentivem cooperação sustentada. Pontos por criar solicitações, rankings individuais de velocidade e contagem de mensagens não integram este requisito.

## Modelo funcional proposto

`CooperationPact` registra empresa, departamentos solicitante/destinatário, solicitante, responsável que aceitou, recurso dependente, entrega esperada, critério de aceitação, data pedida, data proposta, data acordada, classificação, estado e versão. `PactEvent` preserva decisões e alterações; `PactDelivery` referencia evidências autorizadas, sem copiar anexos; `PactAcknowledgement` registra recebimento, resultado e reconhecimento opcional.

Estados: SOLICITADO → EM_NEGOCIACAO → COMPROMETIDO → ENTREGUE → VALIDADO. RECUSADO e CANCELADO encerram com motivo. Uma entrega insuficiente volta a COMPROMETIDO mediante devolução justificada; cada tentativa fica preservada. Renegociação de data exige novo aceite, mantém a data anterior no histórico e não reinicia artificialmente a idade da solicitação.

Solicitar cooperação não concede acesso a uma tarefa e não muda seu responsável. Se faltar permissão, o dono deve concedê-la explicitamente. SIGILOSO continua exclusivo de proprietário e colaboradores autorizados, inclusive para administração, chefes e IA. Notificações contêm mensagens genéricas. O MVP opera dentro da mesma empresa; colaboração entre empresas exige desenho separado de governança.

## Métricas do piloto

| Medida | Regra observável |
|---|---|
| Tempo até primeiro compromisso | `primeiroAceiteEm - criadoEm`; informar tamanho da amostra e mediana/p90 |
| Espera até entrega validada | `validadoEm - criadoEm`, separando tempo de negociação e de execução |
| Confiabilidade do prazo | Pactos validados até a última data acordada / pactos elegíveis com prazo; mostrar também renegociações |
| Trabalho que voltou a avançar | Confirmações explícitas de desbloqueio vinculadas a recurso autorizado; separar entrega aceita sem desbloqueio confirmado |
| Retrabalho | Entregas devolvidas / entregas submetidas; motivo agrupado sem expor texto sensível |
| Reciprocidade | Departamentos que solicitaram e atenderam pactos no período; indicador agregado, sem placar individual |
| Adoção útil | Usuários distintos que receberam ou validaram uma entrega; excluir apenas abrir a tela ou criar solicitações |

“Dias de atraso evitados” não serão apresentados como fato: são estimativas contrafactuais e exigiriam método específico. Ausência de dados aparece como “sem dados”, não como zero. Filas abertas e cancelamentos são mostrados para evitar viés de medir somente casos bem sucedidos.

Piloto proposto: duas equipes, um processo recorrente e quatro semanas. Registrar a linha de base antes da ativação e comparar espera, devoluções e percepção de clareza. Definir a meta com as equipes após observar a linha de base; não prometer ganho percentual sem evidência. Validar também excesso de notificações, demandas indevidas e uso coercitivo.

## Implementação e dependências

1. Vínculos institucionais e chefias reais (RF9/RF28), ACL de tarefas/projetos e histórico persistente.
2. Pacto manual com negociação, aceite, evidência, validação, conflitos de versão e notificações.
3. Fila “Quem eu posso destravar hoje?” e painel departamental, com consultas filtradas pela autorização do ator.
4. Métricas determinísticas e piloto. Reconhecimento integra RF35 sem criar recompensa automática por volume.
5. Apoio opcional de IA reutiliza RF43 com consentimento, orçamento e revisão; não bloqueia o MVP.

Não há prazo estimado de entrega neste estudo. RF49 é uma nova proposta especificada no backlog, não uma funcionalidade implementada. A matriz histórica de 48 RF permanece como linha de base; o RF49 é acompanhado separadamente até a próxima revisão da matriz.

## Fontes internas utilizadas

- [Visão e mapa da documentação](../README.md).
- [DECIA como infraestrutura de decisão](../decia/00_README.md) e seu ciclo de execução/revisão.
- [Abas e responsabilidades por perfil](ABAS_POR_PERFIL.md), em especial Minha equipe.
- [RF10: atribuições](../diagramas/RF10/README.md), [RF24: metas](../diagramas/RF24/README.md), [RF31: cenários](../diagramas/RF31/README.md), [RF36: transição](../diagramas/RF36/README.md), [RF44: prioridade pessoal](../diagramas/RF44/README.md), [RF46: mensageria](../diagramas/RF46/README.md).
- [Taxonomia](../arquitetura/TAXONOMIA.md): dependências, atribuições, lotações e notificações.
- [Bibliografia do produto](BIBLIOGRAFIA.md): digital workplace, CSCW, interrupções, WIP e colaboração. É um mapa de referências para pesquisa futura; seu próprio texto informa que não houve verificação integral das obras. Este estudo não atribui resultados empíricos a essas obras.
