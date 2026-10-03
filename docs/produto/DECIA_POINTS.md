# DECIA Points — pesquisa de produto (RF42 reescrito: objetivos, chancelas e DECIA)

**Status:** rascunho de pesquisa para decisão do dono · 2026-10-03 · não commitado
**Premissa nova (dono):** DECIA Points têm **três origens** — (1) **objetivos cumpridos** (metas coletivas RF35, eixos do Plano Anual RF24, projetos concluídos no prazo/custo RF21/RF43, Tarefa do Dia RF44); (2) **esquemas chancelados** (RF39: chancela = trabalho bem executado; só EMPRESA ou CHEFE concedem, CURADOR opera a fila em nome deles; tarefa/projeto chancelado credita o autor e, no projeto, os responsáveis); (3) **participação de qualidade no DECIA** — a avaliar se continua fonte principal ou secundária.

Convenções deste documento: tudo que não cita fonte e vem marcado **[proposta]** é meu; o resto cita `arquivo:linha` ou `board › card`. Abreviações: **FAI** = `/home/user/matheushaliski/tcc-2026-fashion-ai-backend`; **WS** = `/home/user/Decia-app-2026`; **board** = dump `scratchpad/board2.md`; **DP** = DECIA Points.

---

## 1. Referências lidas e o que foi aproveitado

| Fonte | O que diz | O que aproveitei |
|---|---|---|
| FAI `fai-domain/.../FaiPointsLedgerEntry.java:13,39-43` | Ledger append-only; `idempotency_key` única (`user_id, action_code, ref_id`); `counts_lifetime` separa saldo de vitalício | Mesma chave no WS; "vitalício" não vira segunda medida — o papel de reputação já é do Hype Score (RF45) |
| FAI `FaiPointsRule.java:13-39` | Regra por `action_code`: `points`, `daily_cap`, `weekly_cap`, `once_per_ref`, `active` | Base da `DeciaPointsRule`; acrescento multiplicadores por tier/emissor/porte (§8) |
| FAI `fai-application/.../FaiPointsService.java:104-145` | `award`: regra inativa ⇒ nada; chave `user:action:refId` (ou data quando sem ref); teto diário/semanal **não bloqueia a ação**, só não pontua; `pointsOverride` para conquistas/desafios | Tetos nunca bloqueiam chancela, meta ou conclusão — só o crédito fica SUSPENSO ou vai a zero; `pointsOverride` ⇒ `rewardPointsPerParticipant` da meta |
| FAI `FaiPointsService.java:147-160` | Ponte única `game(...)`: jogar e vencer pontuam com a mesma `ref` por partida | Ponte única por evento de domínio: `award(...)` chamado por `DomainEventOutbox`, nunca pelo controller |
| FAI `FaiPointsService.java:243-288` | Compra: lock usuário→item, saldo ≥ preço, estoque, débito `SHOP_PURCHASE` não vitalício | `StoreService.purchase` já espelha isso (`docs/diagramas/RF42/README.md:455-473`) |
| FAI `V7__fai_points_ref_id.sql:1-4` | `ref_id` precisou de 120 chars para chaves compostas `alvo:autor` | Chaves compostas de pool (`projectId:userId`) cabem em 120/240 |
| FAI `V26__fai_points_games.sql:1-9` | Calibração explícita: teto diário dos jogos (100 pts) "na mesma ordem de grandeza de criar esquemas (5×40)" | Método de calibração por **ordem de grandeza entre origens** (§5) |
| FAI `V5__meu_guarda_roupa.sql:276-289` | Seed de regras: criar esquema +40 (5/dia), peça +25 (10/dia), curtida +1/comentário +2/remix +10 (50/dia), conquistas 0 + override | Produzir vale mais que socializar: conclusão/chancela > reação |
| FAI `markdowns/01-especificacao-meu-quarto.md:340-344` | Princípios: pontos nunca vendidos; "comportamentos que **melhoram o próprio** FashionAI pesam mais que ações sociais" | Traduzido: **entregar trabalho pesa mais que falar sobre trabalho** — base da decisão do §2.1 |
| FAI `markdowns/03-desafios-e-games.md:141` | Recompensa de desafio em Equipe "dividida **igualmente** entre quem terminou como membro, dentro dos limites diários" | Alternativa "igualitária" considerada e rejeitada para projetos (§3) |
| FAI `Seal.java:19-84` / `SealTier.java` (PECA, LOOK) / `SealBond.java:22-25,93-104` | Selo com `premium`, `usageLimit`, janela; vínculo com `sealCode` único, `reviewedBy`, REVOKED | Tier TAREFA<PROJETO<PLANO e Excelência (= premium) como multiplicadores (§2.2) |
| FAI `PromotionRedemption.java:19-22` | "cupons resgatados **sobrevivem à revogação do selo** até a própria validade (CA14)" | Decisão a tomar: no WS os DP da chancela **são estornados** na revogação (premissa do dono), mas benefícios já resgatados seguem a regra FAI (§4.3, pergunta P-07) |
| FAI `CouponRight.java:16-19` | Direito promocional conquistado pelo uso: PENDENTE → RESGATADO/DISPENSADO/EXPIRADO | `BenefitRedemption` do WS já funde isso (`TAXONOMIA.md:344-345`) |
| FAI `markdowns/02-rf-reestruturados-e-criterios-aceite.md:370-387,393-397` | Mecanismo RF20/RF21: IA sugere o vínculo, revisão opcional, selo habilita promoções; tiers PEÇA/LOOK; "Meus Selos" guarda recusados | Chancela auto-emitida (política AUTO) vs. revisada ⇒ multiplicador de emissor humano (§2.2). RF25/RF30/RF38/RF41 do FAI não estão nesse catálogo (ele cobre RF1–RF31 da numeração antiga; RF30/RF41 vivem em `01-especificacao-meu-quarto.md §5` e `V26`) |
| WS `docs/arquitetura/TAXONOMIA.md:329-348` (§6) | `Seal.tier TAREFA·PROJETO·PLANO`, `excellence`, `issuerKind EMPRESA·CHEFE`, `usageLimit`; `SealBond` único por (targetId, issuerUserId), `REVOGADA`, `EXPIRADA`, `lastRecertifiedAt`; `Benefit.type PONTOS_BONUS` | Campos que alimentam os multiplicadores e o estorno |
| WS `TAXONOMIA.md:357-373` (§7) | `DeciaPointsLedgerEntry` com `PointsEvent` (18 valores), `qualityMultiplier 0,5–2,0`, `status CONFIRMADO·SUSPENSO·ESTORNADO`, `expiresAt`; `DeciaPointsRule` versionada; `PointsDonation` | Ledger base; §8 lista o que muda |
| WS `TAXONOMIA.md:395-410` (§9) | `CollectiveGoal.rewardPointsPerParticipant`, `minEffortCheck`, `ledgerBatchId`; `DailyTask` único (userId, taskDate) com `feedback CONCLUI`; `RankingDimension PONTUALIDADE_SPI`; `ProfileHypeScore.blocksJson` (participação DECIA 25 %, reconhecimentos/chancelas 10 %) | Tarefa do Dia já é 1/dia por construção; o DECIA já é recompensado em **reputação** pelo Hype — argumento para torná-lo fonte secundária de **moeda** |
| WS `TAXONOMIA.md:84-135` (TaskItem) | `effortSize P·M·G + estimatedHours`, `responsibleId` (padrão dono), `dueAt`, `legalDueAt`, `state` com CONCLUIDA | Porte e prazo da tarefa para multiplicadores |
| WS `TAXONOMIA.md:161-202` (ProjectScheme/ProjectTask) | `status CONCLUIDO`, `evmJson {PV,EV,AC,CPI,SPI,…}`; `ProjectTask.responsibleId`, `estimatedHours (PERT)`, `actualHours`, `percentComplete`, `decisionTraceNodeId` | SPI/CPI na conclusão; horas PERT M como peso da divisão (§3) |
| WS `TAXONOMIA.md:236-240` (PlanAxis) | `targetValue`, `completedPct`, `projectsCount` | Gatilho "eixo atingido" |
| WS `TAXONOMIA.md:311-315` (DecisionTrace) | Grafo append-only de nós (MENSAGEM…DECISAO…TAREFA) com `actorId` | Opção C da divisão (§3) |
| WS `docs/diagramas/RF42/README.md:5,168-188,295-298,330-358,491-526` | Chave `eventCode+refId+userId`; `ruleVersionId` congela o passado; fluxo award → tetos → multiplicador → antifraude → CONFIRMADO/SUSPENSO; estorno/expiração como lançamentos espelho | Mantido integralmente; só a **lista de eventos** e a **origem** mudam |
| WS `docs/diagramas/RF39/README.md:5,427-458` | `SealService` + `SealPolicyEvaluator`; S11 APROVADA (`sealCode`, `usageCount+1`, `autoIssued`), S12 APROVADA_PRIVADA, S19 recertificação → EXPIRADA, S20 REVOGADA, S23 resgate `BENEFICIO_BONUS` | Pontos de gancho dos eventos `CHANCELA_RECEBIDA` e do estorno |
| WS `docs/diagramas/RF35/README.md:544-549` | `META_ATINGIDA` idempotente por participante, `ledgerBatchId`; `422 META_TRIVIAL`, `429 LIMITE_EMISSOR_MES`, `Company.pointsPolicyJson` | Teto por emissor e anti-trivial reutilizados para chancelas |
| WS `docs/diagramas/RF44/README.md:1138` | CA03: CONCLUÍ ⇒ HSE realizado, tarefa CONCLUIDA, dependentes notificados | Gatilho de `TAREFA_DO_DIA_CONCLUIDA` |
| WS `docs/diagramas/RF24/README.md:2350` | `PlanService.recomputeAxis` recalcula `completedPct`/`aggregatedRisk` | Gatilho de `EIXO_PLANO_ATINGIDO` |
| board › RF42 (`board2.md:773-814`) | Título "só por participar bem no DECIA"; tabela 5/3/8/4/6/15×q/2/2/3+5/bônus; CA01–CA10 | Redação atual a substituir (§7) |
| board › RF39 (`board2.md:712-735`) | CA01 só EMPRESA/CHEFE/CURADOR; CA07 consentimento → APROVADA_PRIVADA; CA08 1 por par, revogação, recertificação; CA09 benefício "pontos bônus" | Governança da chancela como fonte (§4) |
| board › WORK AI — Chancelas (`board2.md:200-247`) | Curadores operam em nome do emissor; empregado indica e propõe; 3 modos (vínculo/política/premiação); Excelência = edição limitada; "moeda ganha por participar bem no chat DECIA" | Premiação (Excelência) como ×2; indicação acolhida como micro-evento |
| board › RF35 (`board2.md:658-670`) | CA01 meta com recompensa "DP para o grupo"; CA02 crédito por participante idempotente; CA06 anti-trivial, limite emissor/mês | Mantidos; CA02/CA06 reescritos em §7 |
| board › RF44 (`board2.md:878-922`) | Porte P/M/G, SPI da tarefa (= EV÷PV, atraso −10/dia), WIP, streak | Multiplicadores de porte e prazo |
| board › RF45 (`board2.md:923-958`) | Bloco "Participação no DECIA" 25 %; chancela PROJETO/PLANO vale mais, Excelência o dobro; antifraude compartilhado com RF42 | Coerência: mesma escala de tier/Excelência no Hype e nos DP |
| board › RF43 (`board2.md:834-836, 866`) | "nunca ordena por volume bruto de mensagens"; ranking Pontualidade (SPI) | Reforça rebaixar o DECIA como fonte de moeda |
| board › RF24 (`board2.md:458-473`), RF28 (`549-569`), RF40 (`736-750`) | Plano oficial/derivado; curador em `audit_log`; Balcão credita autor | Escopo do eixo atingido; conflito de interesse; VENDA_BALCAO inalterado |
| WS `docs/DECISOES.md:14-17,36,45,48,62` | D-07 DP é a única moeda; D-09 CURADOR contextual; Q-11 valores do card e expiração 12 meses; Q-20 artefato usado; Q-23 429 vs 409; Q-37 débito/crédito em 2 linhas | Perguntas já abertas são referenciadas, não duplicadas |

---

## 2. Tabela de eventos pontuáveis

### 2.1 Decisão sobre a origem DECIA — **[proposta]** fonte **secundária**

Argumentos:
1. O DECIA já é recompensado em **reputação**: bloco "Participação no DECIA" = 25 % do Hype do Perfil (`board2.md:926-933`; `TAXONOMIA.md:404`) e dimensão `QUALIDADE_DELIBERATIVA` do ranking (`TAXONOMIA.md:409`). Pagar moeda **e** reputação pela mesma mensagem é dupla recompensa pelo insumo, enquanto o resultado (decisão → projeto → entrega) é o objetivo 1 do produto (`board2.md:8`).
2. RF43.CA05 proíbe "volume bruto de mensagens" como critério (`board2.md:866`). Uma economia em que ~60 % da renda vem de mensagens classificadas pela IA empurra para o volume, mesmo com tetos.
3. Princípio herdado do FAI: o que melhora o produto pesa mais que o social (`01-especificacao-meu-quarto.md:344`). No WS, o que melhora a instituição é a **entrega chancelada e os objetivos cumpridos**.
4. Risco de classificação: pontuar `ARGUMENTO_EVIDENCIA` depende de inferência (RF7) com confiança variável; pontuar `CONCLUIDO`/`APROVADA` depende de fatos registrados.

Alvo de composição da renda mensal de um empregado típico **[proposta]**: **objetivos ≈ 55–65 %**, **chancelas ≈ 15–20 %**, **DECIA ≈ 20–25 %** (simulação no §5). O DECIA permanece porque: é o único canal que paga o **participante que não é autor nem responsável**; `DECISAO_VALIDADA` é em si um objetivo (RF15) e é a ponte entre as origens 3 → 1.

### 2.2 Multiplicadores avaliados **[proposta]**

| Multiplicador | Aplica a | Valores | Veredito |
|---|---|---|---|
| **Tier** da chancela | `CHANCELA_RECEBIDA` | TAREFA 20 · PROJETO 60 · PLANO 120 (base, não multiplicador — razão 1 : 3 : 6) | **Adotar.** Coerente com RF45 "tier PROJETO/PLANO valem mais" (`board2.md:933`) |
| **Excelência** | `CHANCELA_RECEBIDA` | ×2 | **Adotar.** Mesmo fator do Hype ("Excelência vale o dobro", `board2.md:933`); já é edição limitada (`usageLimit`, `Seal.java:63-67`; `TAXONOMIA.md:330`) |
| **Emissor** | `CHANCELA_RECEBIDA` | EMPRESA ×1,5 · CHEFE ×1,0 | **Adotar.** A chancela da empresa é mais escassa e passa por fila mais distante do autor (menor conflito de interesse) |
| **Modo de emissão** | `CHANCELA_RECEBIDA` | `autoIssued` (política AUTO / vínculo sem revisão) ×0,8 · revisada por humano ×1,0 | **Adotar.** Critério automático é mais farmável (§6); a revisão humana é a chancela "forte" |
| **Porte** da tarefa | `TAREFA_DO_DIA_CONCLUIDA`, chancela tier TAREFA | P ×0,75 · M ×1,0 · G ×1,5 (`effortSize`, `TAXONOMIA.md:100`) | **Adotar.** Sem ele, a Tarefa do Dia vira "escolha a menor" (RF44.CA02 troca) |
| **Prazo (SPI)** | `TAREFA_DO_DIA_CONCLUIDA`, `PROJETO_CONCLUIDO` | SPI ≥ 1,0 ×1,0 · 0,9 ≤ SPI < 1,0 ×0,8 · SPI < 0,9 ×0,5 (SPI de `evmJson`, `TAXONOMIA.md:190`; SPI da tarefa como no HSE, `board2.md:896`) | **Adotar** nos objetivos. **Não** aplicar na chancela: `PRAZO_CUMPRIDO` já é critério de política (`TAXONOMIA.md:333`) — evitar contar duas vezes |
| **Custo (CPI)** | `PROJETO_CONCLUIDO` | CPI ≥ 1,0 ×1,1 · 0,9 ≤ CPI < 1,0 ×1,0 · CPI < 0,9 ×0,7; sem AC registrado ⇒ ×1,0 | **Adotar** só quando há EVM (RF43.CA09); premissa do dono "prazo/custo" |
| **Qualidade deliberativa** | `DECISAO_VALIDADA` | 0,5–2,0 pelo `DeliberativeProfile` (`TAXONOMIA.md:358`; RF42 README S5) | **Manter** só em `DECISAO_VALIDADA`. Estender a outros eventos tornaria o cálculo opaco |
| **Reputação de quem reage** | `REACAO_QUALIDADE` | — | **Rejeitar** para moeda (já existe no Hype, RF45.CA04). Moeda deve ser previsível |
| **Escopo do plano** | `EIXO_PLANO_ATINGIDO` | plano EMPRESA ×1,5 · DEPARTAMENTO ×1,0 · PESSOAL ×0 (não pontua) | **Adotar.** Trilha pessoal derivada (RF24.CA04) é auto-definida ⇒ trivial de atingir |

Teto geral **[proposta]**: produto de multiplicadores limitado a **×3,0** (ex.: PLANO 120 × EMPRESA 1,5 × Excelência 2 = 360 — chancela mais valiosa do sistema; ocorre ≤ `usageLimit` vezes por ciclo).

### 2.3 Tabela **[proposta]** (valores base; regras em `decia_points_rules`, editáveis com vigência — RF42.CA02)

Chave de idempotência sempre `eventCode:refId:userId` (`RF42/README.md:5`), com `refId` indicado. "Estorno" = lançamento `ESTORNO` espelho, `status` do original → ESTORNADO (`RF42/README.md:493`).

| # | Evento (`PointsEvent`) | Origem | Quem dispara (fato de domínio) | Quem recebe | Base | Multiplicadores | Teto | `refId` | Estorno |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `TAREFA_DO_DIA_CONCLUIDA` **novo** | OBJETIVO | `DailyTask.feedback = CONCLUI` com `actualHours` (RF44.CA03) e tarefa → CONCLUIDA | dono da `DailyTask` | 5 | porte P/M/G · SPI da tarefa · tarefa trocada (`swappedFromTaskId`) ×0,5 | 1/dia (índice único userId+taskDate, `TAXONOMIA.md:399`); mín. esforço `estimatedHours ≥ 1h` **ou** evidência anexada (RF41.CA06) | `dailyTaskId` | tarefa reaberta CONCLUIDA→EM_USO em ≤ 7 dias (Q-39) ⇒ estorno automático |
| 2 | `SEMANA_FECHADA` **novo** | OBJETIVO | `WeekPlan.closeFriday` com `streak = 5` (RF44.CA06) | dono do `WeekPlan` | 10 | — | 1/semana | `weekPlanId` | não (depende só de #1 já estornáveis) |
| 3 | `PROJETO_CONCLUIDO` **novo** | OBJETIVO | `ProjectScheme.status → CONCLUIDO` (todas `ProjectTask` concluídas, `RF21/README.md:628`) | autor + responsáveis + decisores, pela divisão do §3 (pool) | pool 60 | porte do projeto (Σ horas PERT M: < 16 h ×0,5 · 16–60 h ×1,0 · > 60 h ×1,5) · SPI · CPI | pool só se ≥ 3 tarefas e ≥ 2 responsáveis distintos **ou** projeto chancelado; senão paga como tarefa (base 5 ao autor). 4 pools/mês por autor | `projectId` (cada linha `projectId:userId`) | projeto DEVOLVIDO após conclusão ou fraude ⇒ estorno de todas as linhas do `distributionId` |
| 4 | `EIXO_PLANO_ATINGIDO` **novo** | OBJETIVO | `PlanService.recomputeAxis` com `completedPct = 100` **ou** indicador ≥ `targetValue` (`TAXONOMIA.md:237`; RF24.CA03), plano PUBLICADO | autores e responsáveis dos projetos do eixo (`PlanAxisProject`), por participação em projetos concluídos; dono do plano 20 % | pool 40 por eixo | escopo do plano (EMPRESA ×1,5 · DEPTO ×1,0 · PESSOAL ×0) | 1× por eixo por exercício (6 eixos ⇒ ≤ 6/ano/plano) | `planAxisId` | projeto do eixo DEVOLVIDO ⇒ recálculo; estorno das linhas |
| 5 | `META_ATINGIDA` (existente) | OBJETIVO | `CollectiveGoal.status → ATINGIDA` (RF35.CA02) | cada `GoalParticipant` com `contributionJson` não vazio | `rewardPointsPerParticipant` (10–60, faixa em `pointsPolicyJson`) | — | por emissor: 3 metas/mês; por participante: 120 DP/mês de metas | `goalId` | meta anulada por auditoria ⇒ estorno (`ledgerBatchId`) |
| 6 | `ENCAMINHAMENTO_CUMPRIDO` (existente) | OBJETIVO | tarefa de encaminhamento da Ata Viva CONCLUIDA até `dueAt` (RF37) | responsável | 5 | — | 5/semana | `taskId` | reabertura ⇒ estorno |
| 7 | `CHANCELA_RECEBIDA` **novo** | CHANCELA | `SealBond.status → APROVADA` ou `APROVADA_PRIVADA` (RF39.CA07 conta para métricas; `RF39/README.md:438-439`) | TASK: autor 70 % + `responsibleId` 30 % se ≠ autor · PROJECT: divisão do §3 sem fatia de decisores (autor 40 % / responsáveis 60 %) · PLAN: dono do plano 40 % + autores dos projetos dos eixos 60 % | TAREFA 20 · PROJETO 60 · PLANO 120 | Excelência ×2 · emissor EMPRESA ×1,5 · `autoIssued` ×0,8 · porte (só TAREFA) · teto do produto ×3 | por emissor/mês (orçamento de DP e nº de vínculos, §4.1); por item 1/par item×emissor (RF39.CA08) | `sealBondId` (`sealBondId:userId`) | **REVOGADA ⇒ estorno automático de todas as linhas** (§4.3). EXPIRADA (fim de ciclo/recertificação) ⇒ **sem** estorno |
| 8 | `CHANCELA_RECERTIFICADA` **novo, opcional** | CHANCELA | `lastRecertifiedAt` atualizado com critérios válidos (`RF39/README.md:446`) | mesmos recebedores de #7, mesma proporção | 10 % da base de #7 | mesmos de #7 | 2/ano por vínculo | `sealBondId:recertDate` | não |
| 9 | `INDICACAO_ACOLHIDA` **novo** | CHANCELA | vínculo `basis = INDICACAO` chega a APROVADA (RF39.CA06) | quem indicou (`requestedBy`), se ≠ autor/responsável | 5 | — | 3/mês | `sealBondId` | revogação ⇒ estorno |
| 10 | `BENEFICIO_BONUS` (existente) | CHANCELA | `BenefitRedemption` de `Benefit.type = PONTOS_BONUS` (RF39.CA10) | quem resgata | `valueJson.points` (≤ 50 por benefício) | — | orçamento do emissor (§4.1); 1 por benefício e pessoa | `benefitRedemptionId` | revogação da chancela **não** estorna resgate anterior (regra FAI CA14, `PromotionRedemption.java:21`); fraude ⇒ estorna |
| 11 | `DECISAO_VALIDADA` (existente) | DECIA | `FinalDecision` VALIDADA (RF15) | participantes com ≥ 1 mensagem classificada ARGUMENTO/CONSENSO/DIVERGENCIA/PERGUNTA respondida na sessão (presença só não basta); **revisor não recebe por revisar** | 15 | qualidade 0,5–2,0 (`DeliberativeProfile`) | 1 por sessão por usuário | `decisionId` | decisão DEVOLVIDA em revisão posterior (RF15) ⇒ estorno |
| 12 | `ARTEFATO_USADO` (existente) | DECIA | `MessageAttachment.usedInDecision` (Q-20) | autor do artefato | 6 | — | 5/semana | `attachmentId` | não |
| 13 | `DIVERGENCIA_RESOLVIDA` (existente) | DECIA | IA marca divergência resolvida por resposta do usuário (RF10) | autor da resposta | 6 (era 8) | — | 3/dia | `divergenceReplyId` | não |
| 14 | `ARGUMENTO_EVIDENCIA` (existente) | DECIA | `MessageClassification` ARGUMENTO com `hasEvidence` (RF7) | autor da mensagem | 3 (era 5) | — | 5/dia por sessão (era 10) · 15/semana | `messageId` | antifraude (repetição) ⇒ SUSPENSO, não estorno |
| 15 | `PERGUNTA_RESPONDIDA` (existente) | DECIA | `AiQuestion` respondida com evidência (RF16) | autor da resposta | 3 (era 4) | — | 3/dia | `aiQuestionId` | não |
| 16 | `CONSENSO` (existente) | DECIA | classificação CONSENSO confirmada | autor | 2 (era 3) | — | 3/dia por sessão | `messageId` | não |
| 17 | `ATA_RATIFICADA` (existente) | DECIA | Ata Viva ratificada (RF37) | participantes da reunião | 3 | — | 2/semana | `meetingId` | não |
| 18 | `REACAO_QUALIDADE` (existente) | DECIA/Social | reação BEM_FUNDAMENTADO/CONFORME recebida de perfil verificado (RF26) | autor do alvo | 1 (era 2) | — | 10/dia (era 20) | `reactionId` | conluio ⇒ SUSPENSO/estorno |
| 19 | `PRESENCA_ENCERRADA` (existente) | DECIA | sessão encerrada com resumo (RF17) | participantes | **0 — remover [proposta]** | — | — | — | — |
| — | `COMPRA_LOJA`, `VENDA_BALCAO`, `DOACAO_ENVIADA/RECEBIDA`, `ESTORNO`, `EXPIRACAO` | LOJA/TRANSFERÊNCIA | inalterados (RF42.CA04/05/09; RF40.CA03; Q-37) | | | | | | |

Observações:
- Eventos 1–6 e 7–10 nascem de **fatos de domínio** (estado, data, vínculo), não de inferência. Só 11–18 dependem de classificação da IA e por isso levam os tetos mais apertados e o `AntiFraudService` (RF42.CA07).
- `PRESENCA_ENCERRADA` sai porque presença não é qualidade e já conta no Hype (`board2.md:930`). Pergunta P-09.
- Reações sociais ficam na origem DECIA para a tela "DP por origem" (RF35.CA05) não precisar de quarta categoria; alternativa: origem `SOCIAL` separada (P-10).

---

## 3. Divisão em projetos coletivos **[proposta]**

### 3.1 Partes e dados disponíveis
- **Autor** = `ProjectScheme.ownerId` (`TAXONOMIA.md:165`).
- **Responsáveis por tarefa** = `ProjectTask.responsibleId`, com `estimatedHours` (PERT M), `actualHours`, `percentComplete` (`TAXONOMIA.md:201`).
- **Participantes da sessão que decidiu** = `SessionParticipant` da `DeciaSession` ligada ao projeto (RF29.CA01) com nós próprios no `DecisionTrace` (`actorId`, `TAXONOMIA.md:312`).
- RACI existe só na `FeasibilitySheet.raciJson` do Autopilot (`TAXONOMIA.md:422`), não no projeto em execução — opção A exigiria novo campo.

### 3.2 Exemplo comum às três opções
Projeto "Pavimentação FINISA" concluído, SPI 1,0, CPI 1,0, porte M ⇒ **pool `PROJETO_CONCLUIDO` = 60 DP**. Autor **A**. Tarefas: T1 (A, 8 h), T2 (B, 20 h), T3 (C, 4 h), T4 (B, 8 h) — total 40 h. Sessão DECIA: A (6 nós no rastro), B (2 nós), D = chefe (4 nós, incluindo a revisão). C não participou da sessão.

| Opção | Fórmula | A | B | C | D | Problemas |
|---|---|---|---|---|---|---|
| **A — RACI** | pesos R 3 · A 2 · C 1 · I 0, somados por pessoa; `share = peso / Σ` | A: A(2)+R(3)=5 → **20** | R+R=6 → **24** | R=3 → **12** | C=1 → **4** | Precisa de RACI por projeto (novo campo + disciplina de preenchimento); "R em tarefa de 4 h" vale o mesmo que "R em 20 h" |
| **B — tarefas entregues** | autor 30 % fixo; 70 % ∝ horas PERT M das `ProjectTask` CONCLUIDA por `responsibleId` | 18 + 42×8/40 = **26,4** | 42×28/40 = **29,4** | 42×4/40 = **4,2** | **0** | Quem decidiu mas não executou não recebe (já recebe `DECISAO_VALIDADA`); horas estimadas podem ser infladas (mitigado: usa PERT M aprovado no projeto, não `actualHours`) |
| **C — rastro RF29** | ∝ nós do `DecisionTrace` com `actorId` = pessoa | 6/12 → **30** | 2/12 → **10** | **0** | 4/12 → **20** | Paga quem fala, não quem entrega (C entregou e ficou com 0; o chefe-revisor fica com 1/3); contradiz o princípio do §2.1 |
| **Recomendada — híbrida B+C** | **autor 30 %** · **tarefas 60 %** ∝ horas PERT M · **decisores 10 %** ∝ nós no rastro (só quem tem ≥ 1 nó; se não houver sessão, os 10 % vão ao autor) · piso 1 DP · arredondamento: sobra para o autor | 18 + 36×8/40 (7,2) + 6×6/12 (3) = **28** | 36×28/40 (25,2) + 6×2/12 (1) = **26** | 36×4/40 = 3,6 → **4** | 6×4/12 = **2** | Σ = 60 ✔ |

Para `CHANCELA_RECEBIDA` tier PROJETO a fatia de decisores não existe (chancela premia o **trabalho**, premissa do dono): **autor 40 % / responsáveis 60 % ∝ horas**. Ex.: chancela do CHEFE, revisada, não-Excelência: 60 × 1,0 × 1,0 = 60 ⇒ A 24 + 7,2 = **31**, B **25**, C **4**.

Regras adicionais:
- Pessoa que é autor **e** responsável recebe nas duas fatias (não há dupla contagem: são fatias disjuntas do mesmo pool).
- Responsável de tarefa `removedByAuthor` ou não concluída não entra.
- Chefe do departamento que aparece como decisor recebe a fatia de decisor normalmente; **não** recebe se for o emissor da chancela do projeto (§4.2).
- Toda divisão fica registrada em `PointsDistribution` (§8) com fórmula, versão e quotas em basis points, para "Explique meus pontos".

---

## 4. Governança da chancela como fonte de pontos **[proposta]**

### 4.1 Limites por emissor e período (`Company.pointsPolicyJson`, `TAXONOMIA.md:66`)
| Chave | Padrão sugerido | Efeito ao exceder |
|---|---|---|
| `seal.monthlyBonds.CHEFE` = {TAREFA 10, PROJETO 3, PLANO 0} · `.EMPRESA` = {TAREFA 30, PROJETO 10, PLANO 6} | nº de vínculos APROVADA/mês por emissor que **pontuam** | A chancela é emitida normalmente (regra FAI: teto nunca bloqueia a ação, `FaiPointsService.java:30-33,116-121`); o lançamento nasce **SUSPENSO** (`suspendedReason = TETO_EMISSOR`) e vai à revisão da EMPRESA (chefe) ou do ADMIN (empresa) |
| `seal.monthlyBudgetDp.CHEFE` 600 · `.EMPRESA` 3000 | orçamento de DP creditados por chancelas + `BENEFICIO_BONUS` | idem, SUSPENSO |
| `seal.excellencePerCycle` = `Seal.usageLimit` | já existe (RF39.CA05, `409 LIMITE_ESGOTADO`) | bloqueia a concessão (comportamento atual) |
| `seal.autoIssuedDailyMax` 5 por política | disjuntor de política AUTO | política pausada (`Seal.status = PAUSADA`) + notificação ao emissor; vínculos ficam EM_REVISAO |

PLANO tier por CHEFE = 0 por padrão: o plano do departamento é do próprio chefe (RF24.CA04) — conflito direto. Só a EMPRESA chancela planos (P-05).

### 4.2 Conflito de interesse
| Situação | Regra | Implementação |
|---|---|---|
| CHEFE chancela item em que é `ownerId` ou `responsibleId` (ou autor do plano) | **Não pode.** O vínculo é redirecionado à fila da EMPRESA (`issuerUserId` = empresa; `origin` preservada) com aviso; API direta ⇒ `409 CONFLITO_INTERESSE` | `SealService.resolveIssuer(target)`: se `issuer ∈ {owner, responsibles}` ⇒ `companyIssuer` |
| CURADOR revisa item próprio ou de que é responsável | Não aparece na fila dele; outro curador ou o chefe revisa | filtro na fila (`CuratorAppointment.scope`) + validação no `review` |
| Empregado indica item próprio | `INDICACAO_ACOLHIDA` não paga (`requestedBy == targetOwnerId`) | já coberto por "sem auto-interação" |
| Chefe é revisor da decisão (RF15) | `DECISAO_VALIDADA` paga só se ele também contribuiu com mensagens; revisar não paga | filtro no gatilho #11 |
| Chefe de dois departamentos (RF28.CA07) | limites de §4.1 são **por pessoa**, não por departamento | agregação por `issuerUserId` |
| EMPRESA chancela item do próprio dono da conta EMPRESA | ADMIN revisa (mesma lógica, um nível acima) | `suspendedReason = CONFLITO_INTERESSE` |

### 4.3 Revogação ⇒ estorno automático
- Gatilho: `SealBond.status → REVOGADA` (`RF39/README.md:447`). Evento `SealBondRevoked(sealBondId, revokeReason, correlationId)` ⇒ `DeciaPointsService.reverseByRef(refType = SEAL_BOND, refId = sealBondId)` cria **um `ESTORNO` espelho por linha CONFIRMADA** (#7, #8, #9 ligados ao vínculo), mesmo `correlationId` da revogação, `reviewedBy` = quem revogou.
- Saldo pode ficar **negativo** (verdade do ledger); compras ficam bloqueadas até voltar a ≥ 0; o extrato explica (P-08). Alternativa: estornar só até zero — perde rastreabilidade.
- Itens do Balcão que viraram "chancelado" voltam à prateleira COMUNIDADE (Q-39: MODELO_PUBLICO → DISPONIVEL); `VENDA_BALCAO` já paga **não** é estornada (quem remixou obteve o modelo).
- `BENEFICIO_BONUS` resgatado antes da revogação **permanece** (herança de `PromotionRedemption.java:21`), exceto quando `revokeReason` = FRAUDE, quando também é estornado (P-07).
- **EXPIRADA** (fim do ciclo ou recertificação falhou, `RF39/README.md:446`) ⇒ **sem estorno**: o trabalho foi bom quando foi chancelado; o lacre esmaece (RF38) mas os DP ficam. Isso evita que o empregado seja punido por critérios que mudaram depois (ex.: conformidade recalculada por checklist novo).

### 4.4 Recertificação
- Vínculo com `SealPolicy.recertifyEveryDays` reavaliado por `SealPolicyEvaluator` (RF39.CA08). Sucesso ⇒ `lastRecertifiedAt` e, opcionalmente, #8 (10 % da base, 2/ano). Falha ⇒ EXPIRADA, sem estorno (§4.3), e o item deixa de habilitar novos benefícios.
- Recertificação **não** reabre a divisão: usa a mesma `PointsDistribution` da emissão original.

### 4.5 Auditoria
- Cada lançamento de origem CHANCELA guarda `issuerUserId`, `sealBondId`, `multipliersJson` e `distributionId`; `audit_log` recebe `POINTS_AWARDED_SEAL` / `POINTS_REVERSED_SEAL` com o `correlationId` da transição do vínculo (RF39.CA08, RF42.CA10).
- Métricas do emissor (RF39.CA11) ganham: **DP creditados por chancela no período**, **DP estornados por revogação**, **% de vínculos `autoIssued`**, **concentração por recebedor** (top 3 recebedores ÷ total — insumo do §6).
- Dashboard EMPRESA (RF28.CA06): orçamento de chancela consumido por chefe/mês; fila de SUSPENSO por `TETO_EMISSOR` e `CONFLITO_INTERESSE`.

---

## 5. Equilíbrio da economia **[proposta]**

### 5.1 Premissas
- Mês de 21 dias úteis. Empregado típico: 16 Tarefas do Dia concluídas (6 P, 8 M, 2 G), 75 % no prazo; 2 sessões DECIA/mês; participa de 1 projeto concluído/mês como responsável (fatia média 25 DP) e é autor de 1 projeto a cada 3 meses; 1 chancela TAREFA/mês (chefe, revisada, porte M); fatia de chancela PROJETO a cada 2 meses; 1 meta/trimestre (30 DP); 1 eixo atingido/ano no plano do departamento (fatia 20 DP).
- Chefe: 8 Tarefas do Dia (gestão), 6 sessões DECIA/mês (contribui em 4), não recebe pelas chancelas que emite, recebe fatia PLANO da EMPRESA (120 × 1,5 × 40 % = 72/ano), 1 eixo/ano como dono do plano (20 % de 40 × 1,0 = 8).
- Departamento: 20 empregados + 1 chefe.
- Fatores: SPI médio da Tarefa do Dia 0,9 (mistura 75 % ×1,0 / 25 % ×0,6 ≈ 0,9); decisão validada em 75 % das sessões; qualidade média 1,0.

### 5.2 Entradas mensais

| Origem · evento | Empregado típico | Chefe | Departamento (20 + 1) |
|---|---|---|---|
| `TAREFA_DO_DIA_CONCLUIDA` (6×3,75 + 8×5 + 2×7,5 = 77,5 × 0,9) | **70** | 35 | 1.435 |
| `SEMANA_FECHADA` (2 semanas cheias) | 20 | 10 | 410 |
| `PROJETO_CONCLUIDO` (fatia responsável 25 + autor 60×30 %/3 = 6) | 31 | 10 (autor de 1 projeto/trimestre, 30 %) | 630 |
| `EIXO_PLANO_ATINGIDO` (20/12) | 2 | 1 | 41 |
| `META_ATINGIDA` (30/3) | 10 | 0 (cria, não participa) | 200 |
| `ENCAMINHAMENTO_CUMPRIDO` (1/mês) | 5 | 5 | 105 |
| **Subtotal OBJETIVO** | **138 (54 %)** | **61** | **2.821** |
| `CHANCELA_RECEBIDA` TAREFA (20 × 1,0 × 1,0 × porte M 1,0) | 20 | 0 | 400 |
| `CHANCELA_RECEBIDA` PROJETO (fatia ~25, a cada 2 meses) | 12 | 6 (PLANO 72/12) | 246 |
| `INDICACAO_ACOLHIDA` (1 a cada 2 meses) | 3 | 0 | 60 |
| `BENEFICIO_BONUS` (1 a cada 4 meses, 30 DP) | 8 | 0 | 160 |
| **Subtotal CHANCELA** | **43 (17 %)** | **6** | **866** |
| `DECISAO_VALIDADA` (15 × 0,75 × sessões com contribuição) | 22 (2 sessões) | 45 (4 sessões) | 485 |
| `ARGUMENTO_EVIDENCIA` (3/sessão × 3) | 18 | 36 | 396 |
| `DIVERGENCIA_RESOLVIDA` (0,5/sessão) | 6 | 12 | 132 |
| `PERGUNTA_RESPONDIDA` (1/sessão) | 6 | 12 | 132 |
| `CONSENSO` (1/sessão) | 4 | 8 | 88 |
| `ARTEFATO_USADO` (0,5/sessão) | 6 | 6 | 126 |
| `ATA_RATIFICADA` (1/mês) | 3 | 3 | 63 |
| `REACAO_QUALIDADE` (8/mês) | 8 | 12 | 172 |
| **Subtotal DECIA** | **73 (29 %)** | **134** | **1.594** |
| **Total entradas** | **≈ 254** | **≈ 201** | **≈ 5.280** |

Leitura: o DECIA ficou em 29 % para o empregado típico (acima do alvo 20–25 %) **porque os tetos novos ainda são generosos para 2 sessões/mês**; quem faz 4+ sessões bate os tetos semanais e a fatia estabiliza. Se o dono quiser 25 %, o ajuste mais limpo é `ARGUMENTO_EVIDENCIA` 2 DP e `REACAO_QUALIDADE` teto 5/dia (DECIA → ≈ 64, 26 %; objetivos 56 %, chancelas 18 %). Para o chefe, o DECIA é naturalmente a maior fonte (ele não é chancelado pelo próprio departamento) — aceitável, pois o chefe é o maior consumidor de `SESSAO_IA_AVANCADA`.

### 5.3 Saídas mensais e preços sugeridos da Loja (`StoreItemKind`, `TAXONOMIA.md:364`)

| Item | Preço sugerido (DP) | Referência | Frequência típica · gasto/mês (empregado) |
|---|---|---|---|
| `MODELO_BALCAO` comunidade | autor define 0–50 (teto em `pointsPolicyJson`) | FAI: remix recebido +10 (`V5:287`) | 1 × 20 = **20** (vai ao autor, não sai da economia) |
| `CREDITOS_IA` (10 inferências) | **50** | já usado no diagrama (`RF42/README.md:456`) | 1 × 50 = **50** (sai da economia) |
| `SKIN_MESA` básica / premium | 80 / 200 | FAI porta Navy 180, LED 150 (`V5:294-297`) | 1 premium/trimestre ≈ **67** |
| `MOLDURA_CARD` | 60 | FAI puxador 90 | 1/semestre ≈ **10** |
| `CAPA_IA_LOTE` (10 capas) | 60 | custo real de IA | 1/trimestre ≈ **20** |
| `IMPULSO_MURAL` 24 h | **120** | deve custar ≈ 2 semanas de trabalho para não virar spam | 1/trimestre ≈ **40** |
| `SESSAO_IA_AVANCADA` | **150** | RF43.CA06 debita cota ou DP | chefe: 1/mês = 150; empregado raro |
| `KIT_CHANCELADO` | emissor define 0–300 | chancelado = oficial, padrão 0 | ≈ 0 |
| `CERTIFICADO_PERSONALIZADO` | 80 | — | 1/semestre ≈ **13** |
| Doação a colega | limite 50/mês (RF42.CA09) | — | transfere, não sai |

Gasto típico do empregado ≈ **220 DP/mês** contra renda ≈ 254 ⇒ **acúmulo ≈ 30–40 DP/mês**, suficiente para uma `SESSAO_IA_AVANCADA` por semestre sem inflar. Chefe: renda ≈ 201 vs. gasto 150 (sessão avançada) + 50 (créditos) ⇒ equilíbrio apertado; a EMPRESA pode conceder `BENEFICIO_BONUS`/`CREDITOS_IA` a chefes via chancela PLANO (benefício, não ledger de chefe). Departamento: ≈ 5.280 DP/mês criados; a chancela responde por ≈ 870 (16 %), bem abaixo do orçamento de §4.1 (600 chefe + fatia empresa) — o orçamento é folga antifraude, não gargalo.

Âncora de valor: **1 chancela TAREFA revisada (20 DP) ≈ 4 Tarefas do Dia M no prazo ≈ 40 % de um crédito de IA**. **1 chancela PROJETO Excelência da EMPRESA (60 × 2 × 1,5 = 180, divididos) ≈ 1 skin premium** para o autor (40 % = 72) — a chancela máxima é desejável, mas não compra o catálogo inteiro.

### 5.4 Expiração e sinks
- Expiração **12 meses FIFO** (Q-11; RF42.CA09), aviso 30 dias antes; `EXPIRACAO` espelho. Evita entesouramento que torna os preços irrelevantes.
- Sinks reais (saem da economia): `CREDITOS_IA`, `SESSAO_IA_AVANCADA`, `IMPULSO_MURAL`, skins, capas. Transferências (`MODELO_BALCAO`, doação) não reduzem a massa — por isso o preço de modelo tem teto 50.
- Reequilíbrio: `MetricDefinition` domínio PONTOS (`TAXONOMIA.md:423`) ganha `DP_CRIADOS_MES`, `DP_QUEIMADOS_MES`, `RAZAO_SINK` (alvo 0,6–0,9) e `SHARE_ORIGEM` por departamento; EMPRESA ajusta regras com vigência (RF42.CA02) quando `RAZAO_SINK < 0,5` por 3 meses.

---

## 6. Antifraude **[proposta]** (estende `AntiFraudService`, `RF42/README.md:245-251`)

| Vetor | Sinal (detecção) | Resposta |
|---|---|---|
| **Conluio entre departamentos** (chefe A chancela itens do depto B e vice-versa) | Grafo emissor→recebedor em 90 dias: reciprocidade entre dois emissores ≥ 60 % das chancelas inter-departamentais de cada um **e** ≥ 5 vínculos; ou chancela a item **sem** rastro RF29, sem reações verificadas e sem reutilização (`criteriaReportJson` vazio) | lançamentos SUSPENSO (`CONLUIO_EMISSORES`) → revisão da EMPRESA; 2ª ocorrência ⇒ emissor perde `autoIssued` por 90 dias; `Reaction.ignoredReason` análogo em `HypeIgnoredEvent` (RF45.CA03) |
| **Chancelas em massa** | > 5 APROVADA/hora por emissor; > teto mensal (§4.1); política AUTO emitindo > 5/dia; > 40 % das chancelas do mês para o mesmo recebedor | além do teto ⇒ SUSPENSO `TETO_EMISSOR`; disjuntor da política (PAUSADA); concentração ⇒ alerta no dashboard + revisão |
| **Metas triviais** (RF35.CA06) | `minEffortCheck` ex-ante (`422 META_TRIVIAL`); ex-post: meta ATINGIDA < 48 h após criação, ou `progress ≥ 0,8` no momento da criação, ou participantes = só o criador | créditos SUSPENSO `META_TRIVIAL`; meta anulada ⇒ estorno em lote (`ledgerBatchId`) |
| **Tarefa do Dia trivial / troca oportunista** | `estimatedHours < 1` sem evidência; troca (`swappedFromTaskId`) para tarefa de porte menor 3× na semana; conclusão < 10 min após criação | sem pontos (mín. esforço); ×0,5 na troca; conclusão relâmpago ⇒ SUSPENSO |
| **Micro-projetos para pool** | projeto com < 3 tarefas ou 1 responsável; horas PERT infladas (Σ PERT M > 3× `actualHours` total) | paga como tarefa (§2.3 #3); inflação ⇒ pool recalculado com `actualHours` e SUSPENSO para o chefe |
| **Reabrir e concluir de novo** | CONCLUIDA→EM_USO→CONCLUIDA no mesmo `dailyTaskId`/`projectId` | chave idempotente impede 2º crédito; estorno em ≤ 7 dias (§2.3) |
| **Auto-benefício** | emissor resgata benefício da própria chancela; curador aprova item próprio | `409 CONFLITO_INTERESSE`; filtro de fila (§4.2) |
| **Já cobertos no RF42.CA07** | mensagens repetidas (similaridade > 90 %), auto-reação, sessão fictícia, `testAccount` | SUSPENSO → chefe confirma/estorna |

Escada de resposta: **ignorar** (sem crédito, visível em "ignorados" com motivo) → **SUSPENSO** (revisão do chefe, ou da EMPRESA quando o suspeito é o chefe) → **ESTORNO** + marcação do emissor → **pausa de política / perda de `autoIssued`** → ADMIN. Tudo em `audit_log` com `correlationId`.

---

## 7. Proposta de nova redação — pronta para colar no board

### 7.1 RF42 (substitui o card atual, `board2.md:773-814`)

**Título:** RF42: Acumular DECIA Points por objetivos cumpridos (metas, eixos do plano, projetos no prazo/custo, Tarefa do Dia), por esquemas chancelados (RF39) e por participação de qualidade no DECIA, e usá-los em compras dentro do app (Loja Work Station: modelos do Balcão, créditos de IA, capas/skins, impulsos, kits)

**Equivalente no FAI:** RF30 FAI Points + RF41 FAI Points em jogos e criações (ledger idempotente, regras em banco, tetos, cupons) + RF20/RF21 selos como gatilho de recompensa. **Abas:** DECIA Points (`/points`: saldo, extrato **por origem**, regras), Loja Work Station (`/store`). Os DECIA Points substituem "Pontos de Contribuição" em todos os RFs: única moeda do app, sem dinheiro real.

**Como se ganha — três origens**

| Origem | Evento | Base | Multiplicadores | Teto |
|---|---|---|---|---|
| **OBJETIVO** | Tarefa do Dia concluída (RF44) | 5 | porte P ×0,75 / M ×1,0 / G ×1,5 · SPI (≥1 ×1,0 · 0,9–1 ×0,8 · <0,9 ×0,5) · trocada ×0,5 | 1/dia; mín. 1 h estimada ou evidência |
| OBJETIVO | Semana fechada com streak 5 (RF44) | 10 | — | 1/semana |
| OBJETIVO | Projeto concluído (RF21/RF43) — **pool dividido**: autor 30 %, responsáveis 60 % ∝ horas PERT, decisores da sessão 10 % | 60 | porte · SPI · CPI | ≥ 3 tarefas e ≥ 2 responsáveis (senão paga como tarefa); 4 pools/mês por autor |
| OBJETIVO | Eixo do Plano Anual atingido (RF24) — pool entre autores/responsáveis dos projetos do eixo; dono do plano 20 % | 40 | plano EMPRESA ×1,5 · DEPTO ×1,0 · PESSOAL ×0 | 1× por eixo/exercício |
| OBJETIVO | Meta coletiva atingida (RF35) | 10–60 (recompensa da meta) | — | 3 metas/mês por emissor; 120 DP/mês por participante |
| OBJETIVO | Encaminhamento da Ata Viva cumprido no prazo (RF37) | 5 | — | 5/semana |
| **CHANCELA** | Chancela aprovada (APROVADA ou APROVADA_PRIVADA, RF39) — TAREFA: autor 70 % / responsável 30 %; PROJETO: autor 40 % / responsáveis 60 %; PLANO: dono 40 % / autores dos projetos 60 % | TAREFA 20 · PROJETO 60 · PLANO 120 | Excelência ×2 · emissor EMPRESA ×1,5 · auto-emitida ×0,8 · porte (TAREFA) · produto ≤ ×3 | orçamento e nº de vínculos por emissor/mês (política da empresa) |
| CHANCELA | Indicação de colega acolhida (RF39.CA06) | 5 | — | 3/mês |
| CHANCELA | Benefício "pontos bônus" resgatado (RF39.CA09) | valor do benefício (≤ 50) | — | orçamento do emissor |
| **DECIA** | Decisão final validada (RF15) em sessão em que contribuí com mensagem classificada | 15 | qualidade 0,5–2,0 (perfil deliberativo) | 1/sessão |
| DECIA | Tarefa/artefato compartilhado e usado no resumo/decisão (RF29) | 6 | — | 5/semana |
| DECIA | Divergência resolvida por resposta minha (RF10) | 6 | — | 3/dia |
| DECIA | Argumento com evidência (RF7) | 3 | — | 5/dia por sessão; 15/semana |
| DECIA | Pergunta da IA respondida com evidência (RF16) | 3 | — | 3/dia |
| DECIA | Consenso confirmado | 2 | — | 3/dia por sessão |
| DECIA | Ata Viva ratificada (RF37) | 3 | — | 2/semana |
| DECIA | Reação BEM FUNDAMENTADO/CONFORME recebida de perfil verificado (RF26) | 1 | — | 10/dia |

Não geram pontos: presença sem contribuição, revisar a própria decisão, chancelar/curar o próprio item, mensagens ruído/repetidas (> 90 %), auto-reações, sessões de teste, `testAccount`.

**Onde se gasta** — inalterado (Balcão, créditos de IA, capas/skins, impulso, sessão avançada, kits, certificado, doação com limite mensal).

**Critérios de aceite**
- **RF42.CA01** Dado um evento pontuável de qualquer origem (OBJETIVO, CHANCELA ou DECIA), quando o fato de domínio é confirmado (estado CONCLUIDO/ATINGIDA/APROVADA, ou classificação da IA confirmada), então o ledger recebe **1 lançamento idempotente** por recebedor (chave = tipo + id do evento + usuário) com valor base, multiplicadores aplicados, origem, emissor (quando chancela), `correlationId` e, em pools, o `distributionId`; reprocessar não duplica.
- **RF42.CA02** Dado os tetos, bases e multiplicadores, quando o lançamento é calculado, então as regras vêm de tabela versionada (`decia_points_rules`) editável por ADMIN/EMPRESA com vigência; alterar a regra não altera lançamentos passados; o produto dos multiplicadores nunca excede ×3.
- **RF42.CA03** Dado a tela DECIA Points, quando a abro, então vejo saldo, extrato paginado (**origem**, evento, item/sessão/chancela, pontos, data), regras vigentes em linguagem simples, gráfico mensal **por origem** e, em cada linha de pool, "Explique minha fatia" (fórmula, horas, percentuais); tudo i18n.
- **RF42.CA04** (inalterado) Compra transacional e atômica; `409 SALDO_INSUFICIENTE` / `409 ITEM_INDISPONIVEL`; entrega; extrato.
- **RF42.CA05** (inalterado) Compra no Balcão credita o autor no mesmo lançamento, respeitando a licença.
- **RF42.CA06** (inalterado) Créditos de IA comprados consumidos antes da cota mensal; origem visível; sem cota ⇒ aviso + Loja.
- **RF42.CA07** Dado abuso detectado (mensagens repetidas, conluio de reações **ou de emissores de chancela**, sessões fictícias, metas triviais, micro-projetos, teto do emissor excedido, conflito de interesse), quando a regra antifraude dispara, então os lançamentos ficam **suspensos** para revisão do chefe — ou da EMPRESA quando o suspeito é o chefe —, que confirma ou estorna com motivo (auditado); a chancela, a meta ou a conclusão **nunca são bloqueadas** pelo teto de pontos.
- **RF42.CA08** Dado o perfil (RF19), quando abro o perfil deliberativo, então vejo os DECIA Points por **origem** e por evento, ligando a moeda aos objetivos 1 e 2; o dashboard (RF18/RF28) mostra pontos por departamento e origem, orçamento de chancela consumido por emissor e custo de IA comprado.
- **RF42.CA09** (inalterado) Expiração configurável (padrão 12 meses, aviso 30 dias); doação com limite mensal e sem ganho ao doador.
- **RF42.CA10** (inalterado) Sem moeda real, sem gateway; auditoria com `correlationId` e sem dados sensíveis em todo lançamento.
- **RF42.CA11** Dado um projeto concluído ou chancelado, quando o pool é dividido, então a divisão segue a fórmula vigente (autor / responsáveis ∝ horas PERT M das tarefas concluídas / decisores ∝ nós no Rastro de Decisão), com piso de 1 DP, sobra de arredondamento ao autor e registro em `PointsDistribution`; responsável de tarefa removida ou não concluída não recebe.
- **RF42.CA12** Dado uma chancela REVOGADA, quando a revogação é confirmada, então **todos** os lançamentos ligados ao vínculo são estornados automaticamente (lançamentos espelho, mesmo `correlationId`), o saldo pode ficar negativo bloqueando compras até zerar, e o autor é notificado; chancela EXPIRADA (fim de ciclo ou recertificação) **não** estorna; benefício já resgatado permanece, salvo fraude.
- **RF42.CA13** Dado um CHEFE que é autor ou responsável do item, quando tenta chancelá-lo, então o vínculo é redirecionado à fila da EMPRESA (API direta ⇒ `409 CONFLITO_INTERESSE`); curador não revisa item próprio; revisor de decisão não recebe por revisar; indicação própria não pontua.
- **RF42.CA14** Dado a política da empresa, quando configurada, então existem limites por emissor e período (nº de chancelas que pontuam por tier, orçamento de DP por mês, disjuntor de política AUTO) e faixas de valor para recompensas de meta; o excedente nasce SUSPENSO e aparece no dashboard do emissor.

### 7.2 CAs afetados no RF35 (`board2.md:664-669`)
- **RF35.CA01 (ajuste)** … e recompensa em DECIA Points por participante **dentro da faixa definida pela empresa (padrão 10–60)** e/ou reconhecimento; …
- **RF35.CA02 (reescrito)** Meta atingida credita DECIA Points (origem OBJETIVO, evento `META_ATINGIDA`) a cada participante com contribuição registrada, com lançamento idempotente (RF42.CA01) agrupado por `ledgerBatchId`, e dispara o reconhecimento configurado; participante sem contribuição não recebe.
- **RF35.CA06 (reescrito)** Anti-abuso: metas não podem ter critério trivial (mínimo de esforço da empresa, `422 META_TRIVIAL`); meta atingida em menos de 48 h da criação ou já ≥ 80 % concluída ao ser criada tem créditos suspensos (RF42.CA07); emissor tem limite de metas e de reconhecimentos por mês (`429 LIMITE_EMISSOR_MES`); meta anulada estorna o lote; tudo auditado.

### 7.3 CAs afetados no RF39 (`board2.md:720-735`)
- **RF39.CA07 (ajuste)** … sem consentimento a chancela fica APROVADA_PRIVADA (conta para métricas **e credita DECIA Points normalmente**, não aparece).
- **RF39.CA08 (ajuste)** … revogação com motivo **estorna automaticamente os DECIA Points do vínculo (RF42.CA12)**; expiração ao fim do ciclo ou por recertificação **não estorna**; tudo em `audit_log` com `correlationId`.
- **RF39.CA11 (ajuste)** … métricas do emissor: chancelas emitidas, pendentes, revogadas, benefícios resgatados, **DP creditados e estornados, % auto-emitidas, concentração por recebedor**, por período.
- **RF39.CA13 (novo)** Chancela aprovada credita DECIA Points (RF42) ao autor e, em projeto/plano, aos responsáveis, com base por tier (TAREFA < PROJETO < PLANO), Excelência ×2, emissor EMPRESA ×1,5 e auto-emitida ×0,8; o crédito respeita o orçamento mensal do emissor (RF42.CA14) e nunca bloqueia a emissão.
- **RF39.CA14 (novo)** CHEFE não chancela item em que é autor ou responsável: o vínculo vai à fila da EMPRESA (`409 CONFLITO_INTERESSE` na API direta); CURADOR não revisa item próprio; o tier PLANO é emitido apenas pela EMPRESA.

---

## 8. Impacto na TAXONOMIA e no ledger **[proposta]**

### 8.1 Enum `PointsEvent` (`TAXONOMIA.md:358`, `RF42/README.md:168-188`)
- **Adicionar:** `TAREFA_DO_DIA_CONCLUIDA`, `SEMANA_FECHADA`, `PROJETO_CONCLUIDO`, `EIXO_PLANO_ATINGIDO`, `CHANCELA_RECEBIDA`, `CHANCELA_RECERTIFICADA` (opcional), `INDICACAO_ACOLHIDA`.
- **Remover:** `PRESENCA_ENCERRADA` (P-09).
- **Novo enum** `PointsOrigin`: `OBJETIVO · CHANCELA · DECIA · LOJA · TRANSFERENCIA · AJUSTE` (ESTORNO/EXPIRACAO herdam a origem do lançamento original e ficam em AJUSTE).
- **Novo enum** `SuspendedReason`: `REPETICAO · AUTO_INTERACAO · CONLUIO_REACOES · CONLUIO_EMISSORES · SESSAO_FICTICIA · TEST_ACCOUNT · TETO_EMISSOR · CONFLITO_INTERESSE · META_TRIVIAL · MICRO_PROJETO · CONCLUSAO_RELAMPAGO`.

### 8.2 `DeciaPointsLedgerEntry` (§7.2) — campos novos
`origin PointsOrigin` · `basePoints int` · `multipliersJson {tier, excellence, issuer, autoIssued, effortSize, spi, cpi, quality, planScope, capped}` · `issuerUserId` (quando CHANCELA ou META) · `distributionId → PointsDistribution` · `shareBps int` (fatia em basis points) · `reversedEntryId` (no ESTORNO, aponta o original) · `suspendedReason` passa a enum. `qualityMultiplier` continua (compatível) mas migra para `multipliersJson.quality`. `idempotencyKey` inalterada; `refId` VARCHAR(120) como no FAI (`V7`).

### 8.3 `DeciaPointsRule` (§7.3) — campos novos
`origin PointsOrigin` · `baseByTierJson {TAREFA, PROJETO, PLANO}` · `multipliersJson {excellence 2.0, issuerEmpresa 1.5, autoIssued 0.8, effortSize {P 0.75, M 1.0, G 1.5}, spi [...], cpi [...], planScope {...}, maxProduct 3.0}` · `monthlyCapPerUser` · `minEffortJson {estimatedHours 1, orEvidence true}` · `distributionFormulaVersion`.

### 8.4 Nova entidade `PointsDistribution` — `points_distributions` (contexto 7)
`id · eventCode · refType (PROJECT · PLAN_AXIS · SEAL_BOND) · refId · poolPoints · formulaVersion · sharesJson [{userId, role (AUTOR · RESPONSAVEL · DECISOR · DONO_PLANO), weight, bps, points}] · inputsJson {hoursByUser, traceNodesByUser, spi, cpi, effortSize} · correlationId · createdAt`. Único (eventCode, refId). Lida pelo "Explique minha fatia" (RF42.CA03/CA11).

### 8.5 Outras entidades
- `Company.pointsPolicyJson` (`TAXONOMIA.md:66`): chaves `seal.monthlyBonds.{CHEFE,EMPRESA}`, `seal.monthlyBudgetDp.*`, `seal.autoIssuedDailyMax`, `goal.rewardRange {min 10, max 60}`, `goal.perEmitterMonth 3`, `goal.perParticipantMonth 120`, `project.poolMinTasks 3`, `project.poolMinResponsibles 2`, `project.poolsPerAuthorMonth 4`, `expirationMonths 12`, `donationMonthlyLimit 50`, `modelOfferMaxPrice 50`.
- `SealBond`: `pointsDistributionId` (ligação direta ao pool creditado) e `pointsReversedAt`.
- `Seal`: `pausedReason` (disjuntor AUTO).
- `ProjectScheme`: `concludedAt`, `spiAtConclusion`, `cpiAtConclusion`, `effortSizeComputed` (congela o EVM no momento do pool; `evmJson` continua vivo).
- `DailyTask`: `pointsEntryId` (atalho para estorno na reabertura).
- `PlanAxis`: `achievedAt`, `pointsDistributionId`.
- `CollectiveGoal`: `createdProgress` (progresso no momento da criação, para o anti-trivial ex-post).
- `MetricDefinition` domínio PONTOS: `DP_CRIADOS_MES`, `DP_QUEIMADOS_MES`, `RAZAO_SINK`, `SHARE_ORIGEM`, `CONCENTRACAO_EMISSOR`.
- `NotificationType`: já tem `PONTOS` e `CHANCELA_ESTADO` (`TAXONOMIA.md:388`); acrescentar payload `origin` e `reversed`.
- `RankingDimension.DECIA_POINTS` (`TAXONOMIA.md:409`): passa a somar só CONFIRMADO do período, com filtro opcional por origem (ranking "DP por objetivos" evita premiar o chat).

### 8.6 Eventos de domínio → `award` (ponte única, análoga a `FaiPointsService.game`)
`DailyTaskCompleted` → #1 · `WeekPlanClosed` → #2 · `ProjectConcluded` → `distribute(#3)` · `PlanAxisAchieved` → `distribute(#4)` · `GoalAchieved` → #5 (lote) · `SealBondApproved` → `distribute(#7)` · `SealBondRecertified` → #8 · `SealBondApproved(basis INDICACAO)` → #9 · `BenefitRedeemed(PONTOS_BONUS)` → #10 · `SealBondRevoked` → `reverseByRef` · `ProjectReturned`/`TaskReopened` → `reverseByRef` dentro da janela. Todos via `DomainEventOutbox` AFTER_COMMIT (`TAXONOMIA.md:445`).

### 8.7 Migração do seed (`decia_points_rules`)
Versão 1 das regras com `validFrom` = data de ativação; valores do card antigo (Q-11) ficam como versão 0 encerrada (`validTo`) para rastreabilidade. Nenhum lançamento histórico é recalculado (RF42.CA02).

---

## 9. Perguntas para o dono

1. **P-01 Peso do DECIA.** Aceita o alvo "DECIA ≈ 20–25 % da renda típica" (fonte secundária) e os cortes de §2.3 (#13–#18)? Ou prefere manter os valores do card (5/3/8/4/…) e rebalancear só subindo objetivos/chancelas?
2. **P-02 Base por tier.** TAREFA 20 · PROJETO 60 · PLANO 120 (1 : 3 : 6). Alternativa mais plana 20 · 40 · 80?
3. **P-03 Emissor EMPRESA ×1,5.** Confirma? Alternativa: ×1,0 e deixar a distinção só na escassez (orçamento menor para chefe).
4. **P-04 Auto-emitida ×0,8.** Penalizar política AUTO/vínculo sem revisão faz sentido, ou toda chancela aprovada vale igual (o critério é da empresa)?
5. **P-05 Tier PLANO só pela EMPRESA.** Chefe não chancela planos (nem o próprio, nem trilhas pessoais da equipe)? E a trilha pessoal derivada (RF24.CA04) não pontua eixo atingido (×0)?
6. **P-06 Divisão híbrida 30/60/10.** Confirma autor 30 % · responsáveis 60 % ∝ horas PERT M · decisores 10 % ∝ nós do rastro? Alternativa B pura (30/70, sem decisores, já que `DECISAO_VALIDADA` os paga)? Para chancela PROJETO: 40/60 sem decisores?
7. **P-07 Revogação × benefício já resgatado.** Estorna só os DP da chancela (`CHANCELA_RECEBIDA`, `INDICACAO_ACOLHIDA`) e mantém `BENEFICIO_BONUS` resgatado (regra FAI CA14), estornando este só em fraude? Ou estorna tudo?
8. **P-08 Saldo negativo.** Após estorno, o saldo pode ficar negativo (bloqueia compras até zerar) ou o estorno para em zero?
9. **P-09 Remover `PRESENCA_ENCERRADA`.** Confirma a remoção (presença conta só no Hype)? Alternativa: manter +1 com teto 3/semana.
10. **P-10 Origem das reações.** `REACAO_QUALIDADE` fica na origem DECIA (3 origens na tela) ou cria-se a 4ª origem SOCIAL?
11. **P-11 Tarefa concluída fora da Tarefa do Dia.** Só a Tarefa do Dia pontua (como na premissa) ou qualquer tarefa CONCLUIDA com mínimo de esforço pontua (risco de farm)?
12. **P-12 Mínimo de esforço da Tarefa do Dia.** `estimatedHours ≥ 1` **ou** evidência anexada — adequado para SECID? Qual janela de estorno por reabertura (7 dias)?
13. **P-13 Pool de projeto.** Exige ≥ 3 tarefas e ≥ 2 responsáveis distintos (ou chancela) para abrir pool; abaixo disso paga 5 ao autor. Confirma? Porte por Σ horas PERT M (< 16 h · 16–60 h · > 60 h)?
14. **P-14 Faixa da meta.** 10–60 DP por participante, 3 metas/mês por emissor, 120 DP/mês por participante. Confirma? Participante sem `contributionJson` fica de fora?
15. **P-15 Orçamentos por emissor.** Chefe 600 DP/mês e {TAREFA 10, PROJETO 3}; EMPRESA 3000 e {30, 10, 6}. O excedente nasce SUSPENSO (não bloqueia a chancela). Confirma a abordagem "nunca bloquear a chancela"?
16. **P-16 Preços.** `CREDITOS_IA` 50 (10 inferências), `IMPULSO_MURAL` 120, `SESSAO_IA_AVANCADA` 150, skin premium 200, teto de modelo do Balcão 50. Confirma a âncora "1 chancela TAREFA ≈ 40 % de um crédito de IA"?
17. **P-17 Recertificação pontua?** Manter #8 (10 % da base, 2/ano) ou deixar a recertificação sem efeito nos DP?
18. **P-18 Chefe sem renda de chancela.** O chefe só recebe chancela da EMPRESA (PLANO) e vive do DECIA + Tarefa do Dia (≈ 200 DP/mês). Aceitável, ou a EMPRESA deve ter um evento próprio de reconhecimento ao chefe (ex.: `DEPARTAMENTO_META_ATINGIDA`)?
19. **P-19 Ranking `DECIA_POINTS`.** Passa a excluir a origem DECIA (vira "DP por entrega") para não contradizer RF43.CA05, ou mantém o total?
20. **P-20 Expiração FIFO 12 meses** (Q-11) confirmada para todas as origens, inclusive chancela?
