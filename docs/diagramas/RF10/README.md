# RF10 — Permitir que o chefe de departamento possa atribuir uma tarefa ou projeto a um usuário
**HU:** HU10 · **Sprint (board Work Station):** lista *Requisitos Funcionais* (card novo, sem sprint atribuída — a confirmar) · **Equivalente FAI:** nenhum (o FAI não tem hierarquia chefe → empregado; a atribuição é escopo novo do Work Station, ver `docs/produto/ABAS_POR_PERFIL.md` §7.b, TAXONOMIA §12b e `docs/diagramas/RF46/README.md`) · **Aba/rota:** página do departamento › **Equipe › Minha equipe (gestão)** (`/departments/[slug]/team?mode=manage`, origem `MINHA_EQUIPE`), ação "Atribuir" no card de tarefa (`/tasks/[id]`) e de projeto (`/projects/[id]`, origem `BOTAO_ESQUEMA`); lado do atribuído: `/me/assignments` ("Atribuídas a mim") e Tarefa do Dia (RF44); API `POST /api/assignments`
**Critérios de aceite cobertos:** RF10.CA01 · RF10.CA02 · RF10.CA03 · RF10.CA04 · RF10.CA05 · RF10.CA06 — corpo do card vazio: CAs derivados do título + HU10 + `ABAS_POR_PERFIL.md` §7.b (bloco 3) e P-02 + RF46.CA03–CA05 (mesma entidade `Assignment`), marcados **(CA a confirmar)**

> **HU10** — COMO chefe de departamento POSSO clicar em "Atribuir tarefa ou projeto" PARA que um empregado possa visualizar sua lista de tarefas ou projetos pendentes dentro de seu escopo de trabalho.

A atribuição usa a entidade **`Assignment`** da TAXONOMIA §12b (contexto *Mensageria & Atribuição*, marcado **proposta** na taxonomia): `targetType` `AssignmentTargetType` (TASK · PROJECT), `fromUserId`, `toUserId`, `origin` `AssignmentOrigin` (MINHA_EQUIPE · BOTAO_ESQUEMA · CHAT_WS · CHAT_DECIA), `status` `AssignmentStatus` (PROPOSTA · ACEITA · RECUSADA · DEVOLVIDA), `dueAt`, `message`, `reason`, `previousResponsibleId`, `traceNodeId`, `respondedAt`. O RF10 é o caso em que **`fromUserId` é o CHEFE** (`Department.headUserId`) e as origens são `MINHA_EQUIPE` ou `BOTAO_ESQUEMA`; o RF46 cobre as origens `CHAT_WS`/`CHAT_DECIA` e a proposta entre colegas. O `responsibleId` (`TaskItem` §2.1 / `ProjectTask` §3.2) só é escrito no **aceite**; `previousResponsibleId` permite a **devolução**. Rastro: `Assignment` + `AuditLog` + `TaskStateLog` (quando o aceite muda `TaskState`) + `Notification` ATRIBUICAO_PROPOSTA · ATRIBUICAO_ACEITA · ATRIBUICAO_RECUSADA · ATRIBUICAO_DEVOLVIDA (já em `NotificationType`, §8.8).

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF10.CA01** | Dado um CHEFE (`Department.headUserId`) em *Minha equipe* ou num card de tarefa/projeto, quando aciona **Atribuir** escolhendo pessoa, alvo (`TaskItem` ou `ProjectScheme`), prazo opcional e mensagem (≤ 500), então `POST /api/assignments` cria `Assignment` com `status = PROPOSTA`, `fromUserId` = chefe, `toUserId`, `targetType`, `targetId`, `dueAt`, `message`, `origin` (MINHA_EQUIPE ou BOTAO_ESQUEMA) e `previousResponsibleId` = responsável atual; `AuditLog` ASSIGNMENT_CREATED com `correlationId`. |
| **RF10.CA02** | Dado o pedido, então o serviço exige `AccessPolicy.requireDeptHead` do departamento da pessoa: ator que não é chefe → `403 ACESSO_NEGADO`; pessoa sem `DepartmentMembership` vigente no departamento do chefe → `422 VALIDACAO (FORA_DO_DEPARTAMENTO)`; alvo que o ator não pode ver (`Visibility.PRIVADA` de terceiro) → `403 ACESSO_NEGADO`; alvo em CONCLUIDA/ARQUIVADA (tarefa) ou CONCLUIDO/ARQUIVADO (projeto) → `409 ESTADO_INVALIDO`; já existe `Assignment` PROPOSTA ou ACEITA para o mesmo (`targetId`, `toUserId`) → `409 ATRIBUICAO_DUPLICADA`. |
| **RF10.CA03** | Dado o commit, então o evento `AssignmentProposed` (AFTER_COMMIT) grava `Notification` tipo **ATRIBUICAO_PROPOSTA**, categoria SISTEMA, `resourceType = ASSIGNMENT`, em `notifications_by_user` (Cassandra) + espelho MySQL, e `TimelineEvent` do atribuído; o chefe acompanha o estado no bloco 3 de *Minha equipe* (`GET /api/departments/{id}/assignments`). |
| **RF10.CA04** | Dado o atribuído (`toUserId`), quando **aceita** (`POST /api/assignments/{id}/accept`), então `status = ACEITA`, `respondedAt`, `TaskItem.responsibleId` ou `ProjectTask.responsibleId` (todas as `ProjectTask` sem responsável, quando PROJECT) recebe `toUserId`, `TaskStateLog` é gravado se a tarefa passa de DISPONIVEL para EM_USO (`reason` ATRIBUICAO_ACEITA) e o chefe recebe ATRIBUICAO_ACEITA; quando **recusa** (`/refuse`), então `reason` é obrigatório (`422 MOTIVO_OBRIGATORIO`), `status = RECUSADA` e o chefe recebe ATRIBUICAO_RECUSADA; quem não é `toUserId` → `403 ACESSO_NEGADO`; responder atribuição já respondida → `409 ATRIBUICAO_JA_RESPONDIDA`. |
| **RF10.CA05** | Dado o atribuído, então `/me/assignments` (`AssignmentService.listForMe`) lista as atribuições PROPOSTA e ACEITA (filtros: tipo, prazo, quem atribuiu) com o alvo em card `LINHA`; a `Assignment` ACEITA entra no `priorityIndexJson` da Tarefa do Dia (RF44) com o fator "atribuída pelo chefe" e no Dossiê de Transição (RF36) como item pendente; o chefe vê, por pessoa, as atribuições abertas em *Minha equipe* (bloco 2 Carga e bloco 3). |
| **RF10.CA06** | Dado o atribuído com `Assignment` ACEITA, quando **devolve** com motivo (`POST /api/assignments/{id}/give-back`), então `status = DEVOLVIDA`, `reason` obrigatório (`422 MOTIVO_OBRIGATORIO`), o `responsibleId` volta a `previousResponsibleId`, `TaskStateLog` registra a volta e o chefe recebe ATRIBUICAO_DEVOLVIDA; DELEGUEI da Tarefa do Dia (RF44) e "Atribuir" no chat (RF46) chamam o mesmo `AssignmentService.propose` com `origin` CHAT_WS/CHAT_DECIA; delegação para pessoa de outro departamento exige aceite do chefe dela **(a confirmar)**. |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class Assignment {
    <<entity>>
    +UUID id
    +AssignmentTargetType targetType
    +UUID targetId
    +UUID fromUserId
    +UUID toUserId
    +AssignmentOrigin origin
    +AssignmentStatus status
    +LocalDate dueAt
    +String message
    +String reason
    +UUID previousResponsibleId
    +UUID traceNodeId
    +Instant respondedAt
  }
  class AssignmentStatus {
    <<enum>>
    PROPOSTA
    ACEITA
    RECUSADA
    DEVOLVIDA
  }
  class AssignmentTargetType {
    <<enum>>
    TASK
    PROJECT
  }
  class AssignmentOrigin {
    <<enum>>
    MINHA_EQUIPE
    BOTAO_ESQUEMA
    CHAT_WS
    CHAT_DECIA
  }
  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +UUID departmentId
    +String title
    +UUID responsibleId
    +LocalDate dueAt
    +TaskState state
    +Visibility visibility
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +UUID ownerId
    +UUID departmentId
    +String title
    +ProjectStatus status
    +Visibility visibility
  }
  class ProjectTask {
    <<entity>>
    +UUID id
    +UUID projectId
    +UUID taskId
    +ProjectPhase phase
    +UUID responsibleId
    +LocalDate dueAt
  }
  class TaskStateLog {
    <<entity>>
    +UUID id
    +UUID taskId
    +TaskState fromState
    +TaskState toState
    +UUID actorId
    +String reason
    +String correlationId
  }
  class User {
    <<entity>>
    +UUID id
    +String username
    +String fullName
    +ProfileType profileType
    +UUID departmentId
  }
  class Department {
    <<entity>>
    +UUID id
    +String acronym
    +UUID headUserId
  }
  class DepartmentMembership {
    <<entity>>
    +UUID userId
    +UUID departmentId
    +DeptRole roleInDept
    +Instant startedAt
    +Instant endedAt
  }
  class Notification {
    <<entity>>
    +UUID recipientId
    +UUID actorId
    +NotificationType type
    +String category
    +String resourceType
    +UUID resourceId
    +String groupKey
  }
  class NotificationType {
    <<enum>>
    ATRIBUICAO_PROPOSTA
    ATRIBUICAO_ACEITA
    ATRIBUICAO_RECUSADA
    ATRIBUICAO_DEVOLVIDA
  }
  class DailyTask {
    <<entity>>
    +UUID userId
    +LocalDate taskDate
    +String priorityIndexJson
    +DailyFeedback feedback
    +UUID delegatedToUserId
  }
  class AuditLog {
    <<entity>>
    +UUID actorId
    +String action
    +String resourceType
    +UUID resourceId
    +String correlationId
  }

  class AssignmentController {
    <<controller>>
    +POST_api_assignments(body) 201
    +POST_api_assignments_id_accept() 200
    +POST_api_assignments_id_refuse(reason) 200
    +POST_api_assignments_id_give_back(reason) 200
    +GET_api_me_assignments(status, page) 200
    +GET_api_departments_id_assignments(status, userId) 200
  }
  class AssignmentService {
    <<service>>
    +propose(fromUserId, target, toUserId, dueAt, message, origin, context) Assignment
    +accept(toUserId, assignmentId) Assignment
    +refuse(toUserId, assignmentId, reason) Assignment
    +giveBack(toUserId, assignmentId, reason) Assignment
    +listForMe(userId, status, page) Page
    +listForDepartment(headId, deptId, filters) Page
    -requireAssignee(actor, assignment) 403 ACESSO_NEGADO
    -requireOpen(assignment) 409 ATRIBUICAO_JA_RESPONDIDA
    -applyResponsible(assignment) TaskItem ou ProjectTask
  }
  class AccessPolicy {
    <<service>>
    +requireDeptHead(user, deptId) void
    +canView(user, target) boolean
  }
  class DailyTaskService {
    <<service>>
    +delegate(userId, taskId, toUserId) Assignment
    +priorityIndex(userId) inclui ACEITA do chefe
  }
  class NotificationPort {
    <<port>>
    +notify(recipientId, type, resource, payload)
  }
  class AssignmentRepository {
    <<adapter>>
    MySQL assignments
  }
  class NotificationFeedAdapter {
    <<adapter>>
    Cassandra notifications_by_user
  }

  Assignment --> AssignmentStatus
  Assignment --> AssignmentTargetType
  Assignment --> AssignmentOrigin
  Assignment --> User : fromUserId CHEFE
  Assignment --> User : toUserId
  Assignment --> User : previousResponsibleId
  Assignment ..> TaskItem : targetId quando TASK
  Assignment ..> ProjectScheme : targetId quando PROJECT
  Department --> User : headUserId
  DepartmentMembership --> User
  DepartmentMembership --> Department
  ProjectScheme "1" --> "*" ProjectTask
  ProjectTask --> TaskItem : taskId
  TaskItem --> User : responsibleId
  ProjectTask --> User : responsibleId
  TaskItem "1" --> "*" TaskStateLog
  Notification --> NotificationType
  Notification ..> Assignment : resourceId
  DailyTask ..> Assignment : fator atribuida pelo chefe

  AssignmentController --> AssignmentService
  AssignmentService --> AccessPolicy
  AssignmentService --> AssignmentRepository
  AssignmentService --> NotificationPort
  AssignmentService ..> AuditLog
  AssignmentService ..> TaskStateLog : aceite DISPONIVEL para EM_USO e devolucao
  DailyTaskService --> AssignmentService : DELEGUEI
  NotificationPort <|.. NotificationFeedAdapter

  note for Assignment "TAXONOMIA §12b (proposta) — tabela assignments · mesma entidade do RF46 e das acoes atribuir/retornar (RF18/RF19) · no RF10 fromUserId e o headUserId e origin e MINHA_EQUIPE ou BOTAO_ESQUEMA · unico parcial (targetId, toUserId) em PROPOSTA ou ACEITA (409 ATRIBUICAO_DUPLICADA, proposta deste RF)"
  note for NotificationType "subconjunto dos valores de TAXONOMIA §8.8 usados aqui"
  note for TaskItem "responsibleId e escrito so no aceite (CA04) e volta a previousResponsibleId na devolucao (CA06)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef ai fill:#fff3d6,stroke:#d68910,color:#5c3b00

  subgraph L1["Ator humano · CHEFE e atribuído"]
    U1["CHEFE abre Minha equipe ou o card da tarefa/projeto e clica Atribuir"]
    U2["Escolhe pessoa, alvo (tarefa ou projeto), prazo e mensagem"]
    U3["Atribuído recebe notificação e abre Atribuídas a mim"]
    U4{"Aceita ou recusa?"}
    U5["Informa motivo da recusa"]
    U6["CHEFE acompanha o estado no bloco 3 de Minha equipe"]
    U7["Atribuído, depois de aceitar, devolve com motivo"]
    U8(["Fim"])
  end

  subgraph L2["Web/BFF (Next.js App Router)"]
    W1["AssignDialog: busca membros do departamento (DepartmentMembership vigente), sugestão de carga ✦ opcional"]
    W2["POST /api/assignments {targetType, targetId, toUserId, dueAt, message, origin MINHA_EQUIPE ou BOTAO_ESQUEMA}"]
    W3["Lista /me/assignments com cards LINHA, filtros tipo, prazo, quem atribuiu"]
    W4["POST /api/assignments/{id}/accept · /refuse · /give-back"]
    W5["Exibe 403 ACESSO_NEGADO"]
    W6["Exibe 422 VALIDACAO (FORA_DO_DEPARTAMENTO) ou 422 MOTIVO_OBRIGATORIO"]
    W7["Exibe 409 ESTADO_INVALIDO · 409 ATRIBUICAO_DUPLICADA · 409 ATRIBUICAO_JA_RESPONDIDA"]
  end

  subgraph L3["ws-application · AssignmentService"]
    S1{"AccessPolicy.requireDeptHead: ator é headUserId do departamento da pessoa?"}
    S2{"Pessoa tem DepartmentMembership vigente nesse departamento?"}
    S3{"Ator pode ver o alvo (canView) e alvo não está CONCLUIDA/ARQUIVADA?"}
    S4{"Já existe Assignment PROPOSTA ou ACEITA para (alvo, pessoa)?"}
    S5["INSERT assignments (PROPOSTA, origin, dueAt, message, previousResponsibleId) + AuditLog ASSIGNMENT_CREATED"]
    S6["Evento AssignmentProposed (AFTER_COMMIT) → NotificationPort ATRIBUICAO_PROPOSTA + TimelineEvent"]
    S7{"requireAssignee (ator é toUserId) e requireOpen (status PROPOSTA)?"}
    S8["accept: status ACEITA, respondedAt · applyResponsible → UPDATE responsibleId em tasks ou project_tasks"]
    S9{"Tarefa DISPONIVEL?"}
    S10["TaskStateLog DISPONIVEL → EM_USO (reason ATRIBUICAO_ACEITA, correlationId)"]
    S11{"reason informado?"}
    S12["refuse: status RECUSADA, reason"]
    S13["Notifica o chefe (ATRIBUICAO_ACEITA ou ATRIBUICAO_RECUSADA)"]
    S14["giveBack: status DEVOLVIDA, reason · responsibleId volta a previousResponsibleId · TaskStateLog · ATRIBUICAO_DEVOLVIDA ao chefe"]
    S15["DailyTaskService.priorityIndex inclui fator atribuída pelo chefe (RF44)"]
    S16["listForDepartment: atribuições abertas por pessoa (bloco 2 Carga e bloco 3)"]
  end

  subgraph L4["IA (AiEngine) · opcional"]
    A1["INSIGHT equipe (RF43 §8-D): sugere pessoa com menor carga EM_USO × wipLimit ✦"]
  end

  subgraph L5["Persistência"]
    D1[("MySQL assignments · tasks.responsibleId · project_tasks.responsibleId · task_state_log · audit_log")]
    D2[("Cassandra notifications_by_user · timeline_by_user + MySQL notifications")]
    D3[("MySQL daily_tasks.priorityIndexJson")]
  end

  U1 --> W1 --> U2 --> W2 --> S1
  W1 -. "sugestão" .-> A1
  S1 -->|"não"| W5 --> U8
  S1 -->|"sim"| S2
  S2 -->|"não"| W6 --> U8
  S2 -->|"sim"| S3
  S3 -->|"não"| W7 --> U8
  S3 -->|"sim"| S4
  S4 -->|"sim"| W7
  S4 -->|"não"| S5 --> D1
  S5 --> S6 --> D2
  S6 --> U3 --> W3 --> U4
  U4 -->|"aceita"| W4 --> S7
  U4 -->|"recusa"| U5 --> W4
  S7 -->|"não"| W7
  S7 -->|"sim, aceite"| S8 --> D1
  S8 --> S9
  S9 -->|"sim"| S10 --> D1
  S9 -->|"não"| S13
  S10 --> S13
  S7 -->|"sim, recusa"| S11
  S11 -->|"não"| W6
  S11 -->|"sim"| S12 --> D1
  S12 --> S13 --> D2
  S13 --> U6 --> S16 --> D1
  S8 --> S15 --> D3
  S8 -. "mais tarde" .-> U7 --> W4 --> S14 --> D1
  S14 --> D2
  S14 --> U8
  S16 --> U8

  class W5,W6,W7 err
  class A1 ai
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor CH as Usuário (CHEFE)
  actor EM as Usuário (atribuído)
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant EV as DomainEvents (AFTER_COMMIT)

  rect rgb(245, 242, 239)
    Note over CH,EV: Caminho feliz — chefe atribui tarefa, empregado aceita, responsibleId muda e o chefe é avisado
    CH->>FE: Minha equipe › Atribuir (pessoa Bruno, tarefa T1, prazo, mensagem)
    FE->>C: POST /api/assignments {targetType TASK, targetId T1, toUserId Bruno, dueAt, message, origin MINHA_EQUIPE}
    C->>S: AssignmentService.propose(fromUserId, TASK T1, Bruno, dueAt, message, MINHA_EQUIPE, context)
    S->>DB: SELECT departments WHERE headUserId = actor · department_memberships vigente de Bruno
    S->>DB: SELECT tasks T1 (state, visibility, ownerId, responsibleId) · assignments PROPOSTA ou ACEITA para (T1, Bruno)
    S->>DB: INSERT assignments (PROPOSTA, previousResponsibleId = responsibleId atual) · INSERT audit_log (ASSIGNMENT_CREATED)
    S-)EV: AssignmentProposed(assignmentId)
    EV->>CS: INSERT notifications_by_user (Bruno, ATRIBUICAO_PROPOSTA, resource ASSIGNMENT) · timeline_by_user
    EV->>DB: INSERT notifications (espelho)
    S-->>C: 201 Assignment {status PROPOSTA}
    C-->>FE: 201
    FE-->>CH: Atribuição proposta — aguardando aceite

    EM->>FE: Abre notificação › Atribuídas a mim
    FE->>C: GET /api/me/assignments?status=PROPOSTA
    C->>S: AssignmentService.listForMe(userId, PROPOSTA, page)
    S->>DB: SELECT assignments JOIN tasks ou project_schemes (snapshot do alvo)
    S-->>C: 200 Page (cards LINHA)
    C-->>FE: 200
    EM->>FE: Aceitar
    FE->>C: POST /api/assignments/A1/accept
    C->>S: AssignmentService.accept(actor, A1)
    S->>DB: SELECT assignments A1 (toUserId = actor, status PROPOSTA)
    S->>DB: UPDATE assignments SET status = ACEITA, respondedAt · UPDATE tasks SET responsibleId = Bruno, state = EM_USO
    S->>DB: INSERT task_state_log (DISPONIVEL → EM_USO, reason ATRIBUICAO_ACEITA, correlationId) · audit_log
    S-)EV: AssignmentAccepted(A1)
    EV->>CS: INSERT notifications_by_user (chefe, ATRIBUICAO_ACEITA)
    EV->>DB: UPDATE daily_tasks.priorityIndexJson (fator atribuída pelo chefe, RF44)
    S-->>C: 200 Assignment {status ACEITA}
    C-->>FE: 200
    FE-->>EM: Tarefa agora em Atribuídas a mim e na Tarefa do Dia
  end

  alt RF10.CA02 — ator não é chefe do departamento da pessoa
    FE->>C: POST /api/assignments
    C->>S: propose(...)
    S->>DB: SELECT departments WHERE headUserId = actor → não contém o departamento de Bruno
    S-->>C: 403 ACESSO_NEGADO
    C-->>FE: 403
  else RF10.CA02 — já existe atribuição PROPOSTA para (T1, Bruno)
    S->>DB: SELECT assignments WHERE targetId = T1 AND toUserId = Bruno AND status IN (PROPOSTA, ACEITA) → 1 linha
    S-->>C: 409 ATRIBUICAO_DUPLICADA
    C-->>FE: 409
  else RF10.CA04 — recusa sem motivo
    FE->>C: POST /api/assignments/A1/refuse {reason vazio}
    C->>S: refuse(actor, A1, reason)
    S-->>C: 422 MOTIVO_OBRIGATORIO
    C-->>FE: 422
  else RF10.CA06 — devolução depois do aceite
    FE->>C: POST /api/assignments/A1/give-back {reason}
    C->>S: giveBack(actor, A1, reason)
    S->>DB: UPDATE assignments SET status = DEVOLVIDA, reason, respondedAt · UPDATE tasks SET responsibleId = previousResponsibleId
    S->>DB: INSERT task_state_log (EM_USO → DISPONIVEL, reason ATRIBUICAO_DEVOLVIDA)
    S-)EV: AssignmentGivenBack(A1)
    EV->>CS: INSERT notifications_by_user (chefe, ATRIBUICAO_DEVOLVIDA)
    S-->>C: 200 Assignment {status DEVOLVIDA}
    C-->>FE: 200
  end
```

## 4. Máquina de estados

Entidade central: **`Assignment.status`** (enum `AssignmentStatus` — TAXONOMIA §12b/§13). O aceite escreve `TaskItem.responsibleId`/`ProjectTask.responsibleId` e pode mover `TaskState` DISPONIVEL → EM_USO (RF41), registrado em `TaskStateLog`; a devolução restaura `previousResponsibleId`.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> PROPOSTA : CHEFE atribui (CA01) — AuditLog e Notification ATRIBUICAO_PROPOSTA
  PROPOSTA --> ACEITA : atribuído aceita (CA04) — responsibleId recebe toUserId
  PROPOSTA --> RECUSADA : atribuído recusa com reason obrigatório (CA04)
  ACEITA --> DEVOLVIDA : atribuído devolve com reason (CA06) — responsibleId volta a previousResponsibleId
  RECUSADA --> [*]
  DEVOLVIDA --> [*]
  ACEITA --> [*] : alvo chega a CONCLUIDA ou CONCLUIDO (CA05) — status permanece ACEITA

  note right of PROPOSTA
    Unico parcial (targetId, toUserId) em PROPOSTA ou ACEITA
    nova tentativa devolve 409 ATRIBUICAO_DUPLICADA (CA02)
    aparece em /me/assignments e em Minha equipe bloco 3
    responder de novo devolve 409 ATRIBUICAO_JA_RESPONDIDA
  end note
  note right of ACEITA
    Entra no priorityIndexJson da Tarefa do Dia (RF44)
    e como item pendente do Dossie de Transicao (RF36)
    Nao ha estado CANCELADA — o chefe reatribui propondo de novo (duvida d)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    F1["app/departments/[slug]/team · modo gestão Minha equipe (bloco 3 Atribuir, bloco 2 Carga)"]
    F2["app/tasks/[id] · app/projects/[id] · ação Atribuir no card (BOTAO_ESQUEMA)"]
    F3["app/me/assignments · Atribuídas a mim"]
    F4["components/ui: AssignDialog · MemberPicker · AssignmentBadge (PROPOSTA/ACEITA/RECUSADA/DEVOLVIDA) · GiveBackDialog · NotificationBell · LinhaCard"]
  end

  subgraph WEB["ws-web"]
    C1["AssignmentController (POST /api/assignments · /api/assignments/{id}/accept|refuse|give-back · GET /api/me/assignments · GET /api/departments/{id}/assignments)"]
    C2["RoleGate / requireDeptHead"]
  end

  subgraph APP["ws-application"]
    S1["AssignmentService (propose, accept, refuse, giveBack, listForMe, listForDepartment)"]
    S2["AccessPolicy (requireDeptHead, canView)"]
    S3["DailyTaskService (RF44 · DELEGUEI → propose · priorityIndex)"]
    S4["MessagingService (RF46 · Atribuir no chat → origin CHAT_WS/CHAT_DECIA)"]
    P1["NotificationPort"]
    P2["AuditPort"]
  end

  subgraph DOM["ws-domain · br.gov.pr.secid.workstation"]
    D1["Assignment · AssignmentStatus · AssignmentTargetType · AssignmentOrigin (TAXONOMIA §12b)"]
    D2["TaskItem.responsibleId · ProjectScheme · ProjectTask.responsibleId · TaskStateLog"]
    D3["User · Department.headUserId · DepartmentMembership"]
    D4["Notification (ATRIBUICAO_*) · TimelineEvent · AuditLog · DailyTask"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1["persistence-mysql: AssignmentRepository · TaskItemRepository · ProjectTaskRepository · TaskStateLogRepository · AuditLogRepository · NotificationRepository"]
    I2["persistence-cassandra: NotificationFeedAdapter (notifications_by_user) · TimelineAdapter (timeline_by_user)"]
    I3["platform: OutboxRelay (AssignmentProposed, AssignmentAccepted, AssignmentRefused, AssignmentGivenBack) · NotificationAdapter"]
    I4["ai-providers: AiEngineAdapter INSIGHT (sugestão de carga, opcional)"]
  end

  MY[("MySQL 8")]
  CA[("Cassandra")]
  X1["Claude / Gemini (só na sugestão opcional)"]

  F1 --> F4
  F2 --> F4
  F3 --> F4
  F4 -->|"HTTPS/JSON"| C1 --> C2 --> S1
  S1 --> S2
  S3 --> S1
  S4 --> S1
  S1 --> P1
  S1 --> P2
  S1 --> D1
  S1 --> D2
  S2 --> D3
  P1 --> D4
  S1 --> I1
  P1 -.-> I2
  P1 -.-> I3
  P2 -.-> I1
  F1 -. "sugestão ✦" .-> I4 --> X1
  I1 --> MY
  I2 --> CA
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividades) | Mensagem (sequência) | Transição (estados) | Componente |
|---|---|---|---|---|---|
| RF10.CA01 | `Assignment` (targetType, targetId, fromUserId, toUserId, dueAt, message, origin, previousResponsibleId), `AssignmentService.propose`, `AssignmentController.POST_api_assignments`, `AuditLog` | U1, U2, W1, W2, S5 | 1–6 | `[*] → PROPOSTA` | `AssignDialog`, `MemberPicker`, `AssignmentController`, `AssignmentRepository` |
| RF10.CA02 | `AccessPolicy.requireDeptHead/canView`, `Department.headUserId`, `DepartmentMembership` (vigente), `TaskItem.state/visibility`, `ProjectScheme.status`, índice único parcial de `Assignment` | S1–S4, W5, W6, W7 | 4–5; `alt` 403 ACESSO_NEGADO; `alt` 409 ATRIBUICAO_DUPLICADA | nota de PROPOSTA (409 na repetição) | `RoleGate / requireDeptHead`, `AccessPolicy` |
| RF10.CA03 | `Notification` (ATRIBUICAO_PROPOSTA, resourceType ASSIGNMENT), `NotificationType`, `TimelineEvent`, `NotificationPort`, evento `AssignmentProposed`, `AssignmentService.listForDepartment` | S6, D2, U3, U6, S16 | 7–9 | rótulo da transição `[*] → PROPOSTA` | `OutboxRelay`, `NotificationFeedAdapter`, `TimelineAdapter`, `NotificationBell`, bloco 3 de `Minha equipe` |
| RF10.CA04 | `AssignmentService.accept/refuse/requireAssignee/requireOpen/applyResponsible`, `Assignment.reason/respondedAt`, `TaskItem.responsibleId`, `ProjectTask.responsibleId`, `TaskStateLog` | U4, U5, W4, S7–S13 | 19–30; `alt` 422 MOTIVO_OBRIGATORIO | `PROPOSTA → ACEITA`, `PROPOSTA → RECUSADA` | `AssignmentBadge`, `TaskStateLogRepository`, `ProjectTaskRepository` |
| RF10.CA05 | `AssignmentService.listForMe/listForDepartment`, `DailyTask.priorityIndexJson`, `DailyTaskService.priorityIndex` | W3, S15, S16, D3 | 13–18, 28 | nota de ACEITA; `ACEITA → [*]` quando o alvo conclui | `app/me/assignments`, `LinhaCard`, `DailyTaskService` |
| RF10.CA06 | `AssignmentService.giveBack`, `Assignment.previousResponsibleId`, `AssignmentOrigin` (CHAT_WS, CHAT_DECIA), `DailyTaskService.delegate`, `MessagingService` | U7, S14 | `alt` RF10.CA06 (give-back, ATRIBUICAO_DEVOLVIDA) | `ACEITA → DEVOLVIDA` | `GiveBackDialog`, `DailyTaskService (RF44)`, `MessagingService (RF46)` |

**Dúvidas para confirmar:** (a) nomes dos campos: TAXONOMIA §12b usa `fromUserId`/`toUserId`/`message`/`reason`; `RF46/README.md` usa `assignerId`/`assigneeId`/`note`/`responseReason` e acrescenta `projectTaskId`, `companyId`, `departmentId`, `conversationId`, `sessionId` — unificar; (b) atribuir um **projeto inteiro** preenche todas as `ProjectTask` sem responsável ou só marca o projeto; (c) índice único parcial (`targetId`, `toUserId`) em PROPOSTA/ACEITA e o erro `409 ATRIBUICAO_DUPLICADA` são proposta deste RF; (d) o chefe pode **cancelar** uma PROPOSTA (estado CANCELADA não existe em `AssignmentStatus`) ou só o atribuído responde; (e) delegação (RF44 DELEGUEI) para fora do departamento exige aceite do chefe de destino; (f) sprint do card.
