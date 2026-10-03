# RF36 — Gerar o Dossiê de Transição (handoff) quando um empregado muda de departamento, sai ou uma gestão encerra, transferindo projetos, tarefas e pendências com contexto

**HU:** HU36 · **Sprint (board Work Station):** Product Backlog (pós-Sprint 4, a priorizar) · **Equivalente FAI:** sem equivalente direto (ideia nova; usa Agrupamentos/Eras RF34 e o histórico RF17) · **Aba/rota:** ação no perfil/departamento (`/handoff`); gestão em `/companies/[slug]/groupings/[id]` (RF25.CA05, rota a confirmar)

**Critérios de aceite cobertos:** RF36.CA01 · RF36.CA02 · RF36.CA03 · RF36.CA04 · RF36.CA05

> Contextos da TAXONOMIA: **11. Transição & Memória** (`HandoffDossier`, `HandoffItem`), **4. Planejamento** (`Grouping.handoffDossierId`, status ENCERRADO), **2/3** (`TaskItem` DOCUMENTO PDF com `sourceKind DOSSIE`, `ProjectScheme` "Transição de [nome]" com `origin DOSSIE`, `ProjectTask.responsibleId/snapshotJson`), **5. DECIA** (`DeciaSession` ATIVA, `SessionParticipant` com `addedBy/removedBy`, `FinalDecision EM_REVISAO`, `DecisionTraceNode`), **1** (`DepartmentMembership.endedAt`), **10/12** (`AiInferenceLog` capability `DOSSIE`, `MediaObject`, `Notification`). Itens `PRIVADA` do empregado só entram com `consentForPrivateItems`; a saída nunca apaga tarefas usadas por outros (snapshot RF23).

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR
  namespace ws-domain {
    class HandoffDossier {
      <<entity>>
      +UUID id
      +String subjectType
      +UUID subjectUserId
      +UUID groupingId
      +UUID requestedBy
      +String reason
      +Instant generatedAt
      +JSON contentJson
      +UUID documentTaskId
      +UUID transitionProjectId
      +UUID successorUserId
      +Instant successorAcceptedAt
      +String status
      +Boolean consentForPrivateItems
      +UUID aiInferenceId
    }
    class HandoffItem {
      <<entity>>
      +UUID id
      +UUID dossierId
      +String targetType
      +UUID targetId
      +UUID previousResponsibleId
      +UUID newResponsibleId
      +Instant transferredAt
      +String note
    }
    class Grouping {
      <<entity>>
      +UUID id
      +GroupingType type
      +String label
      +String status
      +Instant closedAt
      +UUID handoffDossierId
    }
    class TaskItem {
      <<entity>>
      +UUID id
      +UUID ownerId
      +UUID responsibleId
      +String title
      +TaskType type
      +SourceKind sourceKind
      +TaskState state
      +Visibility visibility
      +LocalDate dueAt
      +boolean aiGenerated
      +UUID aiInferenceId
    }
    class ProjectScheme {
      <<entity>>
      +UUID id
      +UUID ownerId
      +String title
      +SchemeOrigin origin
      +ProjectStatus status
      +ProjectPhase currentPhase
    }
    class ProjectTask {
      <<entity>>
      +UUID id
      +UUID projectId
      +UUID taskId
      +UUID responsibleId
      +JSON snapshotJson
    }
    class DeciaSession {
      <<entity>>
      +UUID id
      +String topic
      +UUID adminUserId
      +SessionStatus status
    }
    class SessionParticipant {
      <<entity>>
      +UUID id
      +UUID sessionId
      +UUID userId
      +ParticipantRole role
      +Instant leftAt
      +UUID addedBy
      +UUID removedBy
      +String removeReason
    }
    class FinalDecision {
      <<entity>>
      +UUID id
      +UUID sessionId
      +DecisionStatus status
    }
    class DepartmentMembership {
      <<entity>>
      +UUID id
      +UUID userId
      +UUID departmentId
      +Instant endedAt
      +String reason
    }
    class DecisionTraceNode {
      <<entity>>
      +UUID id
      +TraceNodeType nodeType
      +UUID refId
      +JSON snapshotJson
    }
    class MediaObject {
      <<entity>>
      +UUID id
      +String key
      +String mimeType
    }
    class AiInferenceLog {
      <<entity>>
      +UUID id
      +AiCapability capability
      +String result
      +boolean fallbackUsed
    }
    class HandoffStatus {
      <<enum>>
      GERADO
      AGUARDANDO_SUCESSOR
      TRANSFERIDO
    }
    class HandoffReason {
      <<enum>>
      SAIDA
      TRANSFERENCIA
      FIM_GESTAO
      TROCA_CHEFE
    }
    class HandoffTargetType {
      <<enum>>
      TASK
      PROJECT
      SESSION
      REVIEW
    }
  }
  namespace ws-application {
    class HandoffService {
      <<service>>
      +generate(actorId, subjectType, subjectId, reason) HandoffDossier
      +generateForHeadChange(deptId, oldHeadId, newHeadId) HandoffDossier
      +grantConsent(subjectId, dossierId, consent) HandoffDossier
      +nominateSuccessor(actorId, dossierId, successorId) HandoffDossier
      +accept(successorId, dossierId) HandoffDossier
      +compileContent(subject) HandoffContent
    }
    class DeciaBridgeService {
      <<service>>
      +swapParticipant(sessionId, fromUserId, toUserId, reason) SessionParticipant
    }
    class DecisionTraceService {
      <<service>>
      +appendNode(sessionId, type, refId, label, classLabel, actorId, snapshot) DecisionTraceNode
    }
    class InstitutionalService {
      <<service>>
      +endMembership(userId, reason) DepartmentMembership
    }
    class TaskService {
      <<service>>
      +create(ownerId, form) TaskItem
    }
    class ProjectService {
      <<service>>
      +create(ownerId, form) ProjectScheme
    }
    class AiEngine {
      <<service>>
      +contextSummaries(openProjects, tasks, sessions) List~Summary~
    }
    class AiProviderPort {
      <<port>>
      +complete(prompt, mode, accessClass) AiResult
    }
    class MediaStoragePort {
      <<port>>
      +put(bytes, mimeType, accessClass) MediaObject
    }
    class PdfRenderPort {
      <<port>>
      +render(template, content) bytes
    }
  }
  namespace ws-web {
    class HandoffController {
      <<controller>>
      +generate(body)
      +consent(dossierId, body)
      +nominate(dossierId, body)
      +accept(dossierId)
      +get(dossierId)
    }
  }
  namespace ws-infrastructure {
    class HandoffJpaRepository {
      <<adapter>>
    }
    class S3MediaStorageAdapter {
      <<adapter>>
    }
    class PdfRenderAdapter {
      <<adapter>>
    }
    class ClaudeAdapter {
      <<adapter>>
    }
    class CassandraSystemMessageWriter {
      <<adapter>>
      messages_by_session
    }
  }
  HandoffDossier "1" --> "*" HandoffItem
  HandoffDossier --> HandoffStatus : status
  HandoffDossier --> HandoffReason : reason
  HandoffItem --> HandoffTargetType : targetType
  HandoffDossier --> TaskItem : documentTaskId DOCUMENTO PDF
  HandoffDossier --> ProjectScheme : transitionProjectId origin DOSSIE
  HandoffDossier --> Grouping : groupingId quando GESTAO
  Grouping --> HandoffDossier : handoffDossierId
  HandoffDossier --> AiInferenceLog : aiInferenceId
  HandoffItem ..> TaskItem : targetType TASK
  HandoffItem ..> ProjectScheme : targetType PROJECT
  HandoffItem ..> DeciaSession : targetType SESSION
  HandoffItem ..> FinalDecision : targetType REVIEW
  ProjectScheme "1" --> "*" ProjectTask
  DeciaSession "1" --> "*" SessionParticipant
  TaskItem --> MediaObject : anexo PDF
  HandoffService ..> HandoffDossier
  HandoffService ..> HandoffItem
  HandoffService ..> AiEngine : resumo de contexto ✦
  HandoffService ..> PdfRenderPort
  HandoffService ..> MediaStoragePort
  HandoffService ..> TaskService : DOCUMENTO e encaminhamentos
  HandoffService ..> ProjectService : projeto Transição
  HandoffService ..> DeciaBridgeService : troca de participante RF9
  HandoffService ..> DecisionTraceService : rastro RF29
  HandoffService ..> InstitutionalService : encerra lotação
  AiEngine ..> AiProviderPort
  HandoffController ..> HandoffService
  HandoffJpaRepository ..> HandoffDossier : MySQL
  S3MediaStorageAdapter ..|> MediaStoragePort
  PdfRenderAdapter ..|> PdfRenderPort
  ClaudeAdapter ..|> AiProviderPort
  CassandraSystemMessageWriter ..> DeciaSession : mensagem de sistema da troca
  note for HandoffDossier "tabela handoff_dossiers · contentJson {openProjectsByPhase, pendingTasks, blockedTasks, activeSessions, pendingReviews, contacts, contextSummaries[]}"
  note for HandoffItem "tabela handoff_items · previousResponsibleId fica como anterior (CA03)"
  note for TaskItem "tabela tasks · sourceKind DOSSIE · visibility PRIVADA exige consentimento (CA05) · .. +40 campos .."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Ator humano"]
    U1["CHEFE ou EMPRESA aciona Gerar dossiê de transição para um empregado ou uma GESTAO"]
    U2["Empregado decide consentir itens PRIVADA"]
    U3["CHEFE indica o sucessor"]
    U4["Sucessor aceita o dossiê"]
    U5["Grupo da sessão DECIA vê a troca de participante"]
  end
  subgraph L2["Web/BFF (Next.js App Router)"]
    W1["Dossiê: PDF, projeto Transição de [nome] com faísca ✦ e fio de decisão"]
    W2["Pedido de consentimento no perfil do empregado"]
    W3["Tarefas e projetos exibem novo responsável e anterior"]
    W4["Mensagem de sistema na sessão e notificação RF9"]
  end
  subgraph L3["ws-application"]
    S1{"Ator é CHEFE do departamento ou EMPRESA?"}
    S2{"Já existe dossiê não TRANSFERIDO para o mesmo sujeito?"}
    S3["compileContent: projetos abertos por fase, tarefas pendentes e bloqueadas com prazos, sessões ATIVA, decisões EM_REVISAO, contatos e fornecedores citados"]
    S4{"Há itens PRIVADA do empregado?"}
    S5["Exclui itens PRIVADA até consentForPrivateItems"]
    S6["PdfRenderPort → MediaStoragePort.put · TaskService.create DOCUMENTO (sourceKind DOSSIE, aiGenerated)"]
    S7["ProjectService.create Transição de [nome] (origin DOSSIE) · ProjectTask por encaminhamento · HandoffItem por alvo"]
    S8["DecisionTraceService: nós TAREFA e PROJETO · AiInferenceLog DOSSIE · status GERADO"]
    S9["consentForPrivateItems = true · recompila com itens PRIVADA"]
    S10{"Sucessor ativo e diferente do sujeito?"}
    S11["successorUserId · status AGUARDANDO_SUCESSOR · Notification"]
    S12{"Ator é o successorUserId?"}
    S13["Transação: HandoffItem.newResponsibleId e transferredAt · TaskItem.responsibleId · ProjectTask.responsibleId · previousResponsibleId permanece como anterior"]
    S14["DeciaBridgeService.swapParticipant em cada sessão ATIVA: SessionParticipant leftAt, removedBy, removeReason + novo participante addedBy · histórico intacto"]
    S15["Decisões EM_REVISAO: reviewer passa ao sucessor ou ao chefe"]
    S16["successorAcceptedAt · status TRANSFERIDO · InstitutionalService.endMembership (reason) · Grouping ENCERRADO quando GESTAO"]
    S17["Tarefas do empregado usadas por outros: ProjectTask.snapshotJson preservado, nada é apagado"]
    E1["403 ACESSO_NEGADO"]
    E2["409 DOSSIE_EM_ANDAMENTO"]
    E3["422 VALIDACAO"]
    E4["403 ACESSO_NEGADO"]
  end
  subgraph L4["IA (AiEngine)"]
    A1["contextSummaries ✦ por projeto: onde parou, o que falta, riscos"]
    A2["Sem IA externa: dossiê com dados estruturados e sem resumos (result FALLBACK)"]
  end
  subgraph L5["Persistência"]
    D1[("MySQL: handoff_dossiers · handoff_items · ai_inference_log")]
    D2[("MySQL: project_schemes · project_tasks · tasks · decia_sessions · final_decisions · department_memberships")]
    D3[("S3: dossiê PDF")]
    D4[("MySQL: session_participants · Cassandra: messages_by_session · notifications_by_user")]
    D5[("MySQL: decision_trace_nodes · groupings")]
  end
  U1 --> S1
  S1 -->|"não"| E1
  S1 -->|"sim"| S2
  S2 -->|"sim"| E2
  S2 -->|"não"| S3 --> D2
  S3 --> S4
  S4 -->|"sim"| S5 --> W2
  S4 -->|"não"| A1
  S5 --> A1
  A1 --> S6
  A1 -. "fallback" .-> A2 --> S6
  S6 --> D3
  S6 --> S7 --> D2
  S7 --> S8 --> D1
  S8 --> D5
  S8 --> W1
  W2 --> U2 --> S9 --> D1
  S9 --> S6
  W1 --> U3 --> S10
  S10 -->|"não"| E3
  S10 -->|"sim"| S11 --> D1
  S11 --> U4 --> S12
  S12 -->|"não"| E4
  S12 -->|"sim"| S13 --> D2
  S13 --> S14 --> D4
  S14 --> W4 --> U5
  S13 --> S15 --> D2
  S15 --> S16 --> D1
  S16 --> D5
  S16 --> W3
  S13 --> S17
  classDef err fill:#fde2e2,stroke:#b91c1c,color:#7f1d1d
  class E1,E2,E3,E4 err
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: CA01, CA02 e CA05 — gerar o dossiê
  U->>NX: CHEFE aciona Gerar dossiê de transição (saída de um empregado)
  NX->>C: POST /api/handoff/dossiers {subjectType EMPREGADO, subjectUserId, reason SAIDA}
  C->>S: HandoffService.generate(actorId, EMPREGADO, subjectUserId, SAIDA)
  alt ator não é CHEFE do departamento nem EMPRESA
    S-->>C: 403 ACESSO_NEGADO
  else já existe dossiê não TRANSFERIDO para o sujeito
    S-->>C: 409 DOSSIE_EM_ANDAMENTO
  else ok
    S->>DB: SELECT projetos abertos por fase, tarefas pendentes e bloqueadas com prazos, sessões ATIVA, decisões EM_REVISAO, contatos citados
    S->>S: separa itens visibility PRIVADA (entram só com consentimento, CA05)
    alt provider externo disponível
      S->>AI: contextSummaries(openProjects, tasks, sessions)
      AI-->>S: por projeto onde parou, o que falta, riscos ✦
    else sem IA externa
      S->>S: dossiê estruturado sem resumos · fallbackUsed
    end
    S->>S: PdfRenderPort.render(dossiê)
    S->>S3: PUT dossie.pdf (MediaStoragePort)
    S->>DB: INSERT tasks (DOCUMENTO, sourceKind DOSSIE, aiGenerated) · INSERT project_schemes (Transição de Nome, origin DOSSIE)
    S->>DB: INSERT project_tasks (encaminhamentos) · INSERT handoff_items (TASK, PROJECT, SESSION, REVIEW)
    S->>DB: INSERT handoff_dossiers (GERADO, contentJson, documentTaskId, transitionProjectId) · INSERT ai_inference_log (DOSSIE)
    S->>DB: INSERT decision_trace_nodes (TAREFA, PROJETO) · edges (ORIGINOU)
    S->>CS: INSERT trace_by_entity
    S-)EV: HandoffGenerated
    EV->>DB: INSERT notifications (empregado: pedido de consentimento)
    S-->>C: 201 HandoffDossier
  end
  U->>NX: empregado consente itens PRIVADA
  NX->>C: POST /api/handoff/dossiers/{id}/consent {consent true}
  C->>S: HandoffService.grantConsent(subjectId, dossierId, true)
  S->>DB: UPDATE handoff_dossiers SET consentForPrivateItems = true
  S->>S: recompila contentJson com itens PRIVADA e regenera o PDF
  S-->>NX: 200

  Note over U,EV: CA03 e CA04 — sucessor aceita e a responsabilidade é transferida
  U->>NX: CHEFE indica o sucessor
  NX->>C: POST /api/handoff/dossiers/{id}/successor {successorUserId}
  C->>S: HandoffService.nominateSuccessor(actorId, dossierId, successorId)
  alt sucessor igual ao sujeito ou inativo
    S-->>C: 422 VALIDACAO
  else ok
    S->>DB: UPDATE handoff_dossiers SET successorUserId, status = AGUARDANDO_SUCESSOR
    S-)EV: SuccessorNominated
    EV->>DB: INSERT notifications (sucessor)
    S-->>NX: 200
  end
  U->>NX: sucessor aceita
  NX->>C: POST /api/handoff/dossiers/{id}/accept
  C->>S: HandoffService.accept(successorId, dossierId)
  alt ator não é o successorUserId
    S-->>C: 403 ACESSO_NEGADO
  else ok
    S->>DB: UPDATE handoff_items SET newResponsibleId, transferredAt (previousResponsibleId mantido)
    S->>DB: UPDATE tasks SET responsibleId · UPDATE project_tasks SET responsibleId
    loop para cada DeciaSession ATIVA do empregado
      S->>S: DeciaBridgeService.swapParticipant(sessionId, from, to, reason DOSSIE)
      S->>DB: UPDATE session_participants SET leftAt, removedBy, removeReason · INSERT session_participants (addedBy)
      S->>CS: INSERT messages_by_session (mensagem de sistema: troca de participante)
    end
    S->>DB: UPDATE final_decisions EM_REVISAO (revisor passa ao sucessor ou ao chefe)
    S->>DB: UPDATE handoff_dossiers SET successorAcceptedAt, status = TRANSFERIDO
    S->>DB: UPDATE department_memberships SET endedAt, reason · UPDATE groupings SET status = ENCERRADO quando GESTAO
    S-)EV: HandoffTransferred
    EV->>CS: INSERT notifications_by_user (grupo das sessões, RF9)
    EV->>DB: INSERT audit_log
    Note over S,DB: tarefas usadas por outros mantêm ProjectTask.snapshotJson (CA05), nada é apagado
    S-->>NX: 200 HandoffDossier TRANSFERIDO
  end
```

## 4. Máquina de estados

Entidade central: `HandoffDossier.status` (GERADO · AGUARDANDO_SUCESSOR · TRANSFERIDO). O consentimento é um flag (`consentForPrivateItems`), não um estado.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> GERADO : POST /api/handoff/dossiers (CA01) → PDF + projeto Transição ✦ (CA02)
  GERADO --> GERADO : consentimento de itens PRIVADA recompila o dossiê (CA05)
  GERADO --> AGUARDANDO_SUCESSOR : CHEFE indica successorUserId (CA03)
  AGUARDANDO_SUCESSOR --> AGUARDANDO_SUCESSOR : troca de sucessor indicado
  AGUARDANDO_SUCESSOR --> TRANSFERIDO : sucessor aceita → responsabilidades transferidas (CA03), sessões notificadas (CA04)
  TRANSFERIDO --> [*]
  note right of GERADO
    contentJson compilado · documentTaskId e transitionProjectId criados
    itens PRIVADA fora até consentForPrivateItems = true
  end note
  note right of TRANSFERIDO
    HandoffItem.previousResponsibleId permanece como anterior
    DepartmentMembership.endedAt · Grouping ENCERRADO quando GESTAO
    Nenhuma tarefa usada por outros é apagada (snapshot RF23)
  end note
  note left of AGUARDANDO_SUCESSOR
    Falta um estado de recusa ou cancelamento na TAXONOMIA
    (ver dúvida em DECISOES.md)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Next.js (frontend)"]
    direction TB
    P1["app/handoff/page.tsx · gerar, consentir, indicar, aceitar"]
    P2["app/profile · ação Gerar dossiê e pedido de consentimento"]
    P3["app/departments/[slug] · Equipe: ação por empregado"]
    P4["app/companies/[slug]/groupings/[id] · encerrar gestão (RF25.CA05)"]
    UI1["components/ui: HandoffSummary (por fase) · ConsentDialog · SuccessorPicker · ResponsibleBadge (atual e anterior)"]
  end
  subgraph WEB["ws-web (REST · br.gov.pr.secid.workstation.web)"]
    direction TB
    C1["HandoffController"]
  end
  subgraph APP["ws-application"]
    direction TB
    S1["HandoffService"]
    S2["DeciaBridgeService (RF29, RF9)"]
    S3["DecisionTraceService (RF29)"]
    S4["InstitutionalService (RF28)"]
    S5["TaskService (RF20) · ProjectService (RF21)"]
    S6["AiEngine"]
    PT1["AiProviderPort"]
    PT2["MediaStoragePort"]
    PT3["PdfRenderPort"]
  end
  subgraph DOM["ws-domain"]
    direction TB
    E1["HandoffDossier · HandoffItem · Grouping"]
    E2["TaskItem · ProjectScheme · ProjectTask · DeciaSession · SessionParticipant · FinalDecision"]
    E3["DepartmentMembership · DecisionTraceNode · MediaObject · AiInferenceLog"]
  end
  subgraph INFRA["ws-infrastructure"]
    direction TB
    I1["persistence-mysql: HandoffJpaRepository e repositórios dos alvos"]
    I2["storage-s3: S3MediaStorageAdapter (PDF)"]
    I3["persistence-cassandra: CassandraSystemMessageWriter · notifications_by_user · trace_by_entity"]
    I4["ai-providers: ClaudeAdapter · GeminiAdapter"]
    I5["platform: PdfRenderAdapter · DomainEventOutbox · AuditLog · Notification"]
  end
  subgraph EXT["Serviços externos"]
    X1(["Claude / Gemini"])
  end
  P1 --> C1
  P2 --> C1
  P3 --> C1
  P4 --> C1
  UI1 -.-> P1
  C1 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> S4
  S1 --> S5
  S1 --> S6
  S6 -.-> PT1
  S1 -.-> PT2
  S1 -.-> PT3
  S1 --> E1
  S1 --> E2
  S3 --> E3
  S4 --> E3
  S1 --> I1
  S2 --> I3
  S3 --> I3
  S1 --> I5
  I2 -. implementa .-> PT2
  I5 -. implementa .-> PT3
  I4 -. implementa .-> PT1
  I4 --> X1
  classDef port stroke-dasharray: 4 3
  class PT1,PT2,PT3 port
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF36.CA01 | Classes `HandoffDossier` (subjectType EMPREGADO/GESTAO, reason, contentJson {openProjectsByPhase, pendingTasks, blockedTasks, activeSessions, pendingReviews, contacts, contextSummaries[]}), `Grouping.handoffDossierId`, `HandoffService.generate/compileContent`, `AiEngine.contextSummaries`; atividades `U1 → S1 → S2 → S3 → A1/A2` (403 ACESSO_NEGADO, 409 DOSSIE_EM_ANDAMENTO); sequência bloco «CA01, CA02 e CA05»; transição `[*] → GERADO`; componentes `app/handoff`, `HandoffSummary`, `app/companies/[slug]/groupings/[id]` |
| RF36.CA02 | Classes `HandoffDossier.documentTaskId/transitionProjectId/aiInferenceId`, `TaskItem` (DOCUMENTO, sourceKind DOSSIE, aiGenerated), `ProjectScheme origin DOSSIE`, `ProjectTask` (encaminhamentos), `PdfRenderPort`, `MediaStoragePort`, `DecisionTraceService`; atividades `S6 → S7 → S8 → W1`; sequência bloco «CA01, CA02 e CA05» (PUT dossie.pdf, INSERT tasks/project_schemes/decision_trace_nodes); nota do estado `GERADO`; componentes `storage-s3`, `PdfRenderAdapter`, `DecisionTraceService (RF29)` |
| RF36.CA03 | Classes `HandoffDossier.successorUserId/successorAcceptedAt`, `HandoffItem.previousResponsibleId/newResponsibleId/transferredAt`, `HandoffService.nominateSuccessor/accept`, `TaskItem.responsibleId`, `ProjectTask.responsibleId`; atividades `U3 → S10 → S11 → U4 → S12 → S13 → S16 → W3` (422, 403); sequência bloco «CA03 e CA04»; transições `GERADO → AGUARDANDO_SUCESSOR → TRANSFERIDO` e nota; componentes `SuccessorPicker`, `ResponsibleBadge` |
| RF36.CA04 | Classes `SessionParticipant` (leftAt, removedBy, removeReason, addedBy), `DeciaBridgeService.swapParticipant`, `HandoffItem targetType SESSION`, `CassandraSystemMessageWriter`; atividades `S13 → S14 → W4 → U5`; sequência bloco «CA03 e CA04» (loop por sessão ATIVA, mensagem de sistema, notifications_by_user RF9); transição `AGUARDANDO_SUCESSOR → TRANSFERIDO`; componentes `persistence-cassandra`, `DeciaBridgeService (RF29, RF9)` |
| RF36.CA05 | Classes `HandoffDossier.consentForPrivateItems`, `TaskItem.visibility`, `ProjectTask.snapshotJson`, `HandoffService.grantConsent`; atividades `S4 → S5 → W2 → U2 → S9`, `S13 → S17`; sequência bloco «CA01, CA02 e CA05» (separa PRIVADA, `POST .../consent`) e nota final do bloco «CA03 e CA04» (snapshot preservado); transição `GERADO → GERADO` e notas de `GERADO`/`TRANSFERIDO`; componente `ConsentDialog` |

> Dúvidas para `docs/DECISOES.md`: `HandoffStatus`, `HandoffReason` e `HandoffTargetType` não são enums nomeados na TAXONOMIA (valores inline); falta estado de recusa/cancelamento do dossiê (sucessor recusa, chefe cancela) — propor `RECUSADO`/`CANCELADO`; `PdfRenderPort`, `409 DOSSIE_EM_ANDAMENTO` e as rotas são propostas; quem herda decisões EM_REVISAO quando o sujeito era o revisor (sucessor vs. chefe); se o dossiê de GESTAO (RF25.CA05) exige sucessor ou encerra direto em TRANSFERIDO.
