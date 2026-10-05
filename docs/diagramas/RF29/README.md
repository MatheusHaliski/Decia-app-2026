# RF29 — Integrar o DECIA ao Criador de Projetos — compartilhar tarefas/artefatos na sessão, abrir sessão a partir de um projeto, transformar argumentos/divergências/decisões em tarefas e manter o Rastro de Decisão
**HU:** HU29 · **Sprint (board Work Station):** Sprint 4 (comprometido) · **Equivalente FAI:** RF10 Copilot (origem COPILOT nos esquemas), aqui elevado a **hub do app** · **Aba/rota:** botão **Abrir sessão DECIA** no projeto (`/projects/[id]`, Mesa `/desk`), sessão (`/decia/[sessionId]`: composer com anexos do acervo, ação "Transformar em tarefa", "Criar projeto a partir desta sessão"), painel **Por que isto existe?** em `/tasks/[id]` e `/projects/[id]`, indicador em `/admin/dashboard` (RF18)
**Critérios de aceite cobertos:** RF29.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs. A sessão em si (tema, mensagens, classificação, resumo, decisão, revisão) está em `docs/produto/DECIA_SESSAO_E_MESA.md` e nos PlantUML `docs/produto/decia/*.puml`; aqui só a **ponte** com o Criador de Projetos e o **Rastro de Decisão**.

O **Rastro de Decisão** (`DecisionTrace`) é um grafo append-only — `DecisionTraceNode` (MENSAGEM · CLASSIFICACAO · DIVERGENCIA · PERGUNTA · RESUMO · CENARIO · DECISAO · REVISAO · TAREFA · PROJETO · ARTEFATO · ATA_VIVA · CONFORMIDADE) e `DecisionTraceEdge` (ORIGINOU · CLASSIFICOU · RESPONDEU · RESUMIU · DECIDIU · REVISOU · TRANSFORMOU_EM · ANEXOU · VERIFICOU) — gravado no MySQL e espelhado em Cassandra `trace_by_entity` (flag `cassandra.enabled`). Renderiza-se como o **fio de decisão** (`DecisionThread`, RF38.CA07): linha vertical, nós coloridos por `classLabel` (ARGUMENTO azul · DIVERGENCIA laranja · RISCO vermelho · CONSENSO verde · PERGUNTA roxo), carimbo VALIDADO/DEVOLVIDO no fim (`Stamp`). Imutável: nenhuma API de UPDATE/DELETE; exclusão de tarefa mantém o nó via `snapshotJson` (RF23).

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_decia {
  class DeciaSession {
    <<entity>>
    +id: UUID
    +topic: String
    +adminUserId: UUID
    +createdByUserId: UUID
    +companyId: UUID
    +departmentId: UUID
    +accessMode: SessionAccess
    +status: SessionStatus
    +aiMode: AiMode
    +linkedProjectId: UUID
    +planAxisId: UUID
    +startedAt: Instant
    +closedAt: Instant
    .. +6 campos ..
  }
  class SessionParticipant {
    <<entity>>
    +sessionId: UUID
    +userId: UUID
    +role: ParticipantRole
  }
  class SessionMessage {
    <<entity>>
    +id: TIMEUUID
    +sessionId: UUID
    +authorId: UUID
    +authorKind: String
    +bodyMd: String
    +attachmentsJson: JSON
    +classificationId: UUID
    +sentAt: Instant
    +correlationId: String
  }
  class MessageAttachment {
    <<entity>>
    +id: UUID
    +messageId: UUID
    +targetType: String
    +targetId: UUID
    +snapshotJson: JSON
    +usedInDecision: boolean
  }
  class MessageClassification {
    <<entity>>
    +messageId: UUID
    +label: MessageClass
    +confidence: BigDecimal
    +hasEvidence: boolean
    +linkedTaskId: UUID
    +linkedProjectId: UUID
    +aiInferenceId: UUID
  }
  class AnalyticalSummary {
    <<entity>>
    +sessionId: UUID
    +recommendationsJson: JSON
    +complianceResultId: UUID
    +status: String
  }
  class FinalDecision {
    <<entity>>
    +id: UUID
    +sessionId: UUID
    +summaryId: UUID
    +decisionText: String
    +chosenScenarioId: UUID
    +status: DecisionStatus
    +reviewId: UUID
    +resultingTaskId: UUID
    +stampJson: JSON
  }
  class DecisionReview {
    <<entity>>
    +decisionId: UUID
    +reviewerId: UUID
    +outcome: String
    +reason: String
    +reviewedAt: Instant
  }
  class SessionArtifact {
    <<entity>>
    +sessionId: UUID
    +kind: String
    +contentMd: String
    +convertedTaskId: UUID
  }
  class DecisionTraceNode {
    <<entity>>
    +id: UUID
    +sessionId: UUID
    +nodeType: TraceNodeType
    +refId: UUID
    +label: String
    +classLabel: MessageClass
    +actorId: UUID
    +at: Instant
    +snapshotJson: JSON
  }
  class DecisionTraceEdge {
    <<entity>>
    +id: UUID
    +fromNodeId: UUID
    +toNodeId: UUID
    +relation: TraceRelation
    +at: Instant
  }
  class TraceNodeType {
    <<enum>>
    MENSAGEM
    CLASSIFICACAO
    DIVERGENCIA
    PERGUNTA
    RESUMO
    CENARIO
    DECISAO
    REVISAO
    TAREFA
    PROJETO
    ARTEFATO
    ATA_VIVA
    CONFORMIDADE
  }
  class TraceRelation {
    <<enum>>
    ORIGINOU
    CLASSIFICOU
    RESPONDEU
    RESUMIU
    DECIDIU
    REVISOU
    TRANSFORMOU_EM
    ANEXOU
    VERIFICOU
  }
  class DecisionStatus {
    <<enum>>
    PROPOSTA
    EM_REVISAO
    VALIDADA
    DEVOLVIDA
    SUBSTITUIDA
  }
}

namespace ws_domain_projects_acervo {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +title: String
    +objective: String
    +origin: SchemeOrigin
    +sourceSessionId: UUID
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +planAxisId: UUID
    +lastDeciaEventAt: Instant
    .. +30 campos ..
  }
  class ProjectTask {
    <<entity>>
    +projectId: UUID
    +taskId: UUID
    +phase: ProjectPhase
    +snapshotJson: JSON
    +decisionTraceNodeId: UUID
  }
  class TaskItem {
    <<entity>>
    +id: UUID
    +title: String
    +type: TaskType
    +sourceKind: SourceKind
    +state: TaskState
    .. +50 campos ..
  }
}

namespace ws_application {
  class DeciaBridgeService {
    <<service>>
    +openSessionFromProject(actor, projectId) DeciaSession
    +createProjectFromSession(actor, sessionId) ProjectScheme
    +attachToMessage(actor, sessionId, draft, attachments) SessionMessage
    +transformMessageIntoTask(actor, sessionId, messageId, TaskForm) TaskItem
    +onDecisionReviewed(DecisionReviewed) TaskItem
  }
  class DecisionTraceService {
    <<service>>
    +append(node, edgeFrom, relation) DecisionTraceNode
    +thread(targetType, targetId) List~DecisionTraceNode~
    +export(sessionId, format) MediaObject
  }
  class DeciaSessionService {
    <<service>>
    +create(topic, participants, linkedProjectId) DeciaSession
  }
  class SummaryService {
    <<service>>
    +generate(sessionId) AnalyticalSummary
  }
  class MetricCalculator {
    <<service>>
    +decisionsWithTrace(scope, period) MetricSnapshot
  }
  class Guard {
    <<service>>
    +requireOwner(actor, ownerId)
    +requireParticipant(actor, sessionId)
    +requireSessionAdmin(actor, sessionId)
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
  }
  class TracePort {
    <<port>>
    +mirror(DecisionTraceNode)
  }
  class MessagePort {
    <<port>>
    +append(SessionMessage)
  }
  class StoragePort {
    <<port>>
    +put(key, bytes)
  }
  class DomainEvents {
    <<service>>
    +publish(event)
  }
}

namespace ws_web {
  class DeciaBridgeController {
    <<controller>>
    +POST_api_projects_id_decia_session()
    +POST_api_decia_sessions_id_project()
    +POST_api_decia_sessions_id_messages(body, attachments)
    +POST_api_decia_sessions_id_messages_mid_to_task(TaskForm)
    +GET_api_trace(targetType, targetId)
    +GET_api_decia_sessions_id_trace_export(format)
  }
}

namespace ws_infrastructure {
  class CassandraTraceAdapter {
    <<adapter>>
  }
  class CassandraMessageAdapter {
    <<adapter>>
  }
  class S3StorageAdapter {
    <<adapter>>
  }
}

DeciaSession "0..1" --> "0..1" ProjectScheme : linkedProjectId
ProjectScheme "0..*" --> "0..1" DeciaSession : sourceSessionId
DeciaSession "1" o-- "0..*" SessionParticipant
DeciaSession "1" o-- "0..*" SessionMessage
SessionMessage "1" o-- "0..5" MessageAttachment
SessionMessage "1" --> "0..1" MessageClassification
DeciaSession "1" o-- "0..*" AnalyticalSummary
AnalyticalSummary "1" --> "0..1" FinalDecision
FinalDecision "1" --> "0..1" DecisionReview
FinalDecision "0..1" --> "0..1" TaskItem : resultingTaskId ATA_REGISTRO
SessionArtifact "0..1" --> "0..1" TaskItem : convertedTaskId
DeciaSession "1" o-- "0..*" DecisionTraceNode
DecisionTraceNode "1" o-- "0..*" DecisionTraceEdge : from
DecisionTraceNode ..> SessionMessage : refId
DecisionTraceNode ..> TaskItem : refId
DecisionTraceNode ..> ProjectScheme : refId
ProjectTask "0..*" --> "0..1" DecisionTraceNode : decisionTraceNodeId
ProjectScheme "1" *-- "0..*" ProjectTask
DeciaBridgeController --> DeciaBridgeService
DeciaBridgeController --> DecisionTraceService
DeciaBridgeService --> DeciaSessionService
DeciaBridgeService --> DecisionTraceService
DeciaBridgeService --> Guard
DeciaBridgeService --> MessagePort
DeciaBridgeService --> DomainEvents
DeciaBridgeService --> AiEngine : fases sugeridas
DecisionTraceService --> TracePort
DecisionTraceService --> StoragePort
SummaryService ..> AnalyticalSummary : recommendationsJson com tarefas e eixo
MetricCalculator ..> DecisionTraceNode : vw_decisions_with_trace
CassandraTraceAdapter ..|> TracePort
CassandraMessageAdapter ..|> MessagePort
S3StorageAdapter ..|> StoragePort
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (dono do projeto · participante · chefe revisor)"]
    A0([No projeto]) --> A1["Clica Abrir sessão DECIA"]
    A2([Na sessão]) --> A3{"Ação"}
    A3 -->|escrever| A4["Mensagem + até 5 anexos do acervo (busca rápida ou arrastar)"]
    A3 -->|transformar| A5["Transformar em tarefa em mensagem classificada"]
    A3 -->|criar projeto| A6["Criar projeto a partir desta sessão"]
    A7([Chefe valida ou devolve a decisão final])
    A8([Em qualquer tarefa ou projeto]) --> A9["Abre painel Por que isto existe?"]
    A10["Exporta rastro PDF/JSON"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/projects/[id] · decia/[sessionId] · tasks/[id])"]
    F1["POST /api/projects/{id}/decia-session"]
    F2["Composer: AttachmentPicker (TaskCard attachment) · POST /messages"]
    F3["Formulário do RF20 pré-preenchido (tipo, título, descrição = texto da mensagem, fase sugerida ✦)"]
    F4["POST /api/decia/sessions/{id}/project"]
    F5["DecisionThread (fio) + Stamp · navega até a mensagem original"]
    F6["GET /api/decia/sessions/{id}/trace/export?format=pdf|json"]
  end

  subgraph WEB["ws-web · DeciaBridgeController"]
    W1["JWT · CorrelationIdFilter · rate limit por usuário (mensagens)"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application · DeciaBridgeService · DecisionTraceService"]
    P1{"Guard.requireOwner(projeto) ou requireDeptHead?"}
    P1 -->|não| E1["403 ACESSO_NEGADO"]
    P1 -->|sim| P2["DeciaSession(topic = objective, participantes = responsáveis + chefe, linkedProjectId) · anexa tarefas como contexto"]
    P2 --> P3["ProjectScheme.status = EM_DECISAO · DecisionTrace PROJETO → ANEXOU → SESSAO"]
    P4{"Guard.requireParticipant e sessão ATIVA/REABERTA?"}
    P4 -->|não| E2["409 SESSAO_NAO_ATIVA ou 403"]
    P5{"Anexos: até 5 e todos visíveis ao autor?"}
    P5 -->|mais de 5| E3["422 VALIDACAO details.attachments"]
    P5 -->|item sem permissão| E4["403 ACESSO_NEGADO"]
    P5 -->|ok| P6["SessionMessage + MessageAttachment com snapshotJson · DecisionTrace MENSAGEM → ANEXOU → TAREFA/PROJETO"]
    P7{"Mensagem classificada como ARGUMENTO · DIVERGENCIA · RISCO · CONSENSO · PERGUNTA?"}
    P7 -->|RUIDO ou sem classificação| E5["409 CLASSIFICACAO_INVALIDA"]
    P7 -->|sim| P8["TaskItem (TEXTO_MANUAL ou ATA_REGISTRO, sourceKind DECIA) + ProjectTask na fase sugerida · DecisionTrace MENSAGEM → TRANSFORMOU_EM → TAREFA"]
    P9["ProjectScheme origin DECIA + tarefas dos artefatos (RF13) e das decisões, fases sugeridas pela IA"]
    P10{"DecisionReview.outcome"}
    P10 -->|VALIDADA| P11["TaskItem ATA_REGISTRO na fase APROVACAO, stampJson VALIDADO (data, revisor) · projeto APROVADO"]
    P10 -->|DEVOLVIDA| P12["TaskItem ATA_REGISTRO com carimbo DEVOLVIDO e motivo · projeto DEVOLVIDO"]
    P13["DecisionTraceService.thread(target): nós + arestas + autores + datas · navegável até a mensagem (mesmo ENCERRADA/ARQUIVADA)"]
    P14["Export append-only: JSON canônico + PDF (PipelineJob EXPORT_PDF) · checksum"]
    P15["MetricCalculator: % projetos CONCLUIDO com decisão VALIDADA e rastro completo (objetivo 1)"]
  end

  subgraph IA["AiEngine"]
    I1["CLASSIFICAR_MENSAGEM liga argumento à tarefa/projeto citado (linkedTaskId)"]
    I2["COMPOR_PROJETO sugere fase da tarefa transformada ✦"]
    I3["RESUMO_ANALITICO lista por recomendação tarefas, projetos afetados e eixo do plano (RF24)"]
    I4["AiInferenceLog"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL decia_sessions · session_messages_idx · message_attachments · decision_trace_nodes · decision_trace_edges · tasks · project_tasks")]
    D2[("Cassandra messages_by_session · trace_by_entity · flag cassandra.enabled")]
    D3[("S3 exports PDF/JSON · flag storage.s3")]
    D4[("MySQL view vw_decisions_with_trace · metric_snapshots")]
  end

  A1 --> F1 --> W1 --> P1
  P3 --> D1
  P3 --> D2
  A4 --> F2 --> W1 --> P4 -->|sim| P5
  P6 --> D1
  P6 --> D2
  P6 --> I1 --> I4
  A5 --> F3 --> W1 --> P4 --> P7
  P8 --> I2
  P8 --> D1
  A6 --> F4 --> W1 --> P4 --> P9 --> D1
  A7 --> P10
  P11 --> D1
  P12 --> D1
  A9 --> F5 --> W1 --> P13 --> D1
  A10 --> F6 --> W1 --> P14 --> D3
  I3 --> I4
  P15 --> D4
  E1 --> W2
  E2 --> W2
  E3 --> W2
  E4 --> W2
  E5 --> W2
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
  participant CAS as Cassandra
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: CA01 — abrir sessão a partir do projeto
  U->>FE: Abrir sessão DECIA no projeto
  FE->>C: POST /api/projects/{id}/decia-session
  C->>S: DeciaBridgeService.openSessionFromProject(actor, id)
  S->>S: Guard.requireOwner(actor, project.ownerId) ou requireDeptHead
  alt sem permissão
    S-->>C: 403 ACESSO_NEGADO
  else ok
    S->>DB: insert decia_sessions (topic = objective, linkedProjectId) + session_participants (responsáveis + chefe)
    S->>DB: update project_schemes status EM_DECISAO, lastDeciaEventAt
    S->>DB: insert decision_trace_nodes PROJETO, SESSAO + edge ANEXOU
    S->>EV: SessionOpenedFromProject
    S-->>C: 201 DeciaSession
  end
  EV->>CAS: trace_by_entity (cassandra.enabled)
  EV->>AI: contexto da sessão = tarefas do projeto (anexos do RF29.CA01)

  Note over U,EV: CA03 + CA04 — mensagem com anexos e Transformar em tarefa
  U->>FE: escreve mensagem e anexa 2 tarefas
  FE->>C: POST /api/decia/sessions/{id}/messages {bodyMd, attachments[2]}
  C->>S: DeciaBridgeService.attachToMessage(actor, id, draft, attachments)
  S->>S: Guard.requireParticipant + visibilidade de cada anexo
  alt mais de 5 anexos
    S-->>C: 422 VALIDACAO details.attachments
  else ok
    S->>CAS: insert messages_by_session (TIMEUUID)
    S->>DB: insert session_messages_idx + message_attachments (snapshotJson)
    S->>DB: insert decision_trace_nodes MENSAGEM + edge ANEXOU → TAREFA
    S->>EV: MessageSent
    S-->>C: 201
  end
  EV->>AI: run(CLASSIFICAR_MENSAGEM)
  AI-->>EV: MessageClassification ARGUMENTO hasEvidence linkedTaskId
  EV->>DB: insert message_classifications + node CLASSIFICACAO + edge CLASSIFICOU
  U->>FE: Transformar em tarefa (fase sugerida ✦)
  FE->>C: POST /api/decia/sessions/{id}/messages/{mid}/to-task (TaskForm)
  C->>S: DeciaBridgeService.transformMessageIntoTask(actor, id, mid, form)
  alt classificação RUIDO ou inexistente
    S-->>C: 409 CLASSIFICACAO_INVALIDA
  else ok
    S->>AI: run(COMPOR_PROJETO, sugerir fase)
    AI-->>S: fase sugerida + AiInferenceLog
    S->>DB: insert tasks (TEXTO_MANUAL ou ATA_REGISTRO, sourceKind DECIA) + project_tasks (fase) + node TAREFA + edge TRANSFORMOU_EM
    S-->>C: 201 TaskItem
  end

  Note over U,EV: CA05 — decisão validada vira tarefa ATA_REGISTRO
  U->>FE: chefe valida a decisão final (RF15)
  FE->>C: POST /api/decia/decisions/{did}/review {VALIDADA}
  C->>S: DecisionReviewService.review → DomainEvents DecisionReviewed
  S->>EV: DecisionReviewed(VALIDADA)
  EV->>S: DeciaBridgeService.onDecisionReviewed
  S->>DB: insert tasks ATA_REGISTRO (fase APROVACAO, stampJson VALIDADO, revisor) + update project_schemes APROVADO + resultingTaskId
  S->>DB: node DECISAO, REVISAO, TAREFA + edges REVISOU, TRANSFORMOU_EM
  EV->>CAS: trace_by_entity

  Note over U,EV: CA06 + CA07 — fio de decisão e exportação
  U->>FE: abre Por que isto existe? na tarefa
  FE->>C: GET /api/trace?targetType=TASK&targetId=
  C->>S: DecisionTraceService.thread(TASK, id)
  S->>DB: nodes + edges + autores + datas (mesmo sessão ENCERRADA)
  S-->>FE: DecisionThread com links para as mensagens originais
  U->>FE: exportar rastro
  FE->>C: GET /api/decia/sessions/{id}/trace/export?format=pdf
  C->>S: DecisionTraceService.export(id, PDF)
  S->>S3: put exports/{sessionId}/trace.pdf (PipelineJob EXPORT_PDF)
  S-->>FE: 202 + link quando pronto (Notification)
```

## 4. Máquina de estados

Entidade central: `FinalDecision.status` (`DecisionStatus`) — é a decisão que fecha o fio e muda o `ProjectStatus` do projeto vinculado (`EM_DECISAO → APROVADO | DEVOLVIDO`). O `DecisionTraceNode` não tem estado: é append-only.

```mermaid
stateDiagram-v2
  [*] --> PROPOSTA: IA propõe a decisão final a partir do resumo (RF12) · nó DECISAO + aresta DECIDIU
  PROPOSTA --> EM_REVISAO: admin da sessão encaminha ao revisor · projeto continua EM_DECISAO
  EM_REVISAO --> VALIDADA: DecisionReview VALIDADA → tarefa ATA_REGISTRO em APROVACAO com carimbo VALIDADO · projeto APROVADO (CA05)
  EM_REVISAO --> DEVOLVIDA: DecisionReview DEVOLVIDA com motivo → tarefa ATA_REGISTRO com carimbo DEVOLVIDO · projeto DEVOLVIDO (CA05)
  DEVOLVIDA --> SUBSTITUIDA: sessão reaberta (RF14) gera nova decisão PROPOSTA
  SUBSTITUIDA --> [*]
  VALIDADA --> [*]
  note right of VALIDADA
    Fio completo: MENSAGEM → CLASSIFICACAO → TAREFA → PROJETO → DECISAO → REVISAO.
    Conta para vw_decisions_with_trace (CA09).
  end note
  note left of PROPOSTA
    Todo nó e aresta são append-only (CA07):
    reabrir não apaga, substitui.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/projects/[id] (botão Abrir sessão) · decia/[sessionId] (composer, Transformar em tarefa, Criar projeto) · tasks/[id] e projects/[id] (painel Por que isto existe?) · admin/dashboard"]
    R2["components: AttachmentPicker · TaskCard attachment · DecisionThread · Stamp · Spark ✦ · PhaseBar · Button transformar-tarefa/abrir-decia · Confetti"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    BC["DeciaBridgeController (@Operation RF29.CA01-CA09)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    BS["decia/DeciaBridgeService"]
    TS["decia/DecisionTraceService (append-only)"]
    SS["decia/DeciaSessionService · SummaryService · DecisionReviewService"]
    PS["projects/ProjectService · acervo/TaskService (RF20/RF21)"]
    MC["metrics/MetricCalculator (vw_decisions_with_trace)"]
    AIE["ai/AiEngine (CLASSIFICAR_MENSAGEM · COMPOR_PROJETO · RESUMO_ANALITICO)"]
    GD["security/Guard (sec-b3 + requireParticipant/requireSessionAdmin planejados)"]
    DE["events/DomainEvents AFTER_COMMIT"]
    PORTS["ports: MessagePort · TracePort · StoragePort · AiProviderPort"]
  end
  subgraph DOM["ws-domain"]
    ENT["DeciaSession · SessionMessage · MessageAttachment · MessageClassification · FinalDecision · DecisionReview · DecisionTraceNode · DecisionTraceEdge · ProjectScheme · ProjectTask · TaskItem (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql decision_trace_* · session_messages_idx · view vw_decisions_with_trace"]
    CASA["persistence-cassandra messages_by_session · trace_by_entity (flag cassandra.enabled)"]
    S3A["storage-s3 exports (flag storage.s3)"]
    AIP["ai-providers (ai-claude · ai-gemini · ai-local)"]
  end
  BFF --> BC --> SEC
  BC --> BS
  BC --> TS
  BS --> SS
  BS --> PS
  BS --> TS
  BS --> GD
  BS --> DE
  BS --> AIE
  DE --> BS
  DE --> MC
  TS --> PORTS
  BS --> PORTS
  AIE --> PORTS
  BS --> ENT --> MY --> MYSQL[("MySQL 8")]
  PORTS --> CASA --> CASS[("Cassandra")]
  PORTS --> S3A --> S3[("S3 / MinIO")]
  PORTS --> AIP --> AI["Claude / Gemini / local"]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF29.CA01 | `DeciaBridgeService.openSessionFromProject`, `DeciaSession.linkedProjectId/topic`, `ProjectStatus EM_DECISAO`, nó PROJETO → ANEXOU → SESSAO | A1 → F1 → P1 (403) → P2 → P3 | 1–12 | `PROPOSTA (projeto EM_DECISAO)` | `BC`, `BS`, `SS` |
| RF29.CA02 | `DeciaBridgeService.createProjectFromSession`, `SchemeOrigin DECIA`, `ProjectScheme.sourceSessionId`, `SessionArtifact.convertedTaskId` | A6 → F4 → P4 → P9 | — (POST /sessions/{id}/project) | — | `BS`, `PS`, `AIE` |
| RF29.CA03 | `MessageAttachment` (≤ 5, `snapshotJson`), `DeciaBridgeService.attachToMessage`, `Guard.requireParticipant` | A4 → F2 → P4 → P5 (422/403) → P6 | 13–22 | — | `AttachmentPicker`, `TaskCard attachment`, `CASA` |
| RF29.CA04 | `DeciaBridgeService.transformMessageIntoTask`, `MessageClassification.label`, `TaskItem sourceKind DECIA`, `ProjectTask.phase`, aresta TRANSFORMOU_EM | A5 → F3 → P7 (409 CLASSIFICACAO_INVALIDA) → P8 → I2 | 23–34 | — | `BS`, `Button transformar-tarefa` |
| RF29.CA05 | `DeciaBridgeService.onDecisionReviewed`, `FinalDecision.resultingTaskId/stampJson`, `DecisionReview.outcome/reason`, `TaskType ATA_REGISTRO`, fase APROVACAO | A7 → P10 → P11/P12 | 35–41 | `EM_REVISAO → VALIDADA` · `EM_REVISAO → DEVOLVIDA` | `DE`, `Stamp`, `Confetti` |
| RF29.CA06 | `DecisionTraceService.thread`, `DecisionTraceNode.classLabel/actorId/at`, `DecisionTraceEdge` | A8 → A9 → F5 → P13 | 42–46 | nota de VALIDADA | `DecisionThread`, `TS` |
| RF29.CA07 | append-only (sem UPDATE/DELETE), `DecisionTraceService.export`, `snapshotJson`, `PipelineJob EXPORT_PDF` | A10 → F6 → P14 | 47–51 | nota de PROPOSTA | `S3A`, `TS` |
| RF29.CA08 | `AnalyticalSummary.recommendationsJson[].affectedTaskIds/affectedProjectIds/planAxisId`, `SummaryService` | I3 → I4 | — (RF11) | — | `SS`, `AIE` |
| RF29.CA09 | `MetricCalculator.decisionsWithTrace`, view `vw_decisions_with_trace`, `MetricSnapshot` | P15 → D4 | — (RF18) | nota de VALIDADA | `MC`, `MY`, `admin/dashboard` |
