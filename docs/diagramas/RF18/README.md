# RF18 — Interagir socialmente com tarefas e projetos: curtir, comentar, salvar, compartilhar, remixar, retornar e atribuir
**HU:** HU18 · **Sprint (board Work Station):** a confirmar (card renomeado em 2026-10-02; origem `_anterior/RF26` = Sprint 4) · **Equivalente FAI:** RF19 Interações sociais (alvo polimórfico) — **retornar** e **atribuir** não existem no FAI · **Aba/rota:** ações inline em todo card de tarefa/projeto (Acervo, Projetos, Mural, Buscar, perfil de terceiros) · **API:** `/api/interactions/{type}/{id}/reactions|comments|saves|shares|remixes|counters` (RF19) + `/api/interactions/{type}/{id}/returns` e `/api/interactions/{type}/{id}/assignments` (novas)
**Critérios de aceite cobertos:** RF18.CA01 … RF18.CA06 — corpo do card vazio: CA01–CA02 remetem aos RF26.CA01–09 citados no card RF19; CA03–CA06 modelam as duas interações novas ("retornar" e "atribuir", esta última = RF10); todos marcados "(CA a confirmar)"

> **HU18** — COMO usuário visualizando um esquema de tarefa ou projeto POSSO utilizar as funcionalidades de rede social do sistema PARA interagir com usuários conectados ou membros de minha equipe, a fim de aumentar minha produtividade e gerar networking.

O RF18 é a **barra de interações** de todo card de **tarefa** (`TaskItem`) e **projeto** (`ProjectScheme`). As seis interações sociais clássicas (curtir/reagir, comentar, salvar, compartilhar, remixar) são as do antigo RF26, agora detalhadas no card **RF19** (RF26.CA01–09) e **não são repetidas aqui**: este README as referencia e modela as **duas interações novas**, que mudam o fluxo de trabalho e não apenas a reputação:

- **Retornar** — quem recebeu uma tarefa/projeto (por atribuição RF10, por compartilhamento em sessão DECIA ou por "Levar ao meu acervo") **devolve ao autor com motivo** (≥ 20 caracteres). Entidade nova **`TaskReturn` (proposta)**: `id · actorId · targetType (TASK · PROJECT) · targetId · recipientId (autor/dono) · assignmentId (opcional) · reason · status (ABERTA · ACEITA · RECUSADA · RESOLVIDA) · at · resolvedAt · resolutionNote`. Efeito no alvo: projeto → `ProjectStatus.DEVOLVIDO` (já existe, com carimbo DEVOLVIDO + motivo); tarefa → **`TaskState.DEVOLVIDA` (proposta de novo valor; alternativa: `BLOQUEADA` com `blockReason` e `blockedByUserId`)** + `TaskStateLog`.
- **Atribuir** — o **CHEFE** (`Department.headUserId`) atribui tarefa ou projeto a um **membro do departamento** com prazo (ver RF10 / `ABAS_POR_PERFIL.md` §7.b). Entidade nova **`Assignment` (proposta)**: `id · assignerId · assigneeId · targetType (TASK · PROJECT · PROJECT_TASK) · targetId · dueAt · note · status (PENDENTE · ACEITA · RECUSADA · DEVOLVIDA · CONCLUIDA) · refusalReason · at · respondedAt`. Efeito: `TaskItem.responsibleId` / `ProjectTask.responsibleId` = atribuído, `TaskStateLog`, `Notification` e entrada no índice de prioridade da Tarefa do Dia (RF44). O atribuído **aceita ou recusa com motivo**; **DELEGUEI** (RF44) é o caminho inverso.

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF18.CA01** (CA a confirmar) | Dado um card de tarefa ou projeto visível para mim, quando abro a barra de interações, então posso **curtir/reagir, comentar, salvar, compartilhar e remixar** exatamente como nos RF26.CA01–CA07 (citados no card RF19), com contadores em tempo quase real. |
| **RF18.CA02** (CA a confirmar) | Dado qualquer interação, quando é enviada, então respeita a visibilidade do alvo (RF26.CA08: PRIVADA só dono, DEPARTAMENTO só membros, EMPRESA só mesma empresa → `403 ACESSO_NEGADO`) e gera notificação agrupada por hora ao dono (RF26.CA09). |
| **RF18.CA03** (CA a confirmar) | Dado que recebi uma tarefa/projeto (atribuído a mim, compartilhado em sessão ou levado ao meu acervo), quando clico **Retornar** e informo o motivo (≥ 20 caracteres), então nasce `TaskReturn` ABERTA, o alvo muda para DEVOLVIDO (projeto) / DEVOLVIDA (tarefa, proposta) com `TaskStateLog`, a `Assignment` ligada vai a DEVOLVIDA, e o autor recebe `Notification` com o motivo; motivo curto → `422 MOTIVO_OBRIGATORIO`; alvo que não me foi entregue → `403 ACESSO_NEGADO`; retorno já aberto → `409 RETORNO_PENDENTE`. |
| **RF18.CA04** (CA a confirmar) | Dado um `TaskReturn` ABERTA, quando o autor aceita (corrige e reenvia) ou recusa com nota, então o retorno vai a ACEITA/RECUSADA e o alvo volta a DISPONIVEL/EM_USO (tarefa) ou ao status anterior (projeto); o card do autor mostra o carimbo DEVOLVIDO com motivo enquanto ABERTA (design system *Stamp*). |
| **RF18.CA05** (CA a confirmar) | Dado um CHEFE de departamento, quando clica **Atribuir** em uma tarefa/projeto e escolhe um membro do seu departamento e um prazo, então nasce `Assignment` PENDENTE, `responsibleId` passa ao atribuído, `TaskStateLog` registra, o atribuído recebe `Notification` e a atribuição entra no índice de prioridade da Tarefa do Dia dele (RF44); ator não CHEFE ou pessoa fora do departamento → `403 ACESSO_NEGADO`; tarefa ARQUIVADA/CONCLUIDA → `409 ESTADO_INVALIDO`. |
| **RF18.CA06** (CA a confirmar) | Dado uma `Assignment` PENDENTE, quando o atribuído aceita ou recusa com motivo, então ela vai a ACEITA (prazo fixado, tarefa EM_USO se estava DISPONIVEL) ou RECUSADA (`responsibleId` volta ao anterior, chefe notificado); a recusa sem motivo é `422 MOTIVO_OBRIGATORIO`; toda atribuição e retorno ficam em `AuditLog` e aparecem no histórico do card. |

| Interação | Entidade | Quem pode | Efeito no alvo | Notificação |
|---|---|---|---|---|
| Curtir · reagir · comentar · salvar · compartilhar · remixar | `Reaction`, `Comment`, `SavedItem`, `Share`, `Remix` | qualquer usuário com visibilidade (RF26.CA08) | contadores desnormalizados | `REACAO`, `COMENTARIO`, `MENCAO`, `REMIX` (RF26.CA09) |
| **Retornar** | `TaskReturn` (proposta) | quem recebeu o item (atribuído, membro da sessão, quem levou ao acervo) | projeto → DEVOLVIDO · tarefa → DEVOLVIDA (proposta) · `Assignment` → DEVOLVIDA | `ITEM_DEVOLVIDO` (proposta de novo `NotificationType`) |
| **Atribuir** | `Assignment` (proposta) | CHEFE do departamento (RF10) | `responsibleId` = atribuído · DISPONIVEL → EM_USO ao aceitar | `ATRIBUICAO` (proposta de novo `NotificationType`) · prioridade na Tarefa do Dia (RF44) |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_social {
  class Reaction {
    <<entity>>
    +actorId: UUID
    +targetType: TargetType
    +targetId: UUID
    +reactionType: ReactionType
  }
  class Comment {
    <<entity>>
    +authorId: UUID
    +targetType: TargetType
    +targetId: UUID
    +parentCommentId: UUID
    +contentMd: String
  }
  class SavedItem {
    <<entity>>
    +userId: UUID
    +targetType: TargetType
    +targetId: UUID
    +favorite: boolean
  }
  class Share {
    <<entity>>
    +actorId: UUID
    +targetType: TargetType
    +targetId: UUID
    +channel: ShareChannel
  }
  class Remix {
    <<entity>>
    +actorId: UUID
    +sourceType: TargetType
    +sourceId: UUID
    +resultId: UUID
  }
  class TaskReturn {
    <<entity>>
    +id: UUID
    +actorId: UUID
    +targetType: TargetType TASK PROJECT
    +targetId: UUID
    +recipientId: UUID autor ou dono
    +assignmentId: UUID opcional
    +reason: String min 20
    +status: ReturnStatus
    +at: Instant
    +resolvedAt: Instant
    +resolutionNote: String
  }
  class Assignment {
    <<entity>>
    +id: UUID
    +assignerId: UUID chefe
    +assigneeId: UUID membro do departamento
    +targetType: TargetType TASK PROJECT PROJECT_TASK
    +targetId: UUID
    +dueAt: LocalDate
    +note: String
    +status: AssignmentStatus
    +refusalReason: String
    +at: Instant
    +respondedAt: Instant
  }
  class Notification {
    <<entity>>
    +recipientId: UUID
    +actorId: UUID
    +type: NotificationType
    +category: String SOCIAL
    +resourceType: String
    +resourceId: UUID
    +payloadJson: JSON motivo prazo
    +groupKey: String
  }
}

namespace ws_domain_alvos {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +responsibleId: UUID
    +state: TaskState
    +blockedByUserId: UUID
    +blockReason: String
    +visibility: Visibility
    +dueAt: LocalDate
    +likesCount: long
    +commentsCount: long
    +savesCount: long
    +sharesCount: long
    +remixesCount: long
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +status: ProjectStatus
    +visibility: Visibility
    +likesCount: long
    +remixesCount: long
  }
  class ProjectTask {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +taskId: UUID
    +responsibleId: UUID
    +dueAt: LocalDate
  }
  class TaskStateLog {
    <<entity>>
    +taskId: UUID
    +fromState: TaskState
    +toState: TaskState
    +actorId: UUID
    +reason: String
    +correlationId: String
  }
  class Department {
    <<entity>>
    +id: UUID
    +headUserId: UUID chefe atribui
  }
  class DepartmentMembership {
    <<entity>>
    +userId: UUID
    +departmentId: UUID
    +endedAt: Instant
  }
  class DailyTask {
    <<entity>>
    +userId: UUID
    +taskDate: LocalDate
    +priorityIndexJson: JSON inclui atribuída pelo chefe
    +feedback: DailyFeedback
    +delegatedToUserId: UUID
  }
  class AuditLog {
    <<entity>>
    +actorId: UUID
    +action: String ITEM_RETURNED ITEM_ASSIGNED
    +resourceType: String
    +resourceId: UUID
  }
}

namespace ws_domain_enums {
  class TargetType {
    <<enum>>
    TASK
    PROJECT
    PLAN
    KIT
    PROJECT_TASK
    MESSAGE
    RECOGNITION
  }
  class ReturnStatus {
    <<enum>>
    ABERTA
    ACEITA
    RECUSADA
    RESOLVIDA
  }
  class AssignmentStatus {
    <<enum>>
    PENDENTE
    ACEITA
    RECUSADA
    DEVOLVIDA
    CONCLUIDA
  }
  class TaskState {
    <<enum>>
    RASCUNHO
    DISPONIVEL
    EM_USO
    BLOQUEADA
    CONCLUIDA
    ARQUIVADA
    MODELO_PUBLICO
    OFERECIDA
    DEVOLVIDA proposta
  }
  class ProjectStatus {
    <<enum>>
    RASCUNHO
    PUBLICADO
    EM_DECISAO
    APROVADO
    EM_EXECUCAO
    CONCLUIDO
    ARQUIVADO
    DEVOLVIDO
  }
}

namespace ws_application {
  class SocialService {
    <<service>>
    +toggleLike() react() comment() save() share() remix() ver RF19
    +counters(type, id) Counters
    -checkVisibility(actor, target) 403 ACESSO_NEGADO
  }
  class ReturnService {
    <<service>>
    +returnItem(actorId, type, id, reason) TaskReturn
    +accept(ownerId, returnId, note) TaskReturn
    +refuse(ownerId, returnId, note) TaskReturn
    -requireRecipient(actor, target) atribuído, membro da sessão ou quem levou ao acervo
    -applyTargetState(target) DEVOLVIDO ou DEVOLVIDA
  }
  class AssignmentService {
    <<service>>
    +assign(chefeId, type, id, assigneeId, dueAt, note) Assignment
    +accept(assigneeId, assignmentId) Assignment
    +refuse(assigneeId, assignmentId, reason) Assignment
    -requireDeptHead(actor, target) 403
    -requireDeptMember(assignee, departmentId) 403
  }
  class TaskStateMachine {
    <<service>>
    +transition(task, toState, actor, reason) TaskStateLog
  }
  class NotificationService {
    <<service>>
    +notifyOwner(event) groupKey hora
    +notify(recipient, type, payload)
  }
  class DailyTaskService {
    <<service>>
    +onAssigned(assigneeId, taskId, dueAt) prioridade atribuída pelo chefe
  }
  class CounterCachePort {
    <<port>>
    +incr(type, id, counter)
    +get(type, id) Counters
  }
}

namespace ws_web {
  class InteractionController {
    <<controller>>
    +POST_api_interactions_type_id_reactions_comments_saves_shares_remixes()
    +GET_api_interactions_type_id_counters()
    +POST_api_interactions_type_id_returns(reason)
    +POST_api_interactions_returns_returnId_accept(note)
    +POST_api_interactions_returns_returnId_refuse(note)
    +POST_api_interactions_type_id_assignments(assigneeId, dueAt, note)
    +POST_api_interactions_assignments_assignmentId_accept()
    +POST_api_interactions_assignments_assignmentId_refuse(reason)
  }
}

namespace ws_infrastructure {
  class RedisCounterAdapter {
    <<adapter>>
  }
  class CassandraNotificationAdapter {
    <<adapter>>
  }
  class MySqlSocialAdapter {
    <<adapter>>
  }
}

Reaction --> TargetType
Comment --> TargetType
SavedItem --> TargetType
Share --> TargetType
Remix --> TargetType
TaskReturn --> TargetType
TaskReturn --> ReturnStatus
TaskReturn "*" --> "0..1" Assignment : assignmentId
TaskReturn ..> TaskItem : targetId quando TASK → DEVOLVIDA
TaskReturn ..> ProjectScheme : targetId quando PROJECT → DEVOLVIDO
Assignment --> TargetType
Assignment --> AssignmentStatus
Assignment ..> TaskItem : responsibleId = assigneeId
Assignment ..> ProjectTask : responsibleId quando PROJECT_TASK
Assignment "*" --> "1" Department : assigner = headUserId
Assignment ..> DepartmentMembership : assignee membro vigente
Assignment ..> DailyTask : entra no priorityIndexJson
TaskItem --> TaskState
ProjectScheme --> ProjectStatus
TaskItem "1" --> "*" TaskStateLog
Notification ..> TaskReturn : ITEM_DEVOLVIDO proposta
Notification ..> Assignment : ATRIBUICAO proposta

InteractionController ..> SocialService
InteractionController ..> ReturnService
InteractionController ..> AssignmentService
ReturnService ..> TaskStateMachine
ReturnService ..> AssignmentService : marca Assignment DEVOLVIDA
ReturnService ..> NotificationService : AFTER_COMMIT
ReturnService ..> AuditLog
AssignmentService ..> TaskStateMachine
AssignmentService ..> NotificationService : AFTER_COMMIT
AssignmentService ..> DailyTaskService : AFTER_COMMIT
AssignmentService ..> AuditLog
SocialService ..> CounterCachePort
RedisCounterAdapter ..|> CounterCachePort
CassandraNotificationAdapter ..> Notification : notifications_by_user TTL
MySqlSocialAdapter ..> TaskReturn : task_returns proposta
MySqlSocialAdapter ..> Assignment : assignments proposta

note for TaskReturn "tabela task_returns (proposta) · reason min 20 · 1 ABERTA por alvo e ator (409 RETORNO_PENDENTE) · projeto → DEVOLVIDO, tarefa → DEVOLVIDA proposta (CA03, CA04)"
note for Assignment "tabela assignments (proposta) · só Department.headUserId atribui a membro vigente (CA05) · aceitar fixa prazo e põe EM_USO, recusar exige motivo (CA06)"
note for SocialService "seis interações clássicas detalhadas no RF19 (RF26.CA01–09) — aqui só referenciadas (CA01, CA02)"
note for TaskState "DEVOLVIDA é proposta de novo valor; alternativa sem mudar o enum: BLOQUEADA + blockedByUserId + blockReason"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário (ator) · Autor/dono · Chefe · Atribuído"]
    U1["Abre a barra de interações de uma tarefa ou projeto"]
    U2["Escolhe: curtir, reagir, comentar, salvar, compartilhar, remixar"]
    U3["Clica Retornar e escreve o motivo"]
    U4["Autor aceita (corrige e reenvia) ou recusa o retorno com nota"]
    U5["Chefe clica Atribuir, escolhe membro e prazo"]
    U6["Atribuído aceita ou recusa com motivo"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["InteractionBar com contadores otimistas"]
    W2["Modal Retornar: motivo min 20 caracteres"]
    W3["Card do autor com carimbo DEVOLVIDO + motivo"]
    W4["Modal Atribuir: pessoa (membros do departamento), prazo, nota"]
    W5["Card do atribuído com etiqueta Atribuída por chefe · prazo; botões Aceitar / Recusar"]
    W6["Mensagem de erro específica (i18n)"]
  end

  subgraph LA["ws-application"]
    A1["SocialService.checkVisibility → ações RF26.CA01–09 (ver RF19)"]
    A2["ReturnService.returnItem"]
    A3{"ator recebeu o item? atribuído, membro da sessão ou levou ao acervo"}
    A4["403 ACESSO_NEGADO"]
    A5{"reason ≥ 20 caracteres?"}
    A6["422 MOTIVO_OBRIGATORIO"]
    A7{"já existe TaskReturn ABERTA para o alvo?"}
    A8["409 RETORNO_PENDENTE"]
    A9["INSERT TaskReturn ABERTA; projeto → DEVOLVIDO ou tarefa → DEVOLVIDA via TaskStateMachine + TaskStateLog; Assignment ligada → DEVOLVIDA; AuditLog ITEM_RETURNED"]
    A10["ReturnService.accept / refuse → status ACEITA ou RECUSADA; alvo volta a DISPONIVEL/EM_USO ou status anterior"]
    A11["AssignmentService.assign"]
    A12{"ator é Department.headUserId do alvo?"}
    A13{"assignee tem DepartmentMembership vigente no departamento?"}
    A14{"alvo ARQUIVADA, CONCLUIDA ou ARQUIVADO?"}
    A15["409 ESTADO_INVALIDO"]
    A16["INSERT Assignment PENDENTE; responsibleId = assignee; TaskStateLog; AuditLog ITEM_ASSIGNED"]
    A17["AssignmentService.accept → ACEITA; DISPONIVEL → EM_USO; dueAt fixado"]
    A18{"recusa com motivo?"}
    A19["AssignmentService.refuse → RECUSADA; responsibleId volta ao anterior"]
    A20["AFTER_COMMIT: NotificationService ITEM_DEVOLVIDO / ATRIBUICAO (propostas) · DailyTaskService.onAssigned"]
  end

  subgraph LI["IA (AiEngine)"]
    I1["Sem inferência direta — a atribuição entra no índice de prioridade da Tarefa do Dia (RF44, PriorityIndexCalculator determinístico)"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: reactions, comments, saved_items, shares, remixes · Redis counters")]
    P2[("MySQL: task_returns (proposta), tasks, project_schemes, task_state_log, audit_log")]
    P3[("MySQL: assignments (proposta), tasks.responsibleId, project_tasks.responsibleId, task_state_log, audit_log")]
    P4[("Cassandra: notifications_by_user · MySQL: daily_tasks priorityIndexJson")]
  end

  U1 --> W1
  W1 --> U2 --> A1 --> P1
  W1 --> U3 --> W2 --> A2 --> A3
  A3 -->|"não"| A4 --> W6
  A3 -->|"sim"| A5
  A5 -->|"não"| A6 --> W6
  A5 -->|"sim"| A7
  A7 -->|"sim"| A8 --> W6
  A7 -->|"não"| A9 --> P2
  A9 --> A20
  A9 --> W3 --> U4 --> A10 --> P2
  W1 --> U5 --> W4 --> A11 --> A12
  A12 -->|"não"| A4
  A12 -->|"sim"| A13
  A13 -->|"não"| A4
  A13 -->|"sim"| A14
  A14 -->|"sim"| A15 --> W6
  A14 -->|"não"| A16 --> P3
  A16 --> A20
  A16 --> W5 --> U6
  U6 -->|"aceitar"| A17 --> P3
  U6 -->|"recusar"| A18
  A18 -->|"não"| A6
  A18 -->|"sim"| A19 --> P3
  A17 --> A20
  A19 --> A20
  A20 --> P4
  A20 -.-> I1

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  class A4,A6,A8,A15,W6 err
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (atribuído)
  actor CH as Chefe do departamento
  actor O as Autor/dono
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant R as Redis
  participant CS as Cassandra
  participant DE as DomainEvents (AFTER_COMMIT)

  Note over U,R: CA01, CA02 — curtir, reagir, comentar, salvar, compartilhar, remixar: fluxo detalhado no RF19 (RF26.CA01–09)
  U->>NX: curte a tarefa T3
  NX->>C: POST /api/interactions/TASK/T3/reactions {CURTIR}
  C->>S: SocialService.toggleLike → checkVisibility
  S->>DB: INSERT reactions
  S->>R: INCR counters:TASK:T3:likes
  S-->>C: 200 {liked, likesCount}

  CH->>NX: Atribuir T3 a Maria com prazo 30/10 (CA05)
  NX->>C: POST /api/interactions/TASK/T3/assignments {assigneeId maria, dueAt 2026-10-30, note}
  C->>S: AssignmentService.assign(chefeId, TASK, T3, maria, dueAt, note)
  S->>DB: tasks T3 (departmentId, state, responsibleId) + departments.headUserId + department_memberships de maria
  alt ator não é headUserId do departamento ou maria não é membro vigente
    S-->>C: 403 ACESSO_NEGADO
    C-->>NX: 403
  else tarefa ARQUIVADA ou CONCLUIDA
    S-->>C: 409 ESTADO_INVALIDO
    C-->>NX: 409
  else permitido
    S->>DB: INSERT assignments (PENDENTE, assigner chefe, assignee maria, dueAt)
    S->>DB: UPDATE tasks SET responsibleId = maria, INSERT task_state_log (reason atribuída pelo chefe)
    S->>DB: INSERT audit_log ITEM_ASSIGNED
    S->>DE: publish ItemAssigned {TASK, T3, maria}
    S-->>C: 201 Assignment PENDENTE
    C-->>NX: 201
    NX-->>CH: card com etiqueta Atribuída a Maria · aguardando aceite
  end
  DE->>CS: INSERT notifications_by_user (recipient maria, type ATRIBUICAO proposta, payload prazo e nota)
  DE->>DB: DailyTaskService.onAssigned → priorityIndexJson de maria inclui atribuída pelo chefe (RF44)

  U->>NX: Maria aceita a atribuição (CA06)
  NX->>C: POST /api/interactions/assignments/{id}/accept
  C->>S: AssignmentService.accept(maria, id)
  S->>DB: UPDATE assignments SET status ACEITA, respondedAt
  S->>DB: TaskStateMachine DISPONIVEL → EM_USO + task_state_log
  S-->>C: 200 Assignment ACEITA
  C-->>NX: 200
  Note over U,DB: recusar: POST .../assignments/{id}/refuse {reason} → RECUSADA, responsibleId volta ao anterior, chefe notificado. Sem reason → 422 MOTIVO_OBRIGATORIO

  U->>NX: Maria clica Retornar em T3 e escreve o motivo (CA03)
  NX->>C: POST /api/interactions/TASK/T3/returns {reason "Falta a planilha orçamentária atualizada e o parecer jurídico"}
  C->>S: ReturnService.returnItem(maria, TASK, T3, reason)
  S->>DB: tasks T3 + assignments ACEITA de maria + task_returns ABERTA existentes
  alt maria não recebeu T3 (não é atribuída, nem membro da sessão, nem levou ao acervo)
    S-->>C: 403 ACESSO_NEGADO
  else reason com menos de 20 caracteres
    S-->>C: 422 MOTIVO_OBRIGATORIO
  else já existe TaskReturn ABERTA para T3
    S-->>C: 409 RETORNO_PENDENTE
  else permitido
    S->>DB: INSERT task_returns (ABERTA, actor maria, recipient dono de T3, assignmentId, reason)
    S->>DB: TaskStateMachine EM_USO → DEVOLVIDA (proposta) + task_state_log com reason
    S->>DB: UPDATE assignments SET status DEVOLVIDA
    S->>DB: INSERT audit_log ITEM_RETURNED
    S->>DE: publish ItemReturned {TASK, T3, dono}
    S-->>C: 201 TaskReturn ABERTA
    C-->>NX: 201
    NX-->>U: card sai da minha lista, etiqueta Devolvida ao autor
  end
  DE->>CS: INSERT notifications_by_user (recipient dono, type ITEM_DEVOLVIDO proposta, payload motivo)

  O->>NX: dono abre T3, vê carimbo DEVOLVIDO com motivo e aceita o retorno (CA04)
  NX->>C: POST /api/interactions/returns/{returnId}/accept {note "corrigido, reenviando"}
  C->>S: ReturnService.accept(dono, returnId, note)
  S->>DB: UPDATE task_returns SET status ACEITA, resolvedAt, resolutionNote
  S->>DB: TaskStateMachine DEVOLVIDA → DISPONIVEL + task_state_log
  S-->>C: 200 TaskReturn ACEITA
  C-->>NX: 200
  NX-->>O: carimbo removido, tarefa de volta ao Acervo
  Note over O,DB: projeto retornado segue o mesmo fluxo com ProjectStatus → DEVOLVIDO e volta ao status anterior ao aceitar
```

## 4. Máquina de estados

Entidades centrais do RF18 são as duas **propostas**: `Assignment.status` (`AssignmentStatus`) e `TaskReturn.status` (`ReturnStatus`). O terceiro bloco mostra o efeito sobre `TaskItem.state` (`TaskState`), incluindo o valor **DEVOLVIDA (proposta)**; para projetos o efeito equivalente é `ProjectStatus.DEVOLVIDO` (já existente — ver RF22/RF29).

```mermaid
stateDiagram-v2
  state "Assignment (proposta) — CA05, CA06" as AS {
    [*] --> PENDENTE : chefe atribui a membro do departamento, responsibleId = assignee
    PENDENTE --> ACEITA : atribuído aceita, dueAt fixado
    PENDENTE --> RECUSADA : atribuído recusa com motivo, responsibleId volta
    ACEITA --> DEVOLVIDA : atribuído retorna com motivo (TaskReturn ABERTA)
    DEVOLVIDA --> ACEITA : autor aceita o retorno e reenvia
    ACEITA --> CONCLUIDA : tarefa CONCLUIDA ou projeto CONCLUIDO
    RECUSADA --> [*]
    CONCLUIDA --> [*]
  }
  state "TaskReturn (proposta) — CA03, CA04" as TR {
    [*] --> ABERTA : POST returns com reason min 20
    ABERTA --> ACEITA : autor aceita, corrige e reenvia
    ABERTA --> RECUSADA : autor recusa com nota
    ACEITA --> RESOLVIDA : item reenviado e aceito pelo destinatário
    RECUSADA --> [*]
    RESOLVIDA --> [*]
  }
  state "TaskItem.state — efeito das interações novas" as TS {
    DISPONIVEL --> EM_USO : Assignment ACEITA
    EM_USO --> DEVOLVIDA : TaskReturn ABERTA (DEVOLVIDA é proposta de novo valor)
    DISPONIVEL --> DEVOLVIDA : TaskReturn ABERTA sobre tarefa levada ao acervo
    DEVOLVIDA --> DISPONIVEL : retorno ACEITA ou RECUSADA pelo autor
    DEVOLVIDA --> EM_USO : retorno resolvido com reenvio ao atribuído
  }
  note right of AS
    Só Department.headUserId atribui e só a membro vigente (403).
    Alvo ARQUIVADA/CONCLUIDA: 409 ESTADO_INVALIDO.
    1 Assignment PENDENTE ou ACEITA por alvo e atribuído.
  end note
  note right of TR
    1 TaskReturn ABERTA por alvo: 409 RETORNO_PENDENTE.
    Carimbo DEVOLVIDO com motivo no card do autor enquanto ABERTA.
  end note
  note right of TS
    Alternativa sem alterar o enum TaskState:
    BLOQUEADA com blockedByUserId = ator e blockReason = motivo.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["components/ui: InteractionBar — LikeButton, ReactionPicker, CommentThread, SaveButton, ShareSheet, RemixButton (RF19) + ReturnButton com ReturnModal (motivo min 20), AssignButton com AssignModal (membros do departamento, prazo, nota), AcceptRefuseBar, Stamp DEVOLVIDO, AssignmentBadge"]
    F2["Usado em: app/tasks, app/projects, app/mural, app/search, app/u/[username] (RF16), app/desk (RF21), Minha equipe (RF10)"]
  end

  subgraph WEB["ws-web"]
    C1["InteractionController — /api/interactions/{type}/{id}/reactions|comments|saves|shares|remixes|counters (RF19) + /returns + /assignments, /returns/{id}/accept|refuse, /assignments/{id}/accept|refuse"]
  end

  subgraph APP["ws-application"]
    S1["SocialService RF19"]
    S2["ReturnService (proposta)"]
    S3["AssignmentService (proposta) — RF10"]
    S4["TaskStateMachine RF41"]
    S5["NotificationService plataforma"]
    S6["DailyTaskService RF44"]
    P1["CounterCachePort"]
  end

  subgraph DOM["ws-domain"]
    D1["Reaction · Comment · SavedItem · Share · Remix"]
    D2["TaskReturn (proposta) · Assignment (proposta) · enums ReturnStatus, AssignmentStatus, TaskState.DEVOLVIDA (proposta)"]
    D3["TaskItem · ProjectScheme · ProjectTask · TaskStateLog · Department · DepartmentMembership · DailyTask · Notification · AuditLog · DomainEventOutbox"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: reactions, comments, saved_items, shares, remixes, task_returns (proposta), assignments (proposta), tasks, project_schemes, project_tasks, task_state_log, daily_tasks, audit_log")]
    I2[("cache-redis: counters:{type}:{id}:*")]
    I3[("persistence-cassandra: notifications_by_user TTL")]
    I4["platform: outbox AFTER_COMMIT ItemAssigned, ItemReturned, InteractionCreated"]
  end

  F1 --- F2
  F1 -->|"HTTPS/JSON"| C1
  C1 --> S1
  C1 --> S2
  C1 --> S3
  S1 --> P1
  S1 --> D1
  S2 --> S4
  S2 --> S3
  S2 --> D2
  S2 --> D3
  S3 --> S4
  S3 --> D2
  S3 --> D3
  D3 --> I4
  I4 --> S5
  I4 --> S6
  S5 --> I3
  S6 --> I1
  D1 --> I1
  D2 --> I1
  D3 --> I1
  P1 --> I2
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF18.CA01 | Classes `Reaction`, `Comment`, `SavedItem`, `Share`, `Remix`, `SocialService` (nota "seis interações detalhadas no RF19"), `CounterCachePort` · Atividades `U1 → W1 → U2 → A1 → P1` · Sequência msgs 1–6 (curtir T3, INCR counters) · Componentes `InteractionBar` (parte RF19), `cache-redis` · Detalhe completo: RF19 (RF26.CA01–07) |
| RF18.CA02 | `SocialService.checkVisibility` (403), `Notification.groupKey`, `NotificationService.notifyOwner` · Atividade `A1` · Sequência nota inicial · Componentes `NotificationService`, `persistence-cassandra` · Detalhe: RF19 (RF26.CA08–09) |
| RF18.CA03 | `TaskReturn` (proposta; nota reason min 20, 1 ABERTA por alvo), enum `ReturnStatus`, `ReturnService.returnItem/requireRecipient/applyTargetState`, `TaskStateMachine`, `TaskState.DEVOLVIDA` (proposta), `ProjectStatus.DEVOLVIDO`, `AuditLog ITEM_RETURNED`, `Notification ITEM_DEVOLVIDO` (proposta) · Atividades `U3 → W2 → A2 → A3 (403) → A5 (422) → A7 (409) → A9 → P2 → A20` · Sequência msgs 33–47 (`POST …/returns`, `alt` 403 / 422 / 409, `INSERT task_returns`, `EM_USO → DEVOLVIDA`, `UPDATE assignments DEVOLVIDA`, `notifications_by_user ITEM_DEVOLVIDO`) · Transições `[*] → ABERTA` e `EM_USO → DEVOLVIDA` · Componentes `ReturnButton`, `ReturnModal`, `ReturnService (proposta)` |
| RF18.CA04 | `ReturnService.accept/refuse`, `TaskReturn.resolvedAt/resolutionNote` · Atividades `W3 (carimbo DEVOLVIDO) → U4 → A10 → P2` · Sequência msgs 48–55 (`POST …/returns/{id}/accept`, `DEVOLVIDA → DISPONIVEL`, nota do projeto) · Transições `ABERTA → ACEITA / RECUSADA`, `DEVOLVIDA → DISPONIVEL / EM_USO` · Componente `Stamp DEVOLVIDO` |
| RF18.CA05 | `Assignment` (proposta; nota), enum `AssignmentStatus`, `AssignmentService.assign/requireDeptHead/requireDeptMember`, `Department.headUserId`, `DepartmentMembership`, `TaskItem.responsibleId`, `ProjectTask.responsibleId`, `TaskStateLog`, `AuditLog ITEM_ASSIGNED`, `DailyTaskService.onAssigned`, `Notification ATRIBUICAO` (proposta) · Atividades `U5 → W4 → A11 → A12/A13 (403) → A14 (409) → A16 → P3 → A20 → P4` · Sequência msgs 7–22 (`POST …/assignments`, `alt` 403 / 409, `INSERT assignments PENDENTE`, `UPDATE tasks responsibleId`, `notifications_by_user ATRIBUICAO`, `DailyTaskService.onAssigned`) · Transição `[*] → PENDENTE` · Componentes `AssignButton`, `AssignModal`, `AssignmentService (proposta) — RF10`, `DailyTaskService RF44` |
| RF18.CA06 | `AssignmentService.accept/refuse`, `Assignment.refusalReason/respondedAt`, `AuditLog` · Atividades `W5 → U6 → A17 / A18 (422) → A19 → P3 → A20` · Sequência msgs 23–30 (`accept → ACEITA`, `DISPONIVEL → EM_USO`, nota recusar → 422 MOTIVO_OBRIGATORIO) · Transições `PENDENTE → ACEITA / RECUSADA`, `ACEITA → DEVOLVIDA / CONCLUIDA`, `DISPONIVEL → EM_USO` · Componentes `AcceptRefuseBar`, `AssignmentBadge` |
