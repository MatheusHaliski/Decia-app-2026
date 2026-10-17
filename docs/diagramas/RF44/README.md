# RF44 — Receber a Tarefa do Dia sugerida pela IA e acompanhar o Hype Score de Eficiência (previsto × realizado), calculado por princípios de gestão empresarial e de projetos, com feedback diário e semana planejada
**HU:** HU44 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** Look do Dia (DailyLook: 1 por dia, índice único usuário+data, Hype Score, feedback ADOREI / NAO_USEI / NAO_GOSTEI) + WeekPlan · **Aba/rota:** sub-aba **Tarefa do Dia** no perfil (`/profile?tab=tarefa-do-dia`), widget no topo do Acervo (`/tasks`) e da Mesa (`/desk`), Semana planejada (`/profile?tab=semana`), notificação diária às 8h (preferências RF3)
**Critérios de aceite cobertos:** RF44.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs.

`DailyTask` (único `userId + taskDate`; `taskId` entre as DISPONIVEL/EM_USO; `priorityIndexJson` {eisenhower, wsjf, cpmSlack, moscow, pareto, wipAdvice}; `hsePredictedJson` / `hseRealizedJson` {total, components[]}; `feedback` `DailyFeedback` CONCLUI · ADIEI · BLOQUEADA · DELEGUEI; `actualHours`, `swapReason`, `swappedFromTaskId`, `delegatedToUserId`, `blockedByRef`, `aiInferenceId`). O **índice de prioridade** (Eisenhower × WSJF × folga CPM × MoSCoW/Pareto × WIP/Little's Law, `UserPreferences.wipLimit` padrão 3) e o **HSE** (0–100: eficiência 20 · eficácia 20 · valor WSJF 15 · pontualidade SPI 15 · qualidade 15 · impacto na equipe 10 · foco 5, `HseWeights` por EMPRESA com versão) são **serviços de domínio determinísticos** (`PriorityIndexService`, `HseCalculator`, D-12, `METRICAS_GESTAO.md`); a IA (`TAREFA_DO_DIA`, `HSE`) só redige a explicação ✦. `EfficiencyScoreSnapshot` guarda o HSE diário e a média móvel de 7 dias; `WeekPlan`/`WeekPlanDay` a semana (prazos legais, reuniões Google/Microsoft, carga ≤ 80 %, streak, fechamento de sexta). Feedback CONCLUI → `TaskStateMachine` CONCLUIDA (RF41) e notifica dependentes; BLOQUEADA cria dependência; DELEGUEI cria `Assignment` (RF46) com rastro.

## 0. Diagrama de casos de uso

Quem recebe e governa a Tarefa do Dia e o HSE. Atores do catálogo de [`ATORES_E_ATRIBUTOS.md`](../../arquitetura/ATORES_E_ATRIBUTOS.md) §2 e permissões de [`ABAS_POR_PERFIL.md`](../../produto/ABAS_POR_PERFIL.md) (a Tarefa do Dia é só de contas pessoa, EMPREGADO e CHEFE; a EMPRESA define os pesos do HSE). O caso com borda contínua existe no código (preferências em `/settings?tab=trabalho` e `?tab=notificacoes`); os tracejados são planejados — `DailyTask` existe só como entidade.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  empregado["«ator» Empregado"]:::ator
  chefe["«ator» Chefe de departamento"]:::ator
  empresa["«ator» Empresa ou órgão"]:::ator
  subgraph SIS["Work Station — RF44 Tarefa do Dia e HSE"]
    direction TB
    UC1(["UC1 Receber a Tarefa do Dia"]):::ucPlan
    UC2(["UC2 Calcular o índice de prioridade e o HSE previsto"]):::ucPlan
    UC3(["UC3 Trocar a tarefa sugerida com motivo"]):::ucPlan
    UC4(["UC4 Registrar que concluí a tarefa"]):::ucPlan
    UC5(["UC5 Adiar, marcar bloqueada ou delegar"]):::ucPlan
    UC6(["UC6 Definir o limite de WIP e o horário da Tarefa do Dia"]):::uc
    UC7(["UC7 Planejar a semana"]):::ucPlan
    UC8(["UC8 Ver o histórico de 30 dias e o HSE"]):::ucPlan
    UC9(["UC9 Definir os pesos do HSE da empresa"]):::ucPlan
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  agendador["«ator» Agendador de trabalhos"]:::atorSis
  conectores["«ator» Google · Microsoft · e-Protocolo"]:::atorSis
  empregado --- UC1
  empregado --- UC4
  empregado --- UC6
  empregado --- UC7
  empregado --- UC8
  chefe --- UC1
  chefe --- UC4
  chefe --- UC6
  chefe --- UC7
  chefe --- UC8
  empresa --- UC9
  UC1 -. "«include»" .-> UC2
  UC3 -. "«extend»" .-> UC1
  UC5 -. "«extend»" .-> UC4
  UC1 --- agendador
  UC2 --- ia
  UC7 --- conectores
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Receber a Tarefa do Dia (widget e notificação no horário escolhido) | Empregado, Chefe de departamento, Agendador de trabalhos | RF44.CA01, RF44.CA10 | planejado |
| UC2 Calcular o índice de prioridade e o HSE previsto (IA só redige a explicação) | IA (AiGateway) | RF44.CA01, RF44.CA05, RF44.CA09 | planejado |
| UC3 Trocar a tarefa sugerida com motivo | — (estende UC1) | RF44.CA02 | planejado |
| UC4 Registrar que concluí a tarefa (HSE realizado) | Empregado, Chefe de departamento | RF44.CA03 | planejado |
| UC5 Adiar, marcar bloqueada ou delegar | — (estende UC4) | RF44.CA04 | planejado (delegar cria a atribuição do RF46) |
| UC6 Definir o limite de WIP e o horário da Tarefa do Dia | Empregado, Chefe de departamento | RF44.CA05, RF44.CA10 | real (`wipLimit` e `notificationPrefs.dailyTaskAt` em `/settings`, `PUT /api/me/preferences`) |
| UC7 Planejar a semana (prazos, reuniões da agenda, carga) | Empregado, Chefe de departamento, Google · Microsoft · e-Protocolo | RF44.CA06 | planejado |
| UC8 Ver o histórico de 30 dias e o HSE | Empregado, Chefe de departamento | RF44.CA07 | planejado |
| UC9 Definir os pesos do HSE da empresa (versionados) | Empresa ou órgão | RF44.CA08 | planejado |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_gamification {
  class DailyTask {
    <<entity>>
    +id: UUID
    +userId: UUID
    +taskDate: LocalDate
    +taskId: UUID
    +suggestedByAi: boolean
    +priorityIndexJson: JSON
    +hsePredictedJson: JSON
    +hseRealizedJson: JSON
    +feedback: DailyFeedback
    +feedbackAt: Instant
    +actualHours: BigDecimal
    +swapReason: String
    +swappedFromTaskId: UUID
    +delegatedToUserId: UUID
    +blockedByRef: String
    +weekPlanDayId: UUID
    +aiInferenceId: UUID
  }
  class WeekPlan {
    <<entity>>
    +id: UUID
    +userId: UUID
    +weekStart: LocalDate
    +streak: int
    +closingHse: BigDecimal
    +recommendation: String
  }
  class WeekPlanDay {
    <<entity>>
    +id: UUID
    +weekPlanId: UUID
    +date: LocalDate
    +taskId: UUID
    +sortOrder: int
    +meetingsJson: JSON
    +loadPct: BigDecimal
  }
  class HseWeights {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +version: int
    +weightsJson: JSON
    +validFrom: LocalDate
  }
  class EfficiencyScoreSnapshot {
    <<entity>>
    +id: UUID
    +userId: UUID
    +date: LocalDate
    +hse: BigDecimal
    +movingAvg7: BigDecimal
    +weightsVersion: int
  }
  class DailyFeedback {
    <<enum>>
    CONCLUI
    ADIEI
    BLOQUEADA
    DELEGUEI
  }
}

namespace ws_domain_contexto {
  class TaskItem {
    <<entity>>
    +id: UUID
    +state: TaskState
    +dueAt: LocalDate
    +legalDueAt: LocalDate
    +effortSize: EffortSize
    +amountInvolved: BigDecimal
    +blockedByTaskId: UUID
    +blockedByUserId: UUID
    +responsibleId: UUID
  }
  class ProjectTask {
    <<entity>>
    +taskId: UUID
    +isCritical: boolean
    +slackDays: int
    +moscow: String
    +pertMostLikely: BigDecimal
    +plannedValue: BigDecimal
    +earnedValue: BigDecimal
  }
  class ProjectScheme {
    <<entity>>
    +planAxisId: UUID
    +status: ProjectStatus
  }
  class DeciaSession {
    <<entity>>
    +linkedProjectId: UUID
    +status: SessionStatus
  }
  class UserPreferences {
    <<entity>>
    +wipLimit: int
    +timezone: String
    +notificationPrefsJson: JSON
  }
  class Assignment {
    <<entity>>
    +targetId: UUID
    +fromUserId: UUID
    +toUserId: UUID
    +origin: AssignmentOrigin
    +status: AssignmentStatus
  }
  class DeliberativeProfile {
    <<entity>>
    +userId: UUID
  }
  class RankingEntry {
    <<entity>>
    +dimension: RankingDimension
  }
}

namespace ws_application {
  class DailyTaskService {
    <<service>>
    +today(actor) DailyTask
    +swap(actor, newTaskId, reason) DailyTask
    +feedback(actor, DailyFeedback, payload) DailyTask
    +history(actor, days) List~DailyTask~
  }
  class PriorityIndexService {
    <<service>>
    +rank(userId, candidates) List~ScoredTask~
    -eisenhower(task) Score
    -wsjf(task) Score
    -cpmSlack(task) Score
    -moscowPareto(task) Score
    -wipAdvice(userId, wipLimit) Advice
  }
  class HseCalculator {
    <<service>>
    +predict(task, user, weights) HseResult
    +realize(dailyTask, feedback, weights) HseResult
    -components(task) Map
  }
  class WeekPlanService {
    <<service>>
    +week(actor, weekStart) WeekPlan
    +reorder(actor, weekPlanId, order) WeekPlan
    +closeFriday(userId) WeekPlan
  }
  class TaskStateMachine {
    <<service>>
    +transition(task, CONCLUIDA, actor)
  }
  class AssignmentService {
    <<service>>
    +propose(actor, TASK, taskId, toUserId, MINHA_EQUIPE) Assignment
  }
  class AiEngine {
    <<service>>
    +run(TAREFA_DO_DIA | HSE) AiResponse
  }
  class Guard {
    <<service>>
    +requireOwner(actor, ownerId)
    +requireRole(actor, role)
  }
  class CalendarPort {
    <<port>>
    +meetings(userId, from, to) List~Meeting~
  }
  class NotificationPort {
    <<port>>
    +send(Notification)
  }
  class DomainEvents {
    <<service>>
    +publish(event)
  }
}

namespace ws_web {
  class DailyTaskController {
    <<controller>>
    +GET_api_me_daily_task()
    +POST_api_me_daily_task_swap(taskId, reason)
    +POST_api_me_daily_task_feedback(feedback, payload)
    +GET_api_me_daily_task_history(days)
    +GET_api_me_week_plan(weekStart)
    +PATCH_api_me_week_plan_id_order(order)
  }
  class HseWeightsController {
    <<controller>>
    +PUT_api_companies_id_hse_weights(form)
  }
}

namespace ws_infrastructure {
  class GoogleCalendarAdapter {
    <<adapter>>
  }
  class MicrosoftCalendarAdapter {
    <<adapter>>
  }
}

DailyTask "0..*" --> "1" TaskItem
DailyTask "0..*" --> "0..1" WeekPlanDay
WeekPlan "1" *-- "5" WeekPlanDay
HseWeights "1" o-- "0..*" EfficiencyScoreSnapshot : weightsVersion
DailyTask ..> EfficiencyScoreSnapshot : hseRealized
DailyTask "0..1" --> "0..1" Assignment : DELEGUEI
ProjectTask "0..*" --> "1" TaskItem
ProjectScheme ..> PriorityIndexService : planAxisId eixo
DeciaSession ..> PriorityIndexService : decisao pendente
UserPreferences ..> PriorityIndexService : wipLimit
EfficiencyScoreSnapshot ..> DeliberativeProfile : media movel 7d no perfil
EfficiencyScoreSnapshot ..> RankingEntry : HSE_MEDIO
DailyTaskController --> DailyTaskService
DailyTaskController --> WeekPlanService
DailyTaskService --> PriorityIndexService
DailyTaskService --> HseCalculator
DailyTaskService --> TaskStateMachine
DailyTaskService --> AssignmentService
DailyTaskService --> AiEngine
DailyTaskService --> Guard
DailyTaskService --> DomainEvents
WeekPlanService --> PriorityIndexService
WeekPlanService --> CalendarPort
HseWeightsController ..> HseWeights
DomainEvents ..> NotificationPort : TAREFA_DO_DIA 8h
GoogleCalendarAdapter ..|> CalendarPort
MicrosoftCalendarAdapter ..|> CalendarPort
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (EMPREGADO · EMPRESA)"]
    A0([Abre o app após 6h]) --> A1["Vê a Tarefa do Dia com índice de prioridade decomposto e HSE previsto"]
    A1 --> A2{"Aceita?"}
    A2 -->|troca| A3["Escolhe outra tarefa e informa o motivo"]
    A2 -->|sim| A4["Trabalha"]
    A4 --> A5{"Feedback"}
    A5 -->|CONCLUI| A6["Informa esforço real em horas"]
    A5 -->|ADIEI| A7["Motivo: prioridade mudou / falta de tempo / dependência"]
    A5 -->|BLOQUEADA| A8["Por quem ou o quê"]
    A5 -->|DELEGUEI| A9["Para quem"]
    A10([Abre Semana planejada]) --> A11["Reordena por arrastar · sexta de fechamento"]
    A12([Abre histórico no perfil]) --> A13["30 dias: tarefa, feedback, HSE previsto × realizado, média móvel, gráfico de componentes"]
    A14([EMPRESA edita pesos do HSE])
  end

  subgraph FE["Next.js / BFF (app/(shell)/profile · tasks · desk)"]
    F1["DailyTaskWidget: TaskCard variant TAREFA_DO_DIA · PriorityBreakdown (Eisenhower, WSJF, folga, MoSCoW) · HseGauge previsto · Spark ✦ · GET /api/me/daily-task"]
    F2["SwapDialog (lista de motivos + texto) · POST /swap"]
    F3["FeedbackButtons CONCLUI/ADIEI/BLOQUEADA/DELEGUEI · POST /feedback"]
    F4["WeekPlanBoard (5 dias, drag, Due, reuniões, carga) · GET/PATCH /api/me/week-plan"]
    F5["HistoryChart (30 dias, média móvel 7d, componentes)"]
    F6["Notificação push/e-mail 8h (preferência RF3) · i18n"]
  end

  subgraph WEB["ws-web"]
    W1["JWT · CorrelationIdFilter"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application"]
    P1{"Já existe DailyTask para userId + hoje?"}
    P1 -->|sim| P2["Retorna a existente (índice único)"]
    P1 -->|não| P3["Candidatas: TaskItem DISPONIVEL/EM_USO do usuário"]
    P3 --> P4{"Nenhuma candidata?"}
    P4 -->|sim| P5["EmptyState: sem tarefa hoje"]
    P4 -->|não| P6["PriorityIndexService.rank: Eisenhower (prazo/prazo legal × eixo/decisão/chancela) · WSJF (custo do atraso ÷ porte) · folga CPM · MoSCoW/Pareto"]
    P6 --> P7{"WIP acima do wipLimit?"}
    P7 -->|sim| P8["wipAdvice: prioriza concluir EM_USO e explica (Little's Law)"]
    P7 -->|não| P9["Escolhe a melhor"]
    P10["HseCalculator.predict com HseWeights vigente → hsePredictedJson"]
    P11["DailyTask (único) + aiInferenceId"]
    P12{"Motivo informado?"}
    P12 -->|não| E1["422 VALIDACAO details.reason"]
    P12 -->|sim| P13["swappedFromTaskId, swapReason · ajusta pesos pessoais para os próximos dias"]
    P14{"Guard.requireOwner(DailyTask) e feedback ainda não dado?"}
    P14 -->|não| E2["403 ou 409 FEEDBACK_JA_REGISTRADO"]
    P15["CONCLUI: HseCalculator.realize (tabela §2) · ▲▼ vs previsto · EfficiencyScoreSnapshot · TaskStateMachine → CONCLUIDA · Notification aos dependentes"]
    P16["ADIEI/BLOQUEADA/DELEGUEI: só componentes aplicáveis · bloqueio por terceiro não penaliza (vai ao insight de equipe) · BLOQUEADA cria blockedByTaskId/UserId · DELEGUEI → AssignmentService.propose (rastro)"]
    P17["WeekPlanService.week: 5 sugestões (prazos legais, reuniões via CalendarPort, carga ≤ 80%) · reorder persiste · closeFriday: HSE médio, streak, 1 recomendação"]
    P18["Guard.requireRole EMPRESA → HseWeights nova versão (validFrom) · dias passados não recalculam"]
    P19["Job 06:00: pré-calcula a Tarefa do Dia · 08:00 no fuso do usuário: Notification TAREFA_DO_DIA se dailyTaskAt ativo"]
  end

  subgraph IA["AiEngine (TAREFA_DO_DIA · HSE)"]
    I1["Redige a explicação do índice e do HSE sobre os números calculados ✦"]
    I2["Claude → Gemini → LocalEngine (determinístico, redação simplificada)"]
    I3["AiInferenceLog"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL daily_tasks (unique userId+taskDate) · week_plans · week_plan_days · hse_weights · hse_snapshots · tasks · task_state_log · assignments")]
    D2[("Redis cache do dia · flag redis.enabled")]
    D3[("Cassandra notifications_by_user · flag cassandra.enabled")]
  end

  A0 --> F1 --> W1 --> P1
  P2 --> F1
  P8 --> P10
  P9 --> P10 --> I1 --> I2 --> I3 --> P11 --> D1
  P11 --> D2
  A3 --> F2 --> W1 --> P12
  P13 --> D1
  A6 --> F3 --> W1 --> P14 -->|sim| P15 --> D1
  P15 --> D3
  A7 --> F3
  A8 --> F3
  A9 --> F3
  F3 --> P14 --> P16 --> D1
  A10 --> F4 --> W1 --> P17 --> D1
  A11 --> F4
  A12 --> F5 --> W1 --> D1
  A14 --> W1 --> P18 --> D1
  P19 --> P1
  P19 --> F6
  E1 --> W2
  E2 --> W2
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant R as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over S,EV: CA01 + CA10 — job 06:00 e notificação 08:00
  EV->>S: scheduler 06:00 → DailyTaskService.today(user) para usuários com tarefas DISPONIVEL/EM_USO
  S->>DB: select daily_tasks where userId and taskDate = hoje
  alt já existe
    S-->>EV: nada (índice único usuário+data)
  else gera
    S->>DB: candidatas DISPONIVEL/EM_USO + project_tasks (isCritical, slackDays, moscow, PERT) + planAxisId + decisões pendentes + prazos legais
    S->>S: PriorityIndexService.rank (Eisenhower, WSJF, folga CPM, MoSCoW/Pareto, wipAdvice com wipLimit)
    S->>S: HseCalculator.predict(hse_weights vigente)
    S->>AI: run(TAREFA_DO_DIA, índice + componentes calculados)
    AI-->>S: explicação ✦ + AiInferenceLog (fallback local se sem chave)
    S->>DB: insert daily_tasks (priorityIndexJson, hsePredictedJson, aiInferenceId)
    S->>R: cache do dia
    S->>EV: DailyTaskReady
  end
  EV->>EV: 08:00 no fuso do usuário → Notification TAREFA_DO_DIA (se notificationPrefsJson.dailyTaskAt)

  U->>FE: abre o app
  FE->>C: GET /api/me/daily-task
  C->>S: DailyTaskService.today(actor)
  S->>R: cache (fallback MySQL)
  S-->>FE: DailyTask com índice decomposto e HSE previsto por componente

  Note over U,EV: CA02 — troca com motivo
  U->>FE: troca por outra tarefa
  FE->>C: POST /api/me/daily-task/swap {taskId, reason}
  C->>S: DailyTaskService.swap(actor, taskId, reason)
  alt motivo vazio
    S-->>C: 422 VALIDACAO details.reason
  else ok
    S->>DB: update daily_tasks taskId, swappedFromTaskId, swapReason · pesos pessoais ajustados
    S-->>C: 200
  end

  Note over U,EV: CA03 + CA04 — feedback
  U->>FE: CONCLUI com 3 h de esforço real
  FE->>C: POST /api/me/daily-task/feedback {CONCLUI, actualHours 3}
  C->>S: DailyTaskService.feedback(actor, CONCLUI, payload)
  S->>S: Guard.requireOwner
  alt feedback já registrado
    S-->>C: 409 FEEDBACK_JA_REGISTRADO
  else ok
    S->>S: HseCalculator.realize (eficiência, eficácia, valor, pontualidade, qualidade, impacto, foco)
    S->>DB: update daily_tasks feedback, actualHours, hseRealizedJson · insert hse_snapshots (hse, movingAvg7, weightsVersion)
    S->>S: TaskStateMachine.transition(task, CONCLUIDA)
    S->>DB: update tasks state CONCLUIDA · task_state_log
    S->>EV: TaskCompleted → Notification às tarefas dependentes
    S-->>FE: HSE realizado com ▲▼ vs previsto
  end
  U->>FE: no dia seguinte: DELEGUEI para Bruno
  FE->>C: POST /api/me/daily-task/feedback {DELEGUEI, toUserId}
  C->>S: DailyTaskService.feedback(actor, DELEGUEI, payload)
  S->>S: AssignmentService.propose(actor, TASK, taskId, Bruno, MINHA_EQUIPE) (RF46)
  S->>DB: insert assignments PROPOSTA · daily_tasks delegatedToUserId · hseRealized só componentes aplicáveis
  S-->>FE: 200

  Note over U,EV: CA06 — semana planejada
  U->>FE: abre Semana planejada
  FE->>C: GET /api/me/week-plan?weekStart=
  C->>S: WeekPlanService.week(actor, weekStart)
  S->>S: CalendarPort.meetings (Google/Microsoft) · prazos legais · carga ≤ 80%
  S->>DB: upsert week_plans + 5 week_plan_days
  S-->>FE: WeekPlanBoard
  U->>FE: arrasta quarta para terça
  FE->>C: PATCH /api/me/week-plan/{id}/order
  C->>S: WeekPlanService.reorder
  S->>DB: update week_plan_days sortOrder
  EV->>S: sexta 18:00 → WeekPlanService.closeFriday
  S->>DB: week_plans closingHse, streak, recommendation

  Note over U,EV: CA08 — pesos versionados
  U->>FE: EMPRESA edita pesos do HSE
  FE->>C: PUT /api/companies/{id}/hse-weights
  C->>S: HseWeightsService.update (Guard.requireRole EMPRESA)
  S->>DB: insert hse_weights (version+1, validFrom) · audit_log · dias passados intactos
```

## 4. Máquina de estados

Entidade central: `DailyTask.feedback` (`DailyFeedback`) — ciclo de um dia; a tarefa em si segue `TaskState` (RF41).

```mermaid
stateDiagram-v2
  state "SUGERIDA (sem feedback)" as SUGERIDA
  [*] --> SUGERIDA: job das 6h ou primeiro acesso do dia → 1 por usuário+data · índice e HSE previsto ✦ (CA01)
  SUGERIDA --> SUGERIDA: troca por outra tarefa com motivo → swappedFromTaskId (CA02)
  SUGERIDA --> CONCLUI: esforço real → HSE realizado (7 componentes) · tarefa CONCLUIDA · dependentes notificados (CA03)
  SUGERIDA --> ADIEI: motivo (prioridade mudou · falta de tempo · dependência) · só componentes aplicáveis (CA04)
  SUGERIDA --> BLOQUEADA: por quem/o quê → blockedByTaskId/UserId · bloqueio por terceiro não penaliza (CA04)
  SUGERIDA --> DELEGUEI: para quem → Assignment PROPOSTA (RF46) com rastro (CA04)
  CONCLUI --> [*]: EfficiencyScoreSnapshot · média móvel 7d · ranking HSE_MEDIO (RF43) · streak
  ADIEI --> [*]: aprendizado por usuário para a próxima sugestão
  BLOQUEADA --> [*]: insight de equipe (RF43 §4)
  DELEGUEI --> [*]
  note right of SUGERIDA
    WIP acima do wipLimit (padrão 3) → sugere concluir
    uma EM_USO e explica por Little's Law (CA05).
    409 FEEDBACK_JA_REGISTRADO em segundo feedback.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/profile (Tarefa do Dia · Semana) · tasks (widget) · desk (widget)"]
    R2["components: DailyTaskWidget · TaskCard (variant TAREFA_DO_DIA, composition FICHA) · PriorityBreakdown · HseGauge · FeedbackButtons · SwapDialog · WeekPlanBoard (drag) · HistoryChart · Due · Spark ✦ · EmptyState"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    DC["DailyTaskController · HseWeightsController (@Operation RF44.CA01-CA10)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    DTS["gamification/DailyTaskService"]
    PIS["metrics/PriorityIndexService (Eisenhower · WSJF · CPM · MoSCoW · Pareto · Little's Law, determinístico)"]
    HSE["metrics/HseCalculator (7 componentes, pesos versionados, testes unitários)"]
    WPS["gamification/WeekPlanService"]
    TSM["acervo/TaskStateMachine (RF41)"]
    ASG["messaging/AssignmentService (RF46)"]
    AIE["ai/AiEngine (TAREFA_DO_DIA · HSE, só redação)"]
    GD["security/Guard (main)"]
    DE["events/DomainEvents AFTER_COMMIT"]
    PORTS["ports: CalendarPort · NotificationPort · CachePort · AiProviderPort"]
    SCH["schedulers (ws-bootstrap): Tarefa do Dia 06:00 · notificação 08:00 por fuso · fechamento de sexta"]
  end
  subgraph DOM["ws-domain"]
    ENT["DailyTask (unique userId+taskDate) · WeekPlan · WeekPlanDay · HseWeights · EfficiencyScoreSnapshot · DailyFeedback (planejado) · UserPreferences.wipLimit/timezone/notificationPrefsJson (main)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql daily_tasks · week_plans · hse_weights · hse_snapshots (V__rf44)"]
    RD["cache-redis cache do dia (flag redis.enabled)"]
    PLAT["platform: Google Calendar · Microsoft Graph connectors (opt-in)"]
    CASA["persistence-cassandra notifications (flag cassandra.enabled)"]
    AIP["ai-providers (ai-claude · ai-gemini · ai-local)"]
  end
  BFF --> DC --> SEC
  DC --> DTS
  DC --> WPS
  DTS --> PIS
  DTS --> HSE
  DTS --> TSM
  DTS --> ASG
  DTS --> AIE
  DTS --> GD
  DTS --> DE
  WPS --> PIS
  WPS --> PORTS
  SCH --> DTS
  SCH --> WPS
  DTS --> ENT --> MY --> MYSQL[("MySQL 8")]
  PORTS --> RD --> REDIS[("Redis")]
  PORTS --> PLAT --> EXT["Google Workspace · Microsoft 365"]
  DE --> CASA --> CASS[("Cassandra")]
  AIE --> AIP --> AI["Claude / Gemini / local"]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF44.CA01 | `DailyTask` (único userId+taskDate, priorityIndexJson, hsePredictedJson), `DailyTaskService.today`, `PriorityIndexService.rank`, `HseCalculator.predict` | A0 → A1 → F1 → P1 → P3 → P6 → P9 → P10 → P11 | 1–17 | `[*] → SUGERIDA` | `DTS`, `PIS`, `HSE`, `DailyTaskWidget`, `SCH` |
| RF44.CA02 | `DailyTaskService.swap`, `swappedFromTaskId`, `swapReason` (422 sem motivo), ajuste de pesos pessoais | A2 → A3 → F2 → P12 → P13 | 18–24 | `SUGERIDA → self (troca)` | `SwapDialog` |
| RF44.CA03 | `DailyTaskService.feedback CONCLUI`, `actualHours`, `HseCalculator.realize`, `hseRealizedJson`, `EfficiencyScoreSnapshot`, `TaskStateMachine → CONCLUIDA`, notificação a dependentes | A5 → A6 → F3 → P14 → P15 | 25–36 | `SUGERIDA → CONCLUI` | `HSE`, `TSM`, `FeedbackButtons` |
| RF44.CA04 | feedback ADIEI/BLOQUEADA/DELEGUEI, componentes aplicáveis, `blockedByRef`, `blockedByTaskId/UserId`, `delegatedToUserId`, `AssignmentService.propose` (RF46) com rastro | A7/A8/A9 → F3 → P16 | 37–41 | `SUGERIDA → ADIEI / BLOQUEADA / DELEGUEI` | `ASG`, `DTS` |
| RF44.CA05 | `PriorityIndexService.wipAdvice`, `UserPreferences.wipLimit` (padrão 3), Little's Law | P7 → P8 | 7 | nota de SUGERIDA | `PIS` |
| RF44.CA06 | `WeekPlan`, `WeekPlanDay` (meetingsJson, loadPct), `WeekPlanService.week/reorder/closeFriday`, `CalendarPort`, streak | A10 → A11 → F4 → P17 | 42–52 | `CONCLUI → [*] (streak)` | `WPS`, `WeekPlanBoard`, `PLAT` |
| RF44.CA07 | `DailyTaskService.history` (30 dias), `EfficiencyScoreSnapshot.movingAvg7`, gráfico de componentes | A12 → A13 → F5 | — (GET /history) | — | `HistoryChart`, `R1 profile` |
| RF44.CA08 | `HseWeights` (companyId, version, weightsJson, validFrom), `HseWeightsController`, `METRICAS_GESTAO.md`, serviços de domínio testáveis, passado não recalcula | A14 → P18 | 53–56 | — | `HSE`, `PIS`, `MY (hse_weights)` |
| RF44.CA09 | `DailyTask.aiInferenceId`, `AiCapability TAREFA_DO_DIA/HSE`, `LocalEngine` determinístico com redação simplificada, faísca ✦ | P10 → I1 → I2 → I3 | 9–10 | — | `AIE`, `AIP`, `Spark ✦` |
| RF44.CA10 | `UserPreferences.notificationPrefsJson.dailyTaskAt` (08:00) e `timezone` (RF3), `Notification TAREFA_DO_DIA`, i18n | P19 → F6 | 14 | — | `SCH`, `CASA`, `lib/i18n` |
