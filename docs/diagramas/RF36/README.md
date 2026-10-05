# RF36 — Gerar o Dossiê de Transição (handoff) quando um empregado muda de departamento, sai ou uma gestão encerra, transferindo projetos, tarefas e pendências com contexto
**HU:** HU36 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** — (ideia nova; usa Agrupamentos/Eras RF34 e o histórico RF17 do FAI) · **Aba/rota:** ação **Gerar dossiê de transição** no perfil do empregado visto pelo chefe (`/u/[username]`), na página do departamento (`/departments/[slug]/team`) e na GESTAO (`/groupings/[id]`); lista e detalhe em `/handoffs`, `/handoffs/[id]`; aceite do sucessor por notificação
**Critérios de aceite cobertos:** RF36.CA01 · CA02 · CA03 · CA04 · CA05 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs. Gatilhos externos: RF25.CA05 (encerrar GESTAO), RF28.CA07 (troca de chefe), RF9 (chefe remove empregado).

`HandoffDossier` (`subjectType` EMPREGADO · GESTAO; `reason` `HandoffReason` SAIDA · TRANSFERENCIA · FIM_GESTAO · TROCA_CHEFE; `status` `HandoffStatus` GERADO · AGUARDANDO_SUCESSOR · TRANSFERIDO · RECUSADO · CANCELADO) compila em `contentJson` projetos abertos por fase, tarefas pendentes/bloqueadas com prazos, sessões DECIA em andamento, decisões pendentes de revisão, contatos/fornecedores (`OrgEntity`) citados e um **resumo de contexto** por projeto redigido pela IA (`DOSSIE`) **sobre dados do sistema**. Materializa-se em `TaskItem` DOCUMENTO (PDF, `sourceKind DOSSIE`, faísca ✦) e `ProjectScheme` "Transição de [nome]" (`origin DOSSIE`) com as tarefas de encaminhamento, ligados ao rastro (nó TAREFA/PROJETO). O sucessor aceita → `HandoffItem`s transferem `responsibleId` (antigo fica `previousResponsibleId`), sessões ativas notificam a troca de participante (RF9), histórico intacto. Itens PRIVADOS só com `consentForPrivateItems`; saída nunca apaga tarefas usadas por outros (snapshot RF23).

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_handoff {
  class HandoffDossier {
    <<entity>>
    +id: UUID
    +subjectType: String
    +subjectUserId: UUID
    +groupingId: UUID
    +requestedBy: UUID
    +reason: HandoffReason
    +generatedAt: Instant
    +contentJson: JSON
    +documentTaskId: UUID
    +transitionProjectId: UUID
    +successorUserId: UUID
    +successorAcceptedAt: Instant
    +status: HandoffStatus
    +consentForPrivateItems: boolean
    +aiInferenceId: UUID
  }
  class HandoffItem {
    <<entity>>
    +id: UUID
    +dossierId: UUID
    +targetType: String
    +targetId: UUID
    +previousResponsibleId: UUID
    +newResponsibleId: UUID
    +transferredAt: Instant
    +note: String
  }
  class HandoffStatus {
    <<enum>>
    GERADO
    AGUARDANDO_SUCESSOR
    TRANSFERIDO
    RECUSADO
    CANCELADO
  }
  class HandoffReason {
    <<enum>>
    SAIDA
    TRANSFERENCIA
    FIM_GESTAO
    TROCA_CHEFE
  }
}

namespace ws_domain_alvos {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +responsibleId: UUID
    +type: TaskType
    +state: TaskState
    +visibility: Visibility
    +dueAt: LocalDate
    +sourceKind: SourceKind
    +aiGenerated: boolean
    .. +45 campos ..
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +title: String
    +origin: SchemeOrigin
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    .. +32 campos ..
  }
  class ProjectTask {
    <<entity>>
    +projectId: UUID
    +taskId: UUID
    +responsibleId: UUID
    +snapshotJson: JSON
  }
  class DeciaSession {
    <<entity>>
    +id: UUID
    +status: SessionStatus
    +adminUserId: UUID
  }
  class SessionParticipant {
    <<entity>>
    +sessionId: UUID
    +userId: UUID
    +leftAt: Instant
    +removeReason: String
  }
  class DecisionReview {
    <<entity>>
    +decisionId: UUID
    +reviewerId: UUID
  }
  class Grouping {
    <<entity>>
    +id: UUID
    +type: GroupingType
    +status: GroupingStatus
    +handoffDossierId: UUID
  }
  class DepartmentMembership {
    <<entity>>
    +userId: UUID
    +departmentId: UUID
    +endedAt: Instant
    +reason: String
  }
  class OrgEntity {
    <<entity>>
    +id: UUID
    +name: String
    +kind: String
  }
  class DecisionTraceNode {
    <<entity>>
    +nodeType: TraceNodeType
    +refId: UUID
  }
}

namespace ws_application {
  class HandoffService {
    <<service>>
    +generateForEmployee(actor, userId, reason, successorId, consent) HandoffDossier
    +generateForGrouping(groupingId, requestedBy) HandoffDossier
    +accept(actor, dossierId) HandoffDossier
    +refuse(actor, dossierId, reason) HandoffDossier
    +cancel(actor, dossierId, reason)
    -collect(subject) HandoffContent
    -materialize(dossier) void
  }
  class TransferService {
    <<service>>
    +transfer(items, newResponsibleId) List~HandoffItem~
  }
  class DeciaSessionService {
    <<service>>
    +replaceParticipant(sessionId, oldUserId, newUserId, reason)
  }
  class TaskService {
    <<service>>
    +createDocument(actor, TaskForm, mediaId) TaskItem
  }
  class ProjectService {
    <<service>>
    +create(actor, ProjectForm) ProjectScheme
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
  }
  class Guard {
    <<service>>
    +requireRole(actor, role)
    +requireDeptHead(actor, deptId)
    +requireOwner(actor, ownerId)
  }
  class StoragePort {
    <<port>>
    +put(key, pdf)
  }
  class JobPort {
    <<port>>
    +enqueue(EXPORT_PDF)
  }
  class DomainEvents {
    <<service>>
    +publish(event)
  }
}

namespace ws_web {
  class HandoffController {
    <<controller>>
    +POST_api_handoffs(subject, reason, successorId, consent)
    +GET_api_handoffs_id()
    +POST_api_handoffs_id_accept()
    +POST_api_handoffs_id_refuse(reason)
    +POST_api_handoffs_id_cancel(reason)
  }
}

namespace ws_infrastructure {
  class S3StorageAdapter {
    <<adapter>>
  }
  class PdfExportJob {
    <<adapter>>
  }
}

HandoffDossier "1" *-- "0..*" HandoffItem
HandoffDossier "0..1" --> "0..1" TaskItem : documentTaskId DOCUMENTO PDF
HandoffDossier "0..1" --> "0..1" ProjectScheme : transitionProjectId
HandoffDossier "0..1" --> "0..1" Grouping : groupingId GESTAO
HandoffItem ..> TaskItem : TASK
HandoffItem ..> ProjectScheme : PROJECT
HandoffItem ..> DeciaSession : SESSION
HandoffItem ..> DecisionReview : REVIEW
HandoffDossier ..> DepartmentMembership : saida ou transferencia
HandoffDossier ..> OrgEntity : contatos citados
HandoffDossier ..> DecisionTraceNode : rastro RF29
ProjectScheme "1" *-- "0..*" ProjectTask
DeciaSession "1" o-- "0..*" SessionParticipant
HandoffController --> HandoffService
HandoffService --> TransferService
HandoffService --> DeciaSessionService
HandoffService --> TaskService
HandoffService --> ProjectService
HandoffService --> AiEngine
HandoffService --> Guard
HandoffService --> StoragePort
HandoffService --> JobPort
HandoffService --> DomainEvents
DomainEvents ..> HandoffService : GroupingClosed GESTAO · HeadChanged · MemberRemoved
S3StorageAdapter ..|> StoragePort
PdfExportJob ..> JobPort
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (CHEFE · EMPRESA · sucessor · empregado que sai)"]
    A0([Gatilho]) --> A1{"Origem"}
    A1 -->|manual| A2["CHEFE/EMPRESA clica Gerar dossiê de transição para um empregado"]
    A1 -->|RF25.CA05| A3["GESTAO encerrada"]
    A1 -->|RF28.CA07| A4["Troca de chefe"]
    A5["Indica o sucessor e pede consentimento do empregado para itens PRIVADOS"]
    A6([Sucessor recebe notificação]) --> A7{"Aceita?"}
    A7 -->|sim| A8["Aceita a responsabilidade"]
    A7 -->|não| A9["Recusa com motivo"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/handoffs · u/[username] · departments/[slug]/team · groupings/[id])"]
    F1["HandoffForm (motivo, sucessor SelectList, Switch de consentimento) · POST /api/handoffs"]
    F2["HandoffView: projetos por fase, tarefas pendentes/bloqueadas, sessões, decisões, contatos, resumo ✦ por projeto · link do PDF"]
    F3["POST /api/handoffs/{id}/accept · /refuse"]
  end

  subgraph WEB["ws-web · HandoffController"]
    W1["JWT · CorrelationIdFilter"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application · HandoffService"]
    P1{"Guard.requireRole EMPRESA ou requireDeptHead do empregado?"}
    P1 -->|não| E1["403 ACESSO_NEGADO"]
    P2{"Já existe dossiê GERADO/AGUARDANDO para o mesmo sujeito?"}
    P2 -->|sim| E2["409 DOSSIE_EM_ANDAMENTO"]
    P3["collect: projetos abertos por fase · tarefas pendentes e BLOQUEADAS com prazos · sessões ATIVA/REABERTA · DecisionReview pendentes · OrgEntity citados"]
    P4{"Itens PRIVADOS do empregado?"}
    P4 -->|sem consentimento| P5["Excluídos do dossiê (só contagem)"]
    P4 -->|consentForPrivateItems| P6["Incluídos"]
    P7["materialize: TaskItem DOCUMENTO PDF (sourceKind DOSSIE, ✦) + ProjectScheme Transição de [nome] (origin DOSSIE) com tarefas de encaminhamento · DecisionTrace"]
    P8["status GERADO → AGUARDANDO_SUCESSOR · Notification TRANSICAO ao sucessor"]
    P9{"Ator é o sucessor indicado?"}
    P9 -->|não| E3["403 ACESSO_NEGADO"]
    P10["TransferService: HandoffItem por alvo · responsibleId = sucessor · previousResponsibleId = anterior · TaskStateLog · ProjectTask.responsibleId"]
    P11["DeciaSessionService.replaceParticipant nas sessões ativas · Notification PARTICIPANTE_ADICIONADO/REMOVIDO ao grupo (RF9) · histórico intacto"]
    P12["status TRANSFERIDO · AuditLog HANDOFF_TRANSFERRED"]
    P13["status RECUSADO (motivo obrigatório, 422 se vazio) · chefe indica outro sucessor"]
    P14["Saída nunca apaga tarefas usadas por outros: ProjectTask mantém snapshotJson (RF23)"]
  end

  subgraph IA["AiEngine (DOSSIE)"]
    I1["Resumo de contexto por projeto: onde parou, o que falta, riscos — só sobre dados coletados"]
    I2["Claude → Gemini → LocalEngine (lista estruturada sem redação)"]
    I3["AiInferenceLog"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL handoff_dossiers · handoff_items · tasks · project_schemes · project_tasks · session_participants · task_state_log · audit_log")]
    D2[("S3 dossiê PDF em restricted/ · flag storage.s3")]
    D3[("Cassandra notifications_by_user · trace_by_entity · flag cassandra.enabled")]
  end

  A2 --> A5 --> F1 --> W1 --> P1 -->|sim| P2 -->|não| P3
  A3 --> P3
  A4 --> P3
  P3 --> P4
  P5 --> I1
  P6 --> I1
  I1 --> I2 --> I3 --> P7 --> D1
  P7 --> D2
  P7 --> P8 --> D3
  P8 --> F2
  A6 --> A7
  A8 --> F3 --> W1 --> P9 -->|sim| P10 --> P11 --> P12 --> D1
  P11 --> D3
  A9 --> F3 --> P9 --> P13 --> D1
  P10 --> P14
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

  U->>FE: CHEFE gera dossiê de saída da Ana, sucessor Bruno
  FE->>C: POST /api/handoffs {EMPREGADO, userId, SAIDA, successorId, consent}
  C->>S: HandoffService.generateForEmployee(actor, userId, SAIDA, successorId, consent)
  S->>S: Guard.requireDeptHead(actor, dept da Ana)
  alt já existe dossiê em andamento
    S-->>C: 409 DOSSIE_EM_ANDAMENTO
  else ok
    S->>DB: collect: project_schemes abertos, tasks pendentes/BLOQUEADAS, decia_sessions ATIVA, decision_reviews pendentes, org_entities citados
    alt sem consentForPrivateItems
      S->>S: remove itens PRIVADA (fica só a contagem)
    end
    S->>AI: run(DOSSIE, dados coletados mascarados)
    alt provedor indisponível
      AI-->>S: LocalEngine devolve lista estruturada sem redação · fallbackUsed
    else ok
      AI-->>S: resumo de contexto por projeto ✦ (onde parou, o que falta, riscos)
    end
    AI->>DB: insert ai_inference_log
    S->>DB: insert handoff_dossiers (GERADO, contentJson)
    S->>DB: insert tasks DOCUMENTO (sourceKind DOSSIE, aiGenerated) + project_schemes Transição de Ana (origin DOSSIE) + project_tasks de encaminhamento
    S->>DB: decision_trace_nodes TAREFA/PROJETO (RF29)
    S->>EV: HandoffGenerated
    S->>DB: update handoff_dossiers status AGUARDANDO_SUCESSOR, documentTaskId, transitionProjectId
    S-->>C: 201 HandoffDossier
  end
  EV->>S3: PipelineJob EXPORT_PDF → restricted/handoffs/{id}.pdf
  EV->>CAS: Notification TRANSICAO ao sucessor · timeline

  U->>FE: Bruno abre /handoffs/{id} e aceita
  FE->>C: POST /api/handoffs/{id}/accept
  C->>S: HandoffService.accept(actor, id)
  alt ator não é o sucessor indicado
    S-->>C: 403 ACESSO_NEGADO
  else ok
    loop cada item do dossiê
      S->>DB: insert handoff_items (previousResponsibleId = Ana, newResponsibleId = Bruno)
      S->>DB: update tasks.responsible_id / project_tasks.responsible_id · task_state_log
    end
    S->>DB: decia_sessions ativas → session_participants (Ana leftAt + removeReason, Bruno joinedAt)
    S->>DB: update handoff_dossiers TRANSFERIDO, successorAcceptedAt · audit_log HANDOFF_TRANSFERRED
    S->>EV: HandoffTransferred
    S-->>C: 200
  end
  EV->>CAS: Notification PARTICIPANTE_REMOVIDO/ADICIONADO ao grupo das sessões (RF9) · histórico de mensagens intacto
  Note over S,DB: tarefas da Ana usadas em projetos de outros continuam via snapshotJson (RF23), nunca apagadas (CA05)
```

## 4. Máquina de estados

Entidade central: `HandoffDossier.status` (`HandoffStatus`).

```mermaid
stateDiagram-v2
  [*] --> GERADO: POST /api/handoffs ou evento GroupingClosed GESTAO / HeadChanged (CA01) · IA compila contentJson ✦
  GERADO --> AGUARDANDO_SUCESSOR: documento PDF + projeto Transição materializados (CA02) · Notification ao sucessor
  AGUARDANDO_SUCESSOR --> TRANSFERIDO: sucessor aceita → HandoffItems transferem responsabilidades · sessões notificadas (CA03, CA04)
  AGUARDANDO_SUCESSOR --> RECUSADO: sucessor recusa com motivo
  RECUSADO --> AGUARDANDO_SUCESSOR: chefe indica outro sucessor
  AGUARDANDO_SUCESSOR --> CANCELADO: chefe/EMPRESA cancela com motivo
  GERADO --> CANCELADO: cancelado antes de materializar
  TRANSFERIDO --> [*]
  CANCELADO --> [*]
  note right of TRANSFERIDO
    previousResponsibleId preservado em cada HandoffItem.
    Histórico das sessões e snapshots das tarefas intactos (CA04, CA05).
  end note
  note right of GERADO
    Itens PRIVADOS só entram com consentForPrivateItems (CA05).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/handoffs · handoffs/[id] · u/[username] (ação do chefe) · departments/[slug]/team · groupings/[id]"]
    R2["components: HandoffForm · SelectList (sucessor) · Switch (consentimento) · HandoffView · TaskCard list · PhaseBar · Spark ✦ · Dialog (motivo)"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    HC["HandoffController (@Operation RF36.CA01-CA05)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    HS["handoff/HandoffService"]
    TRS["handoff/TransferService"]
    DSS["decia/DeciaSessionService.replaceParticipant (RF9)"]
    TS["acervo/TaskService · projects/ProjectService"]
    AIE["ai/AiEngine (DOSSIE) · Masking (main)"]
    GD["security/Guard (main: requireRole · planejado: requireDeptHead)"]
    AUD["audit/AuditLogPort (main)"]
    DE["events/DomainEvents AFTER_COMMIT (GroupingClosed · HeadChanged · MemberRemoved)"]
    PORTS["ports: StoragePort · JobPort · AiProviderPort · NotificationPort"]
  end
  subgraph DOM["ws-domain"]
    ENT["HandoffDossier · HandoffItem · HandoffStatus · HandoffReason · TaskItem · ProjectScheme · SessionParticipant (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql handoff_* (V__rf36)"]
    S3A["storage-s3 restricted/handoffs (flag storage.s3)"]
    CASA["persistence-cassandra notifications · trace (flag cassandra.enabled)"]
    AIP["ai-providers ai-claude · ai-gemini · ai-local"]
    PLAT["platform: PDF export"]
  end
  BFF --> HC --> SEC
  HC --> HS
  HS --> TRS
  HS --> DSS
  HS --> TS
  HS --> AIE
  HS --> GD
  HS --> AUD
  DE --> HS
  HS --> PORTS
  HS --> ENT --> MY --> MYSQL[("MySQL 8")]
  PORTS --> S3A --> S3[("S3 / MinIO")]
  PORTS --> CASA --> CASS[("Cassandra")]
  PORTS --> AIP --> AI["Claude / Gemini / local"]
  PORTS --> PLAT
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF36.CA01 | `HandoffService.generateForEmployee/generateForGrouping/collect`, `HandoffDossier.contentJson` (openProjectsByPhase, pendingTasks, blockedTasks, activeSessions, pendingReviews, contacts, contextSummaries), `HandoffReason`, `AiCapability DOSSIE` | A1 → A2/A3/A4 → F1 → P1 (403) → P2 (409) → P3 → I1 → I2 | 1–14 | `[*] → GERADO` | `HS`, `AIE`, `HandoffForm` |
| RF36.CA02 | `HandoffService.materialize`, `TaskItem` DOCUMENTO `sourceKind DOSSIE` + `aiGenerated`, `ProjectScheme origin DOSSIE`, `DecisionTraceNode`, `PipelineJob EXPORT_PDF` | P7 → P8 | 15–21 | `GERADO → AGUARDANDO_SUCESSOR` | `TS`, `S3A`, `PLAT`, `Spark ✦` |
| RF36.CA03 | `HandoffDossier.successorUserId/successorAcceptedAt`, `HandoffService.accept/refuse`, `TransferService`, `HandoffItem.previousResponsibleId/newResponsibleId`, `TaskStateLog` | A6 → A7 → A8 → F3 → P9 (403) → P10 → P12 · A9 → P13 | 22–33 | `AGUARDANDO_SUCESSOR → TRANSFERIDO / RECUSADO` | `TRS`, `AUD`, `HandoffView` |
| RF36.CA04 | `DeciaSessionService.replaceParticipant`, `SessionParticipant.leftAt/removeReason`, `Notification PARTICIPANTE_*` (RF9), histórico intacto | P11 | 30, 34 | nota de TRANSFERIDO | `DSS`, `CASA` |
| RF36.CA05 | `HandoffDossier.consentForPrivateItems`, `Visibility PRIVADA`, `ProjectTask.snapshotJson` (RF23), nunca DELETE de tarefas usadas por outros | A5 → P4 → P5/P6 · P14 | 8–9, 35 | nota de GERADO + nota de TRANSFERIDO | `Switch (consentimento)`, `HS` |
