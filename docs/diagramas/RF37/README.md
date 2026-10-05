# RF37 — Registrar reuniões com a Ata Viva (transcrição ou gravação → ata como tarefa + tarefas de encaminhamento com responsável e prazo dentro do projeto)
**HU:** HU37 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** RF13 artefatos automáticos (ata) + RF36 foto com manequim (captura do mundo real para dentro do sistema) · **Aba/rota:** ação **Nova reunião** na sessão DECIA (`/decia/[sessionId]`) ou no projeto (`/projects/[id]`), fluxo em `/meetings/new`, `/meetings/[id]` (gravação, upload, transcrição colada, ata proposta, ratificação)
**Critérios de aceite cobertos:** RF37.CA01 · CA02 · CA03 · CA04 · CA05 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs.

`Meeting` (`sessionId` ou `projectId`, `source` GRAVACAO_NAVEGADOR · ARQUIVO · TRANSCRICAO_COLADA, `status` `MeetingStatus` GRAVANDO · TRANSCREVENDO · ATA_PROPOSTA · CONFIRMADA · CONTESTADA, `audioMediaId`, `minutesTaskId`, `followUpTaskIdsJson`, `ratificationDeadlineAt` 48 h) com `MeetingTranscript` (texto AES-GCM, `segmentsJson` por falante classificado como no RF7) e `RecordingConsent` por participante (LGPD). Áudio vai para `restricted/` (`OwnMedia`), passa por magic bytes e limite por formato, e é **apagado após a transcrição** por padrão (`Company.recordingRetentionPolicy`). A IA (`TRANSCREVER`, `ATA_VIVA`) gera a **ata estruturada** (participantes, pauta, deliberações, encaminhamentos o quê/quem/quando, divergências, pendências); o usuário **confirma antes de persistir**: ata → `TaskItem` ATA_REGISTRO (`sourceKind ATA_VIVA`) no projeto; cada encaminhamento → `TaskItem` com `responsibleId` e `dueAt` + `ProjectTaskDependency` para a ata. A ata é publicada na sessão como mensagem com anexos (RF29) e entra no rastro (nó ATA_VIVA); participantes ratificam ou contestam em 48 h (`Notification`), e ratificação credita DP (`ATA_RATIFICADA`, RF42).

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_decia {
  class Meeting {
    <<entity>>
    +id: UUID
    +sessionId: UUID
    +projectId: UUID
    +organizerId: UUID
    +title: String
    +startedAt: Instant
    +endedAt: Instant
    +source: MeetingSource
    +audioMediaId: UUID
    +status: MeetingStatus
    +minutesTaskId: UUID
    +followUpTaskIdsJson: JSON
    +ratificationDeadlineAt: Instant
    +aiInferenceId: UUID
  }
  class MeetingTranscript {
    <<entity>>
    +id: UUID
    +meetingId: UUID
    +text: String
    +segmentsJson: JSON
    +language: String
    +provider: String
  }
  class RecordingConsent {
    <<entity>>
    +id: UUID
    +meetingId: UUID
    +userId: UUID
    +consented: boolean
    +at: Instant
    +ip: String
  }
  class SessionMessage {
    <<entity>>
    +id: TIMEUUID
    +sessionId: UUID
    +authorKind: String
    +bodyMd: String
    +attachmentsJson: JSON
  }
  class MessageAttachment {
    <<entity>>
    +messageId: UUID
    +targetType: String
    +targetId: UUID
  }
  class DecisionTraceNode {
    <<entity>>
    +nodeType: TraceNodeType
    +refId: UUID
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
}

namespace ws_domain_acervo_projects {
  class TaskItem {
    <<entity>>
    +id: UUID
    +title: String
    +type: TaskType
    +category: TaskCategory
    +sourceKind: SourceKind
    +responsibleId: UUID
    +dueAt: LocalDate
    +state: TaskState
    +aiGenerated: boolean
    .. +45 campos ..
  }
  class ProjectTask {
    <<entity>>
    +projectId: UUID
    +taskId: UUID
    +phase: ProjectPhase
    +responsibleId: UUID
    +dueAt: LocalDate
  }
  class ProjectTaskDependency {
    <<entity>>
    +predecessorProjectTaskId: UUID
    +successorProjectTaskId: UUID
    +type: String
  }
}

namespace ws_domain_platform_identity {
  class MediaObject {
    <<entity>>
    +id: UUID
    +objectKey: String
    +mimeType: String
    +accessClass: String
    +ownerId: UUID
  }
  class Company {
    <<entity>>
    +id: UUID
    +recordingRetentionPolicy: String
  }
  class UserConsent {
    <<entity>>
    +userId: UUID
    +purpose: ConsentPurpose
    +granted: boolean
  }
  class DeciaPointsLedgerEntry {
    <<entity>>
    +eventCode: PointsEvent
    +idempotencyKey: String
  }
  class PipelineJob {
    <<entity>>
    +type: String
    +status: PipelineJobStatus
  }
}

namespace ws_application {
  class MeetingService {
    <<service>>
    +start(actor, MeetingForm) Meeting
    +consent(actor, meetingId, consented) RecordingConsent
    +uploadAudio(actor, meetingId, media) Meeting
    +pasteTranscript(actor, meetingId, text) Meeting
    +proposeMinutes(meetingId) MinutesDraft
    +confirm(actor, meetingId, MinutesDraft) Meeting
    +ratify(actor, meetingId) void
    +contest(actor, meetingId, reason) Meeting
  }
  class TranscriptionService {
    <<service>>
    +transcribe(meetingId, audio) MeetingTranscript
    +purgeAudio(meetingId, policy)
  }
  class DeciaBridgeService {
    <<service>>
    +publishMinutes(sessionId, taskId, followUps) SessionMessage
  }
  class TaskService {
    <<service>>
    +create(actor, TaskForm) TaskItem
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
  }
  class OwnMedia {
    <<service>>
    +requireAccess(actor, MediaObject)
  }
  class UploadGuard {
    <<service>>
    +checkMagicBytes(bytes)
    +checkSizeByFormat(format, size)
  }
  class Guard {
    <<service>>
    +requireParticipant(actor, sessionId)
    +requireOwner(actor, ownerId)
  }
  class StoragePort {
    <<port>>
    +put(restricted, bytes)
    +delete(key)
  }
  class TranscriptionPort {
    <<port>>
    +transcribe(audio, language) Segments
  }
  class DomainEvents {
    <<service>>
    +publish(event)
  }
}

namespace ws_web {
  class MeetingController {
    <<controller>>
    +POST_api_meetings(form)
    +POST_api_meetings_id_consent(consented)
    +POST_api_meetings_id_audio(file)
    +POST_api_meetings_id_transcript(text)
    +GET_api_meetings_id_minutes()
    +POST_api_meetings_id_confirm(draft)
    +POST_api_meetings_id_ratify()
    +POST_api_meetings_id_contest(reason)
  }
}

namespace ws_infrastructure {
  class S3StorageAdapter {
    <<adapter>>
  }
  class PlatformTranscriptionAdapter {
    <<adapter>>
  }
  class LocalEngine {
    <<adapter>>
  }
}

Meeting "1" --> "0..1" MeetingTranscript
Meeting "1" o-- "0..*" RecordingConsent
Meeting "0..1" --> "0..1" MediaObject : audioMediaId apagado apos transcricao
Meeting "0..1" --> "0..1" TaskItem : minutesTaskId ATA_REGISTRO
Meeting "1" --> "0..*" TaskItem : followUpTaskIdsJson
TaskItem "0..*" --> "0..*" ProjectTaskDependency : encaminhamento depende da ata
ProjectTask "0..*" --> "1" TaskItem
SessionMessage "1" o-- "0..*" MessageAttachment
MessageAttachment ..> TaskItem : ata publicada RF29
DecisionTraceNode ..> Meeting : ATA_VIVA
Company ..> TranscriptionService : recordingRetentionPolicy
UserConsent ..> MeetingService : GRAVACAO_REUNIOES_PADRAO preferencia
Meeting ..> DeciaPointsLedgerEntry : ATA_RATIFICADA ENCAMINHAMENTO_CUMPRIDO
PipelineJob ..> TranscriptionService : TRANSCRICAO
MeetingController --> MeetingService
MeetingService --> TranscriptionService
MeetingService --> DeciaBridgeService
MeetingService --> TaskService
MeetingService --> AiEngine
MeetingService --> OwnMedia
MeetingService --> UploadGuard
MeetingService --> Guard
MeetingService --> DomainEvents
TranscriptionService --> TranscriptionPort
TranscriptionService --> StoragePort
S3StorageAdapter ..|> StoragePort
PlatformTranscriptionAdapter ..|> TranscriptionPort
LocalEngine ..> AiEngine : ata estruturada por regras
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (organizador · participantes)"]
    A0([Nova reunião na sessão ou no projeto]) --> A1{"Fonte"}
    A1 -->|gravar| A2["Grava áudio no navegador"]
    A1 -->|arquivo| A3["Sobe áudio/vídeo"]
    A1 -->|colar| A4["Cola transcrição do Teams/Meet"]
    A5["Cada participante registra consentimento de gravação"]
    A6["Revisa a ata proposta e os encaminhamentos"]
    A7{"Confirmar?"}
    A7 -->|sim| A8["Confirma"]
    A9([Participante notificado]) --> A10{"Em 48 h"}
    A10 -->|ratifica| A11["Ratifica"]
    A10 -->|contesta| A12["Contesta com motivo"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/meetings/new · meetings/[id])"]
    F1["MeetingForm (vínculo sessão/projeto) · Recorder (MediaRecorder) · Upload · Textarea"]
    F2["ConsentDialog por participante · POST /consent"]
    F3["MinutesEditor: participantes, pauta, deliberações, encaminhamentos (o quê, quem, quando), divergências, pendências · Tag por classificação · Spark ✦"]
    F4["POST /confirm · POST /ratify · POST /contest"]
  end

  subgraph WEB["ws-web · MeetingController"]
    W1["JWT · CorrelationIdFilter · limite de upload por formato"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application · MeetingService"]
    P1{"Guard.requireParticipant(sessão) ou requireOwner(projeto)?"}
    P1 -->|não| E1["403 ACESSO_NEGADO"]
    P2{"Todos os falantes consentiram?"}
    P2 -->|não| E2["409 CONSENTIMENTO_PENDENTE"]
    P3["UploadGuard: magic bytes, limite por formato · OwnMedia → restricted/meetings/"]
    P4["status GRAVANDO → TRANSCREVENDO · PipelineJob TRANSCRICAO"]
    P5["TranscriptionService.transcribe → MeetingTranscript (texto AES, segmentos por falante)"]
    P6{"recordingRetentionPolicy = apagar após transcrição?"}
    P6 -->|sim, padrão| P7["StoragePort.delete(audio) · audioMediaId = null · AuditLog AUDIO_PURGED"]
    P6 -->|empresa guarda| P8["Mantém em restricted/ até o prazo"]
    P9["proposeMinutes: ata estruturada ✦ · status ATA_PROPOSTA · nada persistido no acervo"]
    P10{"Encaminhamento sem responsável ou prazo?"}
    P10 -->|sim| E3["422 VALIDACAO details.followUps"]
    P11["confirm: TaskItem ATA_REGISTRO (sourceKind ATA_VIVA) na fase sugerida + 1 TaskItem por encaminhamento (responsibleId, dueAt) + ProjectTaskDependency ata → encaminhamento · status CONFIRMADA"]
    P12["DeciaBridgeService.publishMinutes: SessionMessage com anexos + DecisionTrace ATA_VIVA · Notification ratificar/contestar · ratificationDeadlineAt = +48 h"]
    P13["ratify: DP ATA_RATIFICADA idempotente (RF42) · contest: status CONTESTADA + motivo + Notification ao organizador"]
  end

  subgraph IA["AiEngine (TRANSCREVER · ATA_VIVA)"]
    I1["Transcrição (quando áudio) via TranscriptionPort"]
    I2["Ata estruturada + classificação dos trechos como no RF7 (ARGUMENTO · DIVERGENCIA · RISCO · CONSENSO · PERGUNTA)"]
    I3["Claude → Gemini → LocalEngine (estrutura por regras)"]
    I4["AiInferenceLog"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL meetings · meeting_transcripts (AES) · recording_consents · tasks · project_tasks · project_task_dependencies · pipeline_jobs · audit_log")]
    D2[("S3 restricted/meetings áudio temporário · flag storage.s3")]
    D3[("Cassandra messages_by_session · notifications_by_user · trace_by_entity · flag cassandra.enabled")]
  end

  A2 --> A5 --> F2 --> W1 --> P2
  A3 --> A5
  A4 --> F1 --> W1 --> P1 -->|sim| P9
  A2 --> F1 --> W1 --> P1 -->|sim| P3 --> P4 --> D2
  P2 -->|sim| P3
  P4 --> P5 --> I1 --> I4 --> P6
  P7 --> D1
  P8 --> D2
  P5 --> D1
  P6 --> P9 --> I2 --> I3 --> I4 --> F3 --> A6 --> A7
  A8 --> F4 --> W1 --> P10 -->|não| P11 --> D1 --> P12 --> D3
  P12 --> A9
  A11 --> F4 --> P13 --> D1
  A12 --> F4 --> P13
  E1 --> W2
  E2 --> W2
  E3 --> W2
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
  participant S3 as S3
  participant CAS as Cassandra
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>FE: Nova reunião na sessão, grava no navegador
  FE->>C: POST /api/meetings {sessionId, source GRAVACAO_NAVEGADOR}
  C->>S: MeetingService.start(actor, form)
  S->>S: Guard.requireParticipant(actor, sessionId)
  S->>DB: insert meetings (GRAVANDO)
  S-->>FE: 201 Meeting
  loop cada participante
    FE->>C: POST /api/meetings/{id}/consent {consented}
    C->>S: MeetingService.consent(actor, id, consented)
    S->>DB: insert recording_consents (userId, at, ip)
  end
  U->>FE: encerra a gravação e envia
  FE->>C: POST /api/meetings/{id}/audio (webm)
  C->>S: MeetingService.uploadAudio(actor, id, media)
  alt falante sem consentimento
    S-->>C: 409 CONSENTIMENTO_PENDENTE
  else ok
    S->>S: UploadGuard magic bytes + limite por formato
    S->>S3: put restricted/meetings/{id}.webm
    S->>DB: update meetings TRANSCREVENDO, audioMediaId · pipeline_jobs TRANSCRICAO
    S-->>FE: 202
  end
  S->>AI: run(TRANSCREVER) via TranscriptionPort
  AI-->>S: segmentos por falante
  S->>DB: insert meeting_transcripts (text AES-GCM, segmentsJson)
  alt recordingRetentionPolicy padrão
    S->>S3: delete áudio
    S->>DB: audioMediaId = null · audit_log MEETING_AUDIO_PURGED
  end
  S->>AI: run(ATA_VIVA, transcrição mascarada)
  alt provedor indisponível
    AI-->>S: LocalEngine estrutura por regras · fallbackUsed
  else ok
    AI-->>S: ata (participantes, pauta, deliberações, encaminhamentos, divergências, pendências) + classificação RF7 ✦
  end
  AI->>DB: insert ai_inference_log
  S->>DB: update meetings ATA_PROPOSTA (rascunho em cache, nada no acervo)
  S->>EV: MinutesProposed → Notification ao organizador

  U->>FE: revisa e confirma a ata e 3 encaminhamentos
  FE->>C: POST /api/meetings/{id}/confirm (MinutesDraft)
  C->>S: MeetingService.confirm(actor, id, draft)
  alt encaminhamento sem responsável ou prazo
    S-->>C: 422 VALIDACAO details.followUps
  else ok
    S->>DB: insert tasks ATA_REGISTRO (sourceKind ATA_VIVA, aiGenerated) + project_tasks (fase sugerida)
    S->>DB: insert tasks por encaminhamento (responsibleId, dueAt) + project_tasks + project_task_dependencies (ata → encaminhamento)
    S->>DB: update meetings CONFIRMADA, minutesTaskId, followUpTaskIdsJson, ratificationDeadlineAt +48 h
    S->>EV: MinutesConfirmed
    S-->>FE: 200
  end
  EV->>S: DeciaBridgeService.publishMinutes(sessionId, taskId, followUps)
  S->>CAS: messages_by_session (authorKind SISTEMA, anexos ata + encaminhamentos)
  S->>DB: decision_trace_nodes ATA_VIVA + edges ANEXOU
  EV->>CAS: Notification ARTEFATO ratificar ou contestar em 48 h

  U->>FE: participante ratifica
  FE->>C: POST /api/meetings/{id}/ratify
  C->>S: MeetingService.ratify(actor, id)
  S->>DB: insert decia_points_ledger ATA_RATIFICADA (idempotencyKey ATA+meetingId+userId)
  S-->>FE: 204
```

## 4. Máquina de estados

Entidade central: `Meeting.status` (`MeetingStatus`).

```mermaid
stateDiagram-v2
  [*] --> GRAVANDO: POST /api/meetings com source GRAVACAO_NAVEGADOR ou ARQUIVO (CA01) · consentimentos por participante (CA05)
  [*] --> TRANSCREVENDO: source TRANSCRICAO_COLADA (sem áudio, CA01)
  GRAVANDO --> TRANSCREVENDO: áudio enviado para restricted/ · PipelineJob TRANSCRICAO · 409 CONSENTIMENTO_PENDENTE se faltar consentimento
  TRANSCREVENDO --> ATA_PROPOSTA: MeetingTranscript gravado · áudio apagado por padrão (CA05) · IA gera ata estruturada ✦ (CA02)
  TRANSCREVENDO --> GRAVANDO: falha de transcrição · usuário reenvia
  ATA_PROPOSTA --> ATA_PROPOSTA: organizador edita a ata e os encaminhamentos
  ATA_PROPOSTA --> CONFIRMADA: confirmar → ATA_REGISTRO + tarefas de encaminhamento + dependências (CA03) · publicada na sessão (CA04)
  CONFIRMADA --> CONTESTADA: participante contesta em 48 h com motivo (CA04)
  CONTESTADA --> ATA_PROPOSTA: organizador corrige a ata (nova versão da tarefa ATA_REGISTRO)
  CONFIRMADA --> [*]: prazo de 48 h vence sem contestação · ratificações creditam DP
  note right of CONFIRMADA
    Nada é persistido no acervo antes de CONFIRMADA (CA03).
    Rastro: nó ATA_VIVA ligado à sessão (CA04).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/meetings/new · meetings/[id] · decia/[sessionId] (botão Nova reunião) · projects/[id]"]
    R2["components: Recorder (MediaRecorder) · Upload · ConsentDialog · MinutesEditor · TaskCard (layout list, variants GERADA_IA) · Tag (MessageClass) · Due · Spark ✦"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    MCO["MeetingController (@Operation RF37.CA01-CA05)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    MS["decia/MeetingService"]
    TRS["decia/TranscriptionService (purge por recordingRetentionPolicy)"]
    BS["decia/DeciaBridgeService (RF29)"]
    TS["acervo/TaskService · projects/ProjectService"]
    DPS["points/DeciaPointsService (ATA_RATIFICADA)"]
    AIE["ai/AiEngine (TRANSCREVER · ATA_VIVA) · Masking (main)"]
    OM["security/OwnMedia (restricted/meetings)"]
    UG["security/UploadGuard"]
    GD["security/Guard (main)"]
    AUD["audit/AuditLogPort (main)"]
    DE["events/DomainEvents AFTER_COMMIT"]
    PORTS["ports: StoragePort · TranscriptionPort · MessagePort · TracePort · AiProviderPort"]
  end
  subgraph DOM["ws-domain"]
    ENT["Meeting · MeetingTranscript (AesGcmStringConverter, main) · RecordingConsent · MeetingStatus · MeetingSource (planejado) · MediaObject (V2)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql meetings · meeting_transcripts · recording_consents (V__rf37)"]
    S3A["storage-s3 restricted/meetings (flag storage.s3)"]
    PLAT["platform: PlatformTranscriptionAdapter (STT) · antivírus hook"]
    CASA["persistence-cassandra messages · notifications · trace (flag cassandra.enabled)"]
    AIP["ai-providers ai-claude · ai-gemini · ai-local"]
  end
  BFF --> MCO --> SEC
  MCO --> MS
  MS --> TRS
  MS --> BS
  MS --> TS
  MS --> DPS
  MS --> AIE
  MS --> OM
  MS --> UG
  MS --> GD
  MS --> AUD
  MS --> DE
  TRS --> PORTS
  BS --> PORTS
  AIE --> PORTS
  MS --> ENT --> MY --> MYSQL[("MySQL 8")]
  PORTS --> S3A --> S3[("S3 / MinIO")]
  PORTS --> PLAT
  PORTS --> CASA --> CASS[("Cassandra")]
  PORTS --> AIP --> AI["Claude / Gemini / local"]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF37.CA01 | `Meeting` (sessionId/projectId, `MeetingSource`), `MeetingService.start/uploadAudio/pasteTranscript`, `UploadGuard`, `OwnMedia` | A0 → A1 → A2/A3/A4 → F1 → P1 (403) → P3 → P4 | 1–6, 11–18 | `[*] → GRAVANDO / TRANSCREVENDO` | `Recorder`, `Upload`, `MS`, `S3A` |
| RF37.CA02 | `TranscriptionService.transcribe`, `MeetingTranscript.segmentsJson` (classLabel RF7), `AiCapability TRANSCREVER/ATA_VIVA`, `MeetingService.proposeMinutes` | P5 → I1 · P9 → I2 → I3 → I4 → F3 | 19–21, 26–31 | `TRANSCREVENDO → ATA_PROPOSTA` | `TRS`, `PLAT`, `AIE`, `MinutesEditor` |
| RF37.CA03 | `MeetingService.confirm`, `TaskItem ATA_REGISTRO sourceKind ATA_VIVA`, tarefas de encaminhamento (`responsibleId`, `dueAt`), `ProjectTaskDependency`, `minutesTaskId/followUpTaskIdsJson` | A6 → A7 → A8 → F4 → P10 (422) → P11 | 32–40 | `ATA_PROPOSTA → CONFIRMADA` + nota | `TS`, `TaskCard`, `Due` |
| RF37.CA04 | `DeciaBridgeService.publishMinutes`, `SessionMessage` + `MessageAttachment`, nó `ATA_VIVA`, `Notification`, `ratificationDeadlineAt`, `MeetingService.ratify/contest`, DP `ATA_RATIFICADA` | P12 → A9 → A10 → A11/A12 → P13 | 41–49 | `CONFIRMADA → CONTESTADA → ATA_PROPOSTA` · `CONFIRMADA → [*]` | `BS`, `CASA`, `DPS` |
| RF37.CA05 | `RecordingConsent`, `MeetingService.consent` (409 CONSENTIMENTO_PENDENTE), `TranscriptionService.purgeAudio`, `Company.recordingRetentionPolicy`, `AuditLog MEETING_AUDIO_PURGED`, `UserConsent GRAVACAO_REUNIOES_PADRAO` | A5 → F2 → P2 (409) · P6 → P7/P8 | 7–10, 13–14, 22–25 | nota de GRAVANDO | `ConsentDialog`, `OM`, `AUD`, `S3A` |
