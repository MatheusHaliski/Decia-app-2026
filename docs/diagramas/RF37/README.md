# RF37 — Registrar reuniões com a Ata Viva (transcrição ou gravação → ata como tarefa + tarefas de encaminhamento com responsável e prazo dentro do projeto)
**HU:** HU37 · **Sprint (board Work Station):** Product Backlog (não priorizado — pós-Sprint 4) · **Equivalente FAI:** RF13 artefatos automáticos (ata) + RF36 foto com manequim (captura do mundo real para dentro do sistema) · **Aba/rota:** ação "Nova reunião" na sessão DECIA ou no projeto (`/meetings/new`)
**Critérios de aceite cobertos:** RF37.CA01 · RF37.CA02 · RF37.CA03 · RF37.CA04 · RF37.CA05

> Contexto DECIA (bounded context 5). Entidade central: `Meeting` (status GRAVANDO → TRANSCREVENDO → ATA_PROPOSTA → CONFIRMADA | CONTESTADA). A ata vira `TaskItem` do tipo `ATA_REGISTRO` com `sourceKind = ATA_VIVA`; cada encaminhamento vira `TaskItem` ligado por `ProjectTaskDependency` à ata. A publicação na sessão reaproveita `SessionMessage` + `MessageAttachment` (RF29) e cria o nó `ATA_VIVA` no `DecisionTrace`. Pontos: `ATA_RATIFICADA` (+3) e `ENCAMINHAMENTO_CUMPRIDO` (+5) via RF42.

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class Meeting {
    <<entity>>
    +UUID id
    +UUID sessionId
    +UUID projectId
    +UUID organizerId
    +String title
    +Instant startedAt
    +Instant endedAt
    +MeetingSource source
    +UUID audioMediaId
    +MeetingStatus status
    +UUID minutesTaskId
    +List~UUID~ followUpTaskIdsJson
    +Instant ratificationDeadlineAt
    +UUID aiInferenceId
  }
  class MeetingTranscript {
    <<entity>>
    +UUID id
    +UUID meetingId
    +String text
    +List~Segment~ segmentsJson
    +String language
    +String provider
  }
  class RecordingConsent {
    <<entity>>
    +UUID id
    +UUID meetingId
    +UUID userId
    +boolean consented
    +Instant at
    +String ip
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
    +UUID responsibleId
    +LocalDate dueAt
    +TaskState state
    +AccessClassification accessClass
    +boolean aiGenerated
    +UUID aiInferenceId
  }
  class ProjectTask {
    <<entity>>
    +UUID id
    +UUID projectId
    +UUID taskId
    +ProjectPhase phase
    +int sortOrder
    +UUID responsibleId
    +LocalDate dueAt
    +UUID decisionTraceNodeId
  }
  class ProjectTaskDependency {
    <<entity>>
    +UUID id
    +UUID projectId
    +UUID predecessorProjectTaskId
    +UUID successorProjectTaskId
    +String type
    +int lagDays
  }
  class SessionMessage {
    <<entity>>
    +TimeUUID id
    +UUID sessionId
    +UUID authorId
    +String authorKind
    +String bodyMd
    +Instant sentAt
    +List~UUID~ attachmentsJson
    +UUID classificationId
    +String correlationId
  }
  class MessageAttachment {
    <<entity>>
    +UUID id
    +UUID messageId
    +String targetType
    +UUID targetId
    +String snapshotJson
    +boolean usedInDecision
  }
  class MessageClassification {
    <<entity>>
    +UUID id
    +UUID messageId
    +MessageClass label
    +BigDecimal confidence
    +boolean hasEvidence
    +UUID linkedTaskId
    +UUID aiInferenceId
  }
  class DecisionTraceNode {
    <<entity>>
    +UUID id
    +UUID sessionId
    +TraceNodeType nodeType
    +UUID refId
    +String label
    +String classLabel
    +UUID actorId
    +Instant at
  }
  class DecisionTraceEdge {
    <<entity>>
    +UUID id
    +UUID fromNodeId
    +UUID toNodeId
    +String relation
    +Instant at
  }
  class Notification {
    <<entity>>
    +UUID id
    +UUID recipientId
    +NotificationType type
    +String category
    +String resourceType
    +UUID resourceId
    +String groupKey
    +boolean read
  }
  class PipelineJob {
    <<entity>>
    +UUID id
    +String type
    +String targetType
    +UUID targetId
    +String status
    +int attempts
    +String lastError
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
  class AiInferenceLog {
    <<entity>>
    +UUID id
    +AiCapability capability
    +String provider
    +String model
    +String result
    +boolean fallbackUsed
    +String maskedFields
    +String correlationId
  }
  class Company {
    <<entity>>
    +UUID id
    +String legalName
    +String recordingRetentionPolicy
  }
  class DeciaPointsLedgerEntry {
    <<entity>>
    +UUID id
    +UUID userId
    +int delta
    +PointsEvent eventCode
    +String idempotencyKey
    +String status
  }

  class MeetingStatus {
    <<enum>>
    GRAVANDO
    TRANSCREVENDO
    ATA_PROPOSTA
    CONFIRMADA
    CONTESTADA
  }
  class MeetingSource {
    <<enum>>
    GRAVACAO_NAVEGADOR
    ARQUIVO
    TRANSCRICAO_COLADA
  }
  class TaskType {
    <<enum>>
    ATA_REGISTRO
    TEXTO_IA
    DOCUMENTO
    ...13 valores
  }
  class SourceKind {
    <<enum>>
    ATA_VIVA
    DECIA
    AUTOPILOT
    ...11 valores
  }
  class MessageClass {
    <<enum>>
    ARGUMENTO
    DIVERGENCIA
    RISCO
    CONSENSO
    PERGUNTA
    RUIDO
  }
  class TraceNodeType {
    <<enum>>
    ATA_VIVA
    MENSAGEM
    TAREFA
    DECISAO
    ...9 valores
  }
  class AiCapability {
    <<enum>>
    TRANSCREVER
    ATA_VIVA
    CLASSIFICAR_MENSAGEM
    ...24 valores
  }
  class PointsEvent {
    <<enum>>
    ATA_RATIFICADA
    ENCAMINHAMENTO_CUMPRIDO
    ...17 valores
  }

  class MeetingController {
    <<controller>>
    +POST meetings
    +POST meetings_id_consents
    +POST meetings_id_audio
    +POST meetings_id_transcript
    +GET meetings_id_draft
    +POST meetings_id_confirm
    +POST meetings_id_ratify
    +POST meetings_id_contest
  }
  class MeetingService {
    <<service>>
    +start(actor, sessionId, projectId, source) Meeting
    +registerConsent(meetingId, userId, consented, ip) RecordingConsent
    +attachAudio(meetingId, mediaId) PipelineJob
    +pasteTranscript(meetingId, text) MeetingTranscript
    +generateDraft(meetingId) AtaDraft
    +confirm(meetingId, draft) Meeting
    +publishInSession(meetingId) SessionMessage
    +ratify(meetingId, userId) Meeting
    +contest(meetingId, userId, reason) Meeting
    +purgeAudio(meetingId) void
  }
  class TranscriptionPort {
    <<port>>
    +transcribe(mediaId, language) MeetingTranscript
  }
  class SpeechToTextAdapter {
    <<adapter>>
    +transcribe(mediaId, language) MeetingTranscript
  }
  class AiEngine {
    <<service>>
    +run(capability, input, accessClass) AiResult
  }
  class AcervoService {
    <<service>>
    +createFromDraft(owner, draftTask) TaskItem
  }
  class TaskStateMachine {
    <<service>>
    +transition(taskId, toState, actor, reason) TaskStateLog
  }
  class DecisionTraceService {
    <<service>>
    +appendNode(sessionId, nodeType, refId) DecisionTraceNode
    +link(fromNodeId, toNodeId, relation) DecisionTraceEdge
  }

  Meeting "1" --> "0..1" MeetingTranscript : transcript
  Meeting "1" --> "*" RecordingConsent : consents
  Meeting "1" --> "0..1" TaskItem : minutesTaskId
  Meeting "1" --> "*" TaskItem : followUpTaskIdsJson
  Meeting "1" --> "0..1" MediaObject : audioMediaId
  Meeting --> MeetingStatus : status
  Meeting --> MeetingSource : source
  Meeting ..> AiInferenceLog : aiInferenceId
  Meeting ..> Company : recordingRetentionPolicy
  TaskItem --> TaskType : type
  TaskItem --> SourceKind : sourceKind
  TaskItem "1" --> "*" ProjectTask : taskId
  ProjectTask "1" --> "*" ProjectTaskDependency : predecessor
  ProjectTask "1" --> "*" ProjectTaskDependency : successor
  ProjectTask ..> DecisionTraceNode : decisionTraceNodeId
  SessionMessage "1" --> "*" MessageAttachment : attachmentsJson
  SessionMessage "1" --> "0..1" MessageClassification : classificationId
  MessageClassification --> MessageClass : label
  DecisionTraceNode --> TraceNodeType : nodeType
  DecisionTraceNode "1" --> "*" DecisionTraceEdge : fromNodeId
  PipelineJob ..> Meeting : TRANSCRICAO
  AiInferenceLog --> AiCapability : capability
  DeciaPointsLedgerEntry --> PointsEvent : eventCode
  Notification ..> Meeting : ratificar ou contestar 48 h

  MeetingController --> MeetingService
  MeetingService --> TranscriptionPort
  TranscriptionPort <|.. SpeechToTextAdapter : implementa
  MeetingService --> AiEngine : ATA_VIVA
  MeetingService --> AcervoService
  MeetingService --> TaskStateMachine
  MeetingService --> DecisionTraceService
  MeetingService ..> Meeting
  MeetingService ..> RecordingConsent
  MeetingService ..> SessionMessage
  MeetingService ..> Notification
  MeetingService ..> DeciaPointsLedgerEntry : via RF42

  note for Meeting "tabela meetings · audioMediaId apagado após transcrição (política da empresa)"
  note for MeetingTranscript "tabela meeting_transcripts · text com AesGcmStringConverter · segmentsJson speaker, start, end, classLabel"
  note for RecordingConsent "tabela recording_consents · RF37.CA05 · 1 linha por participante"
  note for TaskItem "tabela tasks · +45 campos · ATA_REGISTRO e encaminhamentos com sourceKind ATA_VIVA"
  note for SessionMessage "Cassandra messages_by_session + índice MySQL session_messages_idx"
  note for MeetingStatus "nome do enum a confirmar · TAXONOMIA só lista os valores em Meeting.status"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  classDef err fill:#FFE3E3,stroke:#C0392B,color:#5B1A12
  classDef ai fill:#FFF3D6,stroke:#D68910,color:#5C3B00
  classDef store fill:#EEF6FF,stroke:#4A4852,color:#1F2937

  subgraph L_user["Ator humano · Organizador e participantes da reunião"]
    U1["Abre a sessão DECIA ou o projeto e clica em Nova reunião"]
    U2{"Fonte da reunião?"}
    U3["Grava áudio no navegador (MediaRecorder)"]
    U4["Sobe arquivo de áudio ou vídeo"]
    U5["Cola a transcrição (Teams, Meet)"]
    U6["Cada participante registra consentimento de gravação"]
    U7["Revisa a ata proposta: participantes, pauta, deliberações, encaminhamentos, divergências, pendências"]
    U8{"Confirma a ata e os encaminhamentos?"}
    U9["Edita responsável, prazo e fase sugerida ou descarta"]
    U10["Participantes recebem notificação: ratificar ou contestar em 48 h"]
    U11{"Ratifica ou contesta?"}
  end

  subgraph L_web["Web/BFF · Next.js /meetings/new"]
    W1["POST /meetings (sessionId ou projectId, source)"]
    W2["POST /meetings/id/consents"]
    W3["PUT upload para S3 via URL pré-assinada + POST /meetings/id/audio"]
    W4["POST /meetings/id/transcript"]
    W5["GET /meetings/id/draft (polling ou SSE)"]
    W6["POST /meetings/id/confirm (draft editado)"]
    W7["POST /meetings/id/ratify ou /contest"]
  end

  subgraph L_app["ws-application · MeetingService"]
    A1{"Ator é participante da sessão ou membro do projeto?"}
    A2["Cria Meeting status GRAVANDO ou TRANSCREVENDO"]
    A3{"Todos os participantes presentes consentiram?"}
    A4["Bloqueia gravação: só transcrição colada é aceita"]
    A5["Abre PipelineJob TRANSCRICAO e chama TranscriptionPort"]
    A6{"accessClass do projeto ou sessão é RESTRITO ou SIGILOSO?"}
    A7["Monta AtaDraft: tarefa ATA_REGISTRO (fase sugerida) + N encaminhamentos com responsável e prazo + dependências ata → encaminhamento"]
    A8["Valida draft: título, responsáveis existentes, prazos futuros"]
    A9["AcervoService cria TaskItem ATA_REGISTRO e encaminhamentos (sourceKind ATA_VIVA, aiGenerated)"]
    A10["ProjectTask por tarefa + ProjectTaskDependency FS ata → encaminhamento"]
    A11["Publica SessionMessage (authorKind IA) com MessageAttachment por tarefa"]
    A12["DecisionTraceService: nó ATA_VIVA + arestas ORIGINOU para as tarefas"]
    A13["Meeting ATA_PROPOSTA · ratificationDeadlineAt = agora + 48 h · Notification por participante"]
    A14["purgeAudio: apaga audioMediaId conforme Company.recordingRetentionPolicy (padrão: apagar)"]
    A15["Meeting CONFIRMADA · evento AtaRatificada (+3 DP ATA_RATIFICADA via RF42)"]
    A16["Meeting CONTESTADA · motivo registrado · organizador notificado"]
    E1["403 ACESSO_NEGADO"]
    E2["422 VALIDACAO (sem fonte, transcrição vazia, prazo no passado, responsável inexistente)"]
    E3["409 CONSENTIMENTO_PENDENTE"]
  end

  subgraph L_ai["IA (AiEngine) · capability TRANSCREVER e ATA_VIVA"]
    I1["TRANSCREVER: áudio → MeetingTranscript com segmentsJson (speaker, start, end)"]
    I2["ATA_VIVA: transcrição → ata estruturada + classificação dos trechos como no RF7 (ARGUMENTO, DIVERGENCIA, RISCO, CONSENSO, PERGUNTA)"]
    I3["Motor local apenas (BLOQUEADO_SIGILO para provedor externo) · dados pessoais mascarados"]
    I4["AiInferenceLog: provider, model, latency, result, fallbackUsed, correlationId"]
  end

  subgraph L_db["Persistência"]
    D1["MySQL meetings · recording_consents · pipeline_jobs"]
    D2["S3 MediaObject áudio (accessClass herdada)"]
    D3["MySQL meeting_transcripts (text AES-GCM) · ai_inference_log"]
    D4["MySQL tasks · project_tasks · project_task_dependencies · task_state_log"]
    D5["Cassandra messages_by_session + MySQL message_attachments · decision_trace_nodes · decision_trace_edges"]
    D6["DomainEventOutbox AFTER_COMMIT → notifications_by_user · decia_points_ledger"]
    D7["S3 delete audioMediaId · audit_log"]
  end

  U1 --> W1 --> A1
  A1 -- "não" --> E1
  A1 -- "sim" --> A2 --> D1
  A2 --> U2
  U2 -- "GRAVACAO_NAVEGADOR" --> U6 --> W2 --> A3
  A3 -- "não" --> A4 --> E3
  A3 -- "sim" --> U3 --> W3
  U2 -- "ARQUIVO" --> U4 --> W3
  W3 --> D2 --> A5
  U2 -- "TRANSCRICAO_COLADA" --> U5 --> W4
  A5 --> A6
  W4 --> A6
  A6 -- "sim" --> I3 --> I2
  A6 -- "não" --> I1 --> I2
  I1 --> D3
  I2 --> I4 --> D3
  I2 --> A7 --> W5 --> U7 --> U8
  U8 -- "editar" --> U9 --> U7
  U8 -- "descartar" --> X1(["Fim: nada persistido no acervo"])
  U8 -- "confirmar" --> W6 --> A8
  A8 -- "inválido" --> E2
  A8 -- "válido" --> A9 --> D4
  A9 --> A10 --> D4
  A10 --> A11 --> D5
  A11 --> A12 --> D5
  A12 --> A13 --> D6
  A13 --> A14 --> D7
  A13 --> U10 --> U11
  U11 -- "ratifica" --> W7 --> A15 --> D6
  U11 -- "contesta" --> W7 --> A16 --> D6
  U11 -- "48 h sem resposta" --> A15

  class E1,E2,E3 err
  class I1,I2,I3,I4 ai
  class D1,D2,D3,D4,D5,D6,D7 store
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: Nova reunião no projeto P (gravar áudio)
  N->>C: POST /meetings (projectId, source GRAVACAO_NAVEGADOR)
  C->>S: MeetingService.start(actor, null, projectId, source)
  S->>DB: INSERT meetings (status GRAVANDO)
  S-->>N: 201 Meeting
  loop para cada participante presente
    U->>N: Consentimento de gravação
    N->>C: POST /meetings/id/consents (consented, ip)
    C->>S: registerConsent
    S->>DB: INSERT recording_consents
  end
  alt algum participante não consentiu
    S-->>N: 409 CONSENTIMENTO_PENDENTE (só transcrição colada)
  else todos consentiram
    U->>N: Para a gravação
    N->>S3: PUT áudio (URL pré-assinada, accessClass do projeto)
    N->>C: POST /meetings/id/audio (mediaId)
    C->>S: attachAudio(meetingId, mediaId)
    S->>DB: UPDATE meetings (TRANSCREVENDO, audioMediaId) · INSERT pipeline_jobs TRANSCRICAO
    S->>AI: run(TRANSCREVER, mediaId, accessClass)
    alt accessClass RESTRITO ou SIGILOSO
      AI-->>S: transcrição pelo motor local (result BLOQUEADO_SIGILO para externo)
    else PUBLICO ou INTERNO
      AI-->>S: transcrição via provedor (Claude ou Gemini) com PII mascarada
    end
    S->>DB: INSERT meeting_transcripts (text AES-GCM, segmentsJson) · INSERT ai_inference_log
    S->>AI: run(ATA_VIVA, transcript)
    AI-->>S: ata estruturada + classificação RF7 por trecho + encaminhamentos (o quê, quem, quando)
    S->>DB: INSERT ai_inference_log · UPDATE meetings (aiInferenceId)
    S->>S3: DELETE audioMediaId (Company.recordingRetentionPolicy = apagar)
    N->>C: GET /meetings/id/draft
    C->>S: generateDraft(meetingId)
    S-->>N: 200 AtaDraft (tarefa ATA_REGISTRO, fase sugerida, N encaminhamentos, dependências)
    U->>N: Ajusta responsável e prazo e confirma
    N->>C: POST /meetings/id/confirm (draft)
    C->>S: confirm(meetingId, draft)
    alt prazo no passado ou responsável inexistente
      S-->>N: 422 VALIDACAO
    else draft válido
      S->>DB: INSERT tasks ATA_REGISTRO + encaminhamentos (sourceKind ATA_VIVA, aiGenerated) · project_tasks · project_task_dependencies · task_state_log
      S->>CS: INSERT messages_by_session (authorKind IA, attachmentsJson)
      S->>DB: INSERT message_attachments · decision_trace_nodes (ATA_VIVA) · decision_trace_edges (ORIGINOU)
      S->>DB: UPDATE meetings (ATA_PROPOSTA, minutesTaskId, followUpTaskIdsJson, ratificationDeadlineAt = +48 h)
      S->>EV: MeetingPublished(meetingId, participantIds)
      EV-->>CS: notifications_by_user (ratificar ou contestar em 48 h) por participante
      S-->>N: 200 Meeting ATA_PROPOSTA
    end
    U->>N: Ratificar
    N->>C: POST /meetings/id/ratify
    C->>S: ratify(meetingId, userId)
    S->>DB: UPDATE meetings (CONFIRMADA) · audit_log
    S->>EV: AtaRatificada(meetingId, participantIds)
    EV-->>DB: decia_points_ledger ATA_RATIFICADA +3 (idempotencyKey, RF42)
  end
```

## 4. Máquina de estados

Entidade central: `Meeting.status`. A caixa pontilhada mostra o efeito colateral sobre `TaskItem.state` das tarefas geradas (RF41).

```mermaid
stateDiagram-v2
  direction LR
  [*] --> GRAVANDO : POST /meetings source GRAVACAO_NAVEGADOR e todos consentiram
  [*] --> TRANSCREVENDO : POST /meetings source ARQUIVO ou TRANSCRICAO_COLADA
  GRAVANDO --> TRANSCREVENDO : áudio enviado (PipelineJob TRANSCRICAO)
  GRAVANDO --> [*] : cancelada antes de gravar · consentimento negado

  state TRANSCREVENDO {
    [*] --> Transcrevendo : TranscriptionPort (ou texto colado)
    Transcrevendo --> GerandoAta : MeetingTranscript salvo · áudio apagado
    GerandoAta --> DraftPronto : AiEngine ATA_VIVA ok
    Transcrevendo --> Falha : erro do provedor
    Falha --> Transcrevendo : PipelineJob REPROCESSAR (attempts menor que 3)
  }

  TRANSCREVENDO --> [*] : organizador descarta o draft (nada persistido)
  TRANSCREVENDO --> ATA_PROPOSTA : organizador confirma · tarefas criadas · mensagem publicada · 48 h iniciadas

  state ATA_PROPOSTA {
    [*] --> AguardandoRatificacao
    AguardandoRatificacao --> AguardandoRatificacao : ratificação individual registrada
  }

  ATA_PROPOSTA --> CONFIRMADA : todos ratificaram ou 48 h sem contestação
  ATA_PROPOSTA --> CONTESTADA : qualquer participante contesta com motivo
  CONTESTADA --> TRANSCREVENDO : organizador reabre e regenera a ata
  CONTESTADA --> [*] : encerrada sem ata oficial
  CONFIRMADA --> [*]

  note right of CONFIRMADA
    +3 DP ATA_RATIFICADA para participantes (RF42)
    +5 DP ENCAMINHAMENTO_CUMPRIDO quando a tarefa de encaminhamento chega a CONCLUIDA
  end note
  note left of ATA_PROPOSTA
    TaskItem gerados nascem RASCUNHO e passam a DISPONIVEL na confirmação
    (TaskStateMachine, RF41.CA02)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    FE1["app/meetings/new · app/sessions/[id] · app/projects/[id]"]
    FE2["components/ui · AudioRecorder · ConsentSheet · AtaPreview (tarefa + encaminhamentos) · DecisionThread (fio)"]
  end

  subgraph WEB["ws-web"]
    C1["MeetingController"]
  end

  subgraph APP["ws-application"]
    S1["MeetingService"]
    S2["AcervoService (RF41)"]
    S3["TaskStateMachine"]
    S4["DecisionTraceService (RF29)"]
    S5["AiEngine (RF43)"]
    P1["TranscriptionPort"]
    P2["StoragePort"]
  end

  subgraph DOM["ws-domain · br.gov.pr.secid.workstation"]
    D1["Meeting · MeetingTranscript · RecordingConsent"]
    D2["TaskItem · ProjectTask · ProjectTaskDependency"]
    D3["SessionMessage · MessageAttachment · DecisionTraceNode · DecisionTraceEdge"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1["persistence-mysql · meetings, meeting_transcripts, recording_consents, tasks, project_tasks, pipeline_jobs"]
    I2["persistence-cassandra · messages_by_session, notifications_by_user"]
    I3["storage-s3 · MediaObject áudio (TTL por política)"]
    I4["ai-providers · SpeechToTextAdapter · ClaudeAdapter · GeminiAdapter · LocalEngine"]
    I5["platform · DomainEventOutbox · PipelineJob worker · AuditLog · i18n"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude / Gemini"]
    X2["Microsoft 365 (Teams) · Google Workspace (Meet) — transcrição colada ou importada"]
  end

  FE1 --> C1
  FE2 -.-> FE1
  C1 --> S1
  S1 --> S2 --> S3
  S1 --> S4
  S1 --> S5
  S1 --> P1
  S1 --> P2
  S1 --> D1
  S2 --> D2
  S4 --> D3
  D1 --> I1
  D2 --> I1
  D3 --> I2
  D3 --> I1
  P2 --> I3
  P1 --> I4
  S5 --> I4
  I4 --> X1
  I5 --> I2
  S1 --> I5
  FE1 -.-> X2
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF37.CA01 | Classes `Meeting.sessionId`, `Meeting.projectId`, `MeetingSource` (GRAVACAO_NAVEGADOR, ARQUIVO, TRANSCRICAO_COLADA); atividades U1→U2→U3/U4/U5, W1, W3, W4, A1 (403 ACESSO_NEGADO); sequência msgs 1–5 e 11–13; transições `[*] → GRAVANDO` e `[*] → TRANSCREVENDO`; componentes `app/meetings/new`, `AudioRecorder`, `storage-s3`, `Microsoft 365 / Google Workspace`. |
| RF37.CA02 | Classes `MeetingTranscript.segmentsJson`, `TranscriptionPort`, `SpeechToTextAdapter`, `AiEngine`, `AiCapability` (TRANSCREVER, ATA_VIVA), `MessageClass`; atividades A5, I1, I2, I4, A7; sequência msgs 14–22; estado composto `TRANSCREVENDO` (Transcrevendo → GerandoAta → DraftPronto, Falha → REPROCESSAR); componentes `ai-providers`, `PipelineJob worker`. |
| RF37.CA03 | Classes `TaskItem` (type ATA_REGISTRO, sourceKind ATA_VIVA, responsibleId, dueAt), `ProjectTask.phase`, `ProjectTaskDependency`, `AcervoService.createFromDraft`, `TaskStateMachine`; atividades U7→U8→U9, W5, W6, A7, A8 (422 VALIDACAO), A9, A10; sequência msgs 24–31; transição `TRANSCREVENDO → ATA_PROPOSTA` (organizador confirma) e nota sobre RASCUNHO → DISPONIVEL; componentes `AtaPreview`, `AcervoService`, `TaskStateMachine`. |
| RF37.CA04 | Classes `SessionMessage`, `MessageAttachment`, `DecisionTraceNode` (TraceNodeType ATA_VIVA), `DecisionTraceEdge` (ORIGINOU), `Notification`, `Meeting.ratificationDeadlineAt`, `DeciaPointsLedgerEntry` (ATA_RATIFICADA); atividades A11, A12, A13, U10, U11, A15, A16; sequência msgs 32–43; estados `ATA_PROPOSTA` → `CONFIRMADA` / `CONTESTADA` e nota de pontos; componentes `DecisionTraceService`, `persistence-cassandra`, `DomainEventOutbox`, `DecisionThread`. |
| RF37.CA05 | Classes `RecordingConsent` (consented, at, ip), `Company.recordingRetentionPolicy`, `MediaObject.accessClass`, `MeetingTranscript.text` (AES-GCM), `AiInferenceLog.maskedFields`; atividades U6, W2, A3, A4 (409 CONSENTIMENTO_PENDENTE), A6, I3, A14, D7; sequência msgs 6–10, 17 (motor local) e 23 (DELETE áudio); transição `GRAVANDO → [*]` por consentimento negado e `Transcrevendo → GerandoAta` (áudio apagado); componentes `ConsentSheet`, `storage-s3` (TTL por política), `AuditLog`. |


Tela/aba: `/decia` (esqueleto em `app/(shell)/decia/page.tsx`) · `/decia/[sessionId]` (esqueleto em `app/(shell)/decia/[sessionId]/page.tsx`) · `/lab/decia` (esqueleto em `app/(shell)/lab/decia/page.tsx`)
