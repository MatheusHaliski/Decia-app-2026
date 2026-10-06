# DECIA — Auditoria do Work Station (2026-10-06, `main` @ 2e1f83f)

Escopo auditado: domínio Java (`ws-domain`), migrations V1–V21, JPA/repositórios (`persistence-mysql`), aplicação e web
(`ws-application`, `ws-web`), frontend (`app/`, `components/`, `lib/`), design system e docs de produto, board Trello
(lido ao vivo em 2026-10-06: 46 RFs, sem mudanças nos cartões DECIA; o cartão "Criação dos Requisitos Funcionais do
DECIA" está vazio).

## 1. Arquitetura atual

```
BOARD ── objetivo 1: "decisão fundamentada … rastro completo (argumentos → tarefas → decisão validada) … autoridade humana"
  │
  ├─ Contexto 5 DECIA sessão (V14)  DeciaSession ─< SessionParticipant
  │                                   │ SessionMessage (Cassandra) + SessionMessageIndex (MySQL)
  │                                   │ MessageClassification {ARGUMENTO, DIVERGENCIA, RISCO, CONSENSO, PERGUNTA, RUIDO}
  │                                   │ Divergence ─< DivergenceReply · AiQuestion
  │                                   │ AnalyticalSummary (versionado; risks/recommendations/evaluationCriteria em JSON)
  │                                   │   └─< SummaryScenario (vantagens/desvantagens/criteriaScores em JSON)
  │                                   │ FinalDecision (texto, fundamentação, cenário escolhido, proposedByAi, estado)
  │                                   │   └─ DecisionReview (VALIDADA/DEVOLVIDA) · ReopenRequest (votos JSON)
  │                                   │ SessionArtifact · Meeting (Ata Viva)
  ├─ Contexto 6 Rastro (V15)         DecisionTraceNode/Edge (grafo append-only) · SessionArchive · HandoffDossier
  ├─ Adjacentes                      FeasibilitySheet (premissas/riscos/Monte Carlo — sem ligação com a sessão)
  │                                  ProjectScenario/ProjectVersion (simulador) · TaskItem · Assignment · Comment
  │                                  AiInferenceLog (proveniência) · audit_log · DeliberativeProfile (gamificação)
  │
  ├─ Aplicação/Web                   SÓ identidade/conta/auditoria. Nenhum serviço, porta, DTO ou endpoint de DECIA.
  ├─ Repositórios                    gerados, vazios, sem uso.
  ├─ IA                              AiProvidersConfig só loga; nenhum cliente, prompt ou porta.
  └─ Frontend                        /decia, /decia/[sessionId], /decia/review = esqueletos RfPage; /lab/decia = maquete;
                                     nenhum componente de card além de Card genérico.
```

## 2. Problemas

| # | Problema | Evidência | Efeito |
|---|---|---|---|
| P-1 | A unidade do DECIA é a **conversa**, não a **decisão** | `DeciaSession.topic`; `FinalDecision` sem pergunta | não dá para listar "decisões abertas", só sessões |
| P-2 | Alternativas e critérios só existem **dentro de um resumo de IA** (JSON) | `SummaryScenario.criteriaScoresJson`, `AnalyticalSummary.evaluationCriteriaJson` | a comparação nasce da IA; sem pesos, sem notas por pessoa → a recomendação não é inspecionável |
| P-3 | Sem pesos, sem avaliação humana por critério | — | não há modelo transparente para opor à IA (G3) |
| P-4 | Sem registro de premissas no DECIA | premissas só em `FeasibilitySheet` | hipóteses viram fatos implícitos |
| P-5 | Evidência deliberativa sem entidade | `acervo.Evidence` = fotos; `hasEvidence`/`citationsJson` soltos | não dá para dizer o que sustenta ou contradiz cada opção |
| P-6 | Sem confiança humana e sem dono na `FinalDecision` | só `proposedByAi` | responsabilidade e incerteza não registradas |
| P-7 | **Sem snapshot no momento da decisão** | `FinalDecision` editável; resumo versionado mas não congelado com a escolha | o passado pode ser reescrito (P0) |
| P-8 | Sem resultado, checkpoint, revisão pós-decisão, previsão | `ReviewOutcome` = só veredito do revisor | o loop de aprendizado não fecha |
| P-9 | Decisão registrada em 3+ lugares | FinalDecision + nó DECISAO + tarefa ATA_REGISTRO + ata de reunião | divergência de verdade |
| P-10 | Nenhuma API/serviço | `ws-application`/`ws-web` | nada funciona ponta a ponta |
| P-11 | Frontend sem card de decisão; card de sessão especificado como mini-dashboard | `DECIA_SESSAO_E_MESA` §B.1 | leitura lenta, sinais demais |
| P-12 | Cor ✦ (IA) usada para "proposta" | `Tabs.tsx:107`, `SidebarNav.tsx:55` | proveniência de IA ambígua |
| P-13 | Estados só por cor/pulso; dicas só em `title` | `/lab/decia`, `RfPage.tsx:55` | acessibilidade |
| P-14 | Gamificação premia participação ("argumentos com evidência") | RF42/HU42 | incentivo a volume (Goodhart) — Q-152 |
| P-15 | Indicadores de pessoas ("perfil deliberativo") próximos de diagnóstico | `DeliberativeProfile` | risco de vigilância — Q-153 |

## 3. Redundâncias

1. Visibilidade em 6+ vocabulários (`Visibility`, `SessionAccess`, `OfferVisibility`, `AnnouncementVisibility`,
   `HypeVisibility`, `MediaAccessClass`) com grafias diferentes (PUBLICA/PUBLICO, PRIVADA/SO_EU). → o contexto 5b usa só
   `Visibility` + `AccessClassification`.
2. "Cenário" duplo (`SummaryScenario` × `ProjectScenario`). → `DecisionScenario`/`DecisionAlternative` **apontam** para os
   existentes em vez de copiar.
3. Risco em 5+ JSONs sem tipo comum. → `DecisionRisk` tipado; os JSONs antigos continuam como saída da IA da sessão.
4. "Evidência" com dois sentidos. → `DecisionEvidence` (deliberativa) pode referenciar `media_objects`/`tasks`; `evidences`
   (fotos do acervo) segue intocada.
5. Três fluxos de revisão/aprovação. → aprovação formal continua em `FinalDecision`/`DecisionReview` (RF29); a nova
   `DecisionRetrospective` é revisão **pós-resultado**, outro conceito, nome distinto.
6. FK bidirecional `final_decisions.review_id` ↔ `decision_reviews.decision_id` + `stampJson` desnormalizado. → registrar
   (migration aplicada não muda); a leitura canônica passa a ser `decision_reviews`.
7. "Critério"/"peso" sobrecarregados (`ApprovalCriteria`, `SealCriterion`, `HseWeights`, `RankingWeights`). → nomes novos
   prefixados `Decision*`.
8. Mensagens duplicadas por desenho (Cassandra + índice MySQL; anexos em JSON + tabela). → fora do escopo; registrado.
9. Decisão em 3+ lugares (P-9). → `decisions` vira a **fonte canônica do registro**; nó de rastro e ATA passam a ser
   projeções derivadas (backlog P1).

## 4. Arquitetura proposta

```
                     ┌───────────── DecisionEvent (append-only: trilha, linha do tempo, analytics)
Decision (agregado) ─┤
  pergunta, contexto,├─< DecisionParticipant (DACI)
  dono, estado,      ├─< DecisionAlternative (inclui "não agir") ── → summary_scenarios / project_scenarios (opcional)
  complexidade,      ├─< DecisionCriterion (peso opcional) ─< CriterionAssessment (por pessoa, 1–5)
  impacto/urgência   ├─< DecisionEvidence (natureza, fonte, qualidade) ─< EvidenceLink (SUSTENTA/CONTRADIZ → alvo)
                     ├─< DecisionAssumption · DecisionRisk · DecisionScenario · DecisionForecast
                     ├─< DecisionRecommendation (MODELO determinístico | IA ✦, com os 4 porquês)
                     ├─< DecisionTrigger ("o que mudaria esta decisão")
                     ├─< DecisionSnapshot (imutável, SHA-256)  ← DECIDIDA / REABERTA / CHECKPOINT
                     ├─< DecisionCheckpoint · DecisionOutcome · DecisionRetrospective
                     └─< DecisionWorkLink → tasks / project_schemes (sem copiar)
       │ opcional
       ├── decia_sessions (deliberação em grupo, inalterada)
       └── final_decisions (validação formal RF29, inalterada)

Regras puras (Java = fonte de verdade; TS = espelho para interação) validadas pelos mesmos vetores contracts/decia/vetores.json
Card = view model derivado (nunca cópia) → DecisionCard (COMPACT/STANDARD/DETAIL/HERO, frente/verso)
Workspace = 6 seções + trilha dos 9 estágios
API: só depois dos Blocos 4–5 de segurança (BOLA/BFLA)
```

## 5. Notas 0–5 do DECIA atual

| Dimensão | Nota | Justificativa |
|---|---|---|
| Propósito | 3 | objetivo 1 do board é claro ("decisão fundamentada", "autoridade humana"); o produto o traduz como chat |
| Estrutura da decisão | 1 | pergunta, alternativas e critérios só em JSON de resumo de IA |
| Clareza | 1 | não há tela nem card de decisão |
| Rastreabilidade | 2 | rastro (grafo) e `ai_inference_log` existem; sem snapshot da decisão |
| Qualidade da evidência | 1 | sem entidade, sem fonte/data/confiabilidade |
| Comparação de alternativas | 1 | sem matriz humana, sem pesos |
| Explicabilidade | 1 | recomendações em JSON da IA; nada de "o que mudaria a resposta" |
| Usabilidade | 0 | esqueletos |
| Acessibilidade | 2 | DS com tokens e reduced-motion; estados só por cor em pontos |
| Colaboração | 2 | modelo de sessão rico (divergências, réplicas, perguntas), sem UI |
| Loop de aprendizado | 0 | sem resultado, revisão, checkpoint, previsão |
| Performance | 3 | sem UI pesada; Cassandra/OpenSearch planejados |
| Acabamento | 1 | maquete em `/lab/decia` |

## 6. Matriz de auditoria

| Área | Estado atual | Problema | Referência/Princípio | Sev. | Solução |
|---|---|---|---|---|---|
| Snapshot da decisão | inexistente | passado reescrevível | G7 [REF-FOWLER-ES], LGPD art. 20 | **P0** | `DecisionSnapshot` imutável com SHA-256 + teste de adulteração |
| Exclusão de histórico | — | apagar decisão levaria a trilha | G7 | **P0** | snapshots/eventos com FK RESTRICT |
| Fluxo principal | sem API/UI | nada funciona ponta a ponta | — | **P1** | domínio + regras + UI (mock) agora; API após segurança |
| Alternativas/critérios | JSON de IA | sem modelo transparente | G3 [REF-DOSHIVELEZ] [QOC] | **P1** | entidades + matriz + pesos |
| Responsável humano | ausente na decisão | IA parece decidir | G1 [REF-PARASURAMAN] | **P1** | `ownerUserId` obrigatório; só ele decide |
| Evidência | sem entidade | fato e opinião misturados | G4 [REF-TOULMIN] | **P1** | `DecisionEvidence` + `EvidenceLink` |
| Premissas | fora do DECIA | hipóteses implícitas | G4 | **P1** | `DecisionAssumption` |
| Resultado/revisão | inexistente | sem aprendizado | G8 [REF-ARGYRIS] | **P1** | outcome + retrospectiva + checkpoints |
| Recomendação IA | JSON sem porquês | eco, não crítica | §7 [REF-AMERSHI] [REF-JANIS] | **P2** | 4 porquês obrigatórios; modos de desafio |
| Confiança × evidência | inexistente | confiança confundida com prova | G10 | **P2** | três indicadores separados + alerta de contraste |
| Divergência | só na sessão | média esconde discordância | G6 [REF-NOISE] | **P2** | rodada independente; amplitude |
| Card de sessão | mini-dashboard (spec) | leitura lenta | minimalismo | **P2** | Decision Card ≤ 5 sinais + verso |
| ✦ para "proposta" | Tabs/Sidebar | proveniência ambígua | RF38.CA04 [REF-AMERSHI] | **P2** | trocar por `--ws-info` + texto "proposta" |
| Estados só por cor | `/lab/decia`, notificação | WCAG 1.4.1 | — | **P2** | cor + texto + ícone |
| Dicas só em `title` | RfPage/PageHeader/Sidebar | sem acesso por teclado/toque | — | **P3** | Tooltip (abre no foco) |
| `?acao=nova` ignorado | "+ Criar" | ação morta | — | **P3** | fluxo "Nova decisão" |
| Gamificação por volume | RF42 | Goodhart | G9 [REF-GOODHART] [REF-DECI-CROWDING] | **P2** | Q-152 |
| Perfil deliberativo | indicadores de pessoas | vigilância/diagnóstico | G12 [REF-EDMONDSON] [REF-ZUBOFF] | **P2** | Q-153 |
| Visibilidade | 6 vocabulários | inconsistência | — | **P3** | contexto 5b usa só `Visibility` |
| Calibração | inexistente | — | PRODUCT HYPOTHESIS | **P4** | Brier só com n ≥ 10, privado |
| Memória/decisões parecidas | RF33 planejado | reaproveitar cegamente | [REF-WALSH] [Ackerman] | **P4** | diferenças de contexto antes de reaproveitar |

## 7. Revisão heurística dos fluxos (estado atual → alvo)

| Heurística | Atual | Alvo (onde) |
|---|---|---|
| Estado do sistema | ✗ esqueleto | trilha de estágios, "salvo há", estado da IA (05 §3) |
| Mundo real | ~ termos do domínio em i18n | linguagem Alternativas/Evidências/Premissas (05 §5) |
| Controle | ✗ | desfazer, reabrir, comparar snapshots, IA nunca decide |
| Consistência | ~ DS existe | componentes `components/decia` só com tokens |
| Prevenção de erro | ✗ | guarda pré-decisão proporcional (§6.10) |
| Reconhecimento | ✗ | modelos, critérios recentes, busca de pessoas |
| Eficiência | ✗ | atalhos N/F// e Decisão rápida |
| Minimalismo | ✗ (spec do card de sessão) | ≤ 5 sinais na frente |
| Recuperação de erro | ✗ | mensagens específicas (05 §5) |
| Ajuda | ✗ | ⓘ contextual por indicador |

(Lista de heurísticas: PRODUCT HYPOTHESIS — Nielsen não consta da bibliografia, Q-156.)
