# RF17 — Encerrar uma sessão de conversa e salvar seu histórico para análise de dados
**HU:** HU17 · **Sprint (board Work Station):** 3 · **Equivalente FAI:** card RF17 não cita equivalente; pelo Mapa de equivalência o histórico encerrado alimenta a **Memória Institucional** (= FAI **RF26 Explorador Global**, via RF33) e o Dossiê de Transição (RF36 "usa o histórico RF17") · **Aba/rota:** DECIA — sessão › "Encerrar sessão" (`/decia/[sessionId]`), histórico em `/decia/[sessionId]/archive` (rotas a confirmar)
**Critérios de aceite cobertos:** RF17.CA01 · RF17.CA02 · RF17.CA03 · RF17.CA04 · RF17.CA05 · RF17.CA06 (RF1–RF18 não têm CAs no board: derivados da HU17 + RF29.CA06, RF33.CA01/CA06, RF42 e marcados "CA a confirmar")

> **HU17** — COMO administrador do sistema POSSO encerrar uma sessão de conversa e salvar todo o seu histórico para análise de dados PARA preservar o registro da deliberação e alimentar os indicadores e análises do sistema.

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF17.CA01** | Dado sessão EM_REVISAO com `FinalDecision` VALIDADA (ou DEVOLVIDA com `ReopenRequest` RECUSADA), quando o administrador da sessão aciona "Encerrar sessão", então `status = ENCERRADA`, `closedAt` preenchido, o chat fica somente leitura (RF6 → `409 SESSAO_NAO_ATIVA`) e os participantes recebem `Notification` (DECIA). |
| **RF17.CA02** | Dado sessão ATIVA/REABERTA **sem decisão**, quando o admin tenta encerrar, então o motivo é obrigatório (`422 VALIDACAO` sem motivo) e a sessão encerra "sem decisão" (flag em `analyticsSnapshotJson`); não-admin → `403 ACESSO_NEGADO`; sessão já ENCERRADA/ARQUIVADA → `409 SESSAO_JA_ENCERRADA`; decisão EM_REVISAO pendente → `409 REVISAO_PENDENTE`. |
| **RF17.CA03** | Dado ENCERRADA, quando `SessionClosed` dispara AFTER_COMMIT, então `SessionLifecycleService` exporta mensagens (Cassandra), classificações, divergências, perguntas, resumo, decisão, revisão e artefatos para **JSON + PDF** em S3 (`MediaObject`), cria `SessionArchive` (`exportMediaId`, `messageCount`, `checksum` SHA-256, `analyticsSnapshotJson`) e a sessão passa a ARQUIVADA com `archiveMediaId`/`archivedAt`. |
| **RF17.CA04** | Dado o arquivo criado, então `PipelineJob` INDEXAR_MEMORIA indexa a sessão em `ws-memory` (`InstitutionalMemoryDocument.sourceType = SESSAO`, metadados empresa/departamento/categoria/exercício/autor/data) e marca `indexedInMemory = true` (RF33.CA01); falha de indexação **não bloqueia** o encerramento e fica em `ai_inference_log` (RF33.CA06). |
| **RF17.CA05** | Dado ENCERRADA com resumo PUBLICADO, então cada participante presente (`leftAt` nulo, ≥ 1 mensagem) recebe **+2 DP** (`PRESENCA_ENCERRADA`, idempotente, RF42.CA01) e `analyticsSnapshotJson` (mensagens por classe, divergências resolvidas/abertas, perguntas respondidas, tempo até decisão, fontes citadas) alimenta `MetricSnapshot` (RF18). |
| **RF17.CA06** | Dado sessão ARQUIVADA, então o histórico permanece navegável a partir do rastro (RF29.CA06) e da aba Histórico mesmo após o TTL do Cassandra (`messageTtlDays`), lido do export em S3; `DeciaSession.archiveMediaId` e o `SessionArchive` são imutáveis (`audit_log`). |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class DeciaSession {
    <<entity>>
    +UUID id
    +String topic
    +UUID adminUserId
    +UUID companyId
    +UUID departmentId
    +SessionStatus status
    +Instant startedAt
    +Instant closedAt
    +Instant archivedAt
    +int messageCount
    +int participantCount
    +int messageTtlDays
    +UUID archiveMediaId
    +boolean indexedInMemory
  }
  class SessionArchive {
    <<entity>>
    +UUID id
    +UUID sessionId
    +UUID exportMediaId
    +int messageCount
    +String checksum
    +Instant archivedAt
    +String analyticsSnapshotJson
  }
  class SessionParticipant {
    <<entity>>
    +UUID id
    +UUID sessionId
    +UUID userId
    +ParticipantRole role
    +Instant leftAt
  }
  class SessionMessage {
    <<entity>>
    +TIMEUUID id
    +UUID sessionId
    +UUID authorId
    +String bodyMd
    +Instant sentAt
    +UUID classificationId
  }
  class FinalDecision {
    <<entity>>
    +UUID id
    +UUID sessionId
    +DecisionStatus status
    +String stampJson
    +String citationsJson
  }
  class ReopenRequest {
    <<entity>>
    +UUID id
    +UUID decisionId
    +ReopenStatus status
  }
  class AnalyticalSummary {
    <<entity>>
    +UUID id
    +UUID sessionId
    +SummaryStatus status
  }
  class SessionArtifact {
    <<entity>>
    +UUID id
    +UUID sessionId
    +ArtifactKind kind
    +UUID mediaObjectId
  }
  class MediaObject {
    <<entity>>
    +UUID id
    +String bucket
    +String key
    +String mimeType
    +long sizeBytes
    +String sha256
    +AccessClassification accessClass
  }
  class PipelineJob {
    <<entity>>
    +UUID id
    +PipelineJobType type
    +UUID targetId
    +PipelineJobStatus status
    +int attempts
    +String lastError
  }
  class InstitutionalMemoryDocument {
    <<entity>>
    +String docId
    +String sourceType
    +UUID sourceId
    +UUID companyId
    +UUID departmentId
    +int exerciseYear
    +String title
    +String text
    +float[] embedding
    +Instant indexedAt
  }
  class MetricSnapshot {
    <<entity>>
    +UUID id
    +String metricCode
    +String scope
    +UUID scopeId
    +LocalDate periodStart
    +LocalDate periodEnd
    +BigDecimal value
    +String valuesJson
  }
  class DeciaPointsLedgerEntry {
    <<entity>>
    +UUID userId
    +int delta
    +PointsEvent eventCode
    +UUID sessionId
    +String idempotencyKey
  }
  class AuditLog {
    <<entity>>
    +UUID actorId
    +String action
    +String resourceType
    +UUID resourceId
    +String correlationId
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
  class PipelineJobType {
    <<enum>>
    EXPORT_PDF
    INDEXAR_MEMORIA
  }
  class PointsEvent {
    <<enum>>
    PRESENCA_ENCERRADA
    DECISAO_VALIDADA
  }

  class SessionLifecycleController {
    <<controller>>
    +close(sessionId, CloseForm) 200
    +archive(sessionId) 200
    +downloadArchive(sessionId) 302
  }
  class SessionLifecycleService {
    <<service>>
    +close(actor, sessionId, reason) DeciaSession
    +onSessionClosed(event) AFTER_COMMIT
    +archive(sessionId) SessionArchive
    +transition(sessionId, from, to)
    -buildAnalyticsSnapshot(sessionId) AnalyticsSnapshot
  }
  class DeciaPointsService {
    <<service>>
    +onSessionClosed(event) AFTER_COMMIT
  }
  class AnalyticsService {
    <<service>>
    +onSessionArchived(event) AFTER_COMMIT
    +materialize(snapshot) List~MetricSnapshot~
  }
  class SessionMessageRepositoryPort {
    <<port>>
    +streamAll(sessionId) Stream~SessionMessage~
  }
  class MediaStoragePort {
    <<port>>
    +put(bucket, key, bytes) MediaObject
    +presignedUrl(mediaId) URL
  }
  class PdfRenderPort {
    <<port>>
    +render(contentMd) bytes
  }
  class MemoryIndexPort {
    <<port>>
    +index(InstitutionalMemoryDocument)
  }
  class NotificationPort {
    <<port>>
    +notifyGroup(recipients, type, resource)
  }
  class SessionArchiveRepository {
    <<adapter>>
    MySQL session_archives
  }
  class CassandraMessageAdapter {
    <<adapter>>
    messages_by_session (TTL)
  }
  class S3MediaAdapter {
    <<adapter>>
    bucket ws-archives
  }
  class OpenSearchMemoryAdapter {
    <<adapter>>
    índice ws-memory
  }
  class PipelineJobRunner {
    <<adapter>>
    platform — fila de jobs
  }

  DeciaSession --> SessionStatus
  DeciaSession "1" --> "0..1" SessionArchive : histórico
  DeciaSession "1" --> "*" SessionParticipant
  DeciaSession "1" --> "*" SessionMessage : Cassandra
  DeciaSession "1" --> "*" FinalDecision
  DeciaSession "1" --> "*" AnalyticalSummary
  DeciaSession "1" --> "*" SessionArtifact
  DeciaSession ..> MediaObject : archiveMediaId
  SessionArchive ..> MediaObject : exportMediaId (JSON + PDF)
  SessionArchive ..> MetricSnapshot : analyticsSnapshotJson materializado
  FinalDecision "1" --> "*" ReopenRequest
  PipelineJob --> PipelineJobType
  PipelineJob ..> SessionArchive : targetId
  InstitutionalMemoryDocument ..> DeciaSession : sourceId (SESSAO)
  DeciaPointsLedgerEntry --> PointsEvent
  DeciaPointsLedgerEntry ..> DeciaSession : sessionId

  SessionLifecycleController --> SessionLifecycleService
  SessionLifecycleService --> SessionMessageRepositoryPort
  SessionLifecycleService --> MediaStoragePort
  SessionLifecycleService --> PdfRenderPort
  SessionLifecycleService --> NotificationPort
  SessionLifecycleService --> SessionArchiveRepository
  SessionLifecycleService --> PipelineJob : agenda INDEXAR_MEMORIA
  SessionLifecycleService ..> AuditLog : registra
  SessionLifecycleService ..> DeciaPointsService : evento SessionClosed
  SessionLifecycleService ..> AnalyticsService : evento SessionArchived
  PipelineJobRunner --> MemoryIndexPort
  SessionMessageRepositoryPort <|.. CassandraMessageAdapter
  MediaStoragePort <|.. S3MediaAdapter
  MemoryIndexPort <|.. OpenSearchMemoryAdapter

  note for DeciaSession "tabela decia_sessions — ENCERRADA (closedAt) → ARQUIVADA (archivedAt, archiveMediaId, indexedInMemory) .. +6 campos .."
  note for SessionArchive "tabela session_archives + S3 — imutável, checksum SHA-256 do JSON exportado"
  note for SessionMessage "Cassandra messages_by_session com TTL messageTtlDays — após o TTL, o histórico é lido do export em S3 (RF17.CA06)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Administrador da sessão"]
    A0(["Decisão VALIDADA (RF15) ou reabertura RECUSADA (RF14) — ou sessão sem decisão"])
    A1["Admin aciona Encerrar sessão"]
    A2{"Sessão tem decisão?"}
    A3["Informa motivo do encerramento sem decisão"]
    A4["Vê sessão ENCERRADA (somente leitura) e depois ARQUIVADA com link do histórico"]
    A5(["Fim"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["POST /api/decia/sessions/{id}/close {reason?}"]
    B2["Exibe 403 ACESSO_NEGADO"]
    B3["Exibe 409 SESSAO_JA_ENCERRADA ou 409 REVISAO_PENDENTE"]
    B4["Exibe 422 VALIDACAO — motivo obrigatório sem decisão"]
    B5["Composer desabilitado + etiqueta ENCERRADA"]
    B6["GET /api/decia/sessions/{id}/archive → 302 URL assinada S3"]
  end

  subgraph L3["ws-application (SessionLifecycleService)"]
    C1{"actor = adminUserId?"}
    C2{"status em ENCERRADA ou ARQUIVADA?"}
    C3{"há FinalDecision EM_REVISAO?"}
    C4{"há decisão VALIDADA ou DEVOLVIDA com reabertura RECUSADA?"}
    C5{"reason informado?"}
    C6["status = ENCERRADA, closedAt; AuditLog SESSION_CLOSED"]
    C7["Publica SessionClosed (outbox)"]
    C8["Listener onSessionClosed (AFTER_COMMIT)"]
    C9["Stream de mensagens do Cassandra + classificações, divergências, perguntas, resumo, decisão, revisão, artefatos"]
    C10["Serializa JSON canônico e calcula SHA-256"]
    C11["Renderiza PDF do histórico"]
    C12["S3 PUT JSON + PDF → MediaObject"]
    C13["INSERT SessionArchive (exportMediaId, messageCount, checksum, analyticsSnapshotJson)"]
    C14["status = ARQUIVADA, archivedAt, archiveMediaId"]
    C15["Agenda PipelineJob INDEXAR_MEMORIA (SESSAO)"]
    C16["Publica SessionArchived (outbox)"]
  end

  subgraph L4["IA (AiEngine) / Jobs"]
    D1["INDEXAR_MEMORIA: embedding do histórico → ws-memory (sourceType SESSAO)"]
    D2{"indexou?"}
    D3["indexedInMemory = true"]
    D4["REPROCESSAR + ai_inference_log (falha não bloqueia)"]
  end

  subgraph L5["Persistência"]
    E1[("MySQL decia_sessions · final_decisions · reopen_requests · audit_log · domain_events")]
    E2[("Cassandra messages_by_session")]
    E3[("S3 ws-archives + MySQL media_objects · session_archives")]
    E4[("OpenSearch ws-memory")]
    E5[("MySQL decia_points_ledger · metric_snapshots · pipeline_jobs")]
  end

  subgraph L6["Listeners AFTER_COMMIT"]
    F1["NotificationPort: participantes — Sessão encerrada"]
    F2["DeciaPointsService: +2 DP PRESENCA_ENCERRADA por participante presente (se resumo PUBLICADO)"]
    F3["AnalyticsService: materializa analyticsSnapshotJson em MetricSnapshot (RF18)"]
  end

  A0 --> A1 --> A2
  A2 -->|não| A3 --> B1
  A2 -->|sim| B1
  B1 --> C1
  C1 -->|não| B2 --> A5
  C1 -->|sim| C2
  C2 -->|sim| B3 --> A5
  C2 -->|não| C3
  C3 -->|sim| B3
  C3 -->|não| C4
  C4 -->|sim| C6
  C4 -->|não| C5
  C5 -->|não| B4 --> A3
  C5 -->|sim| C6 --> E1
  C6 --> C7 --> E1
  C7 --> B5 --> A4
  C7 --> F1
  C7 --> F2 --> E5
  C7 --> C8 --> C9 --> E2
  C9 --> C10 --> C11 --> C12 --> E3
  C12 --> C13 --> E3
  C13 --> C14 --> E1
  C14 --> C15 --> E5
  C15 --> D1 --> D2
  D2 -->|sim| D3 --> E1
  D3 --> E4
  D2 -->|não| D4 --> D1
  C14 --> C16 --> F3 --> E5
  C16 --> B6 --> A4 --> A5
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (admin da sessão)
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant OS as OpenSearch
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  rect rgb(245, 242, 239)
    Note over U,EV: Caminho feliz — encerrar, exportar JSON+PDF para S3, arquivar, indexar na memória, creditar presença
    U->>FE: Clica "Encerrar sessão"
    FE->>C: POST /api/decia/sessions/{id}/close
    C->>S: SessionLifecycleService.close(actor, sessionId, reason = null)
    S->>DB: SELECT decia_sessions FOR UPDATE (adminUserId = actor, status = EM_REVISAO)
    S->>DB: SELECT final_decisions (VALIDADA) / reopen_requests (RECUSADA)
    S->>DB: UPDATE decia_sessions SET status = ENCERRADA, closedAt
    S->>DB: INSERT audit_log (SESSION_CLOSED, correlationId) + domain_events (SessionClosed)
    S-->>C: 200 {session ENCERRADA}
    C-->>FE: 200
    FE-->>U: Etiqueta ENCERRADA — composer desabilitado
    EV-->>S: NotificationPort.notifyGroup(participantes, SESSAO_ENCERRADA)
    S->>CS: INSERT notifications_by_user
    EV-->>S: DeciaPointsService.onSessionClosed
    S->>DB: SELECT session_participants (leftAt null) + analytical_summaries PUBLICADO
    S->>DB: INSERT decia_points_ledger (+2 PRESENCA_ENCERRADA, idempotencyKey) por participante
    EV-->>S: SessionLifecycleService.onSessionClosed → archive(sessionId)
    S->>CS: SELECT messages_by_session (stream completo, antes do TTL)
    S->>DB: SELECT message_classifications, divergences, divergence_replies, ai_questions, analytical_summaries, summary_scenarios, final_decisions, decision_reviews, session_artifacts, decision_trace
    S->>S: serializa JSON canônico + SHA-256 + buildAnalyticsSnapshot
    S->>S: PdfRenderPort.render(histórico)
    S->>S3: PUT ws-archives/{sessionId}/history.json + history.pdf
    S3-->>S: etag
    S->>DB: INSERT media_objects (2) + INSERT session_archives (exportMediaId, messageCount, checksum, analyticsSnapshotJson)
    S->>DB: UPDATE decia_sessions SET status = ARQUIVADA, archivedAt, archiveMediaId
    S->>DB: INSERT pipeline_jobs (INDEXAR_MEMORIA, targetType SESSAO) + domain_events (SessionArchived)
    EV-->>S: AnalyticsService.onSessionArchived → INSERT metric_snapshots (mensagens por classe, divergências, tempo até decisão, fontes citadas)
    Note over S,OS: PipelineJobRunner (assíncrono)
    S->>OS: index ws-memory {sourceType SESSAO, sourceId, companyId, departmentId, exerciseYear, text, embedding}
    OS-->>S: 201
    S->>DB: UPDATE decia_sessions SET indexedInMemory = true + UPDATE pipeline_jobs SET status = OK
    U->>FE: Abre aba Histórico
    FE->>C: GET /api/decia/sessions/{id}/archive
    C->>S: SessionLifecycleService.archiveUrl(actor, sessionId)
    S->>DB: SELECT session_archives + media_objects
    S-->>C: 302 URL assinada S3 (JSON ou PDF)
    C-->>FE: 302
    FE-->>U: Histórico completo navegável (mesmo após TTL do Cassandra)
  end

  alt RF17.CA02 — sessão sem decisão e sem motivo
    FE->>C: POST .../close {reason ""}
    C->>S: close(actor, sessionId, "")
    S->>DB: SELECT final_decisions → nenhuma VALIDADA
    S-->>C: 422 VALIDACAO (motivo obrigatório)
    C-->>FE: 422
  else RF17.CA02 — decisão ainda em revisão
    S->>DB: SELECT final_decisions.status = EM_REVISAO
    S-->>C: 409 REVISAO_PENDENTE
  else RF17.CA02 — não é o admin ou já encerrada
    S->>DB: SELECT decia_sessions (adminUserId ≠ actor ou status ENCERRADA/ARQUIVADA)
    S-->>C: 403 ACESSO_NEGADO ou 409 SESSAO_JA_ENCERRADA
  else RF17.CA04 — OpenSearch indisponível
    S->>OS: index ws-memory
    OS-->>S: erro
    S->>DB: UPDATE pipeline_jobs SET status = REPROCESSAR, attempts + 1 + INSERT ai_inference_log (MEMORIA_BUSCA, result ERRO)
    Note over S,DB: sessão continua ARQUIVADA — indexedInMemory = false até o retry
  end
```

## 4. Máquina de estados

Entidade central: `DeciaSession.status` (`SessionStatus`) — ciclo completo, com destaque para ENCERRADA → ARQUIVADA, que é o trecho do RF17.

```mermaid
stateDiagram-v2
  [*] --> PROPOSTA : grupo pede abertura (RF5)
  PROPOSTA --> ATIVA : admin abre (RF4/RF5)
  ATIVA --> EM_RESUMO : gerar resumo (RF11)
  EM_RESUMO --> ATIVA : IA indisponível (RF11)
  EM_RESUMO --> EM_DECISAO : resumo PUBLICADO (RF11)
  EM_DECISAO --> EM_REVISAO : decisão encaminhada (RF12)
  EM_REVISAO --> REABERTA : decisão DEVOLVIDA e ReopenRequest ACEITA (RF14)
  REABERTA --> EM_RESUMO : novo ciclo (RF11)
  EM_REVISAO --> ENCERRADA : decisão VALIDADA ou reabertura RECUSADA — RF17.CA01
  ATIVA --> ENCERRADA : admin encerra sem decisão com motivo — RF17.CA02
  REABERTA --> ENCERRADA : admin encerra sem decisão com motivo — RF17.CA02
  ENCERRADA --> ARQUIVADA : AFTER_COMMIT exporta JSON+PDF para S3 e cria SessionArchive — RF17.CA03
  ARQUIVADA --> [*]

  note right of ENCERRADA
    closedAt preenchido
    chat somente leitura (RF6 → 409 SESSAO_NAO_ATIVA)
    AFTER_COMMIT: Notification ao grupo, +2 DP PRESENCA_ENCERRADA
    nova tentativa → 409 SESSAO_JA_ENCERRADA
  end note
  note right of ARQUIVADA
    archivedAt, archiveMediaId, SessionArchive imutável (checksum)
    PipelineJob INDEXAR_MEMORIA → indexedInMemory = true (falha não bloqueia)
    MetricSnapshot materializado (RF18)
    histórico navegável após TTL do Cassandra (RF29.CA06)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/decia/[sessionId]/page.tsx — botão Encerrar sessão"]
    FE2["app/decia/[sessionId]/archive/page.tsx — Histórico"]
    FE3["components/ui/CloseSessionDialog · SessionStatusBadge · ArchiveViewer"]
  end

  subgraph WEB["ws-web"]
    W1["SessionLifecycleController (REST /api/decia/sessions/{id}/close, /archive)"]
    W2["SessionAccessGuard (adminUserId / participante para leitura)"]
  end

  subgraph APP["ws-application"]
    S1["SessionLifecycleService (+ listener SessionClosed)"]
    S2["DeciaPointsService (listener AFTER_COMMIT)"]
    S3["AnalyticsService (listener SessionArchived, RF18)"]
    P1["SessionMessageRepositoryPort"]
    P2["MediaStoragePort"]
    P3["PdfRenderPort"]
    P4["MemoryIndexPort"]
    P5["NotificationPort"]
    P6["PipelineJobScheduler"]
    P7["DomainEventPublisher (outbox)"]
  end

  subgraph DOM["ws-domain"]
    D1["DeciaSession · SessionArchive · MediaObject · PipelineJob"]
    D2["FinalDecision · ReopenRequest · AnalyticalSummary · SessionArtifact · SessionParticipant (leitura)"]
    D3["DeciaPointsLedgerEntry · MetricSnapshot · AuditLog"]
    D4["Enums: SessionStatus · PipelineJobType · PipelineJobStatus · PointsEvent"]
  end

  subgraph INFRA["ws-infrastructure"]
    I1["persistence-mysql: DeciaSessionRepository (@Version), SessionArchiveRepository, MediaObjectRepository, PipelineJobRepository, DeciaPointsLedgerRepository, MetricSnapshotRepository, AuditLogRepository, DomainEventOutboxRepository"]
    I2["persistence-cassandra: CassandraMessageAdapter (stream completo), NotificationFeedAdapter"]
    I3["storage-s3: S3MediaAdapter (bucket ws-archives, URL assinada)"]
    I4["search-opensearch: OpenSearchMemoryAdapter (ws-memory, sourceType SESSAO)"]
    I5["ai-providers: EmbeddingAdapter (MEMORIA_BUSCA, ai_inference_log)"]
    I6["platform: PipelineJobRunner, PdfRenderAdapter, NotificationAdapter, OutboxRelay"]
  end

  MY[("MySQL 8")]
  CA[("Cassandra")]
  OS[("OpenSearch")]
  S3[("S3 / MinIO")]

  FE1 --> FE3
  FE2 --> FE3
  FE3 -->|HTTPS/JSON| W1 --> W2 --> S1
  S1 --> P1
  S1 --> P2
  S1 --> P3
  S1 --> P5
  S1 --> P6
  S1 --> P7
  P7 -.->|AFTER_COMMIT SessionClosed| S1
  P7 -.->|AFTER_COMMIT SessionClosed| S2
  P7 -.->|AFTER_COMMIT SessionArchived| S3
  P6 -.->|INDEXAR_MEMORIA| I6
  I6 --> P4
  S1 --> D1
  S1 --> D2
  S2 --> D3
  S3 --> D3
  D1 --> D4
  P1 -.-> I2
  P2 -.-> I3
  P3 -.-> I6
  P4 -.-> I4
  P5 -.-> I6
  I4 --> I5
  S1 --> I1
  S2 --> I1
  S3 --> I1
  I1 --> MY
  I2 --> CA
  I3 --> S3
  I4 --> OS
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividades) | Mensagem (sequência) | Transição (estados) | Componente |
|---|---|---|---|---|---|
| RF17.CA01 | `DeciaSession.status/closedAt`, `SessionLifecycleService.close`, `FinalDecision` VALIDADA / `ReopenRequest` RECUSADA, `NotificationPort`, `AuditLog` | A1, B1, C4, C6, C7, B5, F1 | 1–12 | EM_REVISAO → ENCERRADA | `SessionLifecycleController.close`, `SessionLifecycleService`, `NotificationAdapter` |
| RF17.CA02 | guardas de `SessionLifecycleService` (reason, adminUserId, status, decisão EM_REVISAO), `analyticsSnapshotJson.closedWithoutDecision` | A2, A3, C1–C3, C5, B2–B4 | `alt` 422 VALIDACAO / 409 REVISAO_PENDENTE / 403 / 409 SESSAO_JA_ENCERRADA | ATIVA/REABERTA → ENCERRADA | `SessionAccessGuard`, `CloseSessionDialog` |
| RF17.CA03 | `SessionArchive` (exportMediaId, messageCount, checksum, analyticsSnapshotJson), `MediaObject`, `DeciaSession.archivedAt/archiveMediaId`, `SessionLifecycleService.onSessionClosed/archive`, `MediaStoragePort`, `PdfRenderPort` | C8–C14 | 16–24 | ENCERRADA → ARQUIVADA | `CassandraMessageAdapter`, `S3MediaAdapter`, `PdfRenderAdapter`, `SessionArchiveRepository` |
| RF17.CA04 | `PipelineJob` INDEXAR_MEMORIA, `InstitutionalMemoryDocument` (SESSAO), `DeciaSession.indexedInMemory`, `MemoryIndexPort`, `AiInferenceLog` | C15, D1–D4 | 25, 27–29; `alt` OpenSearch indisponível | nota de ARQUIVADA | `PipelineJobRunner`, `OpenSearchMemoryAdapter`, `EmbeddingAdapter` |
| RF17.CA05 | `DeciaPointsLedgerEntry` (PRESENCA_ENCERRADA +2), `DeciaPointsService.onSessionClosed`, `MetricSnapshot`, `AnalyticsService.onSessionArchived/materialize` | F2, F3, C16 | 13–15, 26 | nota de ENCERRADA / ARQUIVADA | `DeciaPointsService`, `AnalyticsService`, `MetricSnapshotRepository` |
| RF17.CA06 | `SessionArchive` imutável, `SessionMessage.messageTtlDays`, `SessionLifecycleController.downloadArchive`, rastro RF29.CA06 | B6, A4 | 30–36 | ARQUIVADA terminal | `ArchiveViewer`, `S3MediaAdapter` (URL assinada), `AuditLogRepository` |
