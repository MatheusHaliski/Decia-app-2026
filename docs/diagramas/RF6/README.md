# RF6 — Enviar mensagens dentro do chat, enquanto a sessão estiver ativa.
**HU:** HU6 · **Sprint (board Work Station):** 1 · **Equivalente FAI:** RF10 Copilot — "Mensagem do Copilot" → **Mensagem do DECIA** (toda mensagem pode carregar tarefa/artefato anexado e é classificada, RF7) · **Aba/rota:** DECIA (`/decia/[sessionId]`, caixa de mensagem + anexos do acervo) — rota sugerida
**Critérios de aceite cobertos:** RF6.CA01 … RF6.CA06 (RF1–RF18 não têm CAs no board: derivados da HU6 e marcados "CA a confirmar")

> **HU6** — COMO usuário participante do grupo da conversa POSSO enviar mensagens no chat enquanto a sessão estiver ativa PARA contribuir com argumentos, opiniões e informações sobre o tema da sessão.

## Critérios de aceite derivados da HU6 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF6.CA01** (CA a confirmar) | Dado um `SessionParticipant` ativo (`leftAt` nulo, `role` MEMBRO ou ADMIN) numa sessão `ATIVA` (ou `REABERTA`), quando envia `bodyMd` (1–4000 caracteres, Markdown restrito), opcionalmente `replyToMessageId` e até **5 anexos do acervo** (`MessageAttachment` TASK · PROJECT · PLAN, RF29.CA03), então a `SessionMessage` é criada com `id` TIMEUUID, `authorKind HUMANO`, `sentAt` e `correlationId`, e a API responde `201` com a mensagem renderizada. |
| **RF6.CA02** (CA a confirmar) | Dado a sessão fora de `ATIVA`/`REABERTA` → `409 SESSAO_NAO_ATIVA`; usuário que não é participante ativo ou é `OBSERVADOR` → `403 ACESSO_NEGADO`; corpo vazio, acima do limite, mais de 5 anexos ou anexo sem permissão de leitura → `422 VALIDACAO`. |
| **RF6.CA03** (CA a confirmar) | Dado a mensagem aceita, então ela é gravada no **Cassandra** `messages_by_session` (partição `sessionId`, cluster `sentAt` desc, TTL = `DeciaSession.messageTtlDays`) e indexada no **MySQL** `session_messages_idx` (id, sessionId, authorId, sentAt, classificationId) na mesma unidade de trabalho que incrementa `messageCount` e grava o evento `MessageSent` no outbox; a escrita é idempotente pelo TIMEUUID (reenvio não duplica). |
| **RF6.CA04** (CA a confirmar) | Dado participantes conectados, então a mensagem chega em **tempo real** (SSE via Redis pub/sub) a todos os participantes ativos da sessão; ao abrir a sessão, as mensagens são paginadas por cursor (`?before=<sentAt>&limit=50`) a partir do Cassandra e `SessionParticipant.lastReadAt` é atualizado. |
| **RF6.CA05** (CA a confirmar) | Dado a mensagem aceita, então o `similarityHash` é calculado e, se for > 90 % similar a uma mensagem recente do mesmo autor na sessão, ela é marcada como repetida (não pontua, RF42); anexos com `accessClass RESTRITO`/`SIGILOSO` marcam a mensagem para classificação **só no motor local** (RF43.CA02); o autor pode editar (`editedAt`) ou apagar (`deleted` = true, corpo oculto) a própria mensagem em até 5 min, mantendo o registro no rastro (RF29.CA07). |
| **RF6.CA06** (CA a confirmar) | Dado o commit, então `MessageSent` (AFTER_COMMIT) dispara a classificação assíncrona da IA (RF7), a notificação dos participantes desconectados (agrupada por hora, `Notification.groupKey`) e `AuditLog MESSAGE_SENT` (sem o corpo); tudo i18n e com `correlationId` fim a fim. |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  namespace wai_domain {
    class DeciaSession {
      <<entity>>
      +id: UUID
      +status: SessionStatus
      +messageTtlDays: int
      +messageCount: int
      +aiMode: AiMode
    }
    class SessionParticipant {
      <<entity>>
      +sessionId: UUID
      +userId: UUID
      +role: ParticipantRole
      +leftAt: Instant
      +lastReadAt: Instant
    }
    class SessionMessage {
      <<entity>>
      +id: TIMEUUID
      +sessionId: UUID
      +authorId: UUID
      +authorKind: String
      +bodyMd: String
      +replyToMessageId: TIMEUUID
      +sentAt: Instant
      +editedAt: Instant
      +deleted: boolean
      +attachmentsJson: String
      +classificationId: UUID
      +similarityHash: String
      +correlationId: String
    }
    class MessageAttachment {
      <<entity>>
      +id: UUID
      +messageId: TIMEUUID
      +targetType: String
      +targetId: UUID
      +snapshotJson: String
      +usedInDecision: boolean
    }
    class TaskItem {
      <<entity>>
      +id: UUID
      +title: String
      +accessClass: AccessClassification
      +visibility: Visibility
    }
    class SessionStatus {
      <<enum>>
      PROPOSTA
      ATIVA
      EM_RESUMO
      EM_DECISAO
      EM_REVISAO
      REABERTA
      ENCERRADA
      ARQUIVADA
    }
    class ParticipantRole {
      <<enum>>
      ADMIN
      MEMBRO
      OBSERVADOR
      IA
    }
    class AccessClassification {
      <<enum>>
      PUBLICO
      INTERNO
      RESTRITO
      SIGILOSO
    }
  }

  namespace wai_application {
    class MessageService {
      <<service>>
      +send(current CurrentUser, sessionId, cmd SendMessageCommand) MessageView
      +edit(current CurrentUser, sessionId, messageId, bodyMd) MessageView
      +softDelete(current CurrentUser, sessionId, messageId) void
      +page(current CurrentUser, sessionId, before Instant, limit int) Page~MessageView~
      +markRead(current CurrentUser, sessionId, at Instant) void
      -similarityHash(bodyMd) String
      -requireActiveParticipant(sessionId, userId) SessionParticipant
    }
    class AttachmentResolver {
      <<service>>
      +resolve(current CurrentUser, refs List~AttachmentRef~) List~MessageAttachment~
      +highestAccessClass(attachments) AccessClassification
    }
    class MessageStorePort {
      <<port>>
      +append(message SessionMessage, ttlDays int) void
      +pageBySession(sessionId, before Instant, limit int) List~SessionMessage~
      +markEdited(sessionId, messageId, bodyMd, at) void
      +markDeleted(sessionId, messageId) void
    }
    class MessageIndexRepository {
      <<port>>
      +insert(idx MessageIndexRow) void
      +recentByAuthor(sessionId, authorId, limit int) List~MessageIndexRow~
    }
    class RealtimePublisherPort {
      <<port>>
      +publish(sessionId, event SessionEvent) void
    }
    class DomainEventPublisherPort {
      <<port>>
      +publish(event DomainEvent) void
    }
  }

  namespace wai_web {
    class MessageController {
      <<controller>>
      +send(sessionId, cmd SendMessageCommand) MessageView
      +page(sessionId, before, limit) Page~MessageView~
      +edit(sessionId, messageId, body EditRequest) MessageView
      +softDelete(sessionId, messageId) void
      +markRead(sessionId, body ReadRequest) void
    }
    class SessionStreamController {
      <<controller>>
      +stream(sessionId) SseEmitter
    }
  }

  namespace wai_infrastructure {
    class CassandraMessageStore {
      <<adapter>>
      +table: String
    }
    class MysqlMessageIndexRepository {
      <<adapter>>
    }
    class RedisRealtimePublisher {
      <<adapter>>
      +channel: String
    }
    class OutboxEventPublisher {
      <<adapter>>
    }
  }

  MessageController --> MessageService
  SessionStreamController --> RealtimePublisherPort : subscribe
  MessageService --> AttachmentResolver
  MessageService --> MessageStorePort
  MessageService --> MessageIndexRepository
  MessageService --> RealtimePublisherPort
  MessageService --> DomainEventPublisherPort
  CassandraMessageStore ..|> MessageStorePort
  MysqlMessageIndexRepository ..|> MessageIndexRepository
  RedisRealtimePublisher ..|> RealtimePublisherPort
  OutboxEventPublisher ..|> DomainEventPublisherPort
  DeciaSession "1" --> "*" SessionMessage : messages_by_session
  DeciaSession "1" --> "*" SessionParticipant
  SessionMessage "1" --> "0..5" MessageAttachment : anexos do acervo
  MessageAttachment ..> TaskItem : targetType TASK
  SessionMessage ..> SessionParticipant : authorId
  DeciaSession --> SessionStatus
  SessionParticipant --> ParticipantRole
  TaskItem --> AccessClassification

  note for SessionMessage "Cassandra messages_by_session (PK sessionId, cluster sentAt desc, TTL) + índice MySQL session_messages_idx (id, sessionId, authorId, sentAt, classificationId)"
  note for MessageAttachment "tabela message_attachments (RF29.CA03, máx. 5) · targetType TASK · PROJECT · PLAN · SCENARIO · ARTIFACT · EVIDENCE"
```

## 2. Diagrama de atividades

Raias: Participante · Web/BFF · `wai-application` · Persistência · IA (AiEngine) só como destino do evento (a classificação é o RF7).

```mermaid
flowchart TD
  subgraph L1["Ator humano — Participante (MEMBRO ou ADMIN)"]
    A1(["Abre a sessão /decia/[id]"]) --> A2["Lê as mensagens (paginação por cursor) · lastReadAt atualizado"]
    A2 --> A3["Escreve o texto (Markdown restrito), responde a uma mensagem e anexa até 5 itens do acervo"]
    A3 --> A4["Envia"]
    A20(["Mensagem aparece para todos em tempo real"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["GET /api/decia/sessions/{id}/messages?before=&limit=50"]
    B2["POST /api/decia/sessions/{id}/messages (Idempotency-Key = TIMEUUID gerado no cliente)"]
    B3["SSE /api/decia/sessions/{id}/stream recebe MessageSent e insere no fim da lista"]
  end

  subgraph L3["wai-application — MessageService"]
    C1{"Participante ativo e role MEMBRO/ADMIN?"}
    C1 -->|não| E403["403 ACESSO_NEGADO"]
    C1 -->|sim| C2{"Sessão ATIVA ou REABERTA?"}
    C2 -->|não| E409["409 SESSAO_NAO_ATIVA"]
    C2 -->|sim| C3{"bodyMd 1–4000, ≤ 5 anexos, anexos legíveis pelo autor?"}
    C3 -->|não| E422["422 VALIDACAO"]
    C3 -->|sim| C4["Resolve anexos (snapshotJson) e maior accessClass"]
    C4 --> C5["similarityHash; compara com as últimas 20 do autor → marca repetida se > 90 %"]
    C5 --> C6["Monta SessionMessage (TIMEUUID, authorKind=HUMANO, sentAt, correlationId)"]
    C6 --> C7["Cassandra append (TTL = messageTtlDays) — idempotente"]
    C7 --> C8["TX MySQL: session_messages_idx + message_attachments + messageCount++ + outbox MessageSent (flag localOnly se RESTRITO/SIGILOSO)"]
    C8 --> C9["Publica no Redis pub/sub → SSE dos participantes"]
    C10["AFTER_COMMIT: MessageSent → ClassificationService (RF7) · Notification agrupada aos desconectados · AuditLog MESSAGE_SENT"]
    C11{"Editar/apagar: é o autor e ≤ 5 min?"}
    C11 -->|não| E403
    C11 -->|sim| C12["editedAt ou deleted=true (corpo oculto, registro mantido no rastro)"]
  end

  subgraph L4["IA (AiEngine)"]
    I1["Consome MessageSent e classifica (RF7)"]
  end

  subgraph L5["Persistência"]
    D1[("Cassandra: messages_by_session (sessionId, sentAt desc, TTL)")]
    D2[("MySQL: session_messages_idx, message_attachments, decia_sessions.message_count, domain_events, audit_log")]
    D3[("Redis: pub/sub decia.session.{id}")]
  end

  A1 --> B1 --> D1
  B1 --> A2
  A4 --> B2 --> C1
  C7 --> D1
  C8 --> D2
  C9 --> D3
  D3 --> B3 --> A20
  C8 --> C10
  C10 --> I1
  C12 --> D1
  C12 --> D2

  classDef erro fill:#fde2e2,stroke:#c0392b,color:#7b1d1d;
  class E403,E409,E422 erro;
```

## 3. Diagrama de sequência

Caminho feliz do envio com anexo, entrega em tempo real e `alt` de erro dos CA02 (409/403/422); leitura paginada e edição em `opt`.

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (participante MEMBRO)
  participant N as Next.js (App Router) /decia/[id]
  participant C as MessageController (wai-web)
  participant S as MessageService (wai-application)
  participant CS as Cassandra
  participant DB as Repository/MySQL
  participant R as Redis
  participant DE as DomainEvents (AFTER_COMMIT)
  participant AI as AiEngine

  U->>N: abre a sessão
  N->>C: GET /api/decia/sessions/{id}/messages?limit=50
  C->>S: page(currentUser, sessionId, before=null, 50)
  S->>DB: SELECT session_participants (ativo?) + decia_sessions.status
  S->>CS: SELECT messages_by_session WHERE session_id=? ORDER BY sent_at DESC LIMIT 50
  S->>DB: UPDATE session_participants SET last_read_at=now (CA04)
  S-->>C: Page de MessageView (com classificação e anexos inline)
  C-->>N: 200
  N->>N: abre SSE /api/decia/sessions/{id}/stream (CA04)

  U->>N: escreve o texto e anexa a tarefa "Planilha orçamentária v2"
  N->>C: POST /api/decia/sessions/{id}/messages (Idempotency-Key TIMEUUID)
  C->>S: send(currentUser, sessionId, SendMessageCommand)
  S->>DB: SELECT session_participants WHERE session_id AND user_id AND left_at IS NULL
  alt não é participante ativo ou é OBSERVADOR (CA02)
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else sessão fora de ATIVA/REABERTA (CA02)
    S->>DB: SELECT decia_sessions.status
    S-->>C: 409 SESSAO_NAO_ATIVA
    C-->>N: 409 → caixa de mensagem desabilitada
  else corpo vazio, > 4000 ou > 5 anexos (CA02)
    S-->>C: 422 VALIDACAO (details.bodyMd / details.attachments)
  else mensagem válida (CA01)
    S->>DB: SELECT tasks WHERE id IN (anexos) → visibilidade e accessClass (AttachmentResolver)
    S->>DB: SELECT session_messages_idx recentes do autor → similarityHash (CA05)
    S->>CS: INSERT messages_by_session (id TIMEUUID, body_md, attachments_json, similarity_hash) USING TTL messageTtlDays (CA03)
    S->>DB: BEGIN · INSERT session_messages_idx · INSERT message_attachments · UPDATE decia_sessions message_count+1 · INSERT domain_events MessageSent · COMMIT (CA03)
    S->>R: PUBLISH decia.session.{id} MessageSent(messageId) (CA04)
    S-->>C: 201 MessageView
    C-->>N: 201
    R-->>N: evento SSE para todos os participantes conectados
    N-->>U: mensagem renderizada com anexo inline
    DE->>AI: AFTER_COMMIT → MessageSent → ClassificationService.classify (RF7, localOnly se RESTRITO/SIGILOSO) (CA06)
    DE->>CS: AFTER_COMMIT → notifications_by_user para desconectados (groupKey por hora) (CA06)
    DE->>DB: AFTER_COMMIT → INSERT audit_log MESSAGE_SENT (sem o corpo) (CA06)
  end

  opt Editar ou apagar a própria mensagem em até 5 min (CA05)
    U->>N: edita o texto
    N->>C: PATCH /api/decia/sessions/{id}/messages/{messageId}
    C->>S: edit(currentUser, sessionId, messageId, bodyMd)
    S->>CS: UPDATE messages_by_session SET body_md, edited_at
    S->>R: PUBLISH MessageEdited
    S-->>C: 200 MessageView (editada)
  end
```

## 4. Máquina de estados

Entidade central: `SessionMessage`. Ela não tem enum de status na TAXONOMIA; os estados são **implícitos pelos campos** `classificationId`, `editedAt` e `deleted`, e o envio depende do `SessionStatus` da sessão (ATIVA/REABERTA), mostrado como guarda.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> ENVIADA : POST messages (sessão ATIVA ou REABERTA, participante ativo) — RF6.CA01
  state "ENVIADA (classificationId nulo)" as ENVIADA
  state "CLASSIFICADA (classificationId preenchido, RF7)" as CLASSIFICADA
  state "EDITADA (editedAt preenchido)" as EDITADA
  state "APAGADA (deleted = true, corpo oculto)" as APAGADA
  state "EXPIRADA (TTL do Cassandra)" as EXPIRADA

  ENVIADA --> CLASSIFICADA : ClassificationService conclui (assíncrono, RF7)
  ENVIADA --> EDITADA : autor edita em até 5 min (RF6.CA05)
  CLASSIFICADA --> EDITADA : autor edita em até 5 min → reclassifica (RF7)
  EDITADA --> CLASSIFICADA : nova classificação
  ENVIADA --> APAGADA : autor apaga em até 5 min
  CLASSIFICADA --> APAGADA : autor apaga em até 5 min
  EDITADA --> APAGADA : autor apaga em até 5 min
  CLASSIFICADA --> EXPIRADA : messageTtlDays (índice MySQL e rastro permanecem)
  APAGADA --> EXPIRADA : messageTtlDays
  EXPIRADA --> [*]

  note right of ENVIADA
    Guarda de envio (RF6.CA02):
    DeciaSession.status em ATIVA ou REABERTA → 201
    PROPOSTA, EM_RESUMO, EM_DECISAO, EM_REVISAO,
    ENCERRADA, ARQUIVADA → 409 SESSAO_NAO_ATIVA
  end note
  note right of APAGADA
    O registro continua no índice e no DecisionTrace
    (append-only, RF29.CA07), só o corpo é ocultado.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/(app)/decia/[sessionId]/page.tsx (lista virtualizada + MessageComposer)"]
    FE2["components/ui (MessageCard, AttachmentPicker do acervo, MarkdownRestrito, ClassBadge)"]
    FE3["app/api/decia/[sessionId]/stream/route.ts (SSE proxy com Bearer)"]
    FE4["lib/decia/useSessionStream.ts (reconexão, cursor)"]
  end

  subgraph WEB["wai-web"]
    W1["MessageController /api/decia/sessions/{id}/messages · /{messageId} · /read"]
    W2["SessionStreamController /api/decia/sessions/{id}/stream (SSE)"]
    W3["SecurityConfig (JWT) · IdempotencyKeyFilter · CorrelationIdFilter"]
  end

  subgraph APP["wai-application"]
    S1["MessageService"]
    S2["AttachmentResolver (visibilidade + accessClass)"]
    S3["Guard.requireActiveParticipant"]
    P1["MessageStorePort · MessageIndexRepository"]
    P2["RealtimePublisherPort · DomainEventPublisherPort · NotificationPort"]
  end

  subgraph DOM["wai-domain"]
    D1["DeciaSession · SessionParticipant · SessionMessage · MessageAttachment · TaskItem"]
    D2["SessionStatus · ParticipantRole · AccessClassification"]
    D3["DeciaSessionRepository · SessionParticipantRepository · TaskItemRepository"]
  end

  subgraph INFRA["wai-infrastructure"]
    I1["persistence-cassandra (CassandraMessageStore: messages_by_session, notifications_by_user)"]
    I2["persistence-mysql (session_messages_idx, message_attachments, decia_sessions, domain_events, audit_log)"]
    I3["cache-redis (RedisRealtimePublisher pub/sub decia.session.*)"]
    I4["platform (OutboxEventPublisher → MessageSent, NotificationDispatcher, AuditLogWriter)"]
    I5["ai-providers (consumidor do MessageSent → RF7)"]
  end

  CA[("Cassandra")]
  MY[("MySQL 8")]
  RD[("Redis")]

  FE1 --> FE2
  FE1 --> FE4
  FE4 --> FE3
  FE1 -->|HTTPS/JSON| W1
  FE3 -->|SSE| W2
  W3 -.-> W1
  W1 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> P1
  S1 --> P2
  S1 --> D1
  S2 --> D3
  I1 -.->|implementa| P1
  I2 -.->|implementa| P1
  I3 -.->|implementa| P2
  I4 -.->|implementa| P2
  W2 --> I3
  I4 -->|MessageSent| I5
  I1 --> CA
  I2 --> MY
  I3 --> RD
  BOOT["wai-bootstrap (flags cassandra.enabled, redis.enabled; TTL padrão; limites de mensagem)"] -.-> INFRA
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) |
|---|---|---|---|---|---|
| RF6.CA01 | `MessageService.send`, `SessionMessage` (TIMEUUID, authorKind, sentAt, correlationId), `MessageAttachment`, `AttachmentResolver.resolve` | `A3`, `A4`, `B2`, `C3`, `C4`, `C6` | 10–12, 21–27 (`POST …/messages`, 201) | `[*] → ENVIADA` | `FE1`, `FE2 AttachmentPicker`, `W1`, `S1`, `S2` |
| RF6.CA02 | `MessageService.requireActiveParticipant`, `SessionParticipant.leftAt/role`, `DeciaSession.status`, `SessionStatus` | `C1` → `E403`, `C2` → `E409`, `C3` → `E422` | 13–20 (`403`, `409 SESSAO_NAO_ATIVA`, `422`) | guarda em `ENVIADA` | `S3 Guard`, `W3` |
| RF6.CA03 | `MessageStorePort`/`CassandraMessageStore`, `MessageIndexRepository`/`MysqlMessageIndexRepository`, `DeciaSession.messageCount/messageTtlDays` | `C7`, `C8`, `D1`, `D2` | 23–24 (INSERT Cassandra USING TTL, TX MySQL + outbox) | `CLASSIFICADA → EXPIRADA` (TTL) | `I1`, `I2`, `W3 IdempotencyKeyFilter` |
| RF6.CA04 | `RealtimePublisherPort`/`RedisRealtimePublisher`, `SessionStreamController`, `MessageService.page/markRead`, `SessionParticipant.lastReadAt` | `A2`, `B1`, `B3`, `C9`, `D3` | 1–9 (paginação, lastReadAt, SSE), 25–29 (PUBLISH → SSE) | — | `W2`, `FE3`, `FE4`, `I3` |
| RF6.CA05 | `SessionMessage.similarityHash/editedAt/deleted`, `MessageService.edit/softDelete`, `AttachmentResolver.highestAccessClass`, `AccessClassification` | `C4`, `C5`, `C11`, `C12` | 22 (similarityHash), 33–38 (`opt` editar) | `→ EDITADA`, `→ APAGADA` | `S1`, `S2`, `I1` (UPDATE) |
| RF6.CA06 | `DomainEventPublisherPort`/`OutboxEventPublisher` (`MessageSent`), `Notification.groupKey`, `AuditLog` | `C10`, `I1` | 30–32 (AFTER_COMMIT → RF7, notificações agrupadas, audit_log) | `ENVIADA → CLASSIFICADA` (efeito do evento) | `I4`, `I5`, `I1 notifications_by_user` |
