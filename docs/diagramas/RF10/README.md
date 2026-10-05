# RF10 — Permitir que o chefe de departamento possa atribuir uma tarefa ou projeto a um usuário
**HU:** HU10 · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída (card novo; o card "SPRINT 2" cita "RF10 Responder divergência", escopo antigo — `RENUMERACAO.md`; fase (g) da ARQUITETURA §6: "RF9/RF10/RF46") · **Equivalente FAI:** nenhum (o FAI não tem hierarquia chefe → empregado; a atribuição é escopo novo — TAXONOMIA §12b, ABAS_POR_PERFIL §7.b, `docs/diagramas/RF46/README.md`) · **Aba/rota:** página do departamento › **Equipe › Minha equipe (gestão)** (`/departments/[slug]/team?mode=manage`, origem `MINHA_EQUIPE`); ação "Atribuir" no card de tarefa (`/tasks/[id]`) e de projeto (`/projects/[id]`, origem `BOTAO_ESQUEMA`); lado do atribuído: `/me/assignments` ("Atribuídas a mim") e Tarefa do Dia (RF44); API `POST /api/assignments`, `POST /api/assignments/{id}/accept|refuse|give-back`, `GET /api/me/assignments`, `GET /api/departments/{id}/assignments`
**Critérios de aceite cobertos:** RF10.CA01 · RF10.CA02 · RF10.CA03 · RF10.CA04 · RF10.CA05 · RF10.CA06 — corpo do card vazio: CAs derivados do título + HU10 + ABAS_POR_PERFIL §7.b (bloco 3 de Minha equipe) + RF46.CA03–CA05 (mesma entidade `Assignment`), marcados **(CA a confirmar)**. Todas as classes do RF são **(planejado)**; reais: `Guard`, `AuditLogPort`, `SecurityConfig`, `SessionActiveFilter`.

> **HU10** — COMO chefe de departamento POSSO clicar em "Atribuir tarefa ou projeto" PARA que um empregado possa visualizar sua lista de tarefas ou projetos pendentes dentro de seu escopo de trabalho.

A entidade **`Assignment`** (TAXONOMIA §12b.4) é compartilhada por três entradas: o chefe em *Minha equipe* ou no card (este RF, origens `MINHA_EQUIPE`/`BOTAO_ESQUEMA`), as ações sociais "atribuir"/"retornar" de qualquer usuário (RF18, `BOTAO_ESQUEMA`) e o chat (RF46, `CHAT_WS`/`CHAT_DECIA`). O que distingue o RF10 é o **papel**: `Guard.requireDeptHead` e o alvo humano precisa ter `DepartmentMembership` vigente no departamento do chefe.

## Critérios de aceite derivados da HU10 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF10.CA01** (CA a confirmar) | Dado um CHEFE (`Department.headUserId`) em *Minha equipe* ou num card de tarefa/projeto, quando aciona **Atribuir** escolhendo pessoa, alvo (`TaskItem` ou `ProjectScheme`), prazo opcional e mensagem (≤ 500), então `POST /api/assignments` cria `Assignment` com `status PROPOSTA`, `fromUserId` = chefe, `toUserId`, `targetType`, `targetId`, `dueAt`, `message`, `origin` (MINHA_EQUIPE ou BOTAO_ESQUEMA), `previousResponsibleId` = responsável atual, e `AuditLog ASSIGNMENT_CREATED`. |
| **RF10.CA02** (CA a confirmar) | Dado o pedido, então o serviço exige `Guard.requireDeptHead` do departamento da pessoa: ator que não é chefe → `403 ACESSO_NEGADO`; pessoa sem `DepartmentMembership` vigente no departamento do chefe → `422 VALIDACAO (FORA_DO_DEPARTAMENTO)`; alvo que o ator não pode ver (`Visibility PRIVADA` de terceiro) → `403 ACESSO_NEGADO`; alvo em CONCLUIDA/ARQUIVADA (tarefa) ou CONCLUIDO/ARQUIVADO (projeto) → `409 ALVO_ENCERRADO`; já existe `Assignment` PROPOSTA/ACEITA do mesmo alvo para a mesma pessoa → `409 ATRIBUICAO_DUPLICADA`. |
| **RF10.CA03** (CA a confirmar) | Dado o commit, então o evento `AssignmentProposed` (AFTER_COMMIT) grava `Notification` tipo **ATRIBUICAO_PROPOSTA**, categoria SISTEMA, `resourceType ASSIGNMENT`, em `notifications_by_user` (Cassandra) + espelho MySQL, e `TimelineEvent` do atribuído; o chefe acompanha o estado no bloco 3 de *Minha equipe* (`GET /api/departments/{id}/assignments`, por pessoa). |
| **RF10.CA04** (CA a confirmar) | Dado o atribuído (`toUserId`), quando **aceita** (`POST /api/assignments/{id}/accept`), então `status ACEITA`, `respondedAt`, `TaskItem.responsibleId` ou `ProjectTask.responsibleId` (todas as `ProjectTask` sem responsável, quando PROJECT) recebe `toUserId`, `TaskStateLog` é gravado se a tarefa passa de DISPONIVEL para EM_USO (`reason ATRIBUICAO_ACEITA`) e o chefe recebe ATRIBUICAO_ACEITA; quando **recusa** (`/refuse`), `reason` é obrigatório (`422 MOTIVO_OBRIGATORIO`), `status RECUSADA` e o chefe recebe ATRIBUICAO_RECUSADA; outro usuário respondendo → `403 ACESSO_NEGADO`; resposta fora de PROPOSTA → `409 ESTADO_INVALIDO`. |
| **RF10.CA05** (CA a confirmar) | Dado o atribuído, então `/me/assignments` (`AssignmentService.listForMe`) lista as atribuições PROPOSTA e ACEITA (filtros: tipo, prazo, quem atribuiu) com o alvo em `TaskCard`/`ProjectCard` compacto; a `Assignment` ACEITA entra no `priorityIndexJson` da Tarefa do Dia (RF44) com o fator "atribuída pelo chefe" e no Dossiê de Transição (RF36) como item pendente; o chefe vê, por pessoa, as atribuições abertas e vencidas (`Due`). |
| **RF10.CA06** (CA a confirmar) | Dado o atribuído com `Assignment` ACEITA, quando **devolve** com motivo (`POST /api/assignments/{id}/give-back`), então `status DEVOLVIDA`, `reason` obrigatório (`422 MOTIVO_OBRIGATORIO`), o `responsibleId` volta a `previousResponsibleId`, `TaskStateLog` registra a volta e o chefe recebe ATRIBUICAO_DEVOLVIDA; DELEGUEI da Tarefa do Dia (RF44) e "Atribuir" no chat (RF46) chamam o mesmo `AssignmentService` com outra `origin`. |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class AssignmentController {
    <<controller>>
    +create(CreateAssignmentRequest, CurrentUser, ctx) AssignmentView
    +accept(id, CurrentUser, ctx) AssignmentView
    +refuse(id, ReasonRequest, CurrentUser, ctx) AssignmentView
    +giveBack(id, ReasonRequest, CurrentUser, ctx) AssignmentView
    +listForMe(filters, CurrentUser) Page~AssignmentView~
    +listForDepartment(deptId, filters, CurrentUser) Page~AssignmentView~
  }
  class AssignmentService {
    <<service>>
    +propose(CreateAssignmentCommand, actor, ctx) Assignment
    +accept(id, actor, ctx) Assignment
    +refuse(id, reason, actor, ctx) Assignment
    +giveBack(id, reason, actor, ctx) Assignment
    +listForMe(userId, filters) Page
    +listForDepartment(deptId, filters, actor) Page
  }
  class AssignmentStateMachine {
    <<service>>
    +transition(Assignment, AssignmentStatus, actor) void
  }
  class Guard {
    <<service>>
    +requireDeptHead(CurrentUser, Department) void
    +ownerOrAdmin(CurrentUser, ownerId) void
  }
  class AccessPolicy {
    <<service>>
    +canView(viewer, target) boolean
  }
  class TaskStateMachine {
    <<service>>
    +transition(TaskItem, TaskState, actor, reason) TaskStateLog
  }
  class AssignmentRepositoryPort {
    <<port>>
    +save(Assignment) Assignment
    +findOpen(targetType, targetId, toUserId) Optional
    +findForUser(userId, filters) Page
    +findForDepartment(deptId, filters) Page
  }
  class MembershipRepositoryPort {
    <<port>>
    +findCurrent(userId) Optional
  }
  class TaskRepositoryPort {
    <<port>>
    +findById(id) Optional
    +save(TaskItem) TaskItem
  }
  class ProjectRepositoryPort {
    <<port>>
    +findById(id) Optional
    +assignUnassigned(projectId, userId) int
  }
  class NotificationPort {
    <<port>>
    +notify(Notification) void
  }
  class DailyTaskPort {
    <<port>>
    +boostAssigned(userId, targetId) void
  }

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
    +Instant createdAt
  }
  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +UUID responsibleId
    +TaskState state
    +Visibility visibility
    +LocalDate dueAt
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +UUID ownerId
    +ProjectStatus status
    +Visibility visibility
  }
  class ProjectTask {
    <<entity>>
    +UUID projectId
    +UUID responsibleId
    +LocalDate dueAt
  }
  class TaskStateLog {
    <<entity>>
    +TaskState fromState
    +TaskState toState
    +String reason
  }
  class Department {
    <<entity>>
    +UUID id
    +UUID headUserId
  }
  class DepartmentMembership {
    <<entity>>
    +UUID userId
    +UUID departmentId
    +Instant endedAt
  }
  class Notification {
    <<entity>>
    +UUID recipientId
    +NotificationType type
    +String category
    +String resourceType
    +UUID resourceId
  }
  class DailyTask {
    <<entity>>
    +UUID userId
    +LocalDate taskDate
    +JSON priorityIndexJson
    +DailyFeedback feedback
  }
  class AssignmentStatus {
    <<enum>>
    PROPOSTA
    ACEITA
    RECUSADA
    DEVOLVIDA
  }
  class AssignmentOrigin {
    <<enum>>
    CHAT_WS
    CHAT_DECIA
    BOTAO_ESQUEMA
    MINHA_EQUIPE
  }
  class AssignmentTargetType {
    <<enum>>
    TASK
    PROJECT
  }
  class NotificationType {
    <<enum>>
    ATRIBUICAO_PROPOSTA
    ATRIBUICAO_ACEITA
    ATRIBUICAO_RECUSADA
    ATRIBUICAO_DEVOLVIDA
  }

  AssignmentController --> AssignmentService
  AssignmentService --> AssignmentStateMachine
  AssignmentService --> Guard
  AssignmentService --> AccessPolicy
  AssignmentService --> TaskStateMachine
  AssignmentService --> AssignmentRepositoryPort
  AssignmentService --> MembershipRepositoryPort
  AssignmentService --> TaskRepositoryPort
  AssignmentService --> ProjectRepositoryPort
  AssignmentService --> NotificationPort
  AssignmentService --> DailyTaskPort
  Assignment "0..*" --> "0..1" TaskItem : targetType TASK
  Assignment "0..*" --> "0..1" ProjectScheme : targetType PROJECT
  ProjectScheme "1" *-- "2..*" ProjectTask
  TaskItem "1" --> "0..*" TaskStateLog
  Department "1" --> "0..*" DepartmentMembership
  Assignment --> AssignmentStatus
  Assignment --> AssignmentOrigin
  Assignment --> AssignmentTargetType
  Notification --> NotificationType
  AssignmentService ..> Notification
  AssignmentService ..> DailyTask : fator "atribuída pelo chefe"
  note for Assignment "Mesma entidade para RF10 (chefe), RF18/RF19 (atribuir/retornar) e RF46 (chat). reason obrigatório em RECUSADA e DEVOLVIDA. traceNodeId só quando origin = CHAT_DECIA."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Chefe de departamento · Empregado atribuído"]
    A1["Chefe: em Minha equipe ou no card, clica Atribuir tarefa ou projeto"]
    A2["Escolhe pessoa da equipe, alvo, prazo opcional e mensagem (≤ 500)"]
    A3["Empregado: abre /me/assignments ou a notificação"]
    A4["Aceita · Recusa com motivo · (depois de aceita) Devolve com motivo"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["Dialog Atribuir: Select pessoa (membros vigentes) · busca de alvo · Due · Textarea"]
    F2["POST /api/assignments {targetType, targetId, toUserId, dueAt, message, origin}"]
    F3["GET /api/me/assignments?status=&type=&from= · GET /api/departments/{id}/assignments"]
    F4["POST /api/assignments/{id}/accept | refuse | give-back"]
    F5["Cards compactos com Tag de status · Due vencido em vermelho · Stamp DEVOLVIDO + motivo"]
  end
  subgraph WEB["ws-web"]
    W1["JWT + SessionActiveFilter + CurrentUserArgumentResolver"]
    W2["AssignmentController"]
    E403["403 ACESSO_NEGADO (não é chefe · alvo PRIVADO de terceiro · responder atribuição alheia)"]
    E422F["422 VALIDACAO FORA_DO_DEPARTAMENTO"]
    E422M["422 MOTIVO_OBRIGATORIO"]
    E409E["409 ALVO_ENCERRADO"]
    E409D["409 ATRIBUICAO_DUPLICADA"]
    E409S["409 ESTADO_INVALIDO"]
  end
  subgraph APP["ws-application · AssignmentService"]
    S1["Guard.requireDeptHead(actor, departamento da pessoa)"]
    S2{"membership vigente de toUserId no departamento do chefe?"}
    S3{"AccessPolicy.canView(actor, alvo)?"}
    S4{"alvo CONCLUIDA/ARQUIVADA ou CONCLUIDO/ARQUIVADO?"}
    S5{"já existe PROPOSTA/ACEITA para o mesmo alvo e pessoa?"}
    S6["Assignment PROPOSTA · previousResponsibleId = responsável atual · AuditLog ASSIGNMENT_CREATED"]
    R1{"actor == toUserId e status == PROPOSTA?"}
    R2["accept: ACEITA · respondedAt · responsibleId = toUserId (TaskItem ou ProjectTasks sem responsável) · TaskStateLog DISPONIVEL→EM_USO (ATRIBUICAO_ACEITA)"]
    R3["refuse: reason obrigatório · RECUSADA"]
    G1{"actor == toUserId e status == ACEITA?"}
    G2["give-back: reason obrigatório · DEVOLVIDA · responsibleId = previousResponsibleId · TaskStateLog volta"]
    L1["listForMe: PROPOSTA + ACEITA · listForDepartment: por pessoa, abertas e vencidas"]
    EV["AFTER_COMMIT: AssignmentProposed/Accepted/Refused/GivenBack → Notification ATRIBUICAO_* (SISTEMA, resourceType ASSIGNMENT) · TimelineEvent · DailyTaskPort.boostAssigned (RF44) · HandoffDossier pendências (RF36)"]
  end
  subgraph PERS["Persistência"]
    P1[("MySQL: assignments, tasks (responsible_id), project_tasks, task_state_log, department_memberships, notifications (espelho), audit_log")]
    P2[("Cassandra: notifications_by_user · timeline_by_user")]
    P3[("Redis: contadores de pendências por pessoa (Minha equipe)")]
  end

  A1 --> F1 --> A2 --> F2 --> W1 --> W2 --> S1
  S1 -->|"não é chefe"| E403
  S1 --> S2
  S2 -->|"não"| E422F
  S2 -->|"sim"| S3
  S3 -->|"não"| E403
  S3 -->|"sim"| S4
  S4 -->|"sim"| E409E
  S4 -->|"não"| S5
  S5 -->|"sim"| E409D
  S5 -->|"não"| S6 --> P1
  S6 --> EV
  A3 --> F3 --> W2 --> L1 --> F5
  L1 --> P1
  L1 --> P3
  A4 --> F4 --> W2
  W2 -->|"accept/refuse"| R1
  R1 -->|"outro usuário"| E403
  R1 -->|"status != PROPOSTA"| E409S
  R1 -->|"sim, accept"| R2 --> P1
  R1 -->|"sim, refuse"| R3
  R3 -->|"sem motivo"| E422M
  R3 --> P1
  W2 -->|"give-back"| G1
  G1 -->|"não"| E409S
  G1 -->|"sim"| G2
  G2 -->|"sem motivo"| E422M
  G2 --> P1
  R2 --> EV
  R3 --> EV
  G2 --> EV
  EV --> P2
  EV --> P3
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor CH as Usuário (chefe)
  actor EM as Usuário (empregado)
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant R as Repository/MySQL
  participant CS as Cassandra
  participant RD as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  CH->>N: Atribuir tarefa X a Maria, prazo, mensagem (Minha equipe)
  N->>C: POST /api/assignments {TASK, taskId, toUserId, dueAt, message, origin MINHA_EQUIPE}
  C->>S: AssignmentService.propose(cmd, actor, ctx)
  S->>R: department_memberships.findCurrent(toUserId) → departamento
  S->>S: Guard.requireDeptHead(actor, department)
  alt ator não é o chefe do departamento da pessoa
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else pessoa sem lotação vigente no departamento do chefe
    S-->>C: 422 VALIDACAO details.toUserId FORA_DO_DEPARTAMENTO
    C-->>N: 422
  else alvo invisível, encerrado ou já atribuído
    S->>R: tasks.findById + AccessPolicy.canView · assignments.findOpen(TASK, taskId, toUserId)
    S-->>C: 403 ACESSO_NEGADO | 409 ALVO_ENCERRADO | 409 ATRIBUICAO_DUPLICADA
    C-->>N: erro
  else ok
    S->>R: insert assignments (PROPOSTA, previousResponsibleId = task.responsibleId)
    S->>R: insert audit_log ASSIGNMENT_CREATED
    S-->>C: AssignmentView
    C-->>N: 201
    EV->>CS: notifications_by_user ATRIBUICAO_PROPOSTA (SISTEMA, ASSIGNMENT) + timeline_by_user
    EV->>R: espelho notifications
    EV->>RD: INCR pending:assignments:{toUserId}
  end

  EM->>N: abre /me/assignments
  N->>C: GET /api/me/assignments?status=PROPOSTA,ACEITA
  C->>S: AssignmentService.listForMe(userId, filters)
  S->>R: assignments + alvo (tasks/project_schemes)
  S-->>C: Page AssignmentView
  C-->>N: 200 (TaskCard/ProjectCard compacto, Due, Tag)

  EM->>N: Aceitar
  N->>C: POST /api/assignments/{id}/accept
  C->>S: AssignmentService.accept(id, actor, ctx)
  alt actor != toUserId
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else status != PROPOSTA
    S-->>C: 409 ESTADO_INVALIDO
    C-->>N: 409
  else ok
    S->>R: update assignments (ACEITA, respondedAt)
    S->>R: update tasks.responsible_id = toUserId (ou project_tasks sem responsável)
    S->>R: TaskStateMachine DISPONIVEL → EM_USO + task_state_log (ATRIBUICAO_ACEITA)
    S-->>C: AssignmentView
    C-->>N: 200
    EV->>CS: ATRIBUICAO_ACEITA ao chefe
    EV->>R: DailyTaskPort.boostAssigned → priorityIndexJson (RF44)
  end

  EM->>N: Devolver com motivo (dias depois)
  N->>C: POST /api/assignments/{id}/give-back {reason}
  C->>S: AssignmentService.giveBack(id, reason, actor, ctx)
  alt motivo vazio
    S-->>C: 422 MOTIVO_OBRIGATORIO
    C-->>N: 422
  else status != ACEITA
    S-->>C: 409 ESTADO_INVALIDO
    C-->>N: 409
  else ok
    S->>R: update assignments (DEVOLVIDA, reason, respondedAt)
    S->>R: update tasks.responsible_id = previousResponsibleId + task_state_log
    S-->>C: AssignmentView
    C-->>N: 200
    EV->>CS: ATRIBUICAO_DEVOLVIDA ao chefe (Stamp DEVOLVIDO + motivo no card)
  end
```

## 4. Máquina de estados

Entidade central: **`Assignment.status`** (`AssignmentStatus`, TAXONOMIA §12b.4/§13) com `AssignmentStateMachine`. Efeitos colaterais em `TaskItem.responsibleId`/`TaskState` anotados nas transições.

```mermaid
stateDiagram-v2
  direction LR
  state "PROPOSTA" as PROP
  state "ACEITA" as ACE
  state "RECUSADA" as REC
  state "DEVOLVIDA" as DEV

  [*] --> PROP : POST /api/assignments pelo chefe (CA01) [requireDeptHead, membership vigente, alvo visível e aberto, sem duplicata] · ATRIBUICAO_PROPOSTA
  PROP --> ACE : accept pelo toUserId (CA04) · responsibleId = toUserId · TaskStateLog DISPONIVEL→EM_USO · ATRIBUICAO_ACEITA · entra na Tarefa do Dia (RF44)
  PROP --> REC : refuse pelo toUserId com reason (CA04) · ATRIBUICAO_RECUSADA
  ACE --> DEV : give-back pelo toUserId com reason (CA06) · responsibleId = previousResponsibleId · TaskStateLog · ATRIBUICAO_DEVOLVIDA
  ACE --> [*] : alvo CONCLUIDA/CONCLUIDO (RF8.CA05) — atribuição cumprida (sem mudar status)
  REC --> [*]
  DEV --> [*] : chefe reatribui (nova Assignment PROPOSTA) ou retoma
  note right of PROP
    Responder por outro usuário: 403 ACESSO_NEGADO.
    Responder fora de PROPOSTA: 409 ESTADO_INVALIDO.
    Nova PROPOSTA para mesmo alvo e pessoa: 409 ATRIBUICAO_DUPLICADA.
  end note
  note right of DEV
    reason obrigatório (422 MOTIVO_OBRIGATORIO).
    DELEGUEI da Tarefa do Dia (RF44) e o chat (RF46)
    criam uma nova PROPOSTA pelo mesmo serviço.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(shell)/departments/[slug]/team (bloco 3 Atribuições) · app/(shell)/me/assignments · botão Atribuir em tasks/[id] e projects/[id]"]
    UI["packages/ui: Dialog (Atribuir), Select (pessoa), Input (busca de alvo), Due, Textarea, TaskCard/ProjectCard compact, Tag (status), Stamp (DEVOLVIDO), Toast"]
    SN["SidebarNav › Gestão › Minha equipe · TopBar (badge de notificações)"]
    BFF["app/bff/assignments/*"]
    PG --> UI
    PG --> BFF
    SN --> PG
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig · SessionActiveFilter · CurrentUserArgumentResolver"]
    AC["AssignmentController"]
    GEH["GlobalExceptionHandler (403, 409, 422)"]
  end
  subgraph WSAPP["ws-application"]
    AS["messaging: AssignmentService · AssignmentStateMachine (compartilhado com RF18/RF46)"]
    SECU["security: Guard.requireDeptHead · AccessPolicy"]
    ACV["acervo: TaskStateMachine"]
    PORTS["ports: AssignmentRepositoryPort · MembershipRepositoryPort · TaskRepositoryPort · ProjectRepositoryPort · NotificationPort · DailyTaskPort · CounterCachePort · AuditLogPort"]
    EVT["events: AssignmentProposed · AssignmentAccepted · AssignmentRefused · AssignmentGivenBack (AFTER_COMMIT)"]
    GAM["gamification: DailyTaskService (RF44) · handoff: HandoffService (RF36) — consumidores"]
    AS --> SECU
    AS --> ACV
    AS --> PORTS
    AS --> EVT
    EVT --> GAM
  end
  subgraph WSDOM["ws-domain"]
    DOM["messaging: Assignment · enums AssignmentStatus/AssignmentOrigin/AssignmentTargetType · acervo: TaskItem · TaskStateLog · projects: ProjectScheme · ProjectTask · identity: Department · DepartmentMembership · social: Notification"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: JpaAssignmentRepository · Flyway V__rf10_assignments"]
    CAS["persistence-cassandra: notifications_by_user · timeline_by_user"]
    RDS["cache-redis: pending:assignments:{userId}"]
  end

  BFF -->|"REST JSON"| SEC --> AC --> AS
  AC --> GEH
  MY -.implementa.-> PORTS
  CAS -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  AS --> DOM
  MY --> DB[("MySQL 8.4")]
  CAS --> CDB[("Cassandra 4.1")]
  RDS --> RD[("Redis 7")]
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF10.CA01 | `AssignmentController.create`, `AssignmentService.propose`, `Assignment` (`origin` MINHA_EQUIPE/BOTAO_ESQUEMA, `previousResponsibleId`) | `A1`→`A2`→`F2`→`S6` | 1–3, 15–18 | `[*]`→`PROP` | `PG`, `UI` (`Dialog`), `AS`, `MY` | planejado |
| RF10.CA02 | `Guard.requireDeptHead`, `MembershipRepositoryPort.findCurrent`, `AccessPolicy.canView`, `AssignmentRepositoryPort.findOpen` | `S1`→`S5`, `E403`, `E422F`, `E409E`, `E409D` | 4–14 | guardas de `[*]`→`PROP` | `SECU`, `GEH` | planejado (`Guard` base real) |
| RF10.CA03 | evento `AssignmentProposed`, `NotificationPort`, `Notification` ATRIBUICAO_PROPOSTA, `AssignmentService.listForDepartment` | `EV`, `F3` (departamento) | 19–21 | — | `EVT`, `CAS`, `RDS` | planejado |
| RF10.CA04 | `AssignmentService.accept/refuse`, `AssignmentStateMachine`, `TaskStateMachine`, `ProjectRepositoryPort.assignUnassigned` | `A4`→`F4`→`R1`→`R2`/`R3`, `E403`, `E409S`, `E422M` | 28–41 | `PROP`→`ACE`, `PROP`→`REC` | `AS`, `ACV` | planejado |
| RF10.CA05 | `AssignmentService.listForMe`, `DailyTaskPort.boostAssigned`, `DailyTask.priorityIndexJson`, `HandoffService` | `A3`→`F3`→`L1`→`F5`, `EV` | 22–27, 41 | nota de `ACE` | `PG` (`/me/assignments`), `GAM`, `UI` (`Due`) | planejado (RF44, RF36) |
| RF10.CA06 | `AssignmentService.giveBack`, `Assignment.reason/previousResponsibleId`, `TaskStateLog` | `F4`→`G1`→`G2`, `E422M`, `E409S` | 42–53 | `ACE`→`DEV` | `AS`, `UI` (`Stamp` DEVOLVIDO) | planejado (RF44 DELEGUEI, RF46) |
