# Registro de decisões e dúvidas — Work Station / DECIA

Formato: **D-nn** decisão tomada (com justificativa) · **Q-nn** dúvida aberta para o time/PO (resposta esperada antes de codificar o RF).

## Decisões

| # | Data | Decisão | Justificativa |
|---|---|---|---|
| D-01 | 2026-10-03 | Backend em **Java 21 LTS + Spring Boot 3.5.x** (não 4.x) | 3.5 é a linha estável com Spring Security 6.5, springdoc 2.x e Resilience4j maduros; Java 25 só quando Testcontainers/JaCoCo/SpotBugs tiverem suporte comprovado. |
| D-02 | 2026-10-03 | Módulos Maven `ws-domain`, `ws-application`, `ws-infrastructure/*`, `ws-web`, `ws-bootstrap`; pacote raiz `br.gov.pr.secid.workstation` | Espelho 1:1 do FAI (`fai-*`), facilitando reaproveitar código de auth, AiEngine, eventos, Guard. |
| D-03 | 2026-10-03 | Diagramas em **Mermaid** (não PlantUML como no FAI), um `README.md` por RF com 5 diagramas | Renderiza no GitHub sem build; validação automatizada com `mermaid-cli`. PlantUML pode ser exportado depois se o TDE exigir PNG. |
| D-04 | 2026-10-03 | Identificadores `UUID` (BINARY(16)); auditoria `AuditableEntity`/`VersionedAuditableEntity`; JSON do MySQL 8 para campos `*Json` | Igual ao FAI; evita enumerar colunas voláteis (políticas, decomposições de score). |
| D-05 | 2026-10-03 | Mensagens da sessão em **Cassandra** (`messages_by_session`, TTL por sessão) com índice leve em MySQL; `DecisionTrace` em MySQL (fonte de verdade) com espelho append-only em Cassandra | Mensageria é append-only e volumosa; o rastro precisa de integridade transacional com tarefas/decisões (objetivo 1) e exportação para auditoria. |
| D-06 | 2026-10-03 | Chancela segue exatamente a máquina de estados do `SealBond` do FAI, acrescida de `APROVADA_PRIVADA`, `REVOGADA`, `EXPIRADA` | Card "Chancelas" exige consentimento do autor, revogação e recertificação. |
| D-07 | 2026-10-03 | **DECIA Points** é a única moeda; "Pontos de Contribuição" (HU35/HU40) é tratado como sinônimo e não vira entidade | Card RF42: "substituem o nome em todos os RFs". |
| D-08 | 2026-10-03 | "Grupo da conversa" (HU5) = conjunto de `SessionParticipant` da sessão; não há entidade `Group` | Nenhum RF exige grupos persistentes fora da sessão. Revisar se RF4–RF6 ganharem CAs. |
| D-09 | 2026-10-03 | Papel `CURADOR` é contextual (`CuratorAppointment` por departamento), não um `ProfileType` | RF28.CA03: curador opera **em nome do emissor**, a chancela continua do chefe/empresa. |
| D-10 | 2026-10-03 | Avatar 3D fora do escopo v1 | Card "Ideias": "em avaliação, sem RF". |
| D-11 | 2026-10-03 | Design system antes de qualquer tela; nenhum HTML/CSS solto; 4 temas via `data-theme` | Pedido explícito + RF38. |
| D-12 | 2026-10-03 | Rankings, Hype do Perfil, HSE e índice de prioridade são **serviços de domínio determinísticos**; a IA só redige | RF43 regra de ouro, RF44.CA08, RF45.CA09. |

## Dúvidas abertas (perguntar antes de codificar)

| # | RF | Dúvida | Impacto |
|---|---|---|---|
| Q-01 | RF1–RF18 | Os cards RF1–RF18 do board **não têm critérios de aceite** (só as HUs). Os diagramas usam CAs derivados marcados "a confirmar". Vocês vão escrever os CAs no board ou aceitam os derivados em `docs/diagramas/RF1..RF18`? | Sprint 1–3 inteiras |
| Q-02 | RF2 | Qual provedor OIDC institucional (Keycloak próprio, Entra ID do Governo do PR, gov.br)? Cadastro local (RF1) continua existindo em prod ou só em dev? | SecurityConfig, RF1 |
| Q-03 | RF4/RF5 | Quem é o "Administrador da sessão": sempre o CHEFE do departamento, qualquer usuário com papel ADMIN, ou quem abre a sessão? HU4 diz "administrador do sistema"; RF28 diz que o chefe administra sessões do departrmento. | Guard das sessões, RF9/RF15 |
| Q-04 | RF12/RF15 | A decisão final é **redigida pela IA** (HU12) ou **registrada pelo grupo** (RF12)? Modelei `FinalDecision.proposedByAi` para cobrir ambos; confirmar o fluxo padrão. | DecisionService |
| Q-05 | RF14 | Quem vota a reabertura: maioria simples dos participantes, o administrador, ou basta o pedido da IA? `ReopenRequest.votesJson` está provisório. | Máquina de estados da sessão |
| Q-06 | RF20 | Integrações Google Workspace / Microsoft 365 / e-Protocolo: há credenciais/apps registrados? Sem elas, implemento o adaptador com modo `stub` e flag. | Fase (d) |
| Q-07 | RF21 | Mapa categoria→fase (`SLOT_BY_CATEGORY`) é fixo no código ou configurável pela EMPRESA? Sugiro tabela `phase_category_map` editável. | TaskCategory × ProjectPhase |
| Q-08 | RF24 | Os 6 eixos do plano da EMPRESA são fixos para a SECID (Mobilidade, Habitação, Saneamento, Regularização fundiária, Equipamentos públicos, Gestão interna) ou livres? | PlanAxis seed |
| Q-09 | RF34 | Leitura de .dwg exige biblioteca proprietária (ODA) — aceitam só .dxf/.ifc/.glb no motor local e .dwg via conversão externa? | CadReaderPort |
| Q-10 | RF37 | Provedor de transcrição (Whisper local vs. API externa) e política de retenção de áudio padrão (sugestão: apagar após transcrição). | TranscriptionPort, LGPD |
| Q-11 | RF42 | Valores da tabela de pontos são os do card (5/3/8/4/6/15/2/2/3/5)? Expiração padrão 12 meses? | Seed `decia_points_rules` |
| Q-12 | RF43/RF44/RF45 | Pesos iniciais de HSE/Hype/ranking são os do board; confirmar se a EMPRESA pode editá-los já na v1 ou se ficam fixos até RF28 estar pronto. | `hse_weights`, `ranking_weights` |
| Q-13 | Geral | Board renomeado para **Work Station**: o nome do produto continua **Work Station** com centro **DECIA**? | Nomes em docs/UI |
| Q-14 | RF4–RF18 | Rotas do DECIA e do admin não existem no board; diagramas usam `/decia/[sessionId]` (+ `/summary`, `/decision`, `/decision/review`, `/artifacts`, `/archive`) e `/admin/dashboard`, API sob `/api/decia/sessions/{id}/...`. Confirmar. | Frontend RF4–RF18 |
| Q-15 | RF12 | Proposta de decisão nasce automaticamente ao publicar o resumo (listener AFTER_COMMIT) **e** por ação manual do administrador. A IA deve propor sempre ou só sob demanda? | DecisionService |
| Q-16 | RF14 | Quem decide a reabertura: administrador, com fallback "maioria simples ao fim do prazo" (`votingDeadlineAt`). Confirmar regra e prazo padrão. | ReopenRequest |
| Q-17 | RF15 | Revisor = `DeciaSession.adminUserId`; o ADMIN global também pode revisar qualquer sessão? Ao validar/devolver, o projeto vinculado vai a APROVADO/DEVOLVIDO além da tarefa ATA_REGISTRO (RF29.CA05). | Guard, ProjectStatus |
| Q-18 | RF8/RF16 | Distinção por `AiQuestion.kind` (RISCO = RF8, PONTO_CRITICO = RF16); teto de 3 perguntas abertas por sessão e dedupe > 90 % são valores provisórios. | AiQuestionService |
| Q-19 | RF17 | Encerrar sem decisão é permitido com motivo obrigatório; `409 REVISAO_PENDENTE` se há decisão EM_REVISAO. Confirmar. | SessionLifecycleService |
| Q-20 | RF11/RF42 | `MessageAttachment.usedInDecision` (+6 DP ao autor) é marcado na publicação do resumo ou só quando a decisão é VALIDADA? | DeciaPointsService |
| Q-21 | RF33 | Claude não oferece API de embeddings: `EmbeddingPort` usa Gemini text-embedding ou modelo local? Com `opensearch.enabled=false`, cair para MySQL FULLTEXT (sem semântica) ou desativar a aba? Score mínimo para "sem precedente"? | MemoryService |
| Q-22 | RF34 | `.dwg` exige conversão prévia para `.dxf` (ODA File Converter, licença); motor local com ezdxf/IfcOpenShell. Tarefa derivada (PLANILHA/CRONOGRAMA) liga-se à origem por `SourceKind.EXTRACAO` (novo) em vez de `originalTaskId`. Confirmar. | ExtractionService |
| Q-23 | RF35 | Limite mensal de reconhecimentos responde `429 LIMITE_EMISSOR_MES` ou `409`? Mínimo de esforço anti-trivial das metas fica em `Company.pointsPolicyJson`? `Highlight` precisa de status RASCUNHO/PUBLICADO explícito? | GoalService, RecognitionService |
| Q-24 | RF36 | Dossiê precisa dos estados RECUSADO (sucessor recusa) e CANCELADO (chefe cancela)? Quem herda decisões EM_REVISAO quando o sujeito era o revisor? Dossiê de GESTÃO (RF25.CA05) exige sucessor ou encerra em TRANSFERIDO? | HandoffService |
| Q-25 | RF4 | Tema/acesso editáveis só em PROPOSTA/ATIVA (REABERTA também?); restringir o acesso não remove participantes já adicionados (assumido). | SessionAccessPolicy |
| Q-26 | RF5 | Recusa da proposta de sessão vai para ARQUIVADA ou precisa de `SessionStatus.RECUSADA`? Mínimo de 2 humanos para iniciar (422) assumido. | SessionStatus |
| Q-27 | RF6 | Ordem de escrita dual: INSERT Cassandra (idempotente por TIMEUUID) → TX MySQL (índice + contador + outbox), órfãos reconciliados pelo TTL; alternativa: índice construído pelo consumidor do outbox. Realtime via SSE + Redis pub/sub (vs WebSocket). Limite 4000 caracteres e janela de edição 5 min são provisórios. | MessageService |
| Q-28 | RF7 | Limiar de confiança 0,6, p95 5 s, quem corrige a classe (autor ou admin) e reclassificação após edição: assumidos. | ClassificationService |
| Q-29 | RF9 | Admin e participante IA não removíveis; usuário não-ACTIVE não adicionável (422 USUARIO_INATIVO); saída voluntária ("SAIU") a confirmar. MySQL 8 não tem índice parcial: unicidade (sessionId, userId, ativo) via coluna gerada `activeKey`. | ParticipantService |
| Q-30 | RF2 | TTLs: access 15 min, refresh 30 d (24 h sem "lembrar"); vinculação OIDC por e-mail só se o IdP marcar `email_verified` (evita takeover); filtro consulta Redis a cada request. Confirmar política. | SecurityConfig |
| Q-31 | RF23 | Exclusão de tarefa pelo dono: hard delete com `ProjectTask.taskId = NULL` + snapshot (modelado) ou soft delete (ARQUIVADA + flag)? Política de GC dos `MediaObject` referenciados por cópias. Extrair de projeto DEPARTAMENTO/EMPRESA exige permissão explícita do autor ou basta tarefa não-PRIVADA? | AcervoService |
| Q-32 | RF24 | Derivar só de plano EMPRESA PUBLICADO (422 DERIVACAO_INVALIDA) e copiar eixos sem vínculos de projeto; projeto já em outro eixo do mesmo plano → 409 PROJETO_JA_NO_PLANO ou mover automaticamente? "REPROGRAMADO" = presente nos dois exercícios com ano alterado. | PlanService |
| Q-33 | RF25 | Item já em agrupamento do mesmo tipo → 409 AGRUPAMENTO_MESMO_TIPO ou substituir? Tarefas só via `GroupingItem` (sem ponteiros desnormalizados em `TaskItem`)? Encerrar GESTÃO gera dossiê sem sucessor e notifica o chefe (sucessor definido no RF36). | GroupingService |
| Q-34 | RF26 | Curtir é toggle idempotente; reações qualitativas 1 por tipo/ator/alvo; remix de alvo não-PUBLICA → 422 REMIX_SOMENTE_PUBLICO; chefe que pode excluir comentário é o do departamento do **alvo**. Confirmar. | SocialService |
| Q-35 | RF27 | Índices OpenSearch `ws-projects`, `ws-tasks`, `ws-people`, `ws-orgs` (+ `ws-memory`); aba CHEFES filtra `Department.headUserId` (fonte de verdade do papel); "Seguindo" por fan-out para `timeline_by_user` com backfill ao seguir (vs fan-in na leitura). Decidir antes de implementar. | SearchService, MuralService |
| Q-36 | RF40/RF41 | `TaskState.OFERECIDA` conflita com "mantendo o estado de trabalho original" (RF40.CA01): modelado como etiqueta derivada de `offeredInCounter=true` + `ModelOffer ATIVA`, preservando `state`. Remover OFERECIDA do enum? | TaskStateMachine |
| Q-37 | RF40/RF42 | "Débito e crédito no mesmo lançamento" = 2 linhas no ledger (COMPRA_LOJA no comprador, VENDA_BALCAO no autor) na mesma transação, `counterpartyUserId` cruzado, mesmo `correlationId`, chaves `k:debit`/`k:credit`. Alternativa: 1 linha com dois deltas. | DeciaPointsService |
| Q-38 | RF37 | Sem consentimento de algum participante a gravação é bloqueada (409 CONSENTIMENTO_PENDENTE) e só transcrição colada é aceita; 48 h sem contestação ⇒ ata CONFIRMADA (ratificação tácita). Confirmar. | MeetingService |
| Q-39 | RF41 | Transições extras para fechar a máquina: CONCLUIDA→EM_USO (retrabalho), ARQUIVADA→DISPONIVEL (restaurar), MODELO_PUBLICO→DISPONIVEL (chancela revogada), DISPONIVEL⇄BLOQUEADA fora de projeto. Confirmar. | TaskStateMachine |
| Q-40 | RF44 | `DailyTask` sem feedback ao virar o dia = "Expirada": vira valor de `DailyFeedback` ou flag derivada? | DailyTaskService |
| Q-41 | RF38 | `CoverMode` divergente entre tarefa (AUTO·MANUAL·IA) e projeto (MOSAICO·FOTO·IA): unificar ou manter `CoverMode` e `ProjectCoverMode`? | CardArtService |
| Q-42 | Geral | Códigos de erro propostos fora dos CAs: 409 CONSENTIMENTO_PENDENTE, 409 COTA_ESGOTADA, 403 SKIN_NAO_ADQUIRIDA, 409 VINCULO_DUPLICADO, 409 OFERTA_INDISPONIVEL, 409 LICENCA_NAO_PERMITE, 422 TRANSICAO_INVALIDA, 409 DECISAO_VINCULADA, 503 BUSCA_INDISPONIVEL, 409 LIMITE_DOACAO, 422 MOTIVO_OBRIGATORIO, 409 FEEDBACK_JA_REGISTRADO, 429 LIMITE_EMISSOR_MES. Ratificar o catálogo de `code`. | GlobalExceptionHandler |
| Q-43 | Geral | O brief atualizado cita um "prompt de esqueleto (segunda mensagem desta sessão)" com tokens, componentes, ícones, artes de fundo, shell do app e **RF23** para a etapa (b). Essa mensagem não chegou nesta sessão: o design system foi derivado do card "Identidade visual" + RF38. Reenviar o prompt para alinhar antes da etapa (b). | Design system, etapa (b) |
