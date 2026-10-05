# RF10 — Permitir que o chefe de departamento possa atribuir uma tarefa ou projeto a um usuário
**HU:** HU10 · **Sprint (board Work Station):** lista *Requisitos Funcionais* (card novo, sem sprint atribuída — a confirmar) · **Equivalente FAI:** nenhum (o FAI não tem hierarquia chefe → empregado; a atribuição é escopo novo do Work Station, ver `docs/produto/ABAS_POR_PERFIL.md` §7.b e o card RF46) · **Aba/rota:** página do departamento › **Equipe › Minha equipe (gestão)** (`/departments/[slug]/team?mode=manage`), ação "Atribuir" no card de tarefa (`/tasks/[id]`) e de projeto (`/projects/[id]`); lado do atribuído: `/me/assignments` ("Atribuídas a mim") e Tarefa do Dia (RF44)
**Critérios de aceite cobertos:** RF10.CA01 · RF10.CA02 · RF10.CA03 · RF10.CA04 · RF10.CA05 · RF10.CA06 — corpo do card vazio: CAs derivados do título + HU10 + `ABAS_POR_PERFIL.md` §7.b (bloco 3) e P-02, marcados **(CA a confirmar)**

> **HU10** — COMO chefe de departamento POSSO clicar em "Atribuir tarefa ou projeto" PARA que um empregado possa visualizar sua lista de tarefas ou projetos pendentes dentro de seu escopo de trabalho.

A TAXONOMIA só tem o campo `responsibleId` em `TaskItem` (§2.1) e em `ProjectTask` (§3.2); não há entidade de atribuição. Este RF **propõe** a entidade `Assignment` (tabela `assignments`) para guardar quem atribuiu, a quem, o alvo, o prazo, a instrução e o **aceite/recusa** — o `responsibleId` só é escrito quando a pessoa **aceita**. O rastro fica em `Assignment` + `AuditLog` (+ `TaskStateLog` quando o aceite muda o estado da tarefa). Alternativa sem entidade nova (escrever `responsibleId` direto, sem aceite) fica registrada como dúvida no §6.

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF10.CA01** | Dado um CHEFE (`Department.headUserId`) em *Minha equipe* ou num card de tarefa/projeto, quando aciona **Atribuir** escolhendo pessoa, alvo (`TaskItem`, `ProjectScheme` ou uma `ProjectTask` do projeto), prazo opcional e instrução (≤ 500), então é criada `Assignment` **(proposta)** com `status = PENDENTE`, `assignerId`, `assigneeId`, `departmentId`, `targetType`, `targetId`, `dueAt`, `instruction`, `origin` (MINHA_EQUIPE · CARD · CHAT · DELEGACAO) e `AuditLog` ASSIGNMENT_CREATED. |
| **RF10.CA02** | Dado o pedido, então o serviço exige `requireDeptHead` do departamento da pessoa: ator que não é chefe → `403 ACESSO_NEGADO`; pessoa sem `DepartmentMembership` vigente no departamento do chefe → `422 VALIDACAO (FORA_DO_DEPARTAMENTO)`; alvo que o ator não pode ver (`Visibility.PRIVADA` de terceiro) → `403 ACESSO_NEGADO`; alvo em CONCLUIDA/ARQUIVADA (tarefa) ou CONCLUIDO/ARQUIVADO (projeto) → `409 ESTADO_INVALIDO`; já existe `Assignment` PENDENTE ou ACEITA para o mesmo (alvo, pessoa) → `409 ATRIBUICAO_DUPLICADA`. |
| **RF10.CA03** | Dado o commit, então o evento `AssignmentCreated` (AFTER_COMMIT) grava `Notification` tipo **ATRIBUICAO (proposta de novo valor de `NotificationType`)**, categoria SISTEMA, `resourceType = ASSIGNMENT`, em `notifications_by_user` (Cassandra) + espelho MySQL, e `TimelineEvent` do atribuído; o chefe vê o estado da atribuição no bloco 3 de *Minha equipe*. |
| **RF10.CA04** | Dado o atribuído, quando **aceita**, então `Assignment.status = ACEITA`, `TaskItem.responsibleId` ou `ProjectTask.responsibleId` recebe `assigneeId` (projeto inteiro: todas as `ProjectTask` sem responsável), `TaskStateLog` é gravado se a tarefa passa de DISPONIVEL para EM_USO, e o chefe é notificado; quando **recusa**, então `responseReason` é obrigatório (≥ 10 caracteres, senão `422 VALIDACAO`), `status = RECUSADA` e o chefe é notificado; quem não é o atribuído → `403 ACESSO_NEGADO`; responder a atribuição já respondida ou cancelada → `409 ESTADO_INVALIDO`. |
| **RF10.CA05** | Dado o atribuído, então `/me/assignments` lista as atribuições PENDENTE e ACEITA (filtros: tipo, prazo, chefe) com o alvo em card `LINHA`; a `Assignment` ACEITA entra no `priorityIndexJson` da Tarefa do Dia (RF44) com o fator "atribuída pelo chefe" e no Dossiê de Transição (RF36) como item pendente; `CONCLUIDA` é derivada quando o alvo chega a CONCLUIDA/CONCLUIDO. |
| **RF10.CA06** | Dado o chefe, quando **cancela** uma atribuição PENDENTE ou ACEITA (motivo opcional), então `status = CANCELADA`, o `responsibleId` volta ao dono do alvo se tinha sido alterado pelo aceite, e o atribuído é notificado; DELEGUEI da Tarefa do Dia (RF44) e "Atribuir" no chat (RF46) chamam o mesmo `AssignmentService` com `origin` DELEGACAO/CHAT; delegação para pessoa de outro departamento exige aceite do chefe dela **(a confirmar)**. |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class Assignment {
    <<entity>>
    +UUID id
    +UUID assignerId
    +UUID assigneeId
    +UUID departmentId
    +AssignmentTarget targetType
    +UUID targetId
    +LocalDate dueAt
    +String instruction
    +AssignmentOrigin origin
    +AssignmentStatus status
    +String responseReason
    +Instant respondedAt
    +UUID cancelledBy
    +String correlationId
  }
  class AssignmentStatus {
    <<enum>>
    PENDENTE
    ACEITA
    RECUSADA
    CANCELADA
    CONCLUIDA
  }
  class AssignmentTarget {
    <<enum>>
    TASK
    PROJECT
    PROJECT_TASK
  }
  class AssignmentOrigin {
    <<enum>>
    MINHA_EQUIPE
    CARD
    CHAT
    DELEGACAO
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
    +POST_api_tasks_id_assign(body) 201
    +POST_api_projects_id_assign(body) 201
    +POST_api_projects_id_tasks_tid_assign(body) 201
    +POST_api_assignments_id_accept() 200
    +POST_api_assignments_id_decline(reason) 200
    +POST_api_assignments_id_cancel(reason) 200
    +GET_api_me_assignments(status, page) 200
    +GET_api_departments_id_assignments(status) 200
  }
  class AssignmentService {
    <<service>>
    +assign(actor, assigneeId, target, dueAt, instruction, origin) Assignment
    +accept(actor, assignmentId) Assignment
    +decline(actor, assignmentId, reason) Assignment
    +cancel(actor, assignmentId, reason) Assignment
    +listForAssignee(userId, filters, page) Page
    +listForDepartment(headId, deptId, filters) Page
    +onTargetCompleted(event) marca CONCLUIDA
  }
  class AccessPolicy {
    <<service>>
    +requireDeptHead(user, deptId) void
    +canView(user, target) boolean
  }
  class DailyTaskService {
    <<service>>
    +delegate(userId, taskId, toUserId) Assignment
    +priorityIndex(userId) inclui atribuicoes ACEITA
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
  Assignment --> AssignmentTarget
  Assignment --> AssignmentOrigin
  Assignment --> User : assignerId chefe
  Assignment --> User : assigneeId
  Assignment --> Department : departmentId
  Assignment ..> TaskItem : targetId quando TASK
  Assignment ..> ProjectScheme : targetId quando PROJECT
  Assignment ..> ProjectTask : targetId quando PROJECT_TASK
  Department --> User : headUserId
  DepartmentMembership --> User
  DepartmentMembership --> Department
  ProjectScheme "1" --> "*" ProjectTask
  ProjectTask --> TaskItem : taskId
  TaskItem --> User : responsibleId
  ProjectTask --> User : responsibleId
  TaskItem "1" --> "*" TaskStateLog
  Notification ..> Assignment : resourceId
  DailyTask ..> Assignment : fator atribuida pelo chefe

  AssignmentController --> AssignmentService
  AssignmentService --> AccessPolicy
  AssignmentService --> AssignmentRepository
  AssignmentService --> NotificationPort
  AssignmentService ..> AuditLog
  AssignmentService ..> TaskStateLog : aceite DISPONIVEL para EM_USO
  DailyTaskService --> AssignmentService : DELEGUEI origin DELEGACAO
  NotificationPort <|.. NotificationFeedAdapter

  note for Assignment "PROPOSTA — tabela assignments. Nao existe na TAXONOMIA. Unico parcial (targetId, assigneeId) com status em PENDENTE ou ACEITA (409 ATRIBUICAO_DUPLICADA) .. +4 campos de auditoria .."
  note for Notification "NotificationType ATRIBUICAO e proposta de novo valor. Alternativa sem mudar o enum SISTEMA com payloadJson.kind ATRIBUICAO"
  note for TaskItem "responsibleId e escrito so no aceite (CA04). Antes do aceite o dono continua responsavel"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef ai fill:#fff3d6,stroke:#d68910,color:#5c3b00

  subgraph L1["Ator humano · CHEFE e atribuído"]
    U1["CHEFE abre Minha equipe ou o card da tarefa/projeto e clica Atribuir"]
    U2["Escolhe pessoa, alvo (tarefa, projeto ou tarefa do projeto), prazo e instrução"]
    U3["Atribuído recebe notificação e abre Atribuídas a mim"]
    U4{"Aceita ou recusa?"}
    U5["Informa motivo da recusa"]
    U6["CHEFE acompanha estado no bloco 3 de Minha equipe e pode cancelar"]
    U7(["Fim"])
  end

  subgraph L2["Web/BFF (Next.js App Router)"]
    W1["AssignDialog: busca membros do departamento (DepartmentMembership vigente), sugestão de carga ✦ opcional"]
    W2["POST /api/tasks/{id}/assign · /api/projects/{id}/assign · /api/projects/{id}/tasks/{tid}/assign"]
    W3["Lista /me/assignments com cards LINHA, filtros tipo, prazo, chefe"]
    W4["POST /api/assignments/{id}/accept ou /decline"]
    W5["Exibe 403 ACESSO_NEGADO"]
    W6["Exibe 422 VALIDACAO (FORA_DO_DEPARTAMENTO, motivo curto)"]
    W7["Exibe 409 ESTADO_INVALIDO ou 409 ATRIBUICAO_DUPLICADA"]
  end

  subgraph L3["ws-application · AssignmentService"]
    S1{"AccessPolicy.requireDeptHead: ator é headUserId do departamento da pessoa?"}
    S2{"Pessoa tem DepartmentMembership vigente nesse departamento?"}
    S3{"Ator pode ver o alvo (canView) e alvo não está CONCLUIDA/ARQUIVADA?"}
    S4{"Já existe Assignment PENDENTE ou ACEITA para (alvo, pessoa)?"}
    S5["INSERT assignments (PENDENTE, origin, dueAt, instruction) + AuditLog ASSIGNMENT_CREATED"]
    S6["Evento AssignmentCreated (AFTER_COMMIT) → NotificationPort ATRIBUICAO + TimelineEvent"]
    S7{"Ator é o assigneeId e status PENDENTE?"}
    S8["accept: status ACEITA, respondedAt · UPDATE responsibleId em tasks ou project_tasks"]
    S9{"Tarefa DISPONIVEL?"}
    S10["TaskStateLog DISPONIVEL → EM_USO (reason ATRIBUICAO, correlationId)"]
    S11{"Motivo com 10 ou mais caracteres?"}
    S12["decline: status RECUSADA, responseReason"]
    S13["Notifica o chefe (ATRIBUICAO aceita ou recusada)"]
    S14["cancel pelo chefe: status CANCELADA, responsibleId volta ao dono se alterado, notifica"]
    S15["onTargetCompleted: alvo CONCLUIDA/CONCLUIDO → Assignment CONCLUIDA"]
    S16["DailyTaskService.priorityIndex inclui fator atribuída pelo chefe (RF44)"]
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
  S1 -->|"não"| W5 --> U7
  S1 -->|"sim"| S2
  S2 -->|"não"| W6 --> U7
  S2 -->|"sim"| S3
  S3 -->|"não"| W7 --> U7
  S3 -->|"sim"| S4
  S4 -->|"sim"| W7
  S4 -->|"não"| S5 --> D1
  S5 --> S6 --> D2
  S6 --> U3 --> W3 --> U4
  U4 -->|"aceita"| W4 --> S7
  U4 -->|"recusa"| U5 --> W4
  S7 -->|"não"| W5
  S7 -->|"sim, aceite"| S8 --> D1
  S8 --> S9
  S9 -->|"sim"| S10 --> D1
  S9 -->|"não"| S13
  S10 --> S13
  S7 -->|"sim, recusa"| S11
  S11 -->|"não"| W6
  S11 -->|"sim"| S12 --> D1
  S12 --> S13 --> D2
  S13 --> U6
  U6 -->|"cancelar"| S14 --> D1
  S14 --> D2
  S8 --> S16 --> D3
  S8 -. "alvo concluído depois" .-> S15 --> D1
  S14 --> U7

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
    CH->>FE: Minha equipe › Atribuir (pessoa Bruno, tarefa T1, prazo, instrução)
    FE->>C: POST /api/tasks/T1/assign {assigneeId, dueAt, instruction, origin MINHA_EQUIPE}
    C->>S: AssignmentService.assign(actor, assigneeId, TASK T1, dueAt, instruction, origin)
    S->>DB: SELECT departments WHERE headUserId = actor · department_memberships vigente de Bruno
    S->>DB: SELECT tasks T1 (state, visibility, ownerId) · assignments PENDENTE ou ACEITA para (T1, Bruno)
    S->>DB: INSERT assignments (PENDENTE) · INSERT audit_log (ASSIGNMENT_CREATED)
    S-)EV: AssignmentCreated(assignmentId)
    EV->>CS: INSERT notifications_by_user (Bruno, ATRIBUICAO, resource ASSIGNMENT) · timeline_by_user
    EV->>DB: INSERT notifications (espelho)
    S-->>C: 201 Assignment {status PENDENTE}
    C-->>FE: 201
    FE-->>CH: Atribuição criada — aguardando aceite

    EM->>FE: Abre notificação › Atribuídas a mim
    FE->>C: GET /api/me/assignments?status=PENDENTE
    C->>S: AssignmentService.listForAssignee(userId, filters, page)
    S->>DB: SELECT assignments JOIN tasks ou project_schemes (snapshot do alvo)
    S-->>C: 200 Page (cards LINHA)
    C-->>FE: 200
    EM->>FE: Aceitar
    FE->>C: POST /api/assignments/A1/accept
    C->>S: AssignmentService.accept(actor, A1)
    S->>DB: SELECT assignments A1 (assigneeId = actor, status PENDENTE)
    S->>DB: UPDATE assignments SET status = ACEITA, respondedAt · UPDATE tasks SET responsibleId = Bruno, state = EM_USO
    S->>DB: INSERT task_state_log (DISPONIVEL → EM_USO, reason ATRIBUICAO, correlationId) · audit_log
    S-)EV: AssignmentAccepted(A1)
    EV->>CS: INSERT notifications_by_user (chefe, ATRIBUICAO aceita)
    EV->>DB: UPDATE daily_tasks.priorityIndexJson (fator atribuída pelo chefe, RF44)
    S-->>C: 200 Assignment {status ACEITA}
    C-->>FE: 200
    FE-->>EM: Tarefa agora em Atribuídas a mim e na Tarefa do Dia
  end

  alt RF10.CA02 — ator não é chefe do departamento da pessoa
    FE->>C: POST /api/tasks/T1/assign
    C->>S: assign(...)
    S->>DB: SELECT departments WHERE headUserId = actor → não contém o departamento de Bruno
    S-->>C: 403 ACESSO_NEGADO
    C-->>FE: 403
  else RF10.CA02 — já existe atribuição PENDENTE para (T1, Bruno)
    S->>DB: SELECT assignments WHERE targetId = T1 AND assigneeId = Bruno AND status IN (PENDENTE, ACEITA) → 1 linha
    S-->>C: 409 ATRIBUICAO_DUPLICADA
    C-->>FE: 409
  else RF10.CA04 — recusa sem motivo suficiente
    FE->>C: POST /api/assignments/A1/decline {reason "nao"}
    C->>S: decline(actor, A1, reason)
    S-->>C: 422 VALIDACAO (responseReason com menos de 10 caracteres)
    C-->>FE: 422
  end
```

## 4. Máquina de estados

Entidade central: **`Assignment.status`** (enum `AssignmentStatus`, **proposta**). O aceite escreve `TaskItem.responsibleId`/`ProjectTask.responsibleId` e pode mover `TaskState` DISPONIVEL → EM_USO (RF41), registrado em `TaskStateLog`.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> PENDENTE : CHEFE atribui (CA01) — AuditLog e Notification ATRIBUICAO
  PENDENTE --> ACEITA : atribuído aceita (CA04) — responsibleId recebe assigneeId
  PENDENTE --> RECUSADA : atribuído recusa com motivo de 10 ou mais caracteres (CA04)
  PENDENTE --> CANCELADA : CHEFE cancela (CA06)
  ACEITA --> CANCELADA : CHEFE cancela — responsibleId volta ao dono (CA06)
  ACEITA --> CONCLUIDA : alvo chega a CONCLUIDA ou CONCLUIDO (CA05)
  RECUSADA --> [*]
  CANCELADA --> [*]
  CONCLUIDA --> [*]

  note right of PENDENTE
    Unico parcial (targetId, assigneeId) em PENDENTE ou ACEITA
    nova tentativa devolve 409 ATRIBUICAO_DUPLICADA (CA02)
    aparece em /me/assignments e em Minha equipe bloco 3
  end note
  note right of ACEITA
    Entra no priorityIndexJson da Tarefa do Dia (RF44)
    e como item pendente do Dossie de Transicao (RF36)
    Responder de novo devolve 409 ESTADO_INVALIDO
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    F1["app/departments/[slug]/team · modo gestão Minha equipe (bloco 3 Atribuir)"]
    F2["app/tasks/[id] · app/projects/[id] · ação Atribuir no card"]
    F3["app/me/assignments · Atribuídas a mim"]
    F4["components/ui: AssignDialog · MemberPicker · AssignmentBadge (PENDENTE/ACEITA/RECUSADA) · NotificationBell · LinhaCard"]
  end

  subgraph WEB["ws-web"]
    C1["AssignmentController (/api/tasks/{id}/assign · /api/projects/{id}/assign · /api/projects/{id}/tasks/{tid}/assign · /api/assignments/{id}/accept|decline|cancel · /api/me/assignments)"]
    C2["RoleGate / requireDeptHead"]
  end

  subgraph APP["ws-application"]
    S1["AssignmentService"]
    S2["AccessPolicy (requireDeptHead, canView)"]
    S3["DailyTaskService (RF44 · DELEGUEI → origin DELEGACAO · priorityIndex)"]
    S4["ChatService (RF46 · Atribuir no chat → origin CHAT)"]
    P1["NotificationPort"]
    P2["AuditPort"]
  end

  subgraph DOM["ws-domain · br.gov.pr.secid.workstation"]
    D1["Assignment (proposta) · AssignmentStatus · AssignmentTarget · AssignmentOrigin"]
    D2["TaskItem.responsibleId · ProjectScheme · ProjectTask.responsibleId · TaskStateLog"]
    D3["User · Department.headUserId · DepartmentMembership"]
    D4["Notification (ATRIBUICAO proposta) · TimelineEvent · AuditLog · DailyTask"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1["persistence-mysql: AssignmentRepository · TaskItemRepository · ProjectTaskRepository · TaskStateLogRepository · AuditLogRepository · NotificationRepository"]
    I2["persistence-cassandra: NotificationFeedAdapter (notifications_by_user) · TimelineAdapter (timeline_by_user)"]
    I3["platform: OutboxRelay (AssignmentCreated, AssignmentAccepted, AssignmentDeclined, AssignmentCancelled) · NotificationAdapter"]
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
| RF10.CA01 | `Assignment` (proposta: assignerId, assigneeId, targetType, targetId, dueAt, instruction, origin), `AssignmentService.assign`, `AssignmentController.POST_*_assign`, `AuditLog` | U1, U2, W1, W2, S5 | 1–6 | `[*] → PENDENTE` | `AssignDialog`, `MemberPicker`, `AssignmentController`, `AssignmentRepository` |
| RF10.CA02 | `AccessPolicy.requireDeptHead/canView`, `Department.headUserId`, `DepartmentMembership` (vigente), `TaskItem.state/visibility`, `ProjectScheme.status`, índice único parcial de `Assignment` | S1–S4, W5, W6, W7 | 4–5; `alt` 403 ACESSO_NEGADO; `alt` 409 ATRIBUICAO_DUPLICADA | nota de PENDENTE (409 na repetição) | `RoleGate / requireDeptHead`, `AccessPolicy` |
| RF10.CA03 | `Notification` (type ATRIBUICAO proposta, resourceType ASSIGNMENT), `TimelineEvent`, `NotificationPort`, evento `AssignmentCreated` | S6, D2, U3, U6 | 7–9 | rótulo da transição `[*] → PENDENTE` | `OutboxRelay`, `NotificationFeedAdapter`, `TimelineAdapter`, `NotificationBell` |
| RF10.CA04 | `AssignmentService.accept/decline`, `Assignment.responseReason/respondedAt`, `TaskItem.responsibleId`, `ProjectTask.responsibleId`, `TaskStateLog` | U4, U5, W4, S7–S13 | 19–30; `alt` 422 VALIDACAO | `PENDENTE → ACEITA`, `PENDENTE → RECUSADA` | `AssignmentBadge`, `TaskStateLogRepository`, `ProjectTaskRepository` |
| RF10.CA05 | `AssignmentService.listForAssignee/onTargetCompleted`, `DailyTask.priorityIndexJson`, `DailyTaskService.priorityIndex` | W3, S15, S16, D3 | 13–18, 28 | `ACEITA → CONCLUIDA`, nota de ACEITA | `app/me/assignments`, `LinhaCard`, `DailyTaskService` |
| RF10.CA06 | `AssignmentService.cancel`, `Assignment.cancelledBy`, `AssignmentOrigin` (DELEGACAO, CHAT), `DailyTaskService.delegate`, `ChatService` | U6, S14 | — (cancelamento segue o mesmo padrão de 20–27 com status CANCELADA) | `PENDENTE → CANCELADA`, `ACEITA → CANCELADA` | `DailyTaskService (RF44)`, `ChatService (RF46)` |

**Dúvidas para confirmar:** (a) entidade `Assignment` nova **ou** escrever `responsibleId` diretamente sem aceite (sem rastro de recusa); (b) novo valor `NotificationType.ATRIBUICAO` ou reutilizar SISTEMA com `payloadJson.kind`; (c) atribuir um **projeto inteiro** preenche todas as `ProjectTask` sem responsável ou só marca o projeto; (d) delegação (RF44 DELEGUEI) para fora do departamento exige aceite do chefe de destino; (e) sprint do card no board.
