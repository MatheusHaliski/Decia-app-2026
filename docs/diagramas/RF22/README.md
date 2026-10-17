# RF22 — Editar um Esquema de Projeto na Mesa de Trabalho (quadro por fase, linha do tempo e canvas livre) com versões e histórico
**HU:** HU22 · **Sprint (board Work Station):** 4 · **Equivalente FAI:** RF9 Editar esquema + RF15 Editor Canvas 2D + RF27 Meu Quarto · **Aba/rota:** `/projects/[id]/edit` e Mesa de Trabalho (`/desk`)
**Critérios de aceite cobertos:** RF22.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07

Três visões do **mesmo** `ProjectScheme`: **Quadro** (kanban por `ProjectPhase`, arrastar e soltar), **Linha do tempo** (barras por `ProjectTask` com prazo, `ProjectTaskDependency` e caminho crítico — Gantt simples) e **Mesa** (canvas livre: cartões/post-its com `canvasX/Y/Scale/Rotation/Layer`, conectores de dependência, textura `DeskSkin` PAPEL · CORTIÇA · BLUEPRINT · PAPEL_TIMBRADO e skins salvas em `UserSkin`, RF38). Toda alteração **estrutural** gera uma `ProjectVersion` com autor, data e `diffJson` legível; a edição é **colaborativa** (propagação ≤ 3 s via Redis pub/sub + WebSocket/polling, conflito resolvido por *último-vence* com aviso); comentários por tarefa usam `Comment` com `targetType = PROJECT_TASK`; o painel lateral mostra o **fio de decisão** (`DecisionTraceNode/Edge`) da `DeciaSession` vinculada (RF29); projetos CONCLUÍDO/ARQUIVADO ficam bloqueados (reabrir exige justificativa); exportação em **PDF** e **ZIP** roda como `PipelineJob EXPORT_PDF` com entrega via `MediaStoragePort`.

| Alteração | Estrutural? | Gera `ProjectVersion`? | Persistido em |
|---|---|---|---|
| Adicionar / remover tarefa, mover de fase, mudar prazo ou responsável, criar/remover dependência | sim | sim (CA02) | `project_tasks`, `project_task_dependencies`, `project_versions` |
| Mover / redimensionar / girar cartão na Mesa, trocar camada ou cor do post-it, trocar skin de mesa | não | não (posição por tarefa, CA03) | `project_tasks.canvas*`, `project_schemes.deskSkin/deskBackgroundJson` |
| Comentar tarefa | não | não | `comments` (PROJECT_TASK) |
| Reabrir projeto CONCLUÍDO/ARQUIVADO | sim | sim, com `reason` obrigatório (CA06) | `project_versions`, `audit_log` |

## 0. Diagrama de casos de uso

Quem lê e quem edita um Esquema de Projeto em `/projects/[id]/edit`: editam o dono, o responsável por tarefa do projeto e o chefe do departamento; os demais que veem o projeto ficam em modo leitura. Pílulas cheias existem no código hoje; tracejadas são planejadas.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  autenticado["«ator» Pessoa autenticada"]:::ator
  dono["«ator» Dono do recurso"]:::ator
  responsavel["«ator» Responsável atribuído"]:::ator
  chefe["«ator» Chefe de departamento"]:::ator
  subgraph SIS["Work Station — RF22 Editar projeto na Mesa"]
    direction TB
    UC1(["UC1 Abrir o projeto em quadro, linha do tempo ou canvas"]):::ucPlan
    UC2(["UC2 Verificar a permissão de edição"]):::ucPlan
    UC3(["UC3 Alterar a estrutura do projeto"]):::ucPlan
    UC4(["UC4 Registrar uma versão do projeto"]):::ucPlan
    UC5(["UC5 Comparar e restaurar versões"]):::ucPlan
    UC6(["UC6 Arrumar cartões no canvas e trocar a skin"]):::ucPlan
    UC7(["UC7 Resolver conflito de edição simultânea"]):::ucPlan
    UC8(["UC8 Reabrir projeto concluído ou arquivado com justificativa"]):::ucPlan
    UC9(["UC9 Comentar uma tarefa e ver o fio de decisão"]):::ucPlan
    UC10(["UC10 Exportar o projeto em PDF ou ZIP"]):::ucPlan
  end
  autenticado --- UC1
  dono --- UC3
  responsavel --- UC3
  chefe --- UC3
  dono --- UC5
  chefe --- UC5
  dono --- UC6
  responsavel --- UC6
  chefe --- UC6
  dono --- UC8
  chefe --- UC8
  autenticado --- UC9
  autenticado --- UC10
  UC3 -. "«include»" .-> UC2
  UC3 -. "«include»" .-> UC4
  UC5 -. "«include»" .-> UC2
  UC5 -. "«include»" .-> UC4
  UC6 -. "«include»" .-> UC2
  UC7 -. "«extend»" .-> UC3
  UC8 -. "«include»" .-> UC4
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Abrir o projeto em quadro, linha do tempo ou canvas | Pessoa autenticada | RF22.CA01, RF22.CA03 | planejado — `/projects/[id]/edit` é esqueleto; sem permissão de edição, modo leitura |
| UC2 Verificar a permissão de edição | (incluído por UC3, UC5, UC6) | RF22.CA01, RF22.CA06 | planejado — `ProjectDeskService.canEdit`; `403 ACESSO_NEGADO` e `409 PROJETO_BLOQUEADO` |
| UC3 Alterar a estrutura do projeto | Dono do recurso · Responsável atribuído · Chefe de departamento | RF22.CA02, RF22.CA06 | planejado — tarefas, fases, prazos, responsáveis e dependências |
| UC4 Registrar uma versão do projeto | (incluído por UC3, UC5, UC8) | RF22.CA02 | planejado — `ProjectVersion` com autor, data e `diffJson` legível |
| UC5 Comparar e restaurar versões | Dono do recurso · Chefe de departamento | RF22.CA02 | planejado |
| UC6 Arrumar cartões no canvas e trocar a skin | Dono do recurso · Responsável atribuído · Chefe de departamento | RF22.CA03 | planejado — não gera versão |
| UC7 Resolver conflito de edição simultânea | (estende UC3) | RF22.CA04 | planejado — propagação em até 3 s, último-vence com aviso |
| UC8 Reabrir projeto concluído ou arquivado com justificativa | Dono do recurso · Chefe de departamento | RF22.CA06 | planejado — `AuditLog PROJECT_REOPEN` |
| UC9 Comentar uma tarefa e ver o fio de decisão | Pessoa autenticada | RF22.CA05 | planejado |
| UC10 Exportar o projeto em PDF ou ZIP | Pessoa autenticada | RF22.CA07 | planejado — `PipelineJob EXPORT_PDF` ou `EXPORT_ZIP` |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_projetos {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +title: String
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +deskSkin: String
    +deskBackgroundJson: JSON
    +criticalPathJson: JSON
    +hasBlockingPending: boolean
    +nextMilestoneAt: LocalDate
    +version: long otimista
    .. +35 campos ..
  }
  class ProjectTask {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +taskId: UUID
    +phase: ProjectPhase
    +sortOrder: int
    +responsibleId: UUID
    +dueAt: LocalDate
    +startAt: LocalDate
    +percentComplete: int
    +isCritical: boolean
    +slackDays: int
    +canvasX: BigDecimal
    +canvasY: BigDecimal
    +canvasScale: BigDecimal
    +canvasRotation: BigDecimal
    +canvasLayer: int
    +stickyColor: String
    +snapshotJson: JSON
    +removedByAuthor: boolean
    +decisionTraceNodeId: UUID
  }
  class ProjectTaskDependency {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +predecessorProjectTaskId: UUID
    +successorProjectTaskId: UUID
    +type: String FS SS FF SF
    +lagDays: int
  }
  class ProjectVersion {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +versionNumber: int
    +authorId: UUID
    +createdAt: Instant
    +diffJson: JSON legível
    +snapshotJson: JSON
    +reason: String
    +restoredFromVersionId: UUID
    +sourceScenarioId: UUID
  }
}

namespace ws_domain_social_decia {
  class Comment {
    <<entity>>
    +id: UUID
    +authorId: UUID
    +targetType: TargetType PROJECT_TASK
    +targetId: UUID
    +parentCommentId: UUID
    +contentMd: String
    +mentionsJson: JSON
    +active: boolean
  }
  class DeciaSession {
    <<entity>>
    +id: UUID
    +linkedProjectId: UUID
    +status: SessionStatus
  }
  class DecisionTraceNode {
    <<entity>>
    +id: UUID
    +sessionId: UUID
    +nodeType: TraceNodeType
    +refId: UUID
    +label: String
    +classLabel: String
    +at: Instant
  }
  class DecisionTraceEdge {
    <<entity>>
    +fromNodeId: UUID
    +toNodeId: UUID
    +relation: String
  }
  class Notification {
    <<entity>>
    +recipientId: UUID
    +type: NotificationType
    +category: String SOCIAL
    +groupKey: String
  }
}

namespace ws_domain_plataforma {
  class Department {
    <<entity>>
    +id: UUID
    +headUserId: UUID chefe
  }
  class UserSkin {
    <<entity>>
    +userId: UUID
    +skinKind: String MESA
    +skinKey: String
    +acquiredVia: String
  }
  class TaskAttachment {
    <<entity>>
    +taskId: UUID
    +mediaObjectId: UUID
    +fileName: String
  }
  class MediaObject {
    <<entity>>
    +id: UUID
    +key: String
    +mimeType: String
  }
  class PipelineJob {
    <<entity>>
    +type: String EXPORT_PDF
    +targetType: String PROJECT
    +targetId: UUID
    +status: String PENDENTE RODANDO OK FALHA
  }
  class AuditLog {
    <<entity>>
    +actorId: UUID
    +action: String PROJECT_REOPEN
    +resourceId: UUID
    +metadataJson: JSON
  }
}

namespace ws_domain_enums {
  class ProjectStatus {
    <<enum>>
    RASCUNHO
    PUBLICADO
    EM_DECISAO
    APROVADO
    EM_EXECUCAO
    CONCLUIDO
    ARQUIVADO
    DEVOLVIDO
  }
  class ProjectPhase {
    <<enum>>
    DEMANDA
    PLANEJAMENTO
    ELABORACAO
    ANALISE
    APROVACAO
    EXECUCAO
    ENCERRAMENTO
  }
  class DeskSkin {
    <<enum>>
    PAPEL
    CORTICA
    BLUEPRINT
    PAPEL_TIMBRADO
  }
  class DeskView {
    <<enum>>
    QUADRO
    LINHA_DO_TEMPO
    MESA
  }
}

namespace ws_application {
  class ProjectDeskService {
    <<service>>
    +load(viewerId, projectId, view) DeskState
    +canEdit(userId, project) boolean dono responsáveis chefe
    +moveTask(userId, projectId, ptId, phase, sortOrder, baseVersion) ChangeResult
    +updateTask(userId, projectId, ptId, dueAt, responsibleId, baseVersion) ChangeResult
    +addTask(userId, projectId, taskId, phase) ChangeResult
    +removeTask(userId, projectId, ptId) ChangeResult
    +setDependency(userId, projectId, predId, succId, type) ChangeResult
    +saveCanvasPosition(userId, projectId, ptId, x, y, scale, rotation, layer)
    +setDeskSkin(userId, projectId, skinKey)
    +reopen(userId, projectId, reason) ProjectScheme
    +requestExport(userId, projectId, format PDF ou ZIP) PipelineJob
  }
  class ProjectVersionService {
    <<service>>
    +record(projectId, authorId, diff, reason) ProjectVersion
    +list(projectId) List~ProjectVersion~
    +compare(projectId, a, b) Diff
    +restore(userId, projectId, versionId) ProjectVersion
  }
  class SocialService {
    <<service>>
    +comment(userId, PROJECT_TASK, ptId, contentMd, parentId) Comment
  }
  class DecisionTraceService {
    <<service>>
    +threadForProject(projectId) List~DecisionTraceNode~
  }
  class CollaborationPort {
    <<port>>
    +publish(channel desk projectId, ChangeEvent)
    +subscribe(channel) Stream~ChangeEvent~
    +presence(projectId) List~UUID~
  }
  class MediaStoragePort {
    <<port>>
    +put(stream, mimeType) MediaObject
    +presign(mediaId, ttl) URL
  }
  class PdfRenderPort {
    <<port>>
    +renderProjectReport(ProjectScheme, tasks, decisions) byte
  }
}

namespace ws_web {
  class ProjectDeskController {
    <<controller>>
    +GET_api_projects_id_desk(view)
    +PATCH_api_projects_id_tasks_ptId(body, If_Match)
    +POST_api_projects_id_tasks(body)
    +DELETE_api_projects_id_tasks_ptId()
    +PUT_api_projects_id_tasks_ptId_canvas(body)
    +PUT_api_projects_id_desk_skin(body)
    +POST_api_projects_id_reopen(reason)
    +POST_api_projects_id_export(format)
  }
  class ProjectVersionController {
    <<controller>>
    +GET_api_projects_id_versions()
    +GET_api_projects_id_versions_a_compare_b()
    +POST_api_projects_id_versions_v_restore()
  }
  class DeskRealtimeController {
    <<controller>>
    +WS_ws_desk_projectId()
    +GET_api_projects_id_changes_since(ts) polling
  }
}

namespace ws_infrastructure {
  class RedisPubSubAdapter {
    <<adapter>>
  }
  class S3StorageAdapter {
    <<adapter>>
  }
  class PdfRendererAdapter {
    <<adapter>>
  }
  class CassandraTraceReadAdapter {
    <<adapter>>
  }
}

ProjectScheme "1" --> "*" ProjectTask
ProjectScheme "1" --> "*" ProjectTaskDependency
ProjectScheme "1" --> "*" ProjectVersion : histórico
ProjectScheme "*" --> "1" Department : chefe edita
ProjectScheme "1" --> "0..1" DeciaSession : linkedProjectId
ProjectVersion "*" --> "0..1" ProjectVersion : restoredFromVersionId
ProjectTask "1" --> "*" Comment : targetId quando PROJECT_TASK
ProjectTask "*" --> "0..1" DecisionTraceNode : decisionTraceNodeId
ProjectTaskDependency "*" --> "1" ProjectTask : predecessor
ProjectTaskDependency "*" --> "1" ProjectTask : successor
DeciaSession "1" --> "*" DecisionTraceNode : fio de decisão
DecisionTraceEdge "*" --> "1" DecisionTraceNode : from
DecisionTraceEdge "*" --> "1" DecisionTraceNode : to
Comment --> Notification : menção ou resposta
PipelineJob "*" --> "1" ProjectScheme : export
PipelineJob "*" --> "0..1" MediaObject : resultado PDF ou ZIP
TaskAttachment "*" --> "1" MediaObject : anexos no ZIP
UserSkin "*" --> "1" DeskSkin : skinKey
ProjectScheme --> ProjectStatus
ProjectScheme --> DeskSkin : deskSkin
ProjectTask --> ProjectPhase

ProjectDeskController ..> ProjectDeskService
ProjectVersionController ..> ProjectVersionService
DeskRealtimeController ..> CollaborationPort
ProjectDeskService ..> ProjectVersionService : record a cada mudança estrutural
ProjectDeskService ..> CollaborationPort : publish ChangeEvent
ProjectDeskService ..> SocialService
ProjectDeskService ..> DecisionTraceService
ProjectDeskService ..> MediaStoragePort
ProjectDeskService ..> PdfRenderPort
ProjectDeskService ..> AuditLog : reopen
RedisPubSubAdapter ..|> CollaborationPort
S3StorageAdapter ..|> MediaStoragePort
PdfRendererAdapter ..|> PdfRenderPort
CassandraTraceReadAdapter ..> DecisionTraceService : trace_by_entity

note for ProjectVersion "tabela project_versions · 1 por alteração estrutural, diffJson legível, comparar e restaurar (CA02)"
note for ProjectTask "canvasX/Y/Scale/Rotation/Layer persistidos por tarefa — trocar de visão não perde dados (CA03)"
note for ProjectDeskService "canEdit = dono OR responsável de alguma ProjectTask OR Department.headUserId — demais só leitura, 403 na API (CA01)"
note for CollaborationPort "canal desk:{projectId} · propagação ≤ 3 s · conflito: último-vence com aviso CONFLITO_ULTIMO_VENCE (CA04)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["Abre /projects/[id]/edit ou /desk"]
    U2["Troca de visão: Quadro / Linha do tempo / Mesa"]
    U3["Arrasta tarefa para outra fase, muda prazo ou responsável, adiciona/remove tarefa ou dependência"]
    U4["Move, redimensiona, gira cartão na Mesa; troca camada, cor, skin"]
    U5["Comenta uma tarefa; abre o painel do fio de decisão"]
    U6["Abre histórico: compara duas versões, restaura uma"]
    U7["Clica em Reabrir e informa justificativa"]
    U8["Exportar PDF ou ZIP"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Carrega DeskState único e renderiza a visão escolhida"]
    W2["Troca de visão só reprojeta o mesmo estado, sem recarregar"]
    W3["Envia PATCH com If-Match = version local"]
    W4["Aplica ChangeEvent recebido via WS ou polling ≤ 3 s; toast de aviso se CONFLITO_ULTIMO_VENCE"]
    W5["Modo somente leitura: controles desabilitados"]
    W6["Mostra aviso: projeto bloqueado, botão Reabrir"]
    W7["Aguarda job e oferece link de download"]
  end

  subgraph LA["ws-application"]
    A1["ProjectDeskService.load"]
    A2{"canEdit? dono, responsável de tarefa ou chefe do departamento"}
    A3{"status CONCLUIDO ou ARQUIVADO?"}
    A4["403 ACESSO_NEGADO em qualquer escrita"]
    A5["409 PROJETO_BLOQUEADO em qualquer escrita"]
    A6{"Alteração estrutural?"}
    A7{"baseVersion == version atual?"}
    A8["Aplica por último-vence e marca warning CONFLITO_ULTIMO_VENCE"]
    A9["Aplica a alteração, recalcula caminho crítico"]
    A10["ProjectVersionService.record: versionNumber + 1, authorId, diffJson legível, snapshotJson"]
    A11["CollaborationPort.publish desk:{projectId} ChangeEvent"]
    A12["saveCanvasPosition x, y, escala, rotação, camada / setDeskSkin"]
    A13["SocialService.comment targetType PROJECT_TASK; menções → Notification"]
    A14["DecisionTraceService.threadForProject: nós e arestas da sessão vinculada"]
    A15["ProjectVersionService.compare a × b / restore → nova versão com restoredFromVersionId"]
    A16{"Justificativa informada?"}
    A17["422 VALIDACAO: reason obrigatório"]
    A18["reopen: status → EM_EXECUCAO ou APROVADO anterior, ProjectVersion com reason, AuditLog PROJECT_REOPEN"]
    A19["requestExport: PipelineJob EXPORT_PDF ou EXPORT_ZIP PENDENTE → 202 jobId"]
    A20["Worker: PdfRenderPort relatório com fases, tarefas, responsáveis, prazos e decisões / ZIP com anexos; MediaStoragePort.put; presign"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: project_schemes, project_tasks, project_task_dependencies")]
    P2[("MySQL: project_versions")]
    P3[("Redis: pub/sub desk:{projectId}, presença")]
    P4[("MySQL: comments · Cassandra: notifications_by_user")]
    P5[("Cassandra: trace_by_entity · MySQL: decision_trace_nodes/edges")]
    P6[("MySQL: audit_log")]
    P7[("MySQL: pipeline_jobs · S3: PDF/ZIP gerado")]
  end

  U1 --> A1 --> P1
  A1 --> A2
  A2 -->|"não"| W5
  A2 -->|"sim"| A3
  A3 -->|"sim"| W6
  A3 -->|"não"| W1 --> U2 --> W2
  W1 --> U3 --> W3 --> A6
  W5 -.->|"tentativa de escrita"| A4
  W6 -.->|"tentativa de escrita"| A5
  A6 -->|"sim"| A7
  A7 -->|"não"| A8 --> A9
  A7 -->|"sim"| A9
  A9 --> P1
  A9 --> A10 --> P2
  A10 --> A11 --> P3 --> W4
  A6 -->|"não"| A12 --> P1
  A12 --> A11
  W1 --> U4 --> A12
  W1 --> U5 --> A13 --> P4
  U5 --> A14 --> P5
  W1 --> U6 --> A15 --> P2
  A15 --> A10
  W6 --> U7 --> A16
  A16 -->|"não"| A17
  A16 -->|"sim"| A18 --> P6
  A18 --> A10
  W1 --> U8 --> A19 --> P7
  A19 --> W7
  A19 --> A20 --> P7

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  class A4,A5,A17 err
  class A8,W5,W6 warn
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário A
  actor B as Usuário B
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant R as Redis
  participant S3 as S3
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>NX: abre /projects/42/edit (visão Mesa)
  NX->>C: GET /api/projects/42/desk?view=MESA
  C->>S: ProjectDeskService.load(viewerId, 42, MESA)
  S->>DB: project_schemes + project_tasks (canvas*) + dependencies + versions resumo
  S->>S: canEdit = dono OR responsável OR Department.headUserId
  S->>CS: trace_by_entity WHERE entity = project 42 (fio de decisão, CA05)
  S->>R: presence desk:42
  S-->>C: 200 DeskState {editable, tasks com x y scale rotation layer, criticalPath, trace, presence}
  C-->>NX: 200
  NX-->>U: Mesa com post-its, conectores e textura (trocar para Quadro reprojeta o mesmo estado, CA03)
  NX->>C: WS /ws/desk/42 (ou GET /changes?since)
  C->>R: SUBSCRIBE desk:42

  U->>NX: arrasta tarefa T1 de ELABORACAO para ANALISE
  NX->>C: PATCH /api/projects/42/tasks/T1 {phase: ANALISE, sortOrder: 0} If-Match: 17
  C->>S: ProjectDeskService.moveTask(userId, 42, T1, ANALISE, 0, baseVersion 17)
  alt viewer sem permissão (CA01)
    S-->>C: 403 ACESSO_NEGADO
    C-->>NX: 403
    NX-->>U: somente leitura
  else projeto CONCLUIDO ou ARQUIVADO (CA06)
    S-->>C: 409 PROJETO_BLOQUEADO {hint: reopen com justificativa}
    C-->>NX: 409
    NX-->>U: aviso e botão Reabrir
  else editável
    S->>DB: SELECT version FROM project_schemes WHERE id = 42
    opt version atual 18 diferente de baseVersion 17 (CA04)
      S->>S: aplica mesmo assim, warning CONFLITO_ULTIMO_VENCE
    end
    S->>DB: UPDATE project_tasks SET phase, sortOrder — recalcula criticalPathJson
    S->>DB: INSERT project_versions (versionNumber 19, authorId A, diffJson "T1: ELABORACAO → ANALISE", snapshotJson)
    S->>DB: UPDATE project_schemes SET version 19
    S->>DE: publish ProjectStructureChanged
    S-->>C: 200 {version 19, warnings: [CONFLITO_ULTIMO_VENCE]?}
    C-->>NX: 200
  end
  DE->>R: PUBLISH desk:42 ChangeEvent {ptId T1, phase ANALISE, version 19, author A}
  R-->>C: mensagem no canal
  C-->>B: WS push em até 3 s
  B->>B: aplica ChangeEvent, toast se conflito (CA04)

  U->>NX: move o post-it T2 na Mesa para x 320, y 140, rotação 4°
  NX->>C: PUT /api/projects/42/tasks/T2/canvas {x, y, scale, rotation, layer}
  C->>S: ProjectDeskService.saveCanvasPosition
  S->>DB: UPDATE project_tasks SET canvasX, canvasY, canvasScale, canvasRotation, canvasLayer (sem nova versão, CA03)
  S->>R: PUBLISH desk:42 CanvasMoved
  S-->>C: 204

  U->>NX: comenta em T1 mencionando @bruno (CA05)
  NX->>C: POST /api/interactions/PROJECT_TASK/T1/comments {contentMd, mentions}
  C->>S: SocialService.comment(userId, PROJECT_TASK, T1, contentMd)
  S->>DB: INSERT comments (targetType PROJECT_TASK)
  S->>DE: publish CommentCreated
  DE->>CS: INSERT notifications_by_user (recipient bruno, type MENCAO, groupKey hora)
  S-->>C: 201 Comment

  U->>NX: Histórico: comparar v17 × v19 e restaurar v17 (CA02)
  NX->>C: GET /api/projects/42/versions/17/compare/19
  C->>S: ProjectVersionService.compare
  S->>DB: project_versions 17 e 19
  S-->>C: 200 Diff legível {moved: [T1], dueChanged: [], responsibleChanged: []}
  NX->>C: POST /api/projects/42/versions/17/restore
  C->>S: ProjectVersionService.restore(userId, 42, 17)
  S->>DB: aplica snapshotJson v17 em project_tasks e dependencies
  S->>DB: INSERT project_versions (20, restoredFromVersionId 17, reason "restaurada pelo autor")
  S->>R: PUBLISH desk:42 ChangeEvent {version 20}
  S-->>C: 201 ProjectVersion 20

  U->>NX: Exportar PDF (CA07)
  NX->>C: POST /api/projects/42/export?format=PDF
  C->>S: ProjectDeskService.requestExport(userId, 42, PDF)
  S->>DB: INSERT pipeline_jobs (type EXPORT_PDF, status PENDENTE)
  S-->>C: 202 {jobId}
  C-->>NX: 202
  DE->>S: worker executa job: PdfRenderPort.renderProjectReport (fases, tarefas, responsáveis, prazos, decisões)
  S->>S3: MediaStoragePort.put(pdf) ou ZIP com todos os TaskAttachment
  S->>DB: UPDATE pipeline_jobs SET status OK, resultado mediaObjectId
  NX->>C: GET /api/jobs/{jobId}
  C-->>NX: 200 {status OK, downloadUrl presign S3}
  NX-->>U: download do PDF ou ZIP
```

## 4. Máquina de estados

Entidade central: **`ProjectScheme.status`** (enum `ProjectStatus`), visto pelo RF22 sob a ótica de **edição**: os estados do grupo *Editável* aceitam alterações estruturais (cada uma gera `ProjectVersion`), enquanto CONCLUIDO e ARQUIVADO bloqueiam a edição; reabrir exige justificativa registrada em `ProjectVersion.reason` e `AuditLog` (CA06). Transições de negócio entre os estados editáveis pertencem ao RF21/RF29 e estão simplificadas.

```mermaid
stateDiagram-v2
  [*] --> Editavel
  state "Editável — cada alteração estrutural gera ProjectVersion" as Editavel {
    [*] --> RASCUNHO
    RASCUNHO --> PUBLICADO : publicar
    PUBLICADO --> EM_DECISAO : abrir sessão DECIA
    EM_DECISAO --> APROVADO : decisão validada
    EM_DECISAO --> DEVOLVIDO : decisão devolvida
    DEVOLVIDO --> EM_DECISAO : reabrir sessão
    APROVADO --> EM_EXECUCAO : iniciar execução
    --
    [*] --> Quadro
    Quadro --> LinhaDoTempo : trocar visão
    LinhaDoTempo --> Mesa : trocar visão
    Mesa --> Quadro : trocar visão
    Mesa --> Mesa : mover cartão, persiste canvasX Y Scale Rotation Layer
  }
  state "Bloqueado para edição — 409 PROJETO_BLOQUEADO" as Bloqueado {
    CONCLUIDO --> ARQUIVADO : arquivar
  }
  Editavel --> CONCLUIDO : todas as tarefas concluídas
  Editavel --> ARQUIVADO : arquivar
  Bloqueado --> Editavel : reabrir com justificativa, ProjectVersion.reason + AuditLog PROJECT_REOPEN
  ARQUIVADO --> [*]
  note right of Editavel
    Escrita só para dono, responsáveis de tarefa e chefe do departamento.
    Outros viewers: somente leitura, 403 ACESSO_NEGADO na API (CA01).
    Conflito concorrente: último-vence com aviso (CA04).
  end note
  note right of Bloqueado
    Reabrir sem justificativa: 422 VALIDACAO.
    A justificativa fica no histórico de versões (CA06).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/projects/[id]/edit — Quadro · Linha do tempo · Mesa"]
    F2["app/desk — Mesa de Trabalho com skins"]
    F3["components/ui: KanbanBoard dnd por fase, GanttTimeline com dependências e caminho crítico, DeskCanvas post-its x y scale rotation layer, DependencyConnector, DeskSkinPicker, VersionHistory + DiffView, CommentThread, DecisionThreadPanel fio de decisão, ExportMenu PDF/ZIP, PresenceAvatars"]
    F4["Realtime client: WebSocket com fallback polling 3 s, toast CONFLITO_ULTIMO_VENCE"]
  end

  subgraph WEB["ws-web"]
    C1["ProjectDeskController — /api/projects/{id}/desk, /tasks/{ptId}, /canvas, /desk/skin, /reopen, /export"]
    C2["ProjectVersionController — /versions, /compare, /restore"]
    C3["DeskRealtimeController — /ws/desk/{id}, /changes?since"]
    C4["InteractionController RF26 — /api/interactions/PROJECT_TASK/{id}/comments"]
    C5["JobController — /api/jobs/{id}"]
  end

  subgraph APP["ws-application"]
    S1["ProjectDeskService"]
    S2["ProjectVersionService"]
    S3["SocialService RF26"]
    S4["DecisionTraceService RF29"]
    P1["CollaborationPort"]
    P2["MediaStoragePort"]
    P3["PdfRenderPort"]
  end

  subgraph DOM["ws-domain"]
    D1["ProjectScheme · ProjectTask · ProjectTaskDependency · ProjectVersion"]
    D2["Comment PROJECT_TASK · Notification · DecisionTraceNode · DecisionTraceEdge · DeciaSession"]
    D3["Department · UserSkin · TaskAttachment · MediaObject · PipelineJob · AuditLog"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: project_schemes, project_tasks, project_task_dependencies, project_versions, comments, audit_log, pipeline_jobs, user_skins")]
    I2[("cache-redis: RedisPubSubAdapter — canal desk:{projectId}, presença")]
    I3[("persistence-cassandra: trace_by_entity leitura do fio de decisão, notifications_by_user")]
    I4[("storage-s3: PDF e ZIP exportados, presign")]
    I5["platform: PdfRendererAdapter, PipelineJob worker EXPORT_PDF, outbox AFTER_COMMIT, WebSocket endpoint"]
  end

  F1 --- F3
  F2 --- F3
  F1 --- F4
  F1 -->|"HTTPS/JSON"| C1
  F1 -->|"HTTPS/JSON"| C2
  F3 -->|"HTTPS/JSON"| C4
  F4 -->|"WS / polling"| C3
  F1 -->|"HTTPS/JSON"| C5
  C1 --> S1
  C2 --> S2
  C3 --> P1
  C4 --> S3
  S1 --> S2
  S1 --> S3
  S1 --> S4
  S1 --> P1
  S1 --> P2
  S1 --> P3
  S1 --> D1
  S1 --> D3
  S2 --> D1
  S3 --> D2
  S4 --> D2
  D1 --> I1
  D2 --> I1
  D3 --> I1
  D2 --> I3
  S4 --> I3
  P1 --> I2
  P2 --> I4
  P3 --> I5
  D3 --> I5
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF22.CA01 | `ProjectDeskService.canEdit` (nota: dono OR responsável OR `Department.headUserId`), classe `Department` · Atividades `A2 (não) → W5 -.-> A4 403 ACESSO_NEGADO` · Sequência `canEdit = …` e `alt viewer sem permissão → 403 ACESSO_NEGADO` · Nota do estado *Editável* · Componentes `PresenceAvatars`, `ProjectDeskController` |
| RF22.CA02 | Classes `ProjectVersion` (versionNumber, authorId, diffJson legível, snapshotJson, restoredFromVersionId), `ProjectVersionService.record/list/compare/restore` · Atividades `A6 (sim) → A9 → A10 → P2`, `U6 → A15` · Sequência `INSERT project_versions (19 …)`, `GET …/versions/17/compare/19`, `POST …/versions/17/restore` · Tabela de alterações estruturais do cabeçalho · Componentes `VersionHistory + DiffView`, `ProjectVersionController` |
| RF22.CA03 | `ProjectTask.canvasX/canvasY/canvasScale/canvasRotation/canvasLayer/stickyColor`, enum `DeskView`, `ProjectDeskService.saveCanvasPosition` · Atividades `U2 → W2`, `U4 → A12 → P1` · Sequência `GET …/desk?view=MESA` ("trocar para Quadro reprojeta o mesmo estado") e `PUT …/tasks/T2/canvas` (sem nova versão) · Região concorrente *Quadro → LinhaDoTempo → Mesa* da máquina de estados · Componentes `KanbanBoard`, `GanttTimeline`, `DeskCanvas` |
| RF22.CA04 | `CollaborationPort` (nota canal desk:{projectId}, ≤ 3 s, último-vence), `RedisPubSubAdapter`, `DeskRealtimeController`, `ProjectScheme.version` · Atividades `A7 → A8 (último-vence, warning) → A9 → A11 → P3 → W4` · Sequência `opt version atual 18 diferente de baseVersion 17` → `warnings: [CONFLITO_ULTIMO_VENCE]`, `PUBLISH desk:42`, `WS push em até 3 s`, "toast se conflito" · Componentes `Realtime client`, `cache-redis pub/sub` |
| RF22.CA05 | Classes `Comment` (targetType PROJECT_TASK, mentionsJson), `Notification`, `DecisionTraceNode/Edge`, `DeciaSession.linkedProjectId`, `SocialService.comment`, `DecisionTraceService.threadForProject` · Atividades `U5 → A13 → P4`, `U5 → A14 → P5` · Sequência `trace_by_entity … (fio de decisão)` e `POST /api/interactions/PROJECT_TASK/T1/comments` → `notifications_by_user` · Componentes `CommentThread`, `DecisionThreadPanel`, `InteractionController RF26`, `persistence-cassandra` |
| RF22.CA06 | Enum `ProjectStatus` (CONCLUIDO, ARQUIVADO), `ProjectDeskService.reopen`, `AuditLog` (PROJECT_REOPEN), `ProjectVersion.reason` · Atividades `A3 (sim) → W6 -.-> A5 409 PROJETO_BLOQUEADO`, `U7 → A16 → A17 422 / A18 → P6 → A10` · Sequência `else projeto CONCLUIDO ou ARQUIVADO → 409 PROJETO_BLOQUEADO` · Estado composto *Bloqueado* e transição `Bloqueado → Editavel : reabrir com justificativa` + nota |
| RF22.CA07 | Classes `PipelineJob` (EXPORT_PDF), `MediaObject`, `TaskAttachment`, `PdfRenderPort`, `MediaStoragePort.presign`, `ProjectDeskService.requestExport` · Atividades `U8 → A19 → P7 → W7`, `A20` · Sequência `POST …/export?format=PDF` → 202 jobId → worker `renderProjectReport` → `MediaStoragePort.put(pdf) ou ZIP com todos os TaskAttachment` → `GET /api/jobs/{jobId}` → downloadUrl · Componentes `ExportMenu PDF/ZIP`, `JobController`, `storage-s3`, `platform PdfRendererAdapter` |


Tela/aba: `/desk` (esqueleto em `app/(shell)/desk/page.tsx`) · `/projects/[id]/edit` (esqueleto em `app/(shell)/projects/[id]/edit/page.tsx`)
