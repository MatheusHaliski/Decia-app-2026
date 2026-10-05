# RF8 — Editar arquivos de tarefas ou projetos dentro de meu perfil do Work Station
**HU:** HU8 · **Sprint (board Work Station):** lista *Requisitos Funcionais* (sem sprint atribuída) · **Equivalente FAI:** RF8 Editar peça (formulário da peça, trocar foto, versão da foto) + RF9 Editar esquema · **Aba/rota:** `/tasks/[id]/edit` (ficha + anexos + versões, a partir do Acervo Digital do perfil RF6) e `/projects/[id]/edit` (ficha do projeto e arquivos das tarefas pela Mesa, RF22); "Editar no provedor" abre Google Docs/Sheets ou Word/Excel online
**Critérios de aceite cobertos:** RF8.CA01 … RF8.CA06 — **todos "(CA a confirmar)"**: o corpo do card RF8 está vazio; os CAs foram derivados do título + HU8 e reaproveitam RF20.CA07/CA12 (itens vinculados, PipelineJob), RF41.CA02/CA03 (estados, versões) e RF22.CA02/CA06 (versões de projeto, bloqueio)

> **HU8** — COMO usuário do sistema Work Station POSSO editar uma tarefa ou projeto de meu perfil PARA concluir projetos e receber insights de feedback da IA a respeito da qualidade do item.

"Editar arquivos" cobre três coisas sobre itens **do meu perfil** (dono ou responsável): **(1) os metadados** da tarefa (`TaskItem`, otimista por `version`) ou do projeto (`ProjectScheme`, com `ProjectVersion` quando a mudança é estrutural, RF22); **(2) os arquivos em si** — substituir/adicionar anexo (`TaskAttachment` → novo `MediaObject` no S3, antivírus, OCR e thumbnail por `PipelineJob`) preservando a versão anterior em `TaskVersion` (`snapshotMediaId`, `changeSummary`), ou **editar no provedor** quando o item é VINCULADO (Google Workspace / Microsoft 365: o webhook de mudança cria `TaskVersion` com `externalRevisionId`); **(3) concluir** — a transição `EM_USO/DISPONIVEL → CONCLUIDA` via `TaskStateMachine` e, quando todas as `ProjectTask`s estão concluídas, `ProjectScheme` → `CONCLUIDO`. Cada salvamento dispara, após o commit, o **feedback de qualidade da IA** (`Insight` com `scope` ACERVO ou PROJETO via AiEngine `INSIGHT`): completude dos metadados, clareza do título/resumo, prazo coerente, conformidade (RF32) e sugestões acionáveis; `accessClass` RESTRITO/SIGILOSO nunca vai à IA externa.

## Critérios de aceite derivados do título + HU8 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) | Fonte reaproveitada |
|---|---|---|
| **RF8.CA01** (CA a confirmar) | Dado uma tarefa do meu perfil (sou `ownerId` ou `responsibleId`), quando edito título, categoria, tags, prazo, descrição ou classificação e salvo com `If-Match: version`, então o sistema valida como no criador (RF4: `422 VALIDACAO` por campo), grava com bloqueio otimista (`409 CONFLITO_VERSAO` se outra edição venceu), registra `AuditLog TASK_UPDATED` e reindexa no OpenSearch; quem não é dono nem responsável recebe `403 ACESSO_NEGADO` e vê a ficha somente leitura. | RF20.CA14, RF22.CA01, RF22.CA04 |
| **RF8.CA02** (CA a confirmar) | Dado os anexos da tarefa, quando substituo o arquivo principal ou adiciono um novo, então o upload passa por `MediaStoragePort` + `AntivirusPort` (`422 ARQUIVO_MALICIOSO` bloqueia), a versão anterior é preservada como `TaskVersion` (`versionNumber + 1`, `snapshotMediaId` do arquivo antigo, `changeSummary`), e thumbnail/OCR são reprocessados por `PipelineJob` após o commit (falha → `REPROCESSAR` e aviso no card). | RF20.CA01, RF20.CA12, RF41.CA03 |
| **RF8.CA03** (CA a confirmar) | Dado um item `linkMode VINCULADO` (Google/Microsoft), quando aciono "Editar no provedor", então o documento abre no Google Docs/Sheets ou Word/Excel online com o OAuth do usuário; ao receber o webhook de mudança, `AcervoService.syncLinkedVersion` cria `TaskVersion` (`externalRevisionId`, `syncedAt`) e atualiza o thumbnail; "Converter em cópia" chama `convertLinkToSnapshot` (`linkMode COPIADO`); OAuth revogado converte automaticamente. | RF20.CA07, RF41.CA03 |
| **RF8.CA04** (CA a confirmar) | Dado um projeto do meu perfil, quando edito a ficha (título, objetivo, prazo, programa, eixo) ou os arquivos das suas tarefas pela Mesa (RF22), então mudanças estruturais geram `ProjectVersion` com `diffJson` legível e as não-estruturais só atualizam; projeto `CONCLUIDO/ARQUIVADO` → `409 PROJETO_BLOQUEADO` (reabrir exige justificativa); a visibilidade dos arquivos segue a do projeto. | RF22.CA02, RF22.CA06 |
| **RF8.CA05** (CA a confirmar) | Dado uma tarefa `EM_USO` ou `DISPONIVEL`, quando marco "Concluir", então `TaskStateMachine` leva a `CONCLUIDA` com `TaskStateLog`; se era a última `ProjectTask` pendente de um projeto, `ProjectScheme.status` passa a `CONCLUIDO` e `percentComplete = 100`; transição inválida → `422 TRANSICAO_INVALIDA`; `BLOQUEADA` precisa ser desbloqueada antes. | RF41.CA02, RF21 máquina de estados |
| **RF8.CA06** (CA a confirmar) | Dado um salvamento bem-sucedido, então após o commit a IA gera um **`Insight` de qualidade** (`scope` ACERVO para tarefa, PROJETO para projeto; `metricRefsJson` com completude, clareza, prazo, conformidade RF32; `actionsJson` com correções em 1 clique), exibido com faísca ✦ e "Por que isto?", registrado em `ai_inference_log` (capability `INSIGHT`); `accessClass` RESTRITO/SIGILOSO → `BLOQUEADO_SIGILO` ou IA local; o usuário pode dispensar (`dismissedAt`); IA indisponível não bloqueia o salvamento. | RF43 §2–4, RF20.CA02/CA03, RF32.CA02 |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_acervo {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +responsibleId: UUID
    +departmentId: UUID
    +title: String
    +summary: String
    +descriptionMd: String
    +type: TaskType
    +category: TaskCategory
    +subcategory: String
    +processTags: Set~ProcessTag~
    +natureTags: Set~NatureTag~
    +accessClass: AccessClassification
    +format: String
    +sourceKind: SourceKind
    +sourceRef: String
    +linkMode: LinkMode
    +dueAt: LocalDate
    +state: TaskState
    +visibility: Visibility
    +thumbnailUrl: String
    +tags: Set~String~
    +aiGenerated: boolean
    +version: long otimista
    .. +35 campos ..
  }
  class TaskAttachment {
    <<entity>>
    +id: UUID
    +taskId: UUID
    +mediaObjectId: UUID
    +fileName: String
    +mimeType: String
    +sizeBytes: long
    +sha256: String
    +antivirusStatus: String PENDENTE LIMPO INFECTADO
    +ocrStatus: String
    +isPrimary: boolean
    +sortOrder: int
  }
  class TaskVersion {
    <<entity>>
    +id: UUID
    +taskId: UUID
    +versionNumber: int
    +externalRevisionId: String
    +syncedAt: Instant
    +thumbnailUrl: String
    +changeSummary: String
    +snapshotMediaId: UUID arquivo anterior
  }
  class TaskStateLog {
    <<entity>>
    +id: UUID
    +taskId: UUID
    +fromState: TaskState
    +toState: TaskState
    +actorId: UUID
    +reason: String
    +projectId: UUID
    +at: Instant
  }
}

namespace ws_domain_projetos {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +title: String
    +objective: String
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +nextMilestoneAt: LocalDate
    +conformityPercent: BigDecimal
    +version: long
    .. +35 campos ..
  }
  class ProjectTask {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +taskId: UUID
    +phase: ProjectPhase
    +responsibleId: UUID
    +dueAt: LocalDate
    +percentComplete: int
  }
  class ProjectVersion {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +versionNumber: int
    +authorId: UUID
    +diffJson: JSON legível
    +snapshotJson: JSON
    +reason: String
  }
}

namespace ws_domain_ia_plataforma {
  class Insight {
    <<entity>>
    +id: UUID
    +scope: InsightScope ACERVO ou PROJETO
    +scopeId: UUID
    +kind: String QUALIDADE
    +title: String
    +bodyMd: String
    +metricRefsJson: JSON completude clareza prazo conformidade
    +actionsJson: JSON correções em 1 clique
    +severity: String
    +aiInferenceId: UUID
    +dismissedAt: Instant
    +generatedAt: Instant
  }
  class AiInferenceLog {
    <<entity>>
    +id: UUID
    +capability: AiCapability INSIGHT
    +provider: AiProvider
    +result: InferenceResult
    +maskedFields: String
    +correlationId: String
  }
  class MediaObject {
    <<entity>>
    +id: UUID
    +bucket: String
    +key: String
    +mimeType: String
    +sha256: String
    +accessClass: AccessClassification
    +variantsJson: JSON
  }
  class PipelineJob {
    <<entity>>
    +id: UUID
    +type: String THUMBNAIL OCR ANTIVIRUS SYNC_EXTERNO
    +targetType: String
    +targetId: UUID
    +status: PipelineJobStatus
    +lastError: String
  }
  class AuditLog {
    <<entity>>
    +id: UUID
    +actorId: UUID
    +action: String TASK_UPDATED ATTACHMENT_REPLACED
    +resourceType: String
    +resourceId: UUID
    +correlationId: String
  }
}

namespace ws_domain_enums {
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
  }
  class LinkMode {
    <<enum>>
    VINCULADO
    COPIADO
  }
  class InsightScope {
    <<enum>>
    ACERVO
    PERFIL
    EQUIPE
    PROJETO
  }
  class InferenceResult {
    <<enum>>
    OK
    FALLBACK
    ERRO
    BLOQUEADO_SIGILO
  }
}

namespace ws_application {
  class TaskService {
    <<service>>
    +canEdit(user, task) boolean dono ou responsável
    +update(userId, taskId, TaskForm, baseVersion) TaskItem
    +replaceAttachment(userId, taskId, attachmentId, stream) TaskAttachment
    +addAttachment(userId, taskId, stream) TaskAttachment
    +conclude(userId, taskId) TaskItem
    -validate(TaskForm) 422 VALIDACAO
  }
  class AcervoService {
    <<service>>
    +openInProvider(userId, taskId) URL
    +syncLinkedVersion(taskId, externalRevision) TaskVersion
    +convertLinkToSnapshot(taskId) TaskVersion
  }
  class TaskStateMachine {
    <<service>>
    +transition(taskId, to, actorId, reason) TaskStateLog
    +canTransition(from, to) boolean
  }
  class ProjectDeskService {
    <<service>>
    +canEdit(userId, project) boolean
    +updateSheet(userId, projectId, form, baseVersion) ProjectScheme
    +onTaskConcluded(taskId) recalcula percentComplete e status
  }
  class ProjectVersionService {
    <<service>>
    +record(projectId, authorId, diff, reason) ProjectVersion
  }
  class InsightService {
    <<service>>
    +qualityFeedback(scope, scopeId, actorId) Insight
    +dismiss(userId, insightId)
  }
  class AiEngine {
    <<service>>
    +infer(capability, input, mode) AiResult
  }
  class MediaStoragePort {
    <<port>>
    +put(stream, mimeType, accessClass) MediaObject
    +presign(mediaId) URL
  }
  class AntivirusPort {
    <<port>>
    +scan(mediaId) PENDENTE LIMPO INFECTADO
  }
  class ExternalDocPort {
    <<port>>
    +editUrl(provider, ref, oauthToken) URL
    +fetch(provider, ref, mode) ExternalDoc
    +revoke(provider, ref)
  }
  class SearchIndexPort {
    <<port>>
    +indexTask(TaskItem, ocrText)
  }
}

namespace ws_web {
  class TaskController {
    <<controller>>
    +GET_api_tasks_id_edit()
    +PATCH_api_tasks_id(TaskForm, If_Match)
    +PUT_api_tasks_id_attachments_attId(multipart)
    +POST_api_tasks_id_attachments(multipart)
    +POST_api_tasks_id_open_in_provider()
    +POST_api_tasks_id_convert_to_copy()
    +POST_api_tasks_id_conclude()
  }
  class ProjectDeskController {
    <<controller>>
    +PATCH_api_projects_id(form, If_Match)
  }
  class InsightController {
    <<controller>>
    +GET_api_insights_scope_id()
    +POST_api_insights_id_dismiss()
  }
  class ExternalDocWebhookController {
    <<controller>>
    +POST_api_webhooks_google_drive()
    +POST_api_webhooks_microsoft_graph()
  }
}

namespace ws_infrastructure {
  class S3StorageAdapter {
    <<adapter>>
  }
  class ClamAvAdapter {
    <<adapter>>
  }
  class GoogleDriveAdapter {
    <<adapter>>
  }
  class MicrosoftGraphAdapter {
    <<adapter>>
  }
  class OpenSearchIndexAdapter {
    <<adapter>>
  }
  class ClaudeGeminiAdapter {
    <<adapter>>
  }
}

TaskItem "1" --> "*" TaskAttachment : anexos
TaskItem "1" --> "*" TaskVersion : versões de arquivo e do provedor
TaskItem "1" --> "*" TaskStateLog
TaskItem "1" --> "*" ProjectTask : usada em projetos
ProjectScheme "1" --> "*" ProjectTask
ProjectScheme "1" --> "*" ProjectVersion
TaskAttachment "*" --> "1" MediaObject : mediaObjectId
TaskVersion "*" --> "0..1" MediaObject : snapshotMediaId
PipelineJob "*" --> "1" TaskItem : targetId
Insight "*" --> "1" AiInferenceLog : aiInferenceId
Insight ..> TaskItem : scope ACERVO
Insight ..> ProjectScheme : scope PROJETO
TaskItem --> TaskState
TaskItem --> LinkMode
Insight --> InsightScope
AiInferenceLog --> InferenceResult

TaskController ..> TaskService
TaskController ..> AcervoService : provedor
ProjectDeskController ..> ProjectDeskService
InsightController ..> InsightService
ExternalDocWebhookController ..> AcervoService : syncLinkedVersion
TaskService ..> TaskStateMachine : conclude
TaskService ..> MediaStoragePort
TaskService ..> AntivirusPort
TaskService ..> SearchIndexPort
TaskService ..> AuditLog
TaskService ..> ProjectDeskService : onTaskConcluded
ProjectDeskService ..> ProjectVersionService : mudança estrutural
AcervoService ..> ExternalDocPort
InsightService ..> AiEngine : INSIGHT
S3StorageAdapter ..|> MediaStoragePort
ClamAvAdapter ..|> AntivirusPort
GoogleDriveAdapter ..|> ExternalDocPort
MicrosoftGraphAdapter ..|> ExternalDocPort
OpenSearchIndexAdapter ..|> SearchIndexPort
ClaudeGeminiAdapter ..> AiEngine : provider

note for TaskItem "edição só por ownerId ou responsibleId (403) · If-Match version → 409 CONFLITO_VERSAO (CA01)"
note for TaskVersion "tabela task_versions · substituir anexo preserva o arquivo anterior em snapshotMediaId (CA02) · webhook do provedor grava externalRevisionId (CA03)"
note for Insight "tabela insights · feedback de qualidade gerado AFTER_COMMIT a cada salvamento · RESTRITO/SIGILOSO = BLOQUEADO_SIGILO ou IA local (CA06)"
note for ProjectScheme "CONCLUIDO/ARQUIVADO bloqueiam edição: 409 PROJETO_BLOQUEADO (CA04) · todas as ProjectTasks concluídas → CONCLUIDO (CA05)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["No perfil (Acervo Digital / Projetos) escolhe Editar"]
    U2["Edita campos da ficha e salva"]
    U3["Substitui ou adiciona arquivo"]
    U4["Editar no provedor (Google / Microsoft) ou Converter em cópia"]
    U5["Edita ficha do projeto ou arquivos das tarefas pela Mesa"]
    U6["Concluir tarefa"]
    U7["Lê o feedback da IA, aplica ação em 1 clique ou dispensa"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Ficha editável com If-Match = version local"]
    W2["Ficha somente leitura"]
    W3["Campos destacados com mensagem i18n"]
    W4["Aviso: outra edição venceu, recarregar"]
    W5["Abre o documento no provedor em nova aba"]
    W6["Card com aviso 'processando' até o PipelineJob concluir"]
    W7["Cartão de feedback de qualidade ✦ com 'Por que isto?'"]
    W8["Aviso: projeto bloqueado, botão Reabrir com justificativa"]
  end

  subgraph LA["ws-application"]
    A1{"canEdit: dono ou responsável?"}
    A2["403 ACESSO_NEGADO"]
    A3["TaskService.update → validate"]
    A4{"Obrigatórios ok?"}
    A5["422 VALIDACAO"]
    A6{"baseVersion == version?"}
    A7["409 CONFLITO_VERSAO"]
    A8["UPDATE tasks, version + 1, AuditLog TASK_UPDATED, SearchIndexPort.indexTask"]
    A9["MediaStoragePort.put + AntivirusPort.scan"]
    A10{"Antivírus"}
    A11["422 ARQUIVO_MALICIOSO"]
    A12["TaskVersion versionNumber + 1 com snapshotMediaId do arquivo anterior; nova TaskAttachment"]
    A13["AFTER_COMMIT: PipelineJob THUMBNAIL, OCR"]
    A14{"linkMode VINCULADO?"}
    A15["AcervoService.openInProvider → ExternalDocPort.editUrl"]
    A16["Webhook → syncLinkedVersion: TaskVersion externalRevisionId, thumbnail"]
    A17["convertLinkToSnapshot → linkMode COPIADO"]
    A18["ProjectDeskService.canEdit + status"]
    A19{"CONCLUIDO ou ARQUIVADO?"}
    A20["409 PROJETO_BLOQUEADO"]
    A21{"Mudança estrutural?"}
    A22["ProjectVersionService.record diffJson"]
    A23["UPDATE project_schemes"]
    A24["TaskStateMachine.transition → CONCLUIDA"]
    A25{"Transição permitida?"}
    A26["422 TRANSICAO_INVALIDA"]
    A27["ProjectDeskService.onTaskConcluded: percentComplete, todas concluídas → CONCLUIDO"]
    A28["AFTER_COMMIT: InsightService.qualityFeedback"]
    A29{"accessClass RESTRITO/SIGILOSO?"}
    A30["BLOQUEADO_SIGILO ou IA local"]
  end

  subgraph LI["IA (AiEngine)"]
    I1["INSIGHT: completude dos metadados, clareza do título/resumo, prazo coerente, conformidade RF32, sugestões acionáveis"]
    I2["THUMBNAIL assíncrono"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: tasks, task_attachments, task_versions, task_state_log, audit_log")]
    P2[("S3: MediaObject novo e anterior preservado")]
    P3[("MySQL: pipeline_jobs")]
    P4[("OpenSearch: índice de tarefas")]
    P5[("MySQL: project_schemes, project_versions, project_tasks")]
    P6[("MySQL: insights, ai_inference_log")]
  end

  U1 --> A1
  A1 -->|"não"| A2 --> W2
  A1 -->|"sim"| W1
  W1 --> U2 --> A3 --> A4
  A4 -->|"não"| A5 --> W3
  A4 -->|"sim"| A6
  A6 -->|"não"| A7 --> W4
  A6 -->|"sim"| A8 --> P1
  A8 --> P4
  A8 --> A28
  W1 --> U3 --> A9 --> P2
  A9 --> A10
  A10 -->|"INFECTADO"| A11
  A10 -->|"LIMPO"| A12 --> P1
  A12 --> A13 --> P3
  A13 --> I2
  A13 --> W6
  A12 --> A28
  W1 --> U4 --> A14
  A14 -->|"sim, editar"| A15 --> W5
  A15 -.->|"mudança no provedor"| A16 --> P1
  A14 -->|"converter"| A17 --> P1
  U1 --> U5 --> A18 --> A19
  A19 -->|"sim"| A20 --> W8
  A19 -->|"não"| A21
  A21 -->|"sim"| A22 --> P5
  A21 -->|"não"| A23 --> P5
  A22 --> A28
  A23 --> A28
  W1 --> U6 --> A24 --> A25
  A25 -->|"não"| A26
  A25 -->|"sim"| P1
  A25 -->|"sim"| A27 --> P5
  A28 --> A29
  A29 -->|"sim"| A30 --> P6
  A29 -->|"não"| I1 --> P6
  I1 --> W7 --> U7

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  class A2,A5,A7,A11,A20,A26 err
  class W2,W4,W6,W8,A30 warn
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
  participant OS as OpenSearch
  participant S3 as S3
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>NX: no Acervo Digital do perfil abre /tasks/T1/edit
  NX->>C: GET /api/tasks/T1/edit
  C->>S: TaskService.canEdit(user, T1)
  alt não é dono nem responsável (CA01)
    S-->>C: 403 ACESSO_NEGADO
    C-->>NX: 403
    NX-->>U: ficha somente leitura
  else pode editar
    S-->>C: 200 ficha + anexos + versões + version 7
    C-->>NX: 200
  end

  U->>NX: altera título, prazo e tags, salva
  NX->>C: PATCH /api/tasks/T1 {TaskForm} If-Match: 7
  C->>S: TaskService.update(userId, T1, form, baseVersion 7)
  S->>S: validate obrigatórios
  alt erro de validação
    S-->>C: 422 VALIDACAO {details por campo, correlationId}
    C-->>NX: 422
    NX-->>U: campos destacados (CA01)
  else válido
    S->>DB: SELECT version FROM tasks WHERE id = T1
    alt version atual 8 diferente de 7
      S-->>C: 409 CONFLITO_VERSAO {currentVersion 8}
      C-->>NX: 409
      NX-->>U: aviso para recarregar
    else igual
      S->>DB: UPDATE tasks SET title, dueAt, tags, version 8
      S->>DB: INSERT audit_log (TASK_UPDATED, correlationId)
      S->>DE: publish TaskUpdated {taskId T1, actorId}
      S-->>C: 200 TaskItem version 8
      C-->>NX: 200
    end
  end
  DE->>OS: indexTask(T1)

  U->>NX: substitui o arquivo principal por oficio_v2.pdf (CA02)
  NX->>C: PUT /api/tasks/T1/attachments/A1 (multipart)
  C->>S: TaskService.replaceAttachment(userId, T1, A1, stream)
  S->>S3: MediaStoragePort.put(stream, mimeType, accessClass)
  S3-->>S: MediaObject M2
  S->>S: AntivirusPort.scan(M2)
  alt INFECTADO
    S->>S3: delete(M2)
    S-->>C: 422 ARQUIVO_MALICIOSO
    C-->>NX: 422
  else LIMPO
    S->>DB: INSERT task_versions (versionNumber 3, snapshotMediaId M1 anterior, changeSummary "arquivo substituído")
    S->>DB: UPDATE task_attachments SET mediaObjectId M2, sha256, sizeBytes
    S->>DB: INSERT audit_log (ATTACHMENT_REPLACED)
    S->>DE: publish AttachmentReplaced
    S-->>C: 200 TaskAttachment
    C-->>NX: 200
    NX-->>U: card com aviso "processando"
  end
  DE->>DB: INSERT pipeline_jobs THUMBNAIL, OCR (PENDENTE)
  DE->>AI: infer(THUMBNAIL, {M2}) assíncrono
  DE->>DB: UPDATE tasks SET thumbnailUrl
  DE->>OS: indexTask(T1, ocrText)

  Note over U,DE: CA03 — item VINCULADO: POST /api/tasks/T1/open-in-provider → ExternalDocPort.editUrl abre Google Docs ou Word online. Webhook /api/webhooks/google-drive → AcervoService.syncLinkedVersion → INSERT task_versions (externalRevisionId, syncedAt) + thumbnail. POST /convert-to-copy → convertLinkToSnapshot (linkMode COPIADO).

  U->>NX: Concluir tarefa (CA05)
  NX->>C: POST /api/tasks/T1/conclude
  C->>S: TaskService.conclude(userId, T1)
  S->>S: TaskStateMachine.canTransition(EM_USO, CONCLUIDA)
  alt BLOQUEADA ou transição inválida
    S-->>C: 422 TRANSICAO_INVALIDA
    C-->>NX: 422
  else permitida
    S->>DB: UPDATE tasks SET state CONCLUIDA
    S->>DB: INSERT task_state_log (EM_USO → CONCLUIDA, actorId)
    S->>DB: UPDATE project_tasks SET percentComplete 100 WHERE taskId = T1
    S->>S: ProjectDeskService.onTaskConcluded — todas concluídas?
    opt última ProjectTask pendente do projeto 42
      S->>DB: UPDATE project_schemes SET status CONCLUIDO WHERE id = 42
      S->>DB: INSERT project_versions (reason "todas as tarefas concluídas")
    end
    S-->>C: 200
    C-->>NX: 200
  end

  DE->>S: InsightService.qualityFeedback(ACERVO, T1, actorId) (CA06)
  alt accessClass RESTRITO ou SIGILOSO
    S->>DB: INSERT ai_inference_log (result BLOQUEADO_SIGILO) ou usa IA local
  else INTERNO ou PUBLICO
    S->>AI: infer(INSIGHT, {tarefa, anexos resumidos, checklist RF32})
    AI-->>S: {completude, clareza, prazo, conformidade, sugestões, confidence}
    S->>DB: INSERT ai_inference_log (capability INSIGHT, result OK)
    S->>DB: INSERT insights (scope ACERVO, scopeId T1, metricRefsJson, actionsJson)
  end
  NX->>C: GET /api/insights/ACERVO/T1
  C-->>NX: 200 Insight
  NX-->>U: cartão de feedback ✦ com ações em 1 clique e "Por que isto?"
  U->>NX: dispensa o insight
  NX->>C: POST /api/insights/{id}/dismiss
  C->>S: InsightService.dismiss
  S->>DB: UPDATE insights SET dismissedAt
```

## 4. Máquina de estados

Entidade central: **`TaskItem.state`** (enum `TaskState`), sob a ótica da **edição e conclusão**: os estados do grupo *Editável* aceitam alteração de ficha e de arquivos (cada troca de arquivo gera `TaskVersion`); `CONCLUIDA` e `ARQUIVADA` ficam somente leitura (reabrir = voltar a `DISPONIVEL`); `BLOQUEADA` precisa ser desbloqueada antes de concluir. `ProjectScheme.status` segue a máquina do RF22 (CONCLUIDO/ARQUIVADO = `409 PROJETO_BLOQUEADO`), indicada na nota.

```mermaid
stateDiagram-v2
  state "Editável — ficha e arquivos, cada troca gera TaskVersion" as Editavel {
    [*] --> DISPONIVEL
    DISPONIVEL --> EM_USO : entra em projeto ativo
    EM_USO --> DISPONIVEL : sai de todos os projetos
    DISPONIVEL --> DISPONIVEL : PATCH ficha, PUT anexo, sync do provedor
    EM_USO --> EM_USO : PATCH ficha, PUT anexo, sync do provedor
    --
    [*] --> VINCULADO
    VINCULADO --> VINCULADO : webhook do provedor, TaskVersion externalRevisionId
    VINCULADO --> COPIADO : Converter em cópia ou OAuth revogado
    COPIADO --> COPIADO : PUT anexo, TaskVersion snapshotMediaId
  }
  state "Pendência" as Pend {
    BLOQUEADA --> BLOQUEADA : edição de ficha permitida, concluir negado
  }
  state "Somente leitura" as Leitura {
    CONCLUIDA --> ARQUIVADA : arquivar
  }
  Editavel --> BLOQUEADA : bloquear com motivo
  BLOQUEADA --> Editavel : desbloquear
  Editavel --> CONCLUIDA : Concluir, TaskStateLog, percentComplete 100
  CONCLUIDA --> Editavel : reabrir, volta a DISPONIVEL
  Editavel --> ARQUIVADA : arquivar
  ARQUIVADA --> [*]
  note right of Editavel
    Edição só por dono ou responsável: 403 ACESSO_NEGADO (CA01).
    If-Match version: 409 CONFLITO_VERSAO (CA01).
    Arquivo anterior preservado em TaskVersion.snapshotMediaId (CA02).
    Cada salvamento dispara Insight de qualidade AFTER_COMMIT (CA06).
  end note
  note right of Leitura
    Concluir a última ProjectTask pendente leva o projeto a CONCLUIDO (CA05).
    Projeto CONCLUIDO/ARQUIVADO: 409 PROJETO_BLOQUEADO na edição (CA04).
  end note
  note left of Pend
    Concluir em BLOQUEADA: 422 TRANSICAO_INVALIDA (CA05).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/tasks/[id]/edit — ficha, anexos, versões, Editar no provedor, Concluir"]
    F2["app/projects/[id]/edit — ficha do projeto e Mesa RF22"]
    F3["components/ui: TaskForm com If-Match, AttachmentManager substituir/adicionar, VersionTimeline, ProviderEditButton, ConvertToCopy, ConcludeButton, QualityInsightCard ✦ com ações em 1 clique, ConflictBanner, ProcessingBadge"]
  end

  subgraph WEB["ws-web"]
    C1["TaskController — /api/tasks/{id}/edit, PATCH /api/tasks/{id}, /attachments, /open-in-provider, /convert-to-copy, /conclude"]
    C2["ProjectDeskController RF22 — PATCH /api/projects/{id}"]
    C3["InsightController RF43 — /api/insights/{scope}/{id}, /dismiss"]
    C4["ExternalDocWebhookController — /api/webhooks/google-drive, /microsoft-graph"]
  end

  subgraph APP["ws-application"]
    S1["TaskService"]
    S2["AcervoService RF41"]
    S3["TaskStateMachine RF41"]
    S4["ProjectDeskService RF22"]
    S5["ProjectVersionService RF22"]
    S6["InsightService RF43"]
    S7["AiEngine"]
    P1["MediaStoragePort"]
    P2["AntivirusPort"]
    P3["ExternalDocPort"]
    P4["SearchIndexPort"]
  end

  subgraph DOM["ws-domain"]
    D1["TaskItem · TaskAttachment · TaskVersion · TaskStateLog · TaskState · LinkMode"]
    D2["ProjectScheme · ProjectTask · ProjectVersion"]
    D3["Insight · AiInferenceLog · MediaObject · PipelineJob · AuditLog · DomainEventOutbox"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: tasks, task_attachments, task_versions, task_state_log, project_schemes, project_versions, insights, ai_inference_log, audit_log, pipeline_jobs")]
    I2[("storage-s3: arquivos novos e anteriores preservados")]
    I3[("search-opensearch: reindexação após edição")]
    I4["ai-providers: ClaudeGeminiAdapter + fallback local — INSIGHT, THUMBNAIL"]
    I5["platform: ClamAvAdapter, GoogleDriveAdapter, MicrosoftGraphAdapter, PipelineJob worker, outbox AFTER_COMMIT"]
  end

  subgraph EXT["Serviços externos"]
    E1(("Claude / Gemini"))
    E2(("Google Workspace: Docs, Sheets, Drive"))
    E3(("Microsoft 365: Word, Excel, OneDrive, SharePoint"))
  end

  F1 --- F3
  F2 --- F3
  F1 -->|"HTTPS/JSON multipart"| C1
  F2 -->|"HTTPS/JSON"| C2
  F3 -->|"HTTPS/JSON"| C3
  C1 --> S1
  C1 --> S2
  C2 --> S4
  C3 --> S6
  C4 --> S2
  S1 --> S3
  S1 --> S4
  S1 --> P1
  S1 --> P2
  S1 --> P4
  S2 --> P3
  S4 --> S5
  S6 --> S7
  S1 --> D1
  S4 --> D2
  S6 --> D3
  S1 --> D3
  D1 --> I1
  D2 --> I1
  D3 --> I1
  P1 --> I2
  P4 --> I3
  S7 --> I4
  P2 --> I5
  P3 --> I5
  D3 --> I5
  I4 -.-> E1
  I5 -.->|"OAuth do usuário + webhooks"| E2
  I5 -.->|"OAuth do usuário + webhooks"| E3
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF8.CA01 (a confirmar) | Classes `TaskItem.version` (nota), `TaskService.canEdit/update/validate`, `AuditLog TASK_UPDATED`, `SearchIndexPort` · Atividades `U1 → A1 → A2 403 → W2`, `U2 → A3 → A4 → A5 422 → W3`, `A6 → A7 409 CONFLITO_VERSAO → W4`, `A8 → P1/P4` · Sequência `GET /api/tasks/T1/edit` com `alt não é dono nem responsável`, `PATCH /api/tasks/T1 If-Match: 7` com `alt erro de validação` e `alt version atual 8 diferente de 7` · Nota do grupo *Editável* · Componentes `TaskForm com If-Match`, `ConflictBanner`, `search-opensearch` |
| RF8.CA02 (a confirmar) | Classes `TaskAttachment`, `TaskVersion.snapshotMediaId/changeSummary`, `MediaObject`, `PipelineJob`, `TaskService.replaceAttachment/addAttachment`, `MediaStoragePort`, `AntivirusPort` · Atividades `U3 → A9 → A10 → A11 422 ARQUIVO_MALICIOSO` / `A12 → A13 → P3 → I2 → W6` · Sequência `PUT /api/tasks/T1/attachments/A1` com `alt INFECTADO` / `else LIMPO` → INSERT task_versions (snapshotMediaId M1), pipeline_jobs THUMBNAIL/OCR · Transição `COPIADO → COPIADO : PUT anexo, TaskVersion snapshotMediaId` · Componentes `AttachmentManager`, `VersionTimeline`, `ProcessingBadge`, `storage-s3`, `ClamAvAdapter`, `PipelineJob worker` |
| RF8.CA03 (a confirmar) | Classes `TaskItem.linkMode/sourceRef`, enum `LinkMode`, `TaskVersion.externalRevisionId/syncedAt`, `AcervoService.openInProvider/syncLinkedVersion/convertLinkToSnapshot`, `ExternalDocPort.editUrl/revoke`, `ExternalDocWebhookController`, `GoogleDriveAdapter`, `MicrosoftGraphAdapter` · Atividades `U4 → A14 → A15 → W5`, `A16`, `A17` · Sequência nota «CA03» (open-in-provider, webhook, convert-to-copy) · Transições `VINCULADO → VINCULADO : webhook` e `VINCULADO → COPIADO` · Componentes `ProviderEditButton`, `ConvertToCopy`, `C4`, `I5 → E2/E3` |
| RF8.CA04 (a confirmar) | Classes `ProjectScheme.status/version`, `ProjectVersion.diffJson`, `ProjectDeskService.canEdit/updateSheet`, `ProjectVersionService.record` · Atividades `U5 → A18 → A19 → A20 409 PROJETO_BLOQUEADO → W8`, `A21 → A22/A23 → P5` · Nota do grupo *Somente leitura* · Componentes `app/projects/[id]/edit`, `ProjectDeskController RF22`, `ProjectVersionService RF22` |
| RF8.CA05 (a confirmar) | Classes `TaskStateMachine.transition/canTransition`, `TaskStateLog`, `ProjectTask.percentComplete`, `ProjectDeskService.onTaskConcluded`, `TaskService.conclude` · Atividades `U6 → A24 → A25 → A26 422 TRANSICAO_INVALIDA` / `A25 → P1 + A27 → P5` · Sequência `POST /api/tasks/T1/conclude` com `alt BLOQUEADA ou transição inválida` / `else permitida` e `opt última ProjectTask pendente → status CONCLUIDO` · Transições `Editavel → CONCLUIDA`, `BLOQUEADA` (nota 422) e nota *Somente leitura* · Componente `ConcludeButton` |
| RF8.CA06 (a confirmar) | Classes `Insight` (scope ACERVO/PROJETO, metricRefsJson, actionsJson, dismissedAt), `AiInferenceLog` (INSIGHT, BLOQUEADO_SIGILO), enums `InsightScope`, `InferenceResult`, `InsightService.qualityFeedback/dismiss`, `AiEngine` · Atividades `A8/A12/A22/A23 → A28 → A29 → A30` / `I1 → P6 → W7 → U7` · Sequência `DE->>S InsightService.qualityFeedback` com `alt accessClass RESTRITO ou SIGILOSO` / `else` → infer(INSIGHT) → insights, `GET /api/insights/ACERVO/T1`, `POST /dismiss` · Nota do grupo *Editável* · Componentes `QualityInsightCard ✦`, `InsightController RF43`, `ai-providers → Claude / Gemini` |


Tela/aba: `/tasks/[id]/edit` (esqueleto em `app/(shell)/tasks/[id]/edit/page.tsx`) · `/projects/[id]/edit` (esqueleto em `app/(shell)/projects/[id]/edit/page.tsx`)
