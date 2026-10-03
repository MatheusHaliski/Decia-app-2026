# RF13 — Gerar artefatos automáticos (relatório, ata, checklist) como resposta ao grupo, através de notificações e análise fundamentada
**HU:** HU13 · **Sprint (board Work Station):** 3 · **Equivalente FAI:** **RF13 artefatos automáticos (ata)** do FAI — citado como equivalente no card RF37 (Ata Viva "estende os artefatos automáticos do RF13") · **Aba/rota:** DECIA — sessão › aba "Artefatos" (`/decia/[sessionId]/artifacts`; rota a confirmar) + Notificações
**Critérios de aceite cobertos:** RF13.CA01 · RF13.CA02 · RF13.CA03 · RF13.CA04 · RF13.CA05 · RF13.CA06 (RF1–RF18 não têm CAs no board: derivados da HU13 + RF29.CA02/CA04, RF33.CA01, RF37, RF42 e marcados "CA a confirmar")

> **HU13** — COMO IA do sistema POSSO gerar automaticamente artefatos (relatório, ata, checklist) e disponibilizá-los ao grupo por meio de notificações PARA documentar formalmente a sessão e facilitar a execução das ações decorrentes.

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF13.CA01** | Dado decisão VALIDADA (RF15) — ou resumo PUBLICADO (RF11) para o artefato RESUMO_PDF — quando o evento AFTER_COMMIT dispara, então a IA (capability ARTEFATO) gera `SessionArtifact` de kind **RELATORIO**, **ATA** e **CHECKLIST** com `contentMd` fundamentado (tema, participantes, argumentos, divergências, decisão, revisor, citações) e `aiInferenceId`; `generatedAt` preenchido. |
| **RF13.CA02** | Dado o `contentMd` salvo, então um `PipelineJob` EXPORT_PDF renderiza o PDF, grava em S3 (`MediaObject`) e preenche `mediaObjectId`; falha de renderização mantém o `contentMd` legível e o job vai a REPROCESSAR (retry com backoff). |
| **RF13.CA03** | Dado artefatos prontos, então cada participante recebe **uma** `Notification` (categoria DECIA, `groupKey` = sessionId para agrupar os três) com título e link para a aba Artefatos; `notifiedAt` é preenchido em cada `SessionArtifact`. |
| **RF13.CA04** | Dado um artefato, quando um participante aciona **"Transformar em tarefa"** (RF29.CA04), então é criada `TaskItem` (ATA → tipo ATA_REGISTRO / categoria ATA; RELATORIO → DOCUMENTO; CHECKLIST → FORMULARIO) com `sourceKind = DECIA`, `convertedTaskId` preenchido e rastro ARTEFATO → TRANSFORMOU_EM → TAREFA; repetir a ação → `409 ARTEFATO_JA_CONVERTIDO`. |
| **RF13.CA05** | Dado o administrador da sessão, quando aciona "Regerar" com instrução de ajuste, então uma nova linha de `SessionArtifact` é gerada e a anterior preservada; não-participante → `403 ACESSO_NEGADO`; sessão sem decisão validada nem resumo publicado → `409 SEM_BASE_PARA_ARTEFATO`; instrução vazia → `422 VALIDACAO`. |
| **RF13.CA06** | Dado artefato gerado, então é indexado na Memória Institucional (`InstitutionalMemoryDocument.sourceType = ARTEFATO`, RF33.CA01) por `PipelineJob` INDEXAR_MEMORIA assíncrono; falha não bloqueia a geração (RF33.CA06). |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class DeciaSession {
    <<entity>>
    +UUID id
    +String topic
    +UUID adminUserId
    +UUID linkedProjectId
    +SessionStatus status
  }
  class FinalDecision {
    <<entity>>
    +UUID id
    +UUID sessionId
    +String decisionText
    +String rationale
    +DecisionStatus status
    +String stampJson
    +String citationsJson
  }
  class AnalyticalSummary {
    <<entity>>
    +UUID id
    +UUID sessionId
    +String recommendationsJson
    +SummaryStatus status
  }
  class SessionArtifact {
    <<entity>>
    +UUID id
    +UUID sessionId
    +ArtifactKind kind
    +String title
    +UUID mediaObjectId
    +String contentMd
    +Instant generatedAt
    +UUID aiInferenceId
    +Instant notifiedAt
    +UUID convertedTaskId
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
    +String targetType
    +UUID targetId
    +PipelineJobStatus status
    +int attempts
    +String lastError
    +Instant scheduledAt
    +Instant finishedAt
  }
  class Notification {
    <<entity>>
    +UUID id
    +UUID recipientId
    +NotificationType type
    +String category
    +String resourceType
    +UUID resourceId
    +String title
    +String groupKey
    +boolean read
  }
  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +String title
    +TaskType type
    +TaskCategory category
    +SourceKind sourceKind
    +String sourceRef
    +TaskState state
  }
  class DecisionTraceNode {
    <<entity>>
    +UUID id
    +TraceNodeType nodeType
    +UUID refId
    +String label
  }
  class InstitutionalMemoryDocument {
    <<entity>>
    +String docId
    +String sourceType
    +UUID sourceId
    +String title
    +String text
    +float[] embedding
  }
  class AiInferenceLog {
    <<entity>>
    +UUID id
    +AiCapability capability
    +String provider
    +String result
  }

  class ArtifactKind {
    <<enum>>
    RELATORIO
    ATA
    CHECKLIST
    RESUMO_PDF
  }
  class PipelineJobType {
    <<enum>>
    EXPORT_PDF
    INDEXAR_MEMORIA
    THUMBNAIL
  }
  class PipelineJobStatus {
    <<enum>>
    PENDENTE
    RODANDO
    OK
    FALHA
    REPROCESSAR
  }
  class TaskType {
    <<enum>>
    ATA_REGISTRO
    DOCUMENTO
    FORMULARIO
  }
  class SourceKind {
    <<enum>>
    DECIA
    ARQUIVO
    COLAR
  }

  class ArtifactController {
    <<controller>>
    +list(sessionId) 200
    +download(sessionId, artifactId) 302
    +regenerate(sessionId, artifactId, instruction) 202
    +toTask(sessionId, artifactId) 201
  }
  class ArtifactService {
    <<service>>
    +onDecisionValidated(event) AFTER_COMMIT
    +onSummaryPublished(event) AFTER_COMMIT
    +generate(sessionId, kinds) List~SessionArtifact~
    +regenerate(actor, sessionId, artifactId, instruction)
    +toTask(actor, sessionId, artifactId) TaskItem
  }
  class TaskCreationService {
    <<service>>
    +createFromArtifact(artifact, actor) TaskItem
  }
  class DecisionTraceService {
    <<service>>
    +appendNode(sessionId, ARTEFATO, artifactId)
    +appendEdge(decisionNode, artifactNode, ORIGINOU)
  }
  class AiEnginePort {
    <<port>>
    +generateArtifact(kind, context) ArtifactDraft
  }
  class MediaStoragePort {
    <<port>>
    +put(bucket, key, bytes) MediaObject
    +presignedUrl(mediaObjectId) URL
  }
  class PdfRenderPort {
    <<port>>
    +render(contentMd) bytes
  }
  class NotificationPort {
    <<port>>
    +notifyGroup(recipients, type, resource, groupKey)
  }
  class MemoryIndexPort {
    <<port>>
    +index(InstitutionalMemoryDocument)
  }
  class SessionArtifactRepository {
    <<adapter>>
    MySQL session_artifacts
  }
  class S3MediaAdapter {
    <<adapter>>
    bucket ws-artifacts
  }
  class PipelineJobRunner {
    <<adapter>>
    platform — fila de jobs
  }
  class OpenSearchMemoryAdapter {
    <<adapter>>
    índice ws-memory
  }

  DeciaSession "1" --> "*" SessionArtifact : artefatos
  SessionArtifact --> ArtifactKind
  SessionArtifact ..> MediaObject : mediaObjectId
  SessionArtifact ..> AiInferenceLog : aiInferenceId
  SessionArtifact ..> TaskItem : convertedTaskId
  SessionArtifact ..> FinalDecision : base (VALIDADA)
  SessionArtifact ..> AnalyticalSummary : base (PUBLICADO)
  PipelineJob --> PipelineJobType
  PipelineJob --> PipelineJobStatus
  PipelineJob ..> SessionArtifact : targetId
  TaskItem --> TaskType
  TaskItem --> SourceKind
  DecisionTraceNode ..> SessionArtifact : refId quando ARTEFATO
  InstitutionalMemoryDocument ..> SessionArtifact : sourceId (ARTEFATO)
  Notification ..> SessionArtifact : resourceId

  ArtifactController --> ArtifactService
  ArtifactService --> AiEnginePort
  ArtifactService --> SessionArtifactRepository
  ArtifactService --> PipelineJob : agenda EXPORT_PDF e INDEXAR_MEMORIA
  ArtifactService --> NotificationPort
  ArtifactService --> DecisionTraceService
  ArtifactService --> TaskCreationService
  PipelineJobRunner --> PdfRenderPort
  PipelineJobRunner --> MediaStoragePort
  PipelineJobRunner --> MemoryIndexPort
  MediaStoragePort <|.. S3MediaAdapter
  MemoryIndexPort <|.. OpenSearchMemoryAdapter

  note for SessionArtifact "tabela session_artifacts — kind RELATORIO, ATA, CHECKLIST, RESUMO_PDF .. contentMd é a fonte, PDF é derivado .."
  note for PipelineJob "tabela pipeline_jobs — EXPORT_PDF e INDEXAR_MEMORIA; retry com backoff até REPROCESSAR"
  note for Notification "Cassandra notifications_by_user + MySQL notifications — groupKey = sessionId agrupa os 3 artefatos"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Grupo / Administrador da sessão"]
    A0(["Decisão VALIDADA (RF15) ou resumo PUBLICADO (RF11)"])
    A1["Participante recebe notificação: Artefatos da sessão disponíveis"]
    A2["Abre aba Artefatos e lê relatório, ata, checklist"]
    A3{"Ação?"}
    A4["Baixar PDF"]
    A5["Transformar em tarefa (RF29.CA04)"]
    A6["Admin pede Regerar com instrução"]
    A7(["Fim"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["GET /api/decia/sessions/{id}/artifacts"]
    B2["GET /api/decia/sessions/{id}/artifacts/{aid}/download → 302 URL assinada S3"]
    B3["POST /api/decia/sessions/{id}/artifacts/{aid}/to-task"]
    B4["POST /api/decia/sessions/{id}/artifacts/{aid}/regenerate"]
    B5["Exibe 403 ACESSO_NEGADO"]
    B6["Exibe 409 ARTEFATO_JA_CONVERTIDO"]
    B7["Exibe 409 SEM_BASE_PARA_ARTEFATO ou 422 VALIDACAO"]
    B8["Mostra contentMd renderizado enquanto PDF não está pronto"]
  end

  subgraph L3["ws-application (ArtifactService)"]
    C0["Listener DecisionValidated / SummaryPublished (AFTER_COMMIT)"]
    C1["Monta contexto: tema, participantes, classificações, divergências, decisão, revisor, citações"]
    C2["Para cada kind em RELATORIO, ATA, CHECKLIST"]
    C3["AiEnginePort.generateArtifact(kind, contexto)"]
    C4["INSERT SessionArtifact (contentMd, aiInferenceId, generatedAt)"]
    C5["Agenda PipelineJob EXPORT_PDF e INDEXAR_MEMORIA"]
    C6["Rastro: nó ARTEFATO + aresta ORIGINOU (DECISAO → ARTEFATO)"]
    C7["NotificationPort.notifyGroup (groupKey = sessionId)"]
    C8["SessionArtifact.notifiedAt = now"]
    C9{"actor é participante?"}
    C10{"convertedTaskId nulo?"}
    C11["TaskCreationService.createFromArtifact (ATA_REGISTRO / DOCUMENTO / FORMULARIO, sourceKind DECIA)"]
    C12["convertedTaskId = taskId; rastro ARTEFATO → TRANSFORMOU_EM → TAREFA"]
    C13{"actor = adminUserId e instrução não vazia e há base?"}
  end

  subgraph L4["IA (AiEngine)"]
    D1["ARTEFATO: redige relatório, ata (pauta, deliberação, encaminhamentos) e checklist (ações, responsáveis, prazos)"]
    D2["Cita fontes (baseado em …) e marca faísca ✦"]
    D3["AiInferenceLog"]
  end

  subgraph L5["Persistência"]
    E1[("MySQL session_artifacts · pipeline_jobs · decision_trace_nodes/edges")]
    E2[("S3 ws-artifacts (PDF) + MySQL media_objects")]
    E3[("OpenSearch ws-memory")]
    E4[("Cassandra notifications_by_user + MySQL notifications")]
    E5[("MySQL tasks")]
  end

  subgraph L6["PipelineJobRunner (assíncrono)"]
    F1["EXPORT_PDF: render contentMd → PDF → S3 → mediaObjectId"]
    F2{"render OK?"}
    F3["status OK"]
    F4["status REPROCESSAR (retry com backoff) — contentMd permanece legível"]
    F5["INDEXAR_MEMORIA: embedding → ws-memory (sourceType ARTEFATO)"]
  end

  A0 --> C0 --> C1 --> C2 --> C3 --> D1 --> D2 --> D3 --> C4 --> E1
  C4 --> C5 --> E1
  C5 --> F1 --> F2
  F2 -->|sim| F3 --> E2
  F2 -->|não| F4 --> F1
  C5 --> F5 --> E3
  C4 --> C6 --> E1
  C6 --> C7 --> E4
  C7 --> C8 --> E1
  C7 --> A1 --> A2 --> B1 --> B8 --> A3
  A3 -->|baixar| A4 --> B2 --> E2
  B2 --> A7
  A3 -->|tarefa| A5 --> B3 --> C9
  C9 -->|não| B5 --> A7
  C9 -->|sim| C10
  C10 -->|não| B6 --> A7
  C10 -->|sim| C11 --> E5
  C11 --> C12 --> E1
  C12 --> A7
  A3 -->|regerar| A6 --> B4 --> C13
  C13 -->|não| B7 --> A7
  C13 -->|sim| C1
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (participante)
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant OS as OpenSearch
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  rect rgb(245, 242, 239)
    Note over U,EV: Caminho feliz — decisão validada gera relatório, ata e checklist, notifica o grupo e vira tarefa
    EV-->>S: ArtifactService.onDecisionValidated(sessionId, decisionId)
    S->>DB: SELECT decia_sessions, final_decisions (VALIDADA, stampJson), decision_reviews, analytical_summaries
    S->>CS: SELECT messages_by_session (resumo das mensagens-base)
    loop kind em RELATORIO, ATA, CHECKLIST
      S->>AI: generateArtifact(kind, contexto, citations)
      AI-->>S: ArtifactDraft {title, contentMd, citations}
      S->>DB: INSERT ai_inference_log (ARTEFATO)
      S->>DB: INSERT session_artifacts (kind, title, contentMd, generatedAt, aiInferenceId)
      S->>DB: INSERT pipeline_jobs (EXPORT_PDF, targetId = artifactId, PENDENTE)
      S->>DB: INSERT pipeline_jobs (INDEXAR_MEMORIA, targetId = artifactId, PENDENTE)
      S->>DB: INSERT decision_trace_nodes (ARTEFATO) + decision_trace_edges (DECISAO → ARTEFATO, ORIGINOU)
    end
    S->>CS: INSERT notifications_by_user (participantes, ARTEFATOS_DISPONIVEIS, groupKey = sessionId)
    S->>DB: INSERT notifications (espelho) + UPDATE session_artifacts SET notifiedAt
    Note over S,S3: PipelineJobRunner (assíncrono)
    S->>DB: UPDATE pipeline_jobs SET status = RODANDO
    S->>S: PdfRenderPort.render(contentMd)
    S->>S3: PUT ws-artifacts/{sessionId}/{artifactId}.pdf
    S3-->>S: etag, sha256
    S->>DB: INSERT media_objects + UPDATE session_artifacts SET mediaObjectId
    S->>OS: index ws-memory {sourceType ARTEFATO, sourceId, text, embedding}
    S->>DB: UPDATE pipeline_jobs SET status = OK

    U->>FE: Abre notificação → aba Artefatos
    FE->>C: GET /api/decia/sessions/{id}/artifacts
    C->>S: ArtifactService.list(actor, sessionId)
    S->>DB: SELECT session_artifacts WHERE sessionId
    S-->>C: 200 [RELATORIO, ATA, CHECKLIST] (contentMd + mediaObjectId)
    C-->>FE: 200
    FE-->>U: Cards dos artefatos com faísca ✦
    U->>FE: Clica "Transformar em tarefa" na ATA
    FE->>C: POST /api/decia/sessions/{id}/artifacts/{aid}/to-task
    C->>S: ArtifactService.toTask(actor, sessionId, artifactId)
    S->>DB: SELECT session_participants (actor) + session_artifacts.convertedTaskId IS NULL
    S->>DB: INSERT tasks (type ATA_REGISTRO, category ATA, sourceKind DECIA, sourceRef = artifactId)
    S->>DB: UPDATE session_artifacts SET convertedTaskId
    S->>DB: INSERT decision_trace_nodes (TAREFA) + decision_trace_edges (ARTEFATO → TAREFA, TRANSFORMOU_EM)
    S-->>C: 201 TaskItem
    C-->>FE: 201
    FE-->>U: Tarefa criada — link para /tasks/[id]
  end

  alt RF13.CA02 — falha ao renderizar PDF
    S->>S: PdfRenderPort.render(contentMd) → exceção
    S->>DB: UPDATE pipeline_jobs SET status = REPROCESSAR, attempts + 1, lastError
    Note over S,DB: contentMd continua disponível na aba Artefatos — retry com backoff
  else RF13.CA04 — artefato já convertido
    FE->>C: POST .../to-task
    C->>S: toTask(...)
    S->>DB: SELECT session_artifacts.convertedTaskId IS NOT NULL
    S-->>C: 409 ARTEFATO_JA_CONVERTIDO
    C-->>FE: 409
  else RF13.CA05 — não participante
    FE->>C: GET .../artifacts
    C->>S: list(actor, sessionId)
    S->>DB: SELECT session_participants → não encontrado
    S-->>C: 403 ACESSO_NEGADO
    C-->>FE: 403
  end
```

## 4. Máquina de estados

`SessionArtifact` não tem status próprio na taxonomia; o RF13 usa os estados de `PipelineJob.status` (`PipelineJobStatus`), entidade que ele cria para EXPORT_PDF e INDEXAR_MEMORIA de cada artefato.

```mermaid
stateDiagram-v2
  [*] --> PENDENTE : ArtifactService agenda EXPORT_PDF / INDEXAR_MEMORIA — RF13.CA01
  PENDENTE --> RODANDO : PipelineJobRunner pega o job
  RODANDO --> OK : PDF em S3 e mediaObjectId preenchido — RF13.CA02
  RODANDO --> OK : documento indexado em ws-memory — RF13.CA06
  RODANDO --> REPROCESSAR : erro de render, S3 ou OpenSearch (attempts + 1, lastError)
  REPROCESSAR --> RODANDO : retry com backoff exponencial
  REPROCESSAR --> FALHA : attempts ≥ limite
  OK --> [*]
  FALHA --> [*]

  note right of PENDENTE
    criado na mesma transação do INSERT em session_artifacts
    contentMd já é legível na aba Artefatos
  end note
  note right of FALHA
    EXPORT_PDF em FALHA não bloqueia a notificação ao grupo
    INDEXAR_MEMORIA em FALHA não bloqueia a operação (RF33.CA06)
    admin pode reprocessar manualmente
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/decia/[sessionId]/artifacts/page.tsx"]
    FE2["components/ui/ArtifactCard · MarkdownViewer · ToTaskButton · NotificationBell"]
  end

  subgraph WEB["ws-web"]
    W1["ArtifactController (REST /api/decia/sessions/{id}/artifacts)"]
    W2["SessionAccessGuard (participante / adminUserId)"]
  end

  subgraph APP["ws-application"]
    S1["ArtifactService (+ listeners DecisionValidated, SummaryPublished)"]
    S2["TaskCreationService (RF20/RF29)"]
    S3["DecisionTraceService"]
    P1["AiEnginePort"]
    P2["MediaStoragePort"]
    P3["PdfRenderPort"]
    P4["MemoryIndexPort"]
    P5["NotificationPort"]
    P6["PipelineJobScheduler"]
  end

  subgraph DOM["ws-domain"]
    D1["SessionArtifact · MediaObject · PipelineJob"]
    D2["FinalDecision · AnalyticalSummary · DeciaSession (leitura)"]
    D3["TaskItem · DecisionTraceNode · DecisionTraceEdge"]
    D4["Enums: ArtifactKind · PipelineJobType · PipelineJobStatus · TaskType · SourceKind"]
  end

  subgraph INFRA["ws-infrastructure"]
    I1["persistence-mysql: SessionArtifactRepository, PipelineJobRepository, MediaObjectRepository, TaskItemRepository, DecisionTraceRepository, NotificationRepository"]
    I2["persistence-cassandra: NotificationFeedAdapter (notifications_by_user), CassandraMessageAdapter"]
    I3["storage-s3: S3MediaAdapter (bucket ws-artifacts, URL assinada)"]
    I4["search-opensearch: OpenSearchMemoryAdapter (ws-memory)"]
    I5["ai-providers: AiEngineAdapter (ARTEFATO, ai_inference_log)"]
    I6["platform: PipelineJobRunner, PdfRenderAdapter, NotificationAdapter, OutboxRelay"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude / Gemini"]
  end

  MY[("MySQL 8")]
  CA[("Cassandra")]
  OS[("OpenSearch")]
  S3[("S3 / MinIO")]

  FE1 --> FE2 -->|HTTPS/JSON| W1 --> W2 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> P1
  S1 --> P5
  S1 --> P6
  P6 -.->|jobs EXPORT_PDF / INDEXAR_MEMORIA| I6
  I6 --> P2
  I6 --> P3
  I6 --> P4
  S1 --> D1
  S1 --> D2
  S2 --> D3
  S3 --> D3
  D1 --> D4
  P1 -.-> I5
  P2 -.-> I3
  P4 -.-> I4
  P5 -.-> I2
  S1 --> I1
  S2 --> I1
  I1 --> MY
  I2 --> CA
  I3 --> S3
  I4 --> OS
  I5 --> X1
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividades) | Mensagem (sequência) | Transição (estados) | Componente |
|---|---|---|---|---|---|
| RF13.CA01 | `SessionArtifact` (kind, contentMd, generatedAt, aiInferenceId), `ArtifactService.onDecisionValidated/onSummaryPublished/generate`, `AiEnginePort.generateArtifact`, `AiCapability.ARTEFATO`, `DecisionTraceNode` ARTEFATO | A0, C0–C4, C6, D1–D3 | 1–10 (loop por kind) | [*] → PENDENTE | `ArtifactService`, `AiEngineAdapter`, `SessionArtifactRepository`, `DecisionTraceService` |
| RF13.CA02 | `PipelineJob` EXPORT_PDF, `MediaObject`, `SessionArtifact.mediaObjectId`, `PdfRenderPort`, `MediaStoragePort` | C5, F1–F4, E2 | 14–18; `alt` RF13.CA02 (REPROCESSAR) | PENDENTE → RODANDO → OK / REPROCESSAR → FALHA | `PipelineJobRunner`, `PdfRenderAdapter`, `S3MediaAdapter` |
| RF13.CA03 | `Notification` (category DECIA, groupKey = sessionId), `SessionArtifact.notifiedAt`, `NotificationPort.notifyGroup` | C7, C8, A1, E4 | 11–12 | nota de PENDENTE (contentMd já legível) | `NotificationAdapter`, `NotificationFeedAdapter`, `NotificationBell` |
| RF13.CA04 | `SessionArtifact.convertedTaskId`, `TaskItem` (ATA_REGISTRO / DOCUMENTO / FORMULARIO, sourceKind DECIA), `TaskCreationService.createFromArtifact`, aresta TRANSFORMOU_EM | A5, B3, C9–C12, E5 | 28–36; `alt` 409 ARTEFATO_JA_CONVERTIDO | — | `TaskCreationService`, `TaskItemRepository`, `ToTaskButton` |
| RF13.CA05 | `ArtifactService.regenerate`, `SessionAccessGuard`, guardas 403/409/422 | A6, B4, C13, B5, B7 | `alt` 403 ACESSO_NEGADO | nova linha → novo job PENDENTE | `ArtifactController.regenerate`, `SessionAccessGuard` |
| RF13.CA06 | `PipelineJob` INDEXAR_MEMORIA, `InstitutionalMemoryDocument` (sourceType ARTEFATO), `MemoryIndexPort` | C5, F5, E3 | 9, 19 | RODANDO → OK (indexado) / FALHA não bloqueante | `OpenSearchMemoryAdapter`, `PipelineJobRunner` |
