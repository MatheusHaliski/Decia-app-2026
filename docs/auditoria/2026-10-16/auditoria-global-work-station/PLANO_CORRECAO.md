# Plano de correção e critérios para chegar a 10

16/10/2026. Primeira rodada executada; os demais incrementos continuam pendentes. Não há novos RF: as ações preservam RF1–RF74. Estimativas de cronograma dependem da capacidade da equipe e da integração de produto; não se promete concluir um conjunto inteiro apenas por acrescentar telas.

## P0 — Integridade, privacidade e controle

| Ação | RF | Estado | Gate verificável |
|---|---|---|---|
| Invalidar proposta por nível, instrução e classificação; impedir aplicar em passivo | RF51/RF68 | **Aplicado localmente** | Três testes de regressão, original preservado e ação indisponível ao mudar política |
| Restringir sigilo no modelo social e filtrar metadados de composição | RF7/RF16–19/RF27 | **Aplicado localmente** | Mesmo departamento não concede acesso; títulos/IDs/contagem não vazam em card/mosaico nem em conteúdo oculto |
| Recuperação persistente da peça e prevenção de perda após reload/navegação | RF8/RF52/RF69/RF71 | **Pendente** | Checkpoint autorizado no servidor, recuperação após falha e conflito, retenção e versões; sem gravar texto sigiloso em armazenamento inseguro |
| Unificar política de autorização de peça/tarefa/projeto/sessão | RF8/RF29/RF56/RF66/RF71 | **Parcial** | Dono/colaborador explícito; negar ADMIN implícito para SIGILOSO; revogação interrompe leitura/escrita e invalida propostas |

## P1 — Fechar as jornadas centrais

### Incremento 1: trabalho persistente e projetos

RF4/RF5/RF7/RF8/RF10/RF12/RF20/RF21/RF22/RF41/RF71. Tipo/categoria/especialidade/formato foram expostos no criador e seis profissões testadas. Falta um agregado de projeto operacional com fases, tarefas, entregas e dependências, ACL, API, versões e detalhe completo.

Implementar campos comuns (objetivo, entregável, responsável, prazo, prioridade, critérios e referências) e extensões por área. Não duplicar a descrição entre Letters e tarefa: a peça deve ser uma referência versionada. Estado de execução, disponibilidade e publicação precisam ser separados conceitualmente e migrados sem quebrar contratos. Atribuição exige aceite e autoridade no servidor.

Gate: usuário cria tarefa de seis áreas, anexa peça, cria projeto com pelo menos três tarefas e dependência, atribui, salva, sai, reabre, altera sem perda, conclui e verifica estado. Duas contas e visitante comprovam ACL. Projeto e tarefa têm APIs e persistência reais; não há repositório DEMO no caminho avaliado.

### Incremento 2: Letters profissional e compartilhado

RF52–RF56/RF69/RF71. Criar modelo textual estruturado com estilos, seleção por trecho, tabelas e referências conforme os casos de uso; preservar modelo e exportação. Adotar protocolo explícito de concorrência por bloco ou colaboração convergente, com comentários/sugestões resolvíveis, permissões ler/comentar/editar e reconexão. Identificar contribuição sem inferir autoria intelectual pelo número de caracteres.

Gate: duas contas editam blocos distintos, disputam o mesmo bloco, perdem conexão, retomam e exportam o mesmo documento. Proposta localizada não altera os demais blocos; aceitar/rejeitar/reverter conserva intenção e versão. Revogação bloqueia escrita no servidor e preserva rascunho recuperável.

### Incremento 3: Drawings preciso e consistente

RF57–RF70/RF73/RF74. Unificar cena 2D/3D, histórico, câmeras, regiões e camadas; manter capacidade declarada por operação. Expor unidades, escala e tolerâncias. Instrumentar topologia, cotagem associativa, precisão e exportação. Adicionar ferramentas contextuais para reduzir a rolagem e reservar mais área ao canvas. Não declarar equivalência integral com comandos comerciais cujas semânticas não foram implementadas.

Gate: desenho técnico e cena ilustrativa complexa preservam IDs, camadas, grupos, vazios, materiais, câmeras e medidas em salvar/reabrir. Alternativas numéricas/teclado para operações de arraste. Reservas obedecidas por ferramenta manual e IA. Testar sobreposição espacial e em profundidade, corrida concorrente real, expiração, reconexão e versão desatualizada.

A geração multimodal RF74 requer endpoint próprio com PNG de entrada, bounds, resposta de duas variantes transparentes, validação alpha/dimensões/MIME, custo, alinhamento e aceite. Ghost de uma proposta vetorial local não conta como esse gate.

### Incremento 4: DECIA real e decisão rastreável

RF13/RF29/RF31/RF32/RF33/RF37/RF43/RF46/RF71. Persistir decisão e sessão, papéis, critérios/versionamento, evidências/fonte, alternativas, avaliações independentes, dissensos, justificativa humana, snapshot e encaminhamentos. Integrar a tarefa e o projeto reais; separar recomendação de IA de voto e decisão humana. Preservar cálculos determinísticos de pontuação e sensibilidade.

Gate: grupo de três contas registra um problema, duas alternativas, critérios ponderados e evidências contrárias; altera um peso e reproduz o cálculo; registra dissenso; a IA identifica lacuna e apresenta fonte verificável; responsável humano decide e cria encaminhamento uma vez. Reload e revogação preservam histórico e ACL. Não há consenso anunciado sem registro humano explícito.

### Incremento 5: modos de IA reais e avaliação técnica

RF26/RF30/RF34/RF43/RF48/RF50/RF51/RF53/RF54/RF55/RF67/RF68/RF74. Implementar Manual, Sob solicitação, Sugestões, Assistido e Agente como política versionada. Agência não deve ser um nome para reescrita de documento inteiro. O agente necessita plano, ferramentas permitidas, orçamento, limite de passos/tempo, interrupção, checkpoints e trilha. O administrador da sessão altera a política dentro das permissões, comunica aos participantes e invalida propostas antigas; não concede credenciais externas alheias.

Avaliação de qualidade: conjunto pequeno inicial de casos com gabarito por área e módulo, fontes controladas e revisão profissional. Medir acerto factual, preservação de restrições e intenção, utilidade, citação verificável, reconhecimento de informação ausente e mudanças indevidas. Separar heurística local, double, LLM real e cálculo determinístico. Requisitar orçamento explícito de campanha antes de testes pagos adicionais; esta rodada gastou zero.

Gate: nenhuma alteração fora do escopo em casos adversos; stop interrompe a execução e novas ferramentas; resultado rastreável; erros e limitações expostos. Meta de qualidade de cada domínio pactuada com especialista, sem nota universal de precisão inventada.

### Incremento 6: portfólio e rede profissional

RF3/RF6/RF14–RF19/RF27/RF35/RF38/RF45. Cabeçalho real e atividade privada estão aplicados localmente. Implementar foto segura, biografia e especialidades, seguidores/seguindo reais, projetos e feed de marcos publicados. Não publicar cada autosave. Registrar papel e contribuição, data, versão, evidência e escopo. Curtir/comentar/salvar/remixar precisam de endpoints idempotentes, moderação e proveniência.

Gate: proprietário, colega de outra empresa e visitante veem contagens e conteúdo coerentes com sua autorização. Publicar/remover/restringir atualiza feed e totais; conteúdo privado não aparece em miniatura, título ou contagem. Remix mantém licença/crédito; seguir não amplia acesso.

### Incremento 7: integrações e gestão institucional

RF1/RF2/RF9/RF23/RF24/RF25/RF28/RF34/RF36/RF39/RF47/RF70. Priorizar um adapter de importação real por vez, com estado de conexão e testes negativos, antes de multiplicar ícones. Completar lotação/chefia/atribuição, aprovação e migração/handoff com histórico. Implementar extração documental isolada e fonte/versão por formato.

Gate: cada integração cumpre a cadeia descrita em `CONECTORES.md`; testes externos e controlados são diferenciados. Falha, expiração ou revogação não perde conteúdo e não causa duplicidade. SMTP/IdP são verificados como infraestrutura própria, não como conectores de arquivos.

## P2 — Consistência, evidência e benefícios

RF11/RF35/RF38/RF39/RF40/RF42/RF44/RF45/RF49/RF72/RF73. Corrigir densidade e diferenciação de cards, termos de estado, thumbnails com autorização, foco, contraste, alvos e navegação móvel. A rodada atual corrigiu contraste e referências ARIA e incorporou RF51–RF74 ao catálogo de rastreabilidade local.

Depois de fechar as jornadas centrais, implementar metas, reconhecimento, pontos/loja/modelos e pactos com transações idempotentes e critérios de contribuição. Indicadores de popularidade não podem ser apresentados como capacidade profissional ou decisão de carreira.

Gate UX: testes de tarefas com participantes reais representando empregado/chefia, áreas distintas e necessidades de acessibilidade. Medir conclusão sem ajuda, tempo, erros e recuperação; registrar protocolo e amostra. Metas iniciais propostas, a validar: ≥90% de conclusão das tarefas críticas, zero perda de trabalho, zero vazamento nos testes de autorização e nenhum problema crítico/sério de acessibilidade nas superfícies críticas verificadas. Isso não é resultado já obtido.

## P3 — Refinamento e escala

Otimizar cenas/documentos grandes e feed paginado; observabilidade de latência/erros; custo por capacidade de IA; aprendizado de uso com consentimento. Definir tamanho de referência, hardware, rede, orçamento e metas antes do benchmark. Não usar tempos de automação desta rodada como performance humana ou garantia de escala.

## Regra de promoção de nota

Para superar 8, cada RF deve ter objetivo principal operacional, persistência/ACL corretas, estados compreensíveis e evidência de recuperação, com limitações residuais registradas. Para nota 10: todos os CA reconciliados e testados nas condições definidas; evidência vinculada por ID; nenhuma falha impeditiva aberta; testes assistivos e com usuários do domínio; integrações disponíveis comprovadas. Nota técnica e validação com usuários continuam distintas.

O checklist de aceite do Trello não foi marcado como concluído por esta auditoria. As ações acima são uma sequência executável, não uma declaração de entrega de todas as pendências.
