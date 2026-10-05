# RF12 — Editar um esquema de tarefa ou projeto de meu perfil
**HU:** HU12 · **Sprint (board Work Station):** lista *Requisitos Funcionais* (card renumerado, sem sprint atribuída — a confirmar) · **Equivalente FAI:** RF9 Editar esquema (`PUT /api/schemes/{id}`, `SchemeService.update`, versões) + RF8 editar peça (`WardrobeService.update`) · **Aba/rota:** Meu perfil (`/profile`) › sub-abas **1 Acervo de Tarefas** e **2 Meus Projetos** › card › **Editar** → `/tasks/[id]/edit` e `/projects/[id]/edit` (a Mesa de Trabalho completa — Quadro, Linha do tempo, canvas — é o RF21/RF22)
**Critérios de aceite cobertos:** RF12.CA01 · RF12.CA02 · RF12.CA03 · RF12.CA04 · RF12.CA05 · RF12.CA06 — corpo do card vazio: CAs derivados do título + HU12 + `docs/diagramas/RF22/README.md` (CA01 permissão, CA02 `ProjectVersion`, CA04 concorrência, CA06 bloqueio) + RF20.CA07/CA11 + RF21.CA14 (autosave) + RF41.CA02 (`TaskStateLog`), marcados **(CA a confirmar)**

> **HU12** — COMO usuário visualizando um esquema de tarefa ou projeto POSSO editar os dados deste esquema PARA atualizar minha gestão pessoal e empresarial.

Edição **dos dados** do esquema (formulário), em contraste com o RF22 (manipulação na Mesa). *Esquema de Tarefa* = `TaskItem` (+ a sua `ProjectTask` quando dentro de um projeto); *Esquema de Projeto* = `ProjectScheme` + `ProjectTask`s. Regras reaproveitadas do RF22: `canEdit` = dono OU responsável OU chefe do departamento (403 fora disso); toda alteração estrutural de projeto gera `ProjectVersion` com `diffJson` legível; mudança de estado de tarefa gera `TaskStateLog`; CONCLUIDO/ARQUIVADO bloqueiam (409) e reabrir exige justificativa; **autosave** do rascunho em `ProjectScheme.autosaveDraftJson` (RF21.CA14) e, para tarefas, em Redis (**proposta**).

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF12.CA01** | Dado o usuário no card de uma tarefa ou projeto **do seu perfil**, quando aciona **Editar**, então `/tasks/[id]/edit` (ou `/projects/[id]/edit`) carrega o formulário com os dados atuais; **tarefa**: título, resumo, descrição, tipo, categoria/subcategoria, `processTags`/`natureTags` (≤ 2 cada), `accessClass`, prazo e prazo legal, prioridade, responsável, visibilidade, anexos, notas, Estúdio do card (RF11); **projeto**: título, emoji, objetivo, descrição, tags, prioridade, exercício, agrupamentos (RF25), eixo do plano (RF24), visibilidade, lista de tarefas por fase com prazo e responsável, orientação para a IA; `canEdit` = `ownerId` OU `responsibleId` (de alguma `ProjectTask`) OU `Department.headUserId`; demais → formulário somente leitura e `403 ACESSO_NEGADO` na API. |
| **RF12.CA02** | Dado o envio (`PATCH /api/tasks/{id}` ou `PATCH /api/projects/{id}` com `If-Match: version`), então o serviço valida: título obrigatório ≤ 200, ≤ 2 tags por eixo, categoria compatível com o tipo, prazo legal recalculado por `LegalDeadlineRule` quando a categoria tem prazo (`legalOverrideReason` obrigatório para sobrescrever, RF20.CA11), projeto com ≥ 1 tarefa em DEMANDA + 1 em outra fase (RF21.CA05) e sem ciclo de dependências → `422 VALIDACAO`; `version` divergente → `409 CONFLITO_VERSAO` para tarefa e **último-vence com aviso `CONFLITO_ULTIMO_VENCE`** para projeto (RF22.CA04). |
| **RF12.CA03** | Dado o salvamento, então: **projeto** com alteração estrutural (tarefa adicionada/removida, fase, prazo, responsável, dependência) grava `ProjectVersion` (`versionNumber + 1`, `authorId`, `diffJson` legível, `snapshotJson`); mudanças só de dados descritivos (título, objetivo, tags) também geram versão com `reason = DADOS`; **tarefa** com mudança de `state` grava `TaskStateLog` (`fromState`, `toState`, `actorId`, `reason`); tarefa `linkMode = VINCULADO` (Google/Microsoft) ganha `TaskVersion` ao sincronizar (RF20.CA07); tudo com `AuditLog` e `correlationId`. |
| **RF12.CA04** | Dado o formulário aberto, então o rascunho é salvo a cada 10 s ou ao sair do campo: projeto em `ProjectScheme.autosaveDraftJson` (RF21.CA14); tarefa em Redis `draft:task:{id}:{userId}` com TTL 7 dias **(proposta)**; ao reabrir, o sistema oferece **Recuperar rascunho** ou **Descartar**; o rascunho nunca é publicado sem o clique em Salvar. |
| **RF12.CA05** | Dado alvo em `TaskState` CONCLUIDA/ARQUIVADA ou `ProjectStatus` CONCLUIDO/ARQUIVADO, então toda escrita devolve `409 TAREFA_BLOQUEADA` / `409 PROJETO_BLOQUEADO`; **Reabrir** exige justificativa (≥ 10 caracteres, senão `422 VALIDACAO`) e gera `TaskStateLog`/`ProjectVersion.reason` + `AuditLog` (REOPEN); tarefa `MODELO_PUBLICO` ou `OFERECIDA` (RF40/RF41) não pode mudar `visibility`/`accessClass` sem antes retirar a oferta (`409 OFERTA_ATIVA`). |
| **RF12.CA06** | Dado o commit, então eventos AFTER_COMMIT: `TaskUpdated`/`ProjectUpdated` reindexam o item no OpenSearch (busca RF27), recalculam a capa-mosaico dos projetos que contêm a tarefa (RF38.CA03), invalidam o cache do card (Redis), atualizam `ProjectTask.snapshotJson` nos projetos de terceiros que referenciam a tarefa (RF23.CA03) e notificam (`Notification` PRAZO_PROXIMO/SISTEMA) o responsável quando prazo ou responsável mudou; tarefa EM_USO em projeto de **outro** dono tem mudança de prazo sinalizada no projeto (⛔ `hasBlockingPending`). |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +UUID departmentId
    +String title
    +String summary
    +String descriptionMd
    +TaskType type
    +TaskCategory category
    +String subcategory
    +Set~ProcessTag~ processTags
    +Set~NatureTag~ natureTags
    +AccessClassification accessClass
    +UUID responsibleId
    +LocalDate dueAt
    +UUID legalDeadlineRuleId
    +LocalDate legalDueAt
    +String legalOverrideReason
    +Priority priority
    +TaskState state
    +Visibility visibility
    +LinkMode linkMode
    +boolean offeredInCounter
    +long version
  }
  class TaskStateLog {
    <<entity>>
    +UUID id
    +UUID taskId
    +TaskState fromState
    +TaskState toState
    +UUID actorId
    +String reason
    +UUID projectId
    +String correlationId
    +Instant at
  }
  class TaskVersion {
    <<entity>>
    +UUID taskId
    +int versionNumber
    +String externalRevisionId
    +Instant syncedAt
    +String changeSummary
  }
  class TaskAttachment {
    <<entity>>
    +UUID taskId
    +UUID mediaObjectId
    +String fileName
    +String mimeType
    +String antivirusStatus
    +boolean isPrimary
  }
  class LegalDeadlineRule {
    <<entity>>
    +UUID id
    +TaskCategory category
    +int days
    +boolean businessDays
    +String legalBasis
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +UUID ownerId
    +UUID departmentId
    +String title
    +String emoji
    +String objective
    +String descriptionMd
    +Priority priority
    +ProjectStatus status
    +ProjectPhase currentPhase
    +Visibility visibility
    +int exerciseYear
    +UUID programGroupingId
    +UUID planAxisId
    +String aiOrientation
    +boolean hasBlockingPending
    +String autosaveDraftJson
    +long version
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
    +String snapshotJson
  }
  class ProjectTaskDependency {
    <<entity>>
    +UUID predecessorProjectTaskId
    +UUID successorProjectTaskId
    +String type
    +int lagDays
  }
  class ProjectVersion {
    <<entity>>
    +UUID id
    +UUID projectId
    +int versionNumber
    +UUID authorId
    +Instant createdAt
    +String diffJson
    +String snapshotJson
    +String reason
    +UUID restoredFromVersionId
  }
  class Department {
    <<entity>>
    +UUID id
    +UUID headUserId
  }
  class Notification {
    <<entity>>
    +UUID recipientId
    +NotificationType type
    +String resourceType
    +UUID resourceId
  }
  class AuditLog {
    <<entity>>
    +UUID actorId
    +String action
    +String resourceType
    +UUID resourceId
    +String correlationId
  }
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
  class LinkMode {
    <<enum>>
    VINCULADO
    COPIADO
  }

  class TaskController {
    <<controller>>
    +GET_api_tasks_id() 200
    +PATCH_api_tasks_id(body, If_Match) 200
    +POST_api_tasks_id_reopen(reason) 200
    +PUT_api_tasks_id_draft(body) 204
    +GET_api_tasks_id_draft() 200
  }
  class ProjectController {
    <<controller>>
    +GET_api_projects_id() 200
    +PATCH_api_projects_id(body, If_Match) 200
    +PATCH_api_projects_id_tasks_ptId(body, If_Match) 200
    +POST_api_projects_id_tasks(body) 201
    +DELETE_api_projects_id_tasks_ptId() 204
    +POST_api_projects_id_reopen(reason) 200
    +PUT_api_projects_id_draft(body) 204
  }
  class TaskEditService {
    <<service>>
    +load(viewer, taskId) TaskEditView
    +canEdit(user, task) boolean
    +update(actor, taskId, patch, baseVersion) TaskItem
    +reopen(actor, taskId, reason) TaskItem
    +saveDraft(actor, taskId, draft)
    +loadDraft(actor, taskId) Draft
  }
  class ProjectEditService {
    <<service>>
    +load(viewer, projectId) ProjectEditView
    +canEdit(user, project) boolean
    +update(actor, projectId, patch, baseVersion) ChangeResult
    +updateTask(actor, projectId, ptId, patch, baseVersion) ChangeResult
    +addTask(actor, projectId, taskId, phase) ChangeResult
    +removeTask(actor, projectId, ptId) ChangeResult
    +reopen(actor, projectId, reason) ProjectScheme
    +saveDraft(actor, projectId, draft)
  }
  class ProjectVersionService {
    <<service>>
    +record(projectId, authorId, diff, reason) ProjectVersion
    +list(projectId) List~ProjectVersion~
    +restore(actor, projectId, versionId) ProjectVersion
  }
  class LegalDeadlineService {
    <<service>>
    +compute(category, subcategory, baseDate, companyId) LocalDate
  }
  class AccessPolicy {
    <<service>>
    +canEdit(user, ownerId, responsibleIds, deptId) boolean
  }
  class SearchIndexPort {
    <<port>>
    +reindex(targetType, targetId)
  }
  class DraftCachePort {
    <<port>>
    +put(key, draft, ttl)
    +get(key) Draft
    +evict(key)
  }
  class TaskItemRepository {
    <<adapter>>
    MySQL tasks (version otimista)
  }
  class RedisDraftAdapter {
    <<adapter>>
    draft task id userId TTL 7d
  }
  class OpenSearchIndexAdapter {
    <<adapter>>
    indice ws-tasks ws-projects
  }

  TaskItem --> TaskState
  TaskItem --> LinkMode
  TaskItem "1" --> "*" TaskStateLog
  TaskItem "1" --> "*" TaskVersion : VINCULADO
  TaskItem "1" --> "*" TaskAttachment
  TaskItem ..> LegalDeadlineRule : legalDeadlineRuleId
  TaskItem --> Department : departmentId
  ProjectScheme --> ProjectStatus
  ProjectScheme "1" --> "*" ProjectTask
  ProjectScheme "1" --> "*" ProjectTaskDependency
  ProjectScheme "1" --> "*" ProjectVersion
  ProjectScheme --> Department : departmentId
  ProjectTask --> TaskItem : taskId
  Notification ..> TaskItem : prazo ou responsavel mudou

  TaskController --> TaskEditService
  ProjectController --> ProjectEditService
  TaskEditService --> AccessPolicy
  ProjectEditService --> AccessPolicy
  TaskEditService --> LegalDeadlineService
  TaskEditService --> DraftCachePort
  TaskEditService --> TaskItemRepository
  TaskEditService ..> TaskStateLog
  TaskEditService ..> AuditLog
  ProjectEditService --> ProjectVersionService : record a cada alteracao
  ProjectEditService ..> AuditLog
  TaskEditService ..> SearchIndexPort : AFTER_COMMIT
  ProjectEditService ..> SearchIndexPort : AFTER_COMMIT
  DraftCachePort <|.. RedisDraftAdapter
  SearchIndexPort <|.. OpenSearchIndexAdapter

  note for TaskItem "tabela tasks · .. +40 campos .. · version otimista (409 CONFLITO_VERSAO)"
  note for ProjectScheme "tabela project_schemes · autosaveDraftJson (RF21.CA14) · .. +30 campos .."
  note for ProjectVersion "1 por alteracao (estrutural ou DADOS) · diffJson legivel · restaurar cria nova versao com restoredFromVersionId"
  note for AccessPolicy "canEdit = ownerId OU responsibleId de alguma ProjectTask OU Department.headUserId (RF22.CA01)"
  note for RedisDraftAdapter "PROPOSTA — rascunho de tarefa fora do MySQL · projeto usa autosaveDraftJson"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  classDef ai fill:#fff3d6,stroke:#d68910,color:#5c3b00

  subgraph L1["Ator humano · dono, responsável ou chefe"]
    U1["No perfil (sub-aba 1 ou 2) clica Editar no card"]
    U2["Edita campos da tarefa ou do projeto (dados, tarefas por fase, prazos, responsáveis)"]
    U3{"Salvar?"}
    U4["Reabrir com justificativa"]
    U5{"Rascunho encontrado: recuperar ou descartar?"}
    U6(["Fim"])
  end

  subgraph L2["Web/BFF (Next.js App Router)"]
    W1["GET /api/tasks/{id} ou /api/projects/{id} + GET .../draft"]
    W2["Formulário com validação local, Estúdio do card (RF11) e If-Match = version"]
    W3["Autosave a cada 10 s ou blur → PUT .../draft"]
    W4["PATCH /api/tasks/{id} ou /api/projects/{id} (+ /tasks/{ptId})"]
    W5["Somente leitura: controles desabilitados"]
    W6["Aviso: item bloqueado, botão Reabrir"]
    W7["Exibe 403 ACESSO_NEGADO"]
    W8["Exibe 422 VALIDACAO (título, tags, prazo legal, fases, ciclo)"]
    W9["Exibe 409 CONFLITO_VERSAO / TAREFA_BLOQUEADA / PROJETO_BLOQUEADO / OFERTA_ATIVA"]
    W10["Toast CONFLITO_ULTIMO_VENCE (projeto)"]
  end

  subgraph L3["ws-application · TaskEditService · ProjectEditService"]
    S1{"AccessPolicy.canEdit: dono, responsável ou chefe do departamento?"}
    S2{"state CONCLUIDA/ARQUIVADA ou status CONCLUIDO/ARQUIVADO?"}
    S3["DraftCachePort.get / autosaveDraftJson"]
    S4{"If-Match == version atual?"}
    S5{"Tarefa ou projeto?"}
    S6["Projeto: aplica por último-vence e marca warning CONFLITO_ULTIMO_VENCE"]
    S7["Valida: título, ≤ 2 tags por eixo, categoria × tipo, fases (1 DEMANDA + 1 outra), sem ciclo"]
    S8["LegalDeadlineService.compute: legalDueAt por LegalDeadlineRule (legalOverrideReason se sobrescrito)"]
    S9{"MODELO_PUBLICO/OFERECIDA e muda visibility ou accessClass?"}
    S10["UPDATE tasks (version + 1) · TaskStateLog se state mudou · AuditLog"]
    S11["UPDATE project_schemes / project_tasks / dependencies (version + 1) · ProjectVersionService.record (diffJson, reason) · AuditLog"]
    S12["DraftCachePort.evict / autosaveDraftJson = null"]
    S13{"Justificativa ≥ 10 caracteres?"}
    S14["reopen: state → DISPONIVEL ou status → EM_EXECUCAO · TaskStateLog/ProjectVersion.reason · AuditLog REOPEN"]
    S15["Eventos AFTER_COMMIT TaskUpdated / ProjectUpdated"]
    S16["Reindexa OpenSearch · rebuildMosaic (RF38) · evict card cache · atualiza ProjectTask.snapshotJson em projetos de terceiros · hasBlockingPending se prazo de EM_USO mudou"]
    S17["Notification ao responsável se prazo ou responsável mudou"]
  end

  subgraph L4["IA (AiEngine) · opcional"]
    A1["PREENCHER_TAREFA: sugere resumo de 3 linhas e categoria ao editar texto ✦ (RF20.CA02, só se o usuário pedir)"]
  end

  subgraph L5["Persistência"]
    D1[("MySQL tasks · task_state_log · task_versions · task_attachments")]
    D2[("MySQL project_schemes · project_tasks · project_task_dependencies · project_versions")]
    D3[("Redis draft:task:{id}:{userId} TTL 7d · cache card:*")]
    D4[("MySQL audit_log")]
    D5[("OpenSearch ws-tasks · ws-projects")]
    D6[("Cassandra notifications_by_user + MySQL notifications")]
  end

  U1 --> W1 --> S1
  S1 -->|"não"| W5 -. "tentativa de escrita" .-> W7 --> U6
  S1 -->|"sim"| S2
  S2 -->|"sim"| W6 --> U4 --> S13
  S13 -->|"não"| W8
  S13 -->|"sim"| S14 --> D4
  S14 --> S15
  S2 -->|"não"| S3 --> D3
  S3 --> U5
  U5 -->|"recuperar"| W2
  U5 -->|"descartar / nenhum"| W2
  W2 --> U2 --> W3 --> D3
  W2 -. "pedir sugestão" .-> A1 --> W2
  U2 --> U3
  U3 -->|"cancelar"| U6
  U3 -->|"salvar"| W4 --> S4
  S4 -->|"não"| S5
  S5 -->|"tarefa"| W9 --> U6
  S5 -->|"projeto"| S6 --> S7
  S4 -->|"sim"| S7
  S7 -->|"inválido"| W8 --> U6
  S7 -->|"ok"| S8 --> S9
  S9 -->|"sim"| W9
  S9 -->|"não, tarefa"| S10 --> D1
  S9 -->|"não, projeto"| S11 --> D2
  S10 --> D4
  S11 --> D4
  S10 --> S12 --> D3
  S11 --> S12
  S6 --> W10
  S10 --> S15
  S11 --> S15
  S15 --> S16 --> D5
  S16 --> D3
  S16 --> D2
  S15 --> S17 --> D6
  S16 --> U6

  class W7,W8,W9 err
  class W5,W6,W10,S6 warn
  class A1 ai
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant R as Redis
  participant OS as OpenSearch
  participant CS as Cassandra
  participant EV as DomainEvents (AFTER_COMMIT)

  rect rgb(245, 242, 239)
    Note over U,EV: Caminho feliz — edita tarefa do perfil com autosave, salva com If-Match, eventos reindexam e notificam
    U->>FE: Perfil › Acervo de Tarefas › card T1 › Editar
    FE->>C: GET /api/tasks/T1
    C->>S: TaskEditService.load(viewer, T1)
    S->>DB: SELECT tasks T1 · departments.headUserId · project_tasks.responsibleId WHERE taskId = T1
    S->>S: AccessPolicy.canEdit = dono OU responsável OU chefe
    S->>R: GET draft:task:T1:{userId}
    R-->>S: rascunho de ontem (ou miss)
    S-->>C: 200 TaskEditView {task, version 7, canEdit true, draft}
    C-->>FE: 200
    FE-->>U: Formulário · Recuperar rascunho ou Descartar
    U->>FE: Edita título, prazo e categoria ETP
    FE->>C: PUT /api/tasks/T1/draft (autosave 10 s)
    C->>S: TaskEditService.saveDraft(actor, T1, draft)
    S->>R: SET draft:task:T1:{userId} TTL 7d
    S-->>C: 204
    U->>FE: Salvar
    FE->>C: PATCH /api/tasks/T1 {title, dueAt, category ETP, legalDeadlineBaseDate} If-Match 7
    C->>S: TaskEditService.update(actor, T1, patch, baseVersion 7)
    S->>DB: SELECT tasks T1 FOR UPDATE (version 7, state DISPONIVEL)
    S->>S: valida título ≤ 200, ≤ 2 tags, categoria × tipo
    S->>DB: SELECT legal_deadline_rules WHERE category = ETP → legalDueAt calculado
    S->>DB: UPDATE tasks SET title, dueAt, category, legalDueAt, version = 8 WHERE id = T1 AND version = 7
    S->>DB: INSERT audit_log (TASK_UPDATED, diff resumido, correlationId)
    S->>R: DEL draft:task:T1:{userId} · DEL card:task:T1
    S-)EV: TaskUpdated(T1, changedFields)
    EV->>OS: index ws-tasks T1 (título, categoria, tags, prazo)
    EV->>DB: UPDATE project_schemes.mosaicJson (rebuildMosaic) · UPDATE project_tasks.snapshotJson WHERE taskId = T1
    EV->>CS: INSERT notifications_by_user (responsável, PRAZO_PROXIMO, prazo alterado)
    S-->>C: 200 TaskItem {version 8}
    C-->>FE: 200
    FE-->>U: Salvo — card atualizado no perfil
  end

  alt RF12.CA01 — viewer sem permissão
    FE->>C: PATCH /api/tasks/T1
    C->>S: update(...)
    S->>S: canEdit = false
    S-->>C: 403 ACESSO_NEGADO
    C-->>FE: 403
  else RF12.CA02 — versão divergente (tarefa)
    S->>DB: UPDATE tasks ... WHERE version = 7 → 0 linhas (version atual 8)
    S-->>C: 409 CONFLITO_VERSAO (recarregar)
    C-->>FE: 409
  else RF12.CA02 — versão divergente (projeto, último-vence)
    FE->>C: PATCH /api/projects/P1/tasks/PT2 {dueAt} If-Match 17
    C->>S: ProjectEditService.updateTask(actor, P1, PT2, patch, 17)
    S->>DB: SELECT project_schemes.version → 18
    S->>DB: UPDATE project_tasks · INSERT project_versions (19, diffJson, reason DADOS)
    S-->>C: 200 ChangeResult {version 19, warnings [CONFLITO_ULTIMO_VENCE]}
    C-->>FE: 200 + toast
  else RF12.CA05 — item bloqueado
    S->>DB: SELECT tasks T1 → state CONCLUIDA
    S-->>C: 409 TAREFA_BLOQUEADA (reabrir com justificativa)
    C-->>FE: 409
  else RF12.CA05 — reabrir sem justificativa
    FE->>C: POST /api/tasks/T1/reopen {reason ""}
    C->>S: TaskEditService.reopen(actor, T1, reason)
    S-->>C: 422 VALIDACAO (reason ≥ 10 caracteres)
    C-->>FE: 422
  end
```

## 4. Máquina de estados

Entidade central: **`TaskItem.state`** (enum `TaskState`), vista sob a ótica de **edição**: o grupo *Editável* aceita PATCH (cada mudança de estado grava `TaskStateLog`); CONCLUIDA e ARQUIVADA bloqueiam; MODELO_PUBLICO e OFERECIDA aceitam edição de dados mas não de `visibility`/`accessClass`. Para projeto vale o mesmo com **`ProjectScheme.status`** (`ProjectStatus`): editável em RASCUNHO · PUBLICADO · EM_DECISAO · APROVADO · EM_EXECUCAO · DEVOLVIDO, bloqueado em CONCLUIDO · ARQUIVADO (máquina detalhada em `RF22/README.md` §4).

```mermaid
stateDiagram-v2
  direction LR

  state "Editável — PATCH aceito, TaskStateLog a cada mudança de estado" as Editavel {
    [*] --> RASCUNHO
    RASCUNHO --> DISPONIVEL : dados mínimos preenchidos (CA02)
    DISPONIVEL --> EM_USO : entra em projeto ou atribuída (RF10, RF41)
    EM_USO --> DISPONIVEL : sai do projeto
    DISPONIVEL --> BLOQUEADA : blockedByTaskId ou blockedByUserId
    EM_USO --> BLOQUEADA : dependência pendente
    BLOQUEADA --> DISPONIVEL : bloqueio resolvido
    BLOQUEADA --> EM_USO : bloqueio resolvido dentro do projeto
  }

  state "Edição parcial — visibility e accessClass travados (409 OFERTA_ATIVA)" as Parcial {
    [*] --> MODELO_PUBLICO
    MODELO_PUBLICO --> OFERECIDA : oferta no Balcão (RF40)
    OFERECIDA --> MODELO_PUBLICO : oferta retirada
  }

  state "Bloqueado — 409 TAREFA_BLOQUEADA em qualquer escrita" as Bloqueado {
    [*] --> CONCLUIDA
    CONCLUIDA --> ARQUIVADA : arquivar
  }

  Editavel --> Parcial : publicar como modelo (RF41)
  Parcial --> Editavel : despublicar modelo
  Editavel --> Bloqueado : concluir (CA05)
  Bloqueado --> Editavel : reabrir com justificativa ≥ 10 caracteres (CA05) — TaskStateLog.reason + AuditLog REOPEN

  note right of Editavel
    canEdit = dono OU responsavel OU chefe do departamento (CA01)
    outros viewers so leitura e 403 ACESSO_NEGADO na API
    If-Match divergente devolve 409 CONFLITO_VERSAO (CA02)
    rascunho em Redis draft task id userId TTL 7 dias (CA04)
  end note
  note right of Bloqueado
    Reabrir leva a DISPONIVEL (ou EM_USO se ainda esta em projeto)
    a justificativa fica em TaskStateLog.reason e audit_log (CA05)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    F1["app/profile (sub-abas 1 Acervo e 2 Meus Projetos) · botão Editar no card"]
    F2["app/tasks/[id]/edit · app/projects/[id]/edit"]
    F3["components/ui: TaskForm · ProjectForm · PhaseTaskList · TagPicker (≤ 2) · LegalDeadlineField ⚖ · ResponsiblePicker · VisibilitySelect · DraftBanner (Recuperar/Descartar) · ReopenDialog · CardArtStudio (RF11)"]
    F4["hooks: useAutosave (10 s / blur) · useIfMatch (version)"]
  end

  subgraph WEB["ws-web"]
    C1["TaskController (GET/PATCH /api/tasks/{id} · POST .../reopen · PUT/GET .../draft)"]
    C2["ProjectController (GET/PATCH /api/projects/{id} · PATCH/POST/DELETE .../tasks · POST .../reopen · PUT .../draft)"]
    C3["EditGuard (canEdit) · If-Match"]
  end

  subgraph APP["ws-application"]
    S1["TaskEditService"]
    S2["ProjectEditService"]
    S3["ProjectVersionService (RF22)"]
    S4["LegalDeadlineService (RF20.CA11)"]
    S5["AccessPolicy.canEdit"]
    S6["CardArtService (RF11/RF38 · rebuildMosaic)"]
    S7["AiEngine (RF43) · PREENCHER_TAREFA opcional"]
    P1["DraftCachePort"]
    P2["SearchIndexPort"]
    P3["NotificationPort"]
    P4["AuditPort"]
  end

  subgraph DOM["ws-domain · br.gov.pr.secid.workstation"]
    D1["TaskItem · TaskStateLog · TaskVersion · TaskAttachment · LegalDeadlineRule"]
    D2["ProjectScheme (autosaveDraftJson) · ProjectTask · ProjectTaskDependency · ProjectVersion"]
    D3["Department.headUserId · Notification · AuditLog"]
    D4["Enums: TaskState · ProjectStatus · ProjectPhase · Visibility · AccessClassification · LinkMode · Priority"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1["persistence-mysql: TaskItemRepository · TaskStateLogRepository · ProjectSchemeRepository · ProjectTaskRepository · ProjectVersionRepository · LegalDeadlineRuleRepository · AuditLogRepository"]
    I2["cache-redis: RedisDraftAdapter (draft:task:*) · CardCacheAdapter"]
    I3["search-opensearch: OpenSearchIndexAdapter (ws-tasks, ws-projects)"]
    I4["persistence-cassandra: NotificationFeedAdapter"]
    I5["platform: OutboxRelay (TaskUpdated, ProjectUpdated) · SYNC_EXTERNO worker (TaskVersion para VINCULADO)"]
    I6["ai-providers: AiEngineAdapter (PREENCHER_TAREFA)"]
  end

  subgraph EXT["Serviços externos"]
    X1["Google Workspace · Microsoft 365 (tarefas VINCULADO → TaskVersion)"]
    X2["Claude / Gemini (sugestão opcional)"]
  end

  MY[("MySQL 8")]
  RD[("Redis")]
  OS[("OpenSearch")]
  CA[("Cassandra")]

  F1 --> F2 --> F3
  F4 -.-> F3
  F3 -->|"HTTPS/JSON"| C1 --> C3 --> S1
  F3 -->|"HTTPS/JSON"| C2 --> C3 --> S2
  S1 --> S5
  S2 --> S5
  S1 --> S4
  S2 --> S3
  S1 --> P1
  S2 --> P1
  S1 --> P2
  S2 --> P2
  S1 --> P3
  S2 --> P3
  S1 --> P4
  S2 --> P4
  S1 --> D1
  S2 --> D2
  S5 --> D3
  D1 --> D4
  D2 --> D4
  S1 --> I1
  S2 --> I1
  S3 --> I1
  P1 -.-> I2
  P2 -.-> I3
  P3 -.-> I4
  I5 -.-> S6
  I5 -.-> X1
  S7 -.-> I6 --> X2
  I1 --> MY
  I2 --> RD
  I3 --> OS
  I4 --> CA
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividades) | Mensagem (sequência) | Transição (estados) | Componente |
|---|---|---|---|---|---|
| RF12.CA01 | `TaskEditService.load/canEdit`, `ProjectEditService.load/canEdit`, `AccessPolicy.canEdit` (dono OU responsável OU `Department.headUserId`), campos de `TaskItem` e `ProjectScheme` listados | U1, W1, W2, S1, W5, W7 | 1–10; `alt` 403 ACESSO_NEGADO | nota do grupo *Editável* | `app/profile` › Editar, `TaskForm`, `ProjectForm`, `EditGuard` |
| RF12.CA02 | `TaskItem.version`, `ProjectScheme.version`, `LegalDeadlineService.compute`, `LegalDeadlineRule`, `TaskItem.legalOverrideReason`, `ProjectTaskDependency` (sem ciclo), `TaskController.PATCH` com `If_Match` | W4, S4–S9, W8, W9, W10 | 18–23; `alt` 409 CONFLITO_VERSAO; `alt` CONFLITO_ULTIMO_VENCE | `RASCUNHO → DISPONIVEL` (dados mínimos) | `TagPicker`, `LegalDeadlineField`, `useIfMatch`, `LegalDeadlineRuleRepository` |
| RF12.CA03 | `ProjectVersion` (versionNumber, authorId, diffJson, reason DADOS), `ProjectVersionService.record`, `TaskStateLog`, `TaskVersion` (VINCULADO), `AuditLog`, `TaskItem.linkMode` | S10, S11, D1, D2, D4 | 23–24 e INSERT project_versions no `alt` de projeto | toda transição dentro de *Editável* grava `TaskStateLog` | `ProjectVersionService`, `TaskStateLogRepository`, `SYNC_EXTERNO worker` |
| RF12.CA04 | `DraftCachePort`, `RedisDraftAdapter` (proposta), `ProjectScheme.autosaveDraftJson`, `TaskEditService.saveDraft/loadDraft` | S3, U5, W3, S12, D3 | 6–7, 12–15, 25 | nota de *Editável* (rascunho TTL 7 dias) | `useAutosave`, `DraftBanner`, `RedisDraftAdapter` |
| RF12.CA05 | enums `TaskState` (CONCLUIDA, ARQUIVADA, MODELO_PUBLICO, OFERECIDA) e `ProjectStatus`, `TaskEditService.reopen`, `ProjectEditService.reopen`, `TaskItem.offeredInCounter`, `AuditLog` REOPEN | S2, W6, U4, S13, S14, S9 | `alt` 409 TAREFA_BLOQUEADA; `alt` 422 reopen | grupos *Parcial* e *Bloqueado*, `Bloqueado → Editavel` com justificativa | `ReopenDialog`, `VisibilitySelect` (travado), `AuditLogRepository` |
| RF12.CA06 | eventos `TaskUpdated`/`ProjectUpdated`, `SearchIndexPort`, `CardArtService.rebuildMosaic`, `ProjectTask.snapshotJson`, `ProjectScheme.hasBlockingPending`, `Notification` (PRAZO_PROXIMO) | S15, S16, S17, D5, D6 | 26–29 | — (efeitos após `Editavel`) | `OutboxRelay`, `OpenSearchIndexAdapter`, `CardCacheAdapter`, `NotificationFeedAdapter` |

**Dúvidas para confirmar:** (a) escopo exato: RF12 = formulário de dados e RF21/RF22 = Mesa (Quadro/Linha do tempo/canvas), ou o card RF12 engloba a Mesa também; (b) rascunho de tarefa em Redis (proposta) × coluna `autosaveDraftJson` em `tasks`; (c) edição de dados descritivos de projeto gera `ProjectVersion` (`reason = DADOS`) ou só alterações estruturais (RF22.CA02); (d) política de concorrência: tarefa `409 CONFLITO_VERSAO` × projeto último-vence com aviso; (e) sprint do card.


Tela/aba: `/profile` (esqueleto em `app/(shell)/profile/page.tsx`) · `/tasks/[id]/edit` (esqueleto em `app/(shell)/tasks/[id]/edit/page.tsx`) · `/projects/[id]/edit` (esqueleto em `app/(shell)/projects/[id]/edit/page.tsx`)
