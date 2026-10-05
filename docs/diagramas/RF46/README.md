# RF46 — Utilizar chats de mensageria para comunicar-se com outros usuários e atribuir ou receber tarefas e projetos
**HU:** HU46 · **Sprint (board Work Station):** Product Backlog (card novo, sem corpo) · **Equivalente FAI:** — (sem equivalente direto; o mais próximo é o compartilhamento de look com mensagem, RF21 do FAI, e o botão "atribuir" é novo) · **Aba/rota:** **Mensagens** (`/messages`, `/messages/[conversationId]`), ícone na barra superior ao lado de Notificações; ação **Atribuir** no card de tarefa/projeto (RF18/RF19 "atribuir"), dentro do chat da sessão DECIA (`/decia/[sessionId]`) e na aba Minha equipe do CHEFE (RF10)
**Critérios de aceite cobertos:** RF46.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 — **todos "(CA a confirmar)"**, derivados do título + HU46 (corpo do card vazio); relacionados: RF10 (chefe atribui tarefa/projeto, sem corpo), RF18/RF19 (interações "retornar" e "atribuir"), RF44.CA DELEGUEI (caminho inverso), RF29.CA04 (rastro quando a atribuição nasce no DECIA)

HU46: *como usuário do Work Station posso enviar mensagens e atribuir tarefas ou projetos para usuários conectados pelo chat do WS, pelo chat do DECIA ou clicando em botões de interação social em um esquema, para melhorar a gestão e o fluxo de trabalho da equipe.* O RF introduz um **chat de mensageria** (conversa direta 1:1 ou em grupo, **fora** da sessão DECIA) e a **atribuição** como transação com aceite: quem recebe pode **aceitar, recusar com motivo ou devolver**. Entidades novas (**propostas**, a incluir na TAXONOMIA): `DirectConversation`, `DirectConversationParticipant`, `DirectMessage` (Cassandra, TTL) e `Assignment`.

| | Chat do WS (RF46, `DirectConversation`) | Chat da sessão DECIA (RF4–RF17, `DeciaSession`) |
|---|---|---|
| Finalidade | comunicação operacional e atribuição | deliberação com tema, resumo e decisão |
| IA | **nenhuma** (sem classificação, sem perguntas, sem resumo) | classifica, detecta divergência, pergunta, resume, propõe decisão |
| DECIA Points | **não pontua** | pontua por qualidade (RF42) |
| Participantes | 1:1 ou grupo livre, mesma empresa | admin, membros, observadores, IA |
| Mensagens | `DirectMessage` em Cassandra `messages_by_conversation` (TTL) | `SessionMessage` em `messages_by_session` (TTL) |
| Rastro | `AuditLog` + nó `DecisionTrace` só quando a atribuição nasce no DECIA | `DecisionTrace` completo |
| Busca / memória institucional | **não indexado** (privado, LGPD) | indexado após encerramento (RF33) |
| Estados | conversa ativa/arquivada, `Assignment.status` | `SessionStatus` |

Critérios de aceite propostos (a confirmar):

- **RF46.CA01** Posso abrir uma conversa direta (1:1) ou em grupo com usuários **da mesma empresa**, enviar texto e anexar tarefa/projeto como cartão (`attachmentsJson` com `targetType` TASK · PROJECT e snapshot); a conversa fica fora da sessão DECIA, sem IA e sem DECIA Points. Usuário de outra empresa: **403 EMPRESA_DIFERENTE**.
- **RF46.CA02** Anexo com `accessClass` RESTRITO ou SIGILOSO só é aceito se **todos** os participantes têm acesso ao item (mesma visibilidade/departamento); caso contrário **403 ACESSO_NEGADO** e o cartão não é enviado.
- **RF46.CA03** A ação **Atribuir** — pelo chat do WS (`CHAT_WS`), pelo chat da sessão DECIA (`CHAT_DECIA`) ou pelo botão no card do esquema (`BOTAO_ESQUEMA`) — cria `Assignment` com `targetType` TASK · PROJECT, destinatário, prazo e nota, em status **PROPOSTA**, gera `DirectMessage` de sistema na conversa e `Notification ATRIBUICAO_PROPOSTA`.
- **RF46.CA04** O destinatário **aceita** (ACEITA → `TaskItem.responsibleId` / `ProjectTask.responsibleId` atualizados, `TaskStateLog`, alimenta a Tarefa do Dia RF44), **recusa com motivo** (RECUSADA, motivo obrigatório, **422 MOTIVO_OBRIGATORIO**) ou, depois de aceitar, **devolve com motivo** (DEVOLVIDA); quem atribuiu é notificado em cada resposta. Só o destinatário responde (**403**), e uma atribuição já respondida não muda (**409 ATRIBUICAO_JA_RESPONDIDA**).
- **RF46.CA05** CHEFE pode atribuir a membros do seu departamento (RF10, `requireDeptHead`); EMPREGADO pode **propor** a colegas da mesma empresa (sempre com aceite); toda atribuição grava `AuditLog`, e quando a origem é `CHAT_DECIA` também um nó `DecisionTraceNode TAREFA/PROJETO` ligado à mensagem (RF29.CA04).
- **RF46.CA06** Mensagens têm TTL configurável por empresa (`Company.pointsPolicyJson` não; nova chave `messagingPolicyJson`, proposta), não entram no índice de busca nem na memória institucional, e o usuário pode arquivar/sair da conversa; a lista de conversas e as não lidas chegam em tempo real (Redis pub/sub → WebSocket/SSE).

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_mensageria_proposta {
  class DirectConversation {
    <<entity>>
    +id: UUID
    +companyId: UUID guard mesma empresa
    +kind: ConversationKind
    +title: String só GRUPO
    +createdBy: UUID
    +lastMessageAt: Instant
    +lastMessagePreview: String
    +messageTtlDays: int
    +archived: boolean
  }
  class DirectConversationParticipant {
    <<entity>>
    +id: UUID
    +conversationId: UUID
    +userId: UUID
    +joinedAt: Instant
    +leftAt: Instant
    +lastReadAt: Instant
    +muted: boolean
  }
  class DirectMessage {
    <<entity>>
    +id: TIMEUUID
    +conversationId: UUID partição
    +authorId: UUID
    +authorKind: String HUMANO SISTEMA
    +bodyMd: String
    +attachmentsJson: JSON targetType TASK PROJECT targetId snapshotJson
    +assignmentId: UUID
    +replyToMessageId: TIMEUUID
    +sentAt: Instant cluster
    +editedAt: Instant
    +deleted: boolean
  }
  class Assignment {
    <<entity>>
    +id: UUID
    +targetType: AssignmentTargetType
    +targetId: UUID TaskItem ou ProjectScheme
    +projectTaskId: UUID quando tarefa dentro de projeto
    +assignerId: UUID
    +assigneeId: UUID
    +companyId: UUID
    +departmentId: UUID
    +dueAt: LocalDate
    +note: String
    +origin: AssignmentOrigin
    +status: AssignmentStatus
    +conversationId: UUID
    +messageId: TIMEUUID
    +sessionId: UUID quando CHAT_DECIA
    +sessionMessageId: TIMEUUID
    +traceNodeId: UUID
    +respondedAt: Instant
    +responseReason: String obrigatório se RECUSADA ou DEVOLVIDA
    +previousResponsibleId: UUID
  }
}

namespace ws_domain_existentes {
  class User {
    <<entity>>
    +id: UUID
    +displayName: String
    +profileType: ProfileType
    +companyId: UUID
    +departmentId: UUID
  }
  class Department {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +headUserId: UUID
  }
  class DepartmentMembership {
    <<entity>>
    +userId: UUID
    +departmentId: UUID
    +roleInDept: DeptRole
    +endedAt: Instant
  }
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +responsibleId: UUID
    +accessClass: AccessClassification
    +visibility: Visibility
    +state: TaskState
    +dueAt: LocalDate
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +visibility: Visibility
    +status: ProjectStatus
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
    +actorId: UUID
    +reason: String ATRIBUICAO_ACEITA
  }
  class DailyTask {
    <<entity>>
    +userId: UUID
    +taskDate: LocalDate
    +taskId: UUID
    +priorityIndexJson: JSON atribuída pelo chefe
    +feedback: DailyFeedback DELEGUEI
    +delegatedToUserId: UUID
  }
  class DeciaSession {
    <<entity>>
    +id: UUID
    +status: SessionStatus
  }
  class SessionMessage {
    <<entity>>
    +id: TIMEUUID
    +sessionId: UUID
    +authorId: UUID
  }
  class DecisionTraceNode {
    <<entity>>
    +id: UUID
    +sessionId: UUID
    +nodeType: TraceNodeType TAREFA PROJETO
    +refId: UUID assignmentId
    +actorId: UUID
  }
  class Notification {
    <<entity>>
    +recipientId: UUID
    +actorId: UUID
    +type: NotificationType
    +category: String SOCIAL
    +resourceType: String ASSIGNMENT CONVERSATION
    +resourceId: UUID
    +groupKey: String
  }
  class AuditLog {
    <<entity>>
    +actorId: UUID
    +action: String ASSIGNMENT_CREATED ASSIGNMENT_RESPONDED
    +resourceType: String
    +resourceId: UUID
  }
  class Company {
    <<entity>>
    +id: UUID
    +messagingPolicyJson: JSON proposta ttlDays allowGroups
  }
}

namespace ws_domain_enums_propostos {
  class ConversationKind {
    <<enum>>
    DIRETA
    GRUPO
  }
  class AssignmentTargetType {
    <<enum>>
    TASK
    PROJECT
  }
  class AssignmentOrigin {
    <<enum>>
    CHAT_WS
    CHAT_DECIA
    BOTAO_ESQUEMA
  }
  class AssignmentStatus {
    <<enum>>
    PROPOSTA
    ACEITA
    RECUSADA
    DEVOLVIDA
  }
  class NotificationType {
    <<enum>>
    MENSAGEM_DIRETA proposta
    ATRIBUICAO_PROPOSTA proposta
    ATRIBUICAO_ACEITA proposta
    ATRIBUICAO_RECUSADA proposta
    ATRIBUICAO_DEVOLVIDA proposta
    MENCAO
    SISTEMA
  }
}

namespace ws_application {
  class MessagingService {
    <<service>>
    +openConversation(actorId, participantIds, kind, title) DirectConversation
    +send(actorId, conversationId, bodyMd, attachments) DirectMessage
    +list(actorId, page) List~DirectConversation~
    +history(actorId, conversationId, before, size) List~DirectMessage~
    +markRead(actorId, conversationId)
    +archive(actorId, conversationId)
    -requireSameCompany(actor, participants) 403 EMPRESA_DIFERENTE
    -requireAttachmentAccess(participants, attachments) 403 ACESSO_NEGADO
  }
  class AssignmentService {
    <<service>>
    +propose(assignerId, target, assigneeId, dueAt, note, origin, context) Assignment
    +accept(assigneeId, assignmentId) Assignment
    +refuse(assigneeId, assignmentId, reason) Assignment
    +giveBack(assigneeId, assignmentId, reason) Assignment
    +listForMe(userId, status) List~Assignment~
    -requireAssignee(actor, assignment) 403 ACESSO_NEGADO
    -requireOpen(assignment) 409 ATRIBUICAO_JA_RESPONDIDA
    -applyResponsible(assignment) TaskItem ou ProjectTask
  }
  class AccessPolicy {
    <<service>>
    +requireSameCompany(a, b)
    +requireDeptHead(user, departmentId)
    +canSee(user, target) boolean
  }
  class NotificationService {
    <<service>>
    +notify(recipientId, type, resource, payload)
  }
  class DailyTaskService {
    <<service>>
    +onAssignmentAccepted(assignment) ajusta índice de prioridade
  }
  class DecisionTraceService {
    <<service>>
    +appendNode(sessionId, nodeType, refId, actorId)
  }
  class RealtimePort {
    <<port>>
    +publish(channel, event)
    +subscribe(userId) Stream
  }
  class MessageStorePort {
    <<port>>
    +append(DirectMessage, ttl)
    +page(conversationId, before, size)
  }
}

namespace ws_web {
  class MessagingController {
    <<controller>>
    +GET_api_conversations()
    +POST_api_conversations(participantIds, kind, title)
    +GET_api_conversations_id_messages(before, size)
    +POST_api_conversations_id_messages(bodyMd, attachments)
    +POST_api_conversations_id_read()
    +GET_api_messages_stream() SSE
  }
  class AssignmentController {
    <<controller>>
    +POST_api_assignments(target, assigneeId, dueAt, note, origin, context)
    +POST_api_assignments_id_accept()
    +POST_api_assignments_id_refuse(reason)
    +POST_api_assignments_id_give_back(reason)
    +GET_api_assignments_me(status)
  }
}

namespace ws_infrastructure {
  class CassandraMessageStore {
    <<adapter>>
    messages_by_conversation TTL
  }
  class RedisPubSubAdapter {
    <<adapter>>
    canal por usuário
  }
  class CassandraNotificationWriter {
    <<adapter>>
    notifications_by_user
  }
}

DirectConversation "1" --> "*" DirectConversationParticipant
DirectConversation "1" --> "*" DirectMessage : Cassandra partição conversationId
DirectConversationParticipant "*" --> "1" User
DirectConversation "*" --> "1" Company : companyId guard
DirectMessage "*" --> "0..1" Assignment : assignmentId mensagem de sistema
DirectMessage ..> TaskItem : attachmentsJson TASK
DirectMessage ..> ProjectScheme : attachmentsJson PROJECT
Assignment "*" --> "1" User : assignerId
Assignment "*" --> "1" User : assigneeId
Assignment "*" --> "0..1" TaskItem : targetId quando TASK
Assignment "*" --> "0..1" ProjectScheme : targetId quando PROJECT
Assignment "*" --> "0..1" ProjectTask : projectTaskId
Assignment "*" --> "0..1" DirectConversation : conversationId
Assignment "*" --> "0..1" DeciaSession : sessionId quando CHAT_DECIA
Assignment "*" --> "0..1" SessionMessage : sessionMessageId
Assignment "*" --> "0..1" DecisionTraceNode : traceNodeId
Assignment ..> TaskStateLog : ACEITA atualiza responsável
Assignment ..> DailyTask : alimenta Tarefa do Dia RF44
Assignment ..> AuditLog : toda criação e resposta
Notification ..> Assignment : resourceType ASSIGNMENT
Notification ..> DirectConversation : resourceType CONVERSATION
Department "1" --> "*" DepartmentMembership
Company ..> DirectConversation : messagingPolicyJson ttlDays
DirectConversation --> ConversationKind
Assignment --> AssignmentTargetType
Assignment --> AssignmentOrigin
Assignment --> AssignmentStatus
Notification --> NotificationType

MessagingController ..> MessagingService
AssignmentController ..> AssignmentService
MessagingService ..> AccessPolicy : requireSameCompany, canSee anexos
MessagingService ..> MessageStorePort
MessagingService ..> RealtimePort
MessagingService ..> NotificationService : MENSAGEM_DIRETA
AssignmentService ..> AccessPolicy : requireDeptHead ou mesma empresa
AssignmentService ..> MessagingService : mensagem de sistema na conversa
AssignmentService ..> NotificationService : ATRIBUICAO_*
AssignmentService ..> DailyTaskService : onAssignmentAccepted
AssignmentService ..> DecisionTraceService : origem CHAT_DECIA
AssignmentService ..> AuditLog
CassandraMessageStore ..|> MessageStorePort
RedisPubSubAdapter ..|> RealtimePort
CassandraNotificationWriter ..> Notification

note for DirectConversation "proposta · tabela direct_conversations (MySQL) · companyId obrigatório, todos os participantes da mesma empresa (CA01) · archived por participante via leftAt (CA06)"
note for DirectMessage "proposta · Cassandra messages_by_conversation (partição conversationId, cluster sentAt, TTL = Company.messagingPolicyJson.ttlDays) + índice MySQL direct_messages_idx · não vai a OpenSearch nem a IA (CA06)"
note for Assignment "proposta · tabela assignments · status PROPOSTA → ACEITA | RECUSADA, ACEITA → DEVOLVIDA (CA04) · origin CHAT_WS, CHAT_DECIA, BOTAO_ESQUEMA (CA03) · responseReason obrigatório ao recusar ou devolver"
note for AssignmentService "CHEFE atribui a membros do departamento (RF10) · EMPREGADO propõe a colegas da mesma empresa · ninguém vira responsável sem aceitar (CA05)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["Abre Mensagens pelo ícone da barra superior ou /messages"]
    U2["Inicia conversa 1:1 ou grupo e escreve mensagem, opcionalmente anexa tarefa/projeto"]
    U3["Clica Atribuir: no chat do WS, no chat da sessão DECIA ou no botão do card do esquema"]
    U4["Escolhe destinatário, tarefa ou projeto, prazo e nota"]
    U5["Destinatário abre a atribuição recebida"]
    U6{"Aceitar, recusar ou devolver?"}
    U7["Informa o motivo"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Lista de conversas com não lidas em tempo real (SSE)"]
    W2["Cartão da tarefa/projeto dentro da mensagem"]
    W3["Mensagem de sistema: X atribuiu a tarefa T a Y, prazo D, com botões Aceitar / Recusar"]
    W4["Badge no card do esquema: Atribuída a Y, aguardando aceite"]
    W5["Card atualizado: responsável Y · Tarefa do Dia de Y recebe a atribuição"]
    W6["Quem atribuiu vê o motivo da recusa ou devolução"]
  end

  subgraph LA["ws-application"]
    A1["MessagingService.openConversation → requireSameCompany"]
    A2{"Todos os participantes da mesma empresa?"}
    A3["403 EMPRESA_DIFERENTE"]
    A4["MessagingService.send → requireAttachmentAccess"]
    A5{"Anexo RESTRITO/SIGILOSO acessível a todos os participantes?"}
    A6["403 ACESSO_NEGADO"]
    A7["MessageStorePort.append TTL · RealtimePort.publish · Notification MENSAGEM_DIRETA agrupada"]
    A8["AssignmentService.propose"]
    A9{"Ator é CHEFE do departamento do destinatário ou colega da mesma empresa com acesso ao item?"}
    A10["403 ACESSO_NEGADO"]
    A11["Assignment PROPOSTA com origin CHAT_WS / CHAT_DECIA / BOTAO_ESQUEMA · AuditLog ASSIGNMENT_CREATED"]
    A12{"Origem CHAT_DECIA?"}
    A13["DecisionTraceService.appendNode TAREFA/PROJETO ligado à SessionMessage (RF29.CA04)"]
    A14["Mensagem de sistema na conversa + Notification ATRIBUICAO_PROPOSTA"]
    A15["AssignmentService.accept / refuse / giveBack → requireAssignee, requireOpen"]
    A16{"Ator é o destinatário e status permite?"}
    A17["403 ACESSO_NEGADO ou 409 ATRIBUICAO_JA_RESPONDIDA"]
    A18{"Motivo informado ao recusar/devolver?"}
    A19["422 MOTIVO_OBRIGATORIO"]
    A20["ACEITA: applyResponsible → TaskItem.responsibleId ou ProjectTask.responsibleId · TaskStateLog · DailyTaskService.onAssignmentAccepted"]
    A21["RECUSADA ou DEVOLVIDA: responsableReason gravado, responsável anterior restaurado se DEVOLVIDA"]
    A22["AuditLog ASSIGNMENT_RESPONDED · Notification ATRIBUICAO_* ao assigner · mensagem de sistema"]
  end

  subgraph LI["IA (AiEngine)"]
    I1["Não usada: o chat do WS não classifica, não resume e não pontua"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: direct_conversations, direct_conversation_participants")]
    P2[("Cassandra: messages_by_conversation TTL · MySQL: direct_messages_idx")]
    P3[("Redis pub/sub: canal por usuário")]
    P4[("MySQL: assignments, audit_log, tasks.responsibleId, project_tasks.responsibleId, task_state_log, daily_tasks")]
    P5[("Cassandra: notifications_by_user · trace_by_entity")]
  end

  U1 --> W1 --> U2 --> A1 --> A2
  A2 -->|"não"| A3
  A2 -->|"sim"| P1 --> A4 --> A5
  A5 -->|"não"| A6
  A5 -->|"sim"| A7 --> P2
  A7 --> P3
  A7 --> P5
  A7 --> W2
  U3 --> U4 --> A8 --> A9
  A9 -->|"não"| A10
  A9 -->|"sim"| A11 --> P4
  A11 --> A12
  A12 -->|"sim"| A13 --> P5
  A12 -->|"não"| A14
  A13 --> A14
  A14 --> P2
  A14 --> P5
  A14 --> W3
  A14 --> W4
  W3 --> U5 --> U6
  U6 -->|"aceitar"| A15
  U6 -->|"recusar / devolver"| U7 --> A15
  A15 --> A16
  A16 -->|"não"| A17
  A16 -->|"sim, aceitar"| A20 --> P4
  A16 -->|"sim, recusar/devolver"| A18
  A18 -->|"não"| A19
  A18 -->|"sim"| A21 --> P4
  A20 --> A22
  A21 --> A22
  A22 --> P5
  A22 --> P2
  A20 --> W5
  A21 --> W6
  A7 -.-> I1

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  class A3,A6,A10,A17,A19 err
  class W4,W6,I1 warn
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor A as Usuário (quem atribui)
  actor B as Destinatário
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant R as Redis
  participant DE as DomainEvents (AFTER_COMMIT)

  Note over A,DE: CA01 e CA02 — conversa direta com cartão de tarefa
  A->>NX: abre Mensagens, inicia conversa com B e anexa a tarefa T
  NX->>C: POST /api/conversations {participantIds [B], kind DIRETA}
  C->>S: MessagingService.openConversation(A, [B], DIRETA)
  S->>DB: SELECT users A, B (companyId)
  alt B é de outra empresa (CA01)
    S-->>C: 403 EMPRESA_DIFERENTE
    C-->>NX: 403
    NX-->>A: só é possível conversar com pessoas da sua empresa
  else mesma empresa
    S->>DB: INSERT direct_conversations (companyId, kind DIRETA, messageTtlDays da política) · INSERT direct_conversation_participants x2
    S-->>C: 201 DirectConversation
    C-->>NX: 201
  end
  NX->>C: POST /api/conversations/{id}/messages {bodyMd, attachments [{TASK, T}]}
  C->>S: MessagingService.send(A, id, bodyMd, attachments)
  S->>DB: SELECT tasks T (accessClass, visibility, departmentId)
  alt T é RESTRITO/SIGILOSO e B não tem acesso (CA02)
    S-->>C: 403 ACESSO_NEGADO {attachment T}
    C-->>NX: 403
    NX-->>A: o cartão não pode ser enviado a quem não tem acesso ao item
  else acessível a todos
    S->>CS: INSERT messages_by_conversation (id TIMEUUID, authorId A, bodyMd, attachmentsJson com snapshot de T, TTL)
    S->>DB: INSERT direct_messages_idx · UPDATE direct_conversations SET lastMessageAt, lastMessagePreview
    S->>R: PUBLISH user:{B} {conversationId, messageId}
    S->>DE: publish DirectMessageSent
    S-->>C: 201 DirectMessage
    C-->>NX: 201
  end
  DE->>CS: INSERT notifications_by_user (B, MENSAGEM_DIRETA, groupKey hora)
  R-->>NX: SSE /api/messages/stream para B, não lidas + 1
  Note over S,CS: nenhuma chamada a AiEngine, OpenSearch ou DeciaPointsService — chat do WS não classifica, não indexa e não pontua (CA01, CA06)

  Note over A,DE: CA03 e CA05 — atribuir a tarefa a partir do chat (origem CHAT_WS)
  A->>NX: clica Atribuir no cartão de T, escolhe B, prazo e nota
  NX->>C: POST /api/assignments {targetType TASK, targetId T, assigneeId B, dueAt, note, origin CHAT_WS, context {conversationId}}
  C->>S: AssignmentService.propose(A, TASK T, B, dueAt, note, CHAT_WS, ctx)
  S->>DB: SELECT users A, B · department_memberships · tasks T
  alt A não é CHEFE do departamento de B nem colega com acesso a T (CA05)
    S-->>C: 403 ACESSO_NEGADO
    C-->>NX: 403
  else permitido
    S->>DB: INSERT assignments (status PROPOSTA, origin CHAT_WS, conversationId, previousResponsibleId) · INSERT audit_log ASSIGNMENT_CREATED
    S->>CS: INSERT messages_by_conversation (authorKind SISTEMA, assignmentId, A atribuiu T a B, prazo)
    S->>R: PUBLISH user:{B}
    S->>DE: publish AssignmentProposed
    S-->>C: 201 Assignment PROPOSTA
    C-->>NX: 201
    NX-->>A: badge Atribuída a B, aguardando aceite
  end
  DE->>CS: INSERT notifications_by_user (B, ATRIBUICAO_PROPOSTA, resourceType ASSIGNMENT)
  Note over S,DB: origem CHAT_DECIA — o mesmo POST com context {sessionId, sessionMessageId} também grava DecisionTraceNode TAREFA ligado à SessionMessage (RF29.CA04) · origem BOTAO_ESQUEMA — sem conversa prévia, o serviço abre a conversa DIRETA A–B para a mensagem de sistema

  Note over A,DE: CA04 — destinatário aceita, recusa ou devolve
  B->>NX: abre a atribuição e clica Recusar sem motivo
  NX->>C: POST /api/assignments/{id}/refuse {reason vazio}
  C->>S: AssignmentService.refuse(B, id, vazio)
  S->>DB: SELECT assignments id
  alt ator não é o destinatário
    S-->>C: 403 ACESSO_NEGADO
  else já respondida
    S-->>C: 409 ATRIBUICAO_JA_RESPONDIDA
  else motivo vazio
    S-->>C: 422 MOTIVO_OBRIGATORIO
    C-->>NX: 422
    NX-->>B: informe o motivo da recusa
  end
  B->>NX: clica Aceitar
  NX->>C: POST /api/assignments/{id}/accept
  C->>S: AssignmentService.accept(B, id)
  S->>DB: UPDATE assignments SET status ACEITA, respondedAt
  S->>DB: UPDATE tasks SET responsibleId = B WHERE id = T · INSERT task_state_log (reason ATRIBUICAO_ACEITA) · INSERT audit_log ASSIGNMENT_RESPONDED
  S->>S: DailyTaskService.onAssignmentAccepted → priorityIndexJson de B considera atribuída pelo chefe (RF44)
  S->>CS: INSERT messages_by_conversation (SISTEMA, B aceitou T)
  S->>R: PUBLISH user:{A}
  S->>DE: publish AssignmentAccepted
  S-->>C: 200 Assignment ACEITA
  C-->>NX: 200
  NX-->>B: T aparece como sua, com prazo, no Acervo e na Tarefa do Dia
  DE->>CS: INSERT notifications_by_user (A, ATRIBUICAO_ACEITA)
  B->>NX: dias depois, Devolver com motivo
  NX->>C: POST /api/assignments/{id}/give-back {reason}
  C->>S: AssignmentService.giveBack(B, id, reason)
  S->>DB: UPDATE assignments SET status DEVOLVIDA, responseReason, respondedAt · UPDATE tasks SET responsibleId = previousResponsibleId · INSERT task_state_log · INSERT audit_log
  S->>CS: INSERT messages_by_conversation (SISTEMA, B devolveu T, motivo)
  S->>DE: publish AssignmentGivenBack
  S-->>NX: 200 Assignment DEVOLVIDA
  DE->>CS: INSERT notifications_by_user (A, ATRIBUICAO_DEVOLVIDA, motivo)
```

## 4. Máquina de estados

Entidade central: **`Assignment.status`** (enum proposto `AssignmentStatus` PROPOSTA · ACEITA · RECUSADA · DEVOLVIDA). A `DirectConversation` não tem enum de status (ativa/arquivada por participante via `leftAt` e `archived`), mostrada como composto auxiliar.

```mermaid
stateDiagram-v2
  direction LR
  state "Assignment.status" as AS {
    [*] --> PROPOSTA : POST assignments pelo chat do WS, chat DECIA ou botão do esquema (CA03)
    PROPOSTA --> ACEITA : destinatário aceita, responsibleId atualizado, TaskStateLog, Tarefa do Dia (CA04)
    PROPOSTA --> RECUSADA : destinatário recusa com motivo obrigatório (CA04)
    ACEITA --> DEVOLVIDA : destinatário devolve com motivo, responsável anterior restaurado (CA04)
    ACEITA --> ACEITA : trabalho segue, DELEGUEI da Tarefa do Dia gera nova Assignment (RF44)
    RECUSADA --> [*]
    DEVOLVIDA --> [*]
    ACEITA --> [*] : tarefa CONCLUIDA ou projeto CONCLUIDO
  }
  state "DirectConversation (sem enum, derivado)" as DC {
    [*] --> Ativa : openConversation, mesma empresa (CA01)
    Ativa --> Ativa : mensagens com TTL, cartões TASK/PROJECT, mensagens de sistema das atribuições
    Ativa --> Arquivada : participante arquiva ou sai, leftAt (CA06)
    Arquivada --> Ativa : nova mensagem recebida reabre
    Arquivada --> [*] : TTL apaga as mensagens, conversa vazia
  }
  note right of AS
    Só o destinatário responde 403 ACESSO_NEGADO.
    Resposta repetida 409 ATRIBUICAO_JA_RESPONDIDA.
    Recusar ou devolver sem motivo 422 MOTIVO_OBRIGATORIO.
    Toda transição grava AuditLog e notifica quem atribuiu (CA05).
  end note
  note right of DC
    Sem IA, sem DECIA Points, sem índice de busca.
    Participantes sempre da mesma empresa 403 EMPRESA_DIFERENTE.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/messages, app/messages/[conversationId] — lista, conversa, composer com anexo de tarefa/projeto"]
    F2["app/decia/[sessionId] — ação Atribuir no menu da mensagem"]
    F3["app/projects/[id] · app/acervo — botão Atribuir no card do esquema (RF18/RF19)"]
    F4["app/departments/[slug]/team — Minha equipe do CHEFE, atribuir e redistribuir (RF10)"]
    F5["components/ui: MessagesIcon com não lidas, ConversationList, MessageBubble, TaskCardAttachment, AssignmentSystemMessage com Aceitar/Recusar, AssignmentBadge, ReasonDialog"]
  end

  subgraph WEB["ws-web"]
    C1["MessagingController — /api/conversations, /{id}/messages, /{id}/read, /api/messages/stream SSE"]
    C2["AssignmentController — /api/assignments, /{id}/accept, /{id}/refuse, /{id}/give-back, /me"]
  end

  subgraph APP["ws-application"]
    S1["MessagingService (proposta)"]
    S2["AssignmentService (proposta)"]
    S3["AccessPolicy — requireSameCompany, requireDeptHead, canSee"]
    S4["NotificationService RF26/RF27"]
    S5["DailyTaskService RF44"]
    S6["DecisionTraceService RF29"]
    P1["MessageStorePort (proposta)"]
    P2["RealtimePort (proposta)"]
  end

  subgraph DOM["ws-domain"]
    D1["DirectConversation · DirectConversationParticipant · DirectMessage · Assignment (propostas)"]
    D2["User · Department · DepartmentMembership · Company.messagingPolicyJson"]
    D3["TaskItem · ProjectScheme · ProjectTask · TaskStateLog · DailyTask"]
    D4["DeciaSession · SessionMessage · DecisionTraceNode · Notification · AuditLog"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: direct_conversations, direct_conversation_participants, direct_messages_idx, assignments, audit_log, tasks, project_tasks, task_state_log, daily_tasks")]
    I2[("persistence-cassandra: messages_by_conversation TTL, notifications_by_user, trace_by_entity")]
    I3[("cache-redis: pub/sub canal por usuário, contagem de não lidas")]
    I4["platform: DomainEventOutbox AFTER_COMMIT · AuditLog · FeatureFlag messaging.enabled (proposta)"]
    I5["search-opensearch e ai-providers: NÃO usados — mensagens diretas não são indexadas nem enviadas à IA"]
  end

  F1 --- F5
  F2 --- F5
  F3 --- F5
  F4 --- F5
  F1 -->|"HTTPS/JSON + SSE"| C1
  F1 -->|"HTTPS/JSON"| C2
  F2 -->|"HTTPS/JSON"| C2
  F3 -->|"HTTPS/JSON"| C2
  F4 -->|"HTTPS/JSON"| C2
  C1 --> S1
  C2 --> S2
  S1 --> S3
  S1 --> S4
  S1 --> P1
  S1 --> P2
  S2 --> S1
  S2 --> S3
  S2 --> S4
  S2 --> S5
  S2 --> S6
  S1 --> D1
  S2 --> D1
  S2 --> D3
  S3 --> D2
  S6 --> D4
  S4 --> D4
  D1 --> I1
  D2 --> I1
  D3 --> I1
  D4 --> I1
  P1 --> I2
  S4 --> I2
  S6 --> I2
  P2 --> I3
  D1 --> I4
  I5 -.-x S1

  classDef port stroke-dasharray: 4 3
  classDef off fill:#f3f4f6,stroke:#9ca3af,color:#4b5563
  class P1,P2 port
  class I5 off
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF46.CA01 (a confirmar — conversa 1:1/grupo na mesma empresa, sem IA e sem pontos) | `DirectConversation` (companyId, kind), `DirectConversationParticipant`, `DirectMessage.attachmentsJson`, enum `ConversationKind`, `MessagingService.openConversation/send/requireSameCompany`, `MessageStorePort`, `CassandraMessageStore` · Atividades `U1 → W1 → U2 → A1 → A2 → A3 403 EMPRESA_DIFERENTE / P1 → A4 → A7 → P2`, `I1` (IA não usada) · Sequência bloco "CA01 e CA02" (`POST /api/conversations`, `alt B é de outra empresa → 403 EMPRESA_DIFERENTE`, `INSERT messages_by_conversation … TTL`, nota "nenhuma chamada a AiEngine …") · Estado *DC* `[*] → Ativa` e nota · Componentes `app/messages`, `ConversationList`, `MessageBubble`, `persistence-cassandra messages_by_conversation`, `I5` (OpenSearch/IA não usados) |
| RF46.CA02 (a confirmar — anexo RESTRITO/SIGILOSO só se todos têm acesso) | `TaskItem.accessClass/visibility`, `MessagingService.requireAttachmentAccess`, `AccessPolicy.canSee` · Atividades `A4 → A5 → A6 403 ACESSO_NEGADO / A7 → W2` · Sequência `alt T é RESTRITO/SIGILOSO e B não tem acesso → 403 ACESSO_NEGADO {attachment T}` · Componente `TaskCardAttachment` |
| RF46.CA03 (a confirmar — Atribuir pelo chat WS, chat DECIA ou botão do esquema) | `Assignment` (targetType, assigneeId, dueAt, note, origin, status PROPOSTA, conversationId, sessionId, sessionMessageId), enums `AssignmentTargetType`, `AssignmentOrigin`, `AssignmentService.propose`, `DirectMessage.assignmentId` (mensagem de sistema), `Notification ATRIBUICAO_PROPOSTA` · Atividades `U3 → U4 → A8 → A11 → P4 → A14 → W3/W4` · Sequência bloco "CA03 e CA05" (`POST /api/assignments {… origin CHAT_WS …}`, `INSERT assignments (status PROPOSTA …)`, mensagem SISTEMA, notificação) e nota sobre `CHAT_DECIA`/`BOTAO_ESQUEMA` · Transição `[*] → PROPOSTA` · Componentes `F2` (Atribuir na mensagem DECIA), `F3` (botão no card), `AssignmentSystemMessage`, `AssignmentBadge`, `AssignmentController` |
| RF46.CA04 (a confirmar — aceitar, recusar com motivo, devolver) | `Assignment.status/respondedAt/responseReason/previousResponsibleId`, enum `AssignmentStatus`, `AssignmentService.accept/refuse/giveBack/requireAssignee/requireOpen/applyResponsible`, `TaskItem.responsibleId`, `ProjectTask.responsibleId`, `TaskStateLog`, `DailyTask`, `DailyTaskService.onAssignmentAccepted` · Atividades `U5 → U6 → A15 → A16 → A17 (403/409)`, `A18 → A19 422 MOTIVO_OBRIGATORIO`, `A20 → P4 → W5`, `A21 → W6` · Sequência bloco "CA04" (`alt … 403 / 409 / 422`, `UPDATE tasks SET responsibleId = B`, `DailyTaskService.onAssignmentAccepted`, `give-back` restaura `previousResponsibleId`) · Transições `PROPOSTA → ACEITA / RECUSADA`, `ACEITA → DEVOLVIDA` e nota · Componentes `ReasonDialog`, `DailyTaskService RF44` |
| RF46.CA05 (a confirmar — permissões CHEFE/EMPREGADO, AuditLog, rastro no DECIA) | `AccessPolicy.requireDeptHead/requireSameCompany`, `DepartmentMembership`, `AuditLog` (ASSIGNMENT_CREATED, ASSIGNMENT_RESPONDED), `DecisionTraceNode` (TAREFA/PROJETO, refId assignmentId), `DecisionTraceService.appendNode`, `Assignment.traceNodeId` · Atividades `A9 → A10 403`, `A11` (AuditLog), `A12 → A13` (rastro RF29.CA04), `A22` · Sequência `alt A não é CHEFE … nem colega com acesso → 403`, `INSERT audit_log ASSIGNMENT_CREATED/RESPONDED`, nota "origem CHAT_DECIA … DecisionTraceNode TAREFA" · Nota do estado *AS* · Componentes `F4` (Minha equipe RF10), `AccessPolicy`, `DecisionTraceService RF29`, `platform AuditLog` |
| RF46.CA06 (a confirmar — TTL por empresa, fora de busca/IA, arquivar, tempo real) | `DirectConversation.messageTtlDays/archived`, `DirectConversationParticipant.leftAt/muted/lastReadAt`, `Company.messagingPolicyJson` (proposta), `RealtimePort`, `RedisPubSubAdapter`, `MessagingService.archive/markRead` · Atividades `A7 → P3` (pub/sub), `W1` (não lidas em tempo real) · Sequência `PUBLISH user:{B}`, `SSE /api/messages/stream`, nota "não indexa" · Estado *DC* `Ativa → Arquivada`, `Arquivada → [*] : TTL apaga` · Componentes `MessagesIcon com não lidas`, `cache-redis pub/sub`, `I5` (search-opensearch e ai-providers não usados), `FeatureFlag messaging.enabled` |

> Dúvidas para `docs/DECISOES.md` (card novo, sem corpo — tudo a confirmar):
> 1. **Entidades propostas para a TAXONOMIA** (novo contexto "13. Mensageria & Atribuição" ou dentro de "8. Social"): `DirectConversation` (`direct_conversations`), `DirectConversationParticipant` (`direct_conversation_participants`), `DirectMessage` (Cassandra `messages_by_conversation`, partição `conversationId`, cluster `sentAt`, TTL + índice MySQL `direct_messages_idx`), `Assignment` (`assignments`); enums `ConversationKind` (DIRETA · GRUPO), `AssignmentTargetType` (TASK · PROJECT), `AssignmentOrigin` (CHAT_WS · CHAT_DECIA · BOTAO_ESQUEMA), `AssignmentStatus` (PROPOSTA · ACEITA · RECUSADA · DEVOLVIDA); novos valores de `NotificationType` (MENSAGEM_DIRETA, ATRIBUICAO_PROPOSTA, ATRIBUICAO_ACEITA, ATRIBUICAO_RECUSADA, ATRIBUICAO_DEVOLVIDA); `Company.messagingPolicyJson` (ttlDays, allowGroups); `TaskStateLog.reason ATRIBUICAO_ACEITA`; serviços `MessagingService`, `AssignmentService`; portas `MessageStorePort`, `RealtimePort`; `FeatureFlag messaging.enabled`.
> 2. Relação com **RF10** (chefe atribui) e com as interações "retornar"/"atribuir" dos cards RF18/RF19: `Assignment` é a mesma entidade para os três; "retornar" = `giveBack` (DEVOLVIDA)? Confirmar (ABAS_POR_PERFIL §9 P-02 e P-14).
> 3. O chat do WS é **separado** do DECIA (sem IA, sem pontos) — modelado assim para não criar dois chats deliberativos concorrentes (ABAS_POR_PERFIL §9 pergunta 10). Alternativa seria uma `DeciaSession` "leve", descartada aqui.
> 4. Grupos: permitir conversas em grupo já na primeira versão ou só 1:1? `ConversationKind.GRUPO` está modelado, mas pode ficar atrás de `messagingPolicyJson.allowGroups`.
> 5. Atribuição de **projeto** inteiro: altera `ProjectScheme.ownerId` ou só cria responsável? Modelei como responsável (sem trocar dono); confirmar. Para tarefa dentro de projeto, atualiza `ProjectTask.responsibleId` (campo `projectTaskId` na `Assignment`).
> 6. Posição no menu (ícone na barra superior + item Mensagens em Descobrir) e códigos HTTP (`403 EMPRESA_DIFERENTE`, `409 ATRIBUICAO_JA_RESPONDIDA`, `422 MOTIVO_OBRIGATORIO`) são propostas.


Tela/aba: `/messages` (esqueleto em `app/(shell)/messages/page.tsx`) · `/messages/[conversationId]` (esqueleto em `app/(shell)/messages/[conversationId]/page.tsx`) · `/decia/[sessionId]` (esqueleto em `app/(shell)/decia/[sessionId]/page.tsx`) · `/departments/[slug]/team` (esqueleto em `app/(shell)/departments/[slug]/team/page.tsx`)
