# RF12 — Editar um esquema de tarefa ou projeto de meu perfil
**HU:** HU12 · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída (card renumerado; o card "SPRINT 3" cita "RF12 Registrar decisão final", escopo antigo — `RENUMERACAO.md`; fase (e) da ARQUITETURA §6: "RF7/RF8/RF12 detalhe e edição") · **Equivalente FAI:** RF9 Editar esquema (`PUT /api/schemes/{id}`, `SchemeService.update`, versões) + RF8 Editar peça (`WardrobeService.update`) · **Aba/rota:** Meu perfil (`/profile`) › sub-abas Acervo Digital e Projetos (RF6) › card › **Editar** → `/tasks/[id]/edit` e `/projects/[id]/edit` (a Mesa completa — Quadro, Linha do tempo, canvas — é o RF21/RF22; os **arquivos** são o RF8); API `GET /api/tasks/{id}/edit-form`, `PATCH /api/tasks/{id}`, `PATCH /api/projects/{id}`, `PUT /api/tasks/{id}/draft`, `POST /api/tasks/{id}/reopen`, `POST /api/projects/{id}/reopen` · **contrato real em 17/10/2026:** `GET /api/tasks/{id}` e `PUT /api/tasks/{id}` (corpo `TaskRequest` com `version`; sem `version` → `422 VALIDACAO`; versão superada → `409 EDICAO_CONCORRENTE`), estados por `POST /api/tasks/{id}/transitions` (RF41); `edit-form`, `PATCH`, `draft`, `reopen` e todas as rotas de projeto seguem **(planejado)** — ver «Contrato real × documento»
**Critérios de aceite cobertos:** RF12.CA01 · RF12.CA02 · RF12.CA03 · RF12.CA04 · RF12.CA05 · RF12.CA06 — corpo do card vazio: CAs derivados do título + HU12 + RF22 (CA01 permissão, CA02 `ProjectVersion`, CA04 concorrência, CA06 bloqueio) + RF20.CA07/CA11 + RF21.CA14 (autosave) + RF41.CA02 (`TaskStateLog`), marcados **(CA a confirmar)**. Classes **(real)** desde 17/10/2026 (`97611a0`, `013657a`, `474b6cb`): `TaskController.get/update` (`@AuthorizedBy("require")`), `TaskRequest`, `TaskService.get/update` (`TaskInput`, `TaskView` com `version` e `editable`), `TaskRepositoryPort.update` (versão obrigatória), `ResourceAuthorizer`, `AccessPolicy`, `TaskState.isReadOnly/locksVisibility`, `GlobalExceptionHandler` (`409 EDICAO_CONCORRENTE`) e a tela `/tasks/[id]/edit` com `TaskForm` modo edit; as demais (projeto, rascunho/autosave, reabrir, prazo legal, eventos AFTER_COMMIT) seguem **(planejado)**; transversais reais: `Guard`, `AuditLogPort`, `SecurityConfig`, `SessionActiveFilter`, `RedisAdaptersConfig`.

> **HU12** — COMO usuário visualizando um esquema de tarefa ou projeto POSSO editar os dados deste esquema PARA atualizar minha gestão pessoal e empresarial.

Este RF cobre a edição dos **dados** (ficha) da `TaskItem` e do `ProjectScheme`: validação igual à do criador (RF4/RF5), lock otimista para tarefa e último-vence com aviso para projeto (RF22.CA04), versões (`ProjectVersion`, `TaskStateLog`), autosave e bloqueio de itens encerrados. A edição de **arquivos** (anexos, versões, provedor externo) é o RF8 e a arte do card é o RF11.

## Critérios de aceite derivados da HU12 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF12.CA01** (CA a confirmar) | Dado o usuário no card de uma tarefa ou projeto **do seu perfil**, quando aciona **Editar**, então `/tasks/[id]/edit` (ou `/projects/[id]/edit`) carrega o formulário com os dados atuais; **tarefa**: título, resumo, descrição, tipo, categoria/subcategoria, `processTags`/`natureTags` (≤ 2 cada), `accessClass`, prazo e prazo legal, prioridade, responsável, visibilidade, notas, Estúdio do card (RF11); **projeto**: título, emoji, objetivo, descrição, tags, prioridade, exercício, agrupamentos (RF25), eixo do plano (RF24), visibilidade, lista de tarefas por fase com prazo e responsável, orientação para a IA; `AccessPolicy.canEdit` = `ownerId` OU `responsibleId` (de alguma `ProjectTask`) OU `Department.headUserId`; demais → somente leitura e `403 ACESSO_NEGADO` na API. |
| **RF12.CA02** (CA a confirmar) | Dado o envio (`PATCH /api/tasks/{id}` ou `PATCH /api/projects/{id}` com `If-Match: version`), então o serviço valida: título ≤ 200, ≤ 2 tags por eixo, categoria compatível com o tipo, prazo legal recalculado por `LegalDeadlineRule` quando a categoria tem prazo (`legalOverrideReason` obrigatório para sobrescrever, RF20.CA11), projeto com ≥ 1 tarefa em DEMANDA + 1 em outra fase (RF21.CA05) e sem ciclo de dependências → `422 VALIDACAO`; `version` divergente → `409 CONFLITO_VERSAO` para tarefa e **último-vence com aviso `CONFLITO_ULTIMO_VENCE`** para projeto (RF22.CA04). **Contrato real da tarefa (17/10/2026):** `PUT /api/tasks/{id}` com o `TaskRequest` completo e `version` no corpo (não `PATCH` + `If-Match`) e `409 EDICAO_CONCORRENTE` (não `CONFLITO_VERSAO`); categoria×tipo, tags por eixo e prazo legal ainda não são validados. |
| **RF12.CA03** (CA a confirmar) | Dado o salvamento, então **projeto** com alteração estrutural (tarefa adicionada/removida, fase, prazo, responsável, dependência) grava `ProjectVersion` (`versionNumber + 1`, `authorId`, `diffJson` legível, `snapshotJson`); mudanças só descritivas também geram versão com `reason DADOS`; **tarefa** com mudança de `state` grava `TaskStateLog`; tudo com `AuditLog TASK_UPDATED`/`PROJECT_UPDATED` e `correlationId`. |
| **RF12.CA04** (CA a confirmar) | Dado o formulário aberto, então o rascunho é salvo a cada 10 s ou ao sair do campo: projeto em `ProjectScheme.autosaveDraftJson` (RF21.CA14); tarefa em Redis `draft:task:{id}:{userId}` com TTL 7 dias **(proposta)**; ao reabrir, o sistema oferece **Recuperar rascunho** ou **Descartar**; o rascunho nunca é publicado sem o clique em Salvar. |
| **RF12.CA05** (CA a confirmar) | Dado alvo em `TaskState` CONCLUIDA/ARQUIVADA ou `ProjectStatus` CONCLUIDO/ARQUIVADO, então toda escrita devolve `409 TAREFA_BLOQUEADA` / `409 PROJETO_BLOQUEADO`; **Reabrir** exige justificativa (≥ 10 caracteres, senão `422 VALIDACAO`) e gera `TaskStateLog`/`ProjectVersion.reason REABERTURA` + `AuditLog TASK_REOPENED`/`PROJECT_REOPENED`; tarefa `MODELO_PUBLICO` ou `OFERECIDA` (RF40/RF41) não pode mudar `visibility`/`accessClass` sem antes retirar a oferta (`409 OFERTA_ATIVA`). |
| **RF12.CA06** (CA a confirmar) | Dado o commit, então eventos AFTER_COMMIT `TaskUpdated`/`ProjectUpdated`: reindexam o item no OpenSearch (RF17/RF27), recalculam a capa-mosaico dos projetos que contêm a tarefa (RF38.CA03), invalidam o cache do card (Redis), atualizam `ProjectTask.snapshotJson` nos projetos de terceiros que referenciam a tarefa (RF23.CA03) e notificam (`Notification PRAZO_PROXIMO`/`SISTEMA`) o responsável quando prazo ou responsável mudou; tarefa EM_USO em projeto de **outro** dono tem mudança de prazo sinalizada no projeto (⛔ `hasBlockingPending`). |

## Contrato real × documento (divergência registrada em 17/10/2026)

A MATRIZ_RF de 17/10/2026 (`docs/auditoria/2026-10-17/MATRIZ_RF.md`, linha RF12) registra: «doc pede PATCH/If-Match e a API usa PUT com versão no corpo». Os diagramas abaixo seguem o **contrato real** na parte da tarefa; a parte de projeto continua **(planejado)** porque não há API de projetos.

| Tema | Documento (CA a confirmar) | Real em 17/10/2026 (`TaskController`, `TaskService`) |
|---|---|---|
| Carregar para editar | `GET /api/tasks/{id}/edit-form` | `GET /api/tasks/{id}` → `TaskView` com `version` e `editable` (estado + permissão); `editable = false` → `/tasks/[id]/edit` mostra «Somente leitura» |
| Salvar | `PATCH /api/tasks/{id}` + cabeçalho `If-Match: version` | `PUT /api/tasks/{id}` com o `TaskRequest` completo e `version` no corpo; sem `version` → `422 VALIDACAO` (`fields.version`) |
| Conflito | `409 CONFLITO_VERSAO` | `409 EDICAO_CONCORRENTE` (`GlobalExceptionHandler` ← `OptimisticLockingFailureException` do `TaskRepositoryPort.update`; `JpaAcervoAdapters` sobe a versão com `PESSIMISTIC_FORCE_INCREMENT`, até quando só o briefing muda); o `TaskForm` preserva o texto digitado e oferece «Recarregar versão atual» |
| Quem edita | `AccessPolicy.canEdit` = dono OU responsável de `ProjectTask` OU chefe do departamento | `ResourceAuthorizer.require(..., EDIT)` → `AccessPolicy.decide`: dono, colaborador explícito ou ADMIN (nunca em SIGILOSO, D-139); invisível → `404 NAO_ENCONTRADO` igual a inexistente; visível sem permissão → `403 ACESSO_NEGADO` |
| Encerrada / oferecida | `409 TAREFA_BLOQUEADA`, `409 OFERTA_ATIVA` | iguais: `TaskState.isReadOnly()` e `TaskState.locksVisibility()` |
| Autosave e rascunho | Redis `draft:task:{id}:{userId}` (7 d) + «Recuperar rascunho» | não existe: o `TaskForm` só avisa ao sair com alterações (`beforeunload`) e não grava nada no navegador (pode ser sigiloso) — **(planejado)** |
| Reabrir | `POST /api/tasks/{id}/reopen` com justificativa ≥ 10 | não existe — **(planejado)**; concluída fica somente leitura na tela |
| Auditoria e histórico | `AuditLog TASK_UPDATED`, `TaskStateLog` se o estado mudou | `TASK_UPDATED` com a nova `version`; a edição não muda estado (estado só por `/transitions`, que grava `task_state_log` e `TASK_STATE_CHANGED`) |
| Eventos AFTER_COMMIT | reindexar, mosaico, `snapshotJson`, notificação | não existem — **(planejado)** |

## 0. Diagrama de casos de uso

Quem edita os dados de uma tarefa ou projeto e o que consegue fazer. Borda contínua: existe no código em 17/10/2026; tracejada: planejado (projeto, rascunho, reabertura e eventos).

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  dono["«ator» Dono do recurso"]:::ator
  colaborador["«ator» Colaborador explícito"]:::ator
  admin["«ator» Administrador"]:::ator
  responsavel["«ator» Responsável atribuído"]:::ator
  chefe["«ator» Chefe de departamento"]:::ator
  subgraph SIS["Work Station — RF12 Editar esquema"]
    direction TB
    UC1(["UC1 Editar dados da tarefa"]):::uc
    UC2(["UC2 Verificar permissão e estado editável"]):::uc
    UC3(["UC3 Resolver conflito de versão"]):::uc
    UC4(["UC4 Editar dados do projeto"]):::ucPlan
    UC5(["UC5 Recuperar rascunho automático"]):::ucPlan
    UC6(["UC6 Reabrir tarefa ou projeto encerrado"]):::ucPlan
    UC7(["UC7 Propagar a alteração"]):::ucPlan
  end
  dono --- UC1
  colaborador --- UC1
  admin --- UC1
  responsavel --- UC1
  dono --- UC4
  responsavel --- UC4
  chefe --- UC4
  dono --- UC6
  UC1 -. "«include»" .-> UC2
  UC4 -. "«include»" .-> UC2
  UC3 -. "«extend»" .-> UC1
  UC5 -. "«extend»" .-> UC1
  UC5 -. "«extend»" .-> UC4
  UC1 -. "«include»" .-> UC7
  UC4 -. "«include»" .-> UC7
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Editar dados da tarefa | dono, colaborador, admin fora de SIGILOSO (real); responsavel (planejado) | RF12.CA01, RF12.CA02, RF12.CA03 | real: `/tasks/[id]/edit` (`TaskForm` modo edit) → `PUT /api/tasks/{id}` com `version` → `TaskService.update`, `TASK_UPDATED` |
| UC2 Verificar permissão e estado editável | — (incluído por UC1 e UC4) | RF12.CA01, RF12.CA05 | real para tarefa: `ResourceAuthorizer.require(EDIT)` (invisível → `404`, sem permissão → `403`), `TaskState.isReadOnly` → `409 TAREFA_BLOQUEADA`, `locksVisibility` → `409 OFERTA_ATIVA` |
| UC3 Resolver conflito de versão | dono, colaborador | RF12.CA02 | real: `409 EDICAO_CONCORRENTE` e «Recarregar versão atual» sem perder o texto |
| UC4 Editar dados do projeto | dono, responsavel, chefe | RF12.CA01, RF12.CA02, RF12.CA03 | planejado (sem API de projetos; `ProjectVersion`, último-vence com aviso) |
| UC5 Recuperar rascunho automático | dono | RF12.CA04 | planejado (o `TaskForm` só avisa ao sair com alterações) |
| UC6 Reabrir tarefa ou projeto encerrado | dono | RF12.CA05 | planejado (justificativa ≥ 10 caracteres) |
| UC7 Propagar a alteração | — (incluído por UC1 e UC4) | RF12.CA06 | planejado (reindexar, mosaico, `snapshotJson`, notificar o responsável) |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class TaskController {
    <<controller>>
    +get(CurrentUser, id) TaskView
    +update(CurrentUser, id, TaskRequest, RequestContext) TaskView
    +transition(CurrentUser, id, TransitionRequest, RequestContext) TaskView
  }
  class TaskRequest {
    +String title
    +String descriptionMd
    +TaskType type
    +Priority priority
    +LocalDate dueAt
    +UUID responsibleId
    +AccessClassification accessClass
    +Visibility visibility
    +String objective
    +WorkArea area
    +List~Criterion~ acceptanceCriteria
    +Map extensions
    +Long version
  }
  class TaskService {
    <<service>>
    +get(CurrentUser, id) TaskView
    +update(CurrentUser, id, TaskInput, version, ctx) TaskView
    -validate(Viewer, TaskInput) Validated
    -view(Viewer, StoredTask) TaskView
  }
  class ResourceAuthorizer {
    <<service>>
    +viewer(CurrentUser) Viewer
    +require(Viewer, ScopedResource, ResourceAction) void
  }
  class AuditLogPort {
    <<port>>
    +record(AuditEvent) void
  }
  class TaskEditController {
    <<controller>>
    +editForm(id, CurrentUser) TaskEditForm
    +saveDraft(id, DraftRequest, CurrentUser) void
    +reopen(id, ReasonRequest, CurrentUser, ctx) TaskView
  }
  class ProjectEditController {
    <<controller>>
    +editForm(id, CurrentUser) ProjectEditForm
    +update(id, PatchProjectRequest, ifMatch, CurrentUser, ctx) ProjectView
    +reopen(id, ReasonRequest, CurrentUser, ctx) ProjectView
  }
  class TaskEditService {
    <<service>>
    +editForm(id, viewer) TaskEditForm
    +reopen(id, reason, actor, ctx) TaskItem
  }
  class ProjectEditService {
    <<service>>
    +editForm(id, viewer) ProjectEditForm
    +update(id, PatchProjectCommand, version, actor, ctx) ProjectScheme
    +reopen(id, reason, actor, ctx) ProjectScheme
    -isStructural(diff) boolean
    -diffLegivel(before, after) JSON
  }
  class DraftService {
    <<service>>
    +saveTaskDraft(id, userId, json) void
    +loadTaskDraft(id, userId) Optional
    +saveProjectDraft(id, json) void
  }
  class DeadlineService {
    <<service>>
    +compute(category, subcategory, baseDate, companyId) DeadlineResult
  }
  class DependencyGraph {
    <<service>>
    +assertNoCycle() void
  }
  class AccessPolicy {
    <<service>>
    +visible(Viewer, ScopedResource) boolean
    +decide(Viewer, ScopedResource, ResourceAction) AccessDecision
    +canEdit(viewer, ProjectScheme) boolean
  }
  class TaskStateMachine {
    <<service>>
    +transition(TaskItem, TaskState, actor, reason) TaskStateLog
  }
  class ProjectStatusStateMachine {
    <<service>>
    +transition(ProjectScheme, ProjectStatus, actor, reason) void
  }
  class TaskRepositoryPort {
    <<port>>
    +findById(id) Optional
    +update(TaskItem, TaskBrief, expectedVersion) StoredTask
    +appendStateLog(TaskStateLog) void
  }
  class TaskBrief {
    <<entity>>
    +UUID taskId
    +String objective
    +WorkArea area
    +JSON deliverablesJson
    +JSON acceptanceCriteriaJson
    +JSON referencesJson
    +JSON extensionsJson
  }
  class ProjectRepositoryPort {
    <<port>>
    +findById(id) Optional
    +save(ProjectScheme) ProjectScheme
    +findContaining(taskId) List
  }
  class DraftStorePort {
    <<port>>
    +put(key, json, ttl) void
    +get(key) Optional
    +delete(key) void
  }
  class SearchIndexPort {
    <<port>>
    +index(target) void
  }
  class CardCachePort {
    <<port>>
    +evict(key) void
  }
  class NotificationPort {
    <<port>>
    +notify(Notification) void
  }

  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +UUID responsibleId
    +String title
    +String summary
    +String descriptionMd
    +TaskType type
    +TaskCategory category
    +String subcategory
    +Set~ProcessTag~ processTags
    +Set~NatureTag~ natureTags
    +AccessClassification accessClass
    +LocalDate dueAt
    +LocalDate legalDueAt
    +String legalOverrideReason
    +Priority priority
    +Visibility visibility
    +TaskState state
    +boolean offeredInCounter
    +String notes
    +long version
  }
  class TaskStateLog {
    <<entity>>
    +TaskState fromState
    +TaskState toState
    +UUID actorId
    +String reason
    +String correlationId
  }
  class LegalDeadlineRule {
    <<entity>>
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
    +Set~ProcessTag~ processTags
    +Set~NatureTag~ natureTags
    +Priority priority
    +int exerciseYear
    +UUID programGroupingId
    +UUID planAxisId
    +Visibility visibility
    +String aiOrientation
    +ProjectStatus status
    +boolean hasBlockingPending
    +JSON autosaveDraftJson
    +long version
  }
  class ProjectTask {
    <<entity>>
    +UUID taskId
    +ProjectPhase phase
    +UUID responsibleId
    +LocalDate dueAt
    +JSON snapshotJson
  }
  class ProjectVersion {
    <<entity>>
    +UUID projectId
    +int versionNumber
    +UUID authorId
    +JSON diffJson
    +JSON snapshotJson
    +String reason
    +UUID restoredFromVersionId
  }
  class Department {
    <<entity>>
    +UUID id
    +UUID headUserId
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
    +isReadOnly() boolean
    +locksVisibility() boolean
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
  class ProjectVersionReason {
    <<enum>>
    ESTRUTURAL
    DADOS
    REABERTURA
    RESTAURACAO
    CONCLUSAO
  }

  TaskController --> TaskService : get e update real
  TaskController ..> TaskRequest
  TaskService --> ResourceAuthorizer
  ResourceAuthorizer --> AccessPolicy : decide EDIT
  TaskService --> TaskRepositoryPort
  TaskService --> AuditLogPort : TASK_UPDATED
  TaskItem "1" --> "0..1" TaskBrief : task_briefs V36
  TaskEditController --> TaskEditService
  TaskEditController --> DraftService
  ProjectEditController --> ProjectEditService
  TaskEditService --> AccessPolicy
  TaskEditService --> DeadlineService
  TaskEditService --> TaskStateMachine
  TaskEditService --> TaskRepositoryPort
  ProjectEditService --> AccessPolicy
  ProjectEditService --> DependencyGraph
  ProjectEditService --> ProjectStatusStateMachine
  ProjectEditService --> ProjectRepositoryPort
  DraftService --> DraftStorePort
  TaskItem "1" --> "0..*" TaskStateLog
  TaskItem "0..*" --> "0..1" LegalDeadlineRule
  ProjectScheme "1" *-- "0..*" ProjectVersion
  ProjectScheme "1" *-- "2..*" ProjectTask
  ProjectTask "0..*" --> "0..1" TaskItem
  ProjectScheme "0..*" --> "0..1" Department : headUserId pode editar
  TaskItem --> TaskState
  ProjectScheme --> ProjectStatus
  ProjectVersion ..> ProjectVersionReason : reason
  note for TaskController "(real) PUT /api/tasks/{id} com version no corpo, 409 EDICAO_CONCORRENTE, 404 se invisível · @AuthorizedBy require"
  note for TaskEditController "(planejado) editForm, saveDraft e reopen · PATCH com If-Match não existe"
  note for AccessPolicy "(real) EDIT = dono, colaborador ou ADMIN fora de SIGILOSO · canEdit de projeto (planejado)"
  note for ProjectEditController "(planejado) não há API de projetos em 17/10/2026"
  note for ProjectVersion "ProjectVersionReason é proposta (TAXONOMIA só traz reason como texto): ESTRUTURAL (padrão), DADOS, REABERTURA, RESTAURACAO, CONCLUSAO."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Dono · responsável · chefe do departamento"]
    A1["No card do perfil clica Editar"]
    A2["Edita os dados da ficha (tarefa ou projeto)"]
    A3["Sai sem salvar e volta depois"]
    A4["Clica Salvar"]
    A5["Item encerrado: clica Reabrir e justifica"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["Tarefa (real): GET /api/tasks/{id} → TaskView com version e editable · Projeto (planejado): GET /api/projects/{id}/edit-form (dados + opções + canEdit + rascunho)"]
    F2["Formulário (Input, Select, Textarea, TypeChip, Due, Switch visibilidade) · somente leitura se !canEdit · tarefa real: TaskForm modo edit ou «Somente leitura» se editable = false"]
    F3["(planejado) Autosave 10 s / blur: PUT /api/tasks/{id}/draft ou PATCH autosaveDraftJson"]
    F4["(planejado) Dialog Recuperar rascunho · Descartar"]
    F5["Tarefa (real): PUT /api/tasks/{id} com TaskRequest completo e version no corpo · Projeto (planejado): PATCH /api/projects/{id} com If-Match"]
    F6["(planejado) POST /api/tasks/{id}/reopen | /api/projects/{id}/reopen {reason}"]
    F7["Toast · aviso CONFLITO_ULTIMO_VENCE (projeto) · Banner ⛔ hasBlockingPending"]
    F8["(real) TaskForm: aviso de alteração em outro lugar, o texto digitado na segunda aba é preservado, botão Recarregar versão atual (tasksApi.get)"]
  end
  subgraph WEB["ws-web"]
    W1["JWT + SessionActiveFilter + CurrentUserArgumentResolver"]
    W2["TaskController.get / update (real) · TaskEditController · ProjectEditController (planejado)"]
    E404["404 NAO_ENCONTRADO (invisível = inexistente, real)"]
    E403["403 ACESSO_NEGADO"]
    E422["422 VALIDACAO (título, tags, categoria×tipo, prazo legal, mínimo de fases, ciclo, justificativa < 10) · real: fields por campo e version ausente"]
    E409V["409 EDICAO_CONCORRENTE (tarefa, real)"]
    E409B["409 TAREFA_BLOQUEADA · 409 PROJETO_BLOQUEADO"]
    E409O["409 OFERTA_ATIVA"]
  end
  subgraph APP["ws-application"]
    S1["Tarefa (real): ResourceAuthorizer.require EDIT → AccessPolicy.decide: dono, colaborador explícito ou ADMIN fora de SIGILOSO · Projeto (planejado): ownerId OU responsibleId de ProjectTask OU Department.headUserId"]
    S2{"pode editar?"}
    S3{"CONCLUIDA/ARQUIVADA ou CONCLUIDO/ARQUIVADO?"}
    S4["validate · real (TaskService): título ≤ 200, tipo, objetivo ≤ 500, descrição, responsável da empresa, prazo, listas do briefing · planejado: ≤ 2 tags/eixo, categoria×tipo, DeadlineService (legalOverrideReason), DEMANDA + outra fase, DependencyGraph.assertNoCycle"]
    S5{"válido?"}
    S6{"MODELO_PUBLICO/OFERECIDA mudando visibility/accessClass?"}
    S7{"version igual?"}
    S8["Tarefa (real): TaskRepositoryPort.update → OptimisticLockingFailureException → 409 · Projeto (planejado): último-vence + aviso CONFLITO_ULTIMO_VENCE"]
    S9["Tarefa (real): TaskRepositoryPort.update em tasks e task_briefs, version + 1 · AuditLog TASK_UPDATED · estado só muda por /transitions (RF41)"]
    S10["(planejado) Projeto: isStructural? → ProjectVersion(ESTRUTURAL | DADOS, diffJson, snapshotJson) · AuditLog PROJECT_UPDATED"]
    R1["(planejado) reopen: justificativa ≥ 10 · TaskStateMachine ARQUIVADA→DISPONIVEL ou ProjectStatusStateMachine →RASCUNHO · reason REABERTURA · AuditLog *_REOPENED"]
    D1["(planejado) DraftService: Redis draft:task:{id}:{userId} TTL 7 d · ProjectScheme.autosaveDraftJson"]
    EV["(planejado) AFTER_COMMIT: TaskUpdated/ProjectUpdated → SearchIndexPort.index · rebuildMosaic nos projetos (RF38.CA03) · CardCachePort.evict · ProjectTask.snapshotJson em projetos de terceiros (RF23.CA03) · Notification PRAZO_PROXIMO/SISTEMA ao responsável · hasBlockingPending em projeto de outro dono"]
  end
  subgraph PERS["Persistência"]
    P1[("MySQL: tasks, task_state_log, legal_deadline_rules, project_schemes (autosave_draft_json), project_tasks, project_versions, project_task_dependencies, audit_log")]
    P2[("Redis: draft:task:{id}:{userId} · card:task|project:{id}")]
    P3[("OpenSearch ws-tasks · ws-projects")]
    P4[("Cassandra notifications_by_user")]
  end

  A1 --> F1 --> W1 --> W2 --> S1 --> S2
  S2 -->|"não"| E403
  S2 -->|"invisível"| E404
  S2 -->|"sim"| F2 --> A2 --> F3 --> D1 --> P2
  D1 --> P1
  A3 --> F1 --> F4
  A2 --> A4 --> F5 --> W2 --> S3
  S3 -->|"sim"| E409B
  S3 -->|"não"| S4 --> S5
  S5 -->|"não"| E422
  S5 -->|"sim"| S6
  S6 -->|"sim"| E409O
  S6 -->|"não"| S7
  S7 -->|"não"| S8
  S8 -->|"tarefa"| E409V
  E409V --> F8
  F8 -->|"Recarregar versão atual"| F1
  S8 -->|"projeto"| S10
  S7 -->|"sim, tarefa"| S9 --> P1
  S7 -->|"sim, projeto"| S10 --> P1
  S9 --> EV
  S10 --> EV
  S10 --> F7
  A5 --> F6 --> W2 --> R1
  R1 -->|"justificativa curta"| E422
  R1 --> P1
  R1 --> EV
  EV --> P2
  EV --> P3
  EV --> P4
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant R as Repository/MySQL
  participant RD as Redis
  participant OS as OpenSearch
  participant CS as Cassandra
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: Projeto — bloco inteiro (planejado), não há API de projetos em 17/10/2026
  U->>N: Editar no card do projeto (perfil › Projetos)
  N->>C: GET /api/projects/{id}/edit-form
  C->>S: ProjectEditService.editForm(id, viewer)
  S->>R: project_schemes + project_tasks + dependências + autosave_draft_json
  S->>S: AccessPolicy.canEdit (dono | responsável | chefe)
  alt sem permissão
    S-->>C: ProjectEditForm {canEdit=false}
    C-->>N: 200 (somente leitura)
  else pode editar
    S-->>C: ProjectEditForm {dados, opções, canEdit=true, draft}
    C-->>N: 200
    opt havia rascunho
      N-->>U: Dialog "Recuperar rascunho" ou "Descartar"
    end
  end

  loop a cada 10 s ou ao sair do campo
    N->>C: PATCH /api/projects/{id}/draft {autosaveDraftJson}
    C->>S: DraftService.saveProjectDraft
    S->>R: update project_schemes.autosave_draft_json
  end

  U->>N: altera prazo de uma tarefa da fase ELABORACAO e salva
  N->>C: PATCH /api/projects/{id} {ficha, tasks[]} If-Match: version
  C->>S: ProjectEditService.update(id, cmd, version, actor, ctx)
  alt projeto CONCLUIDO ou ARQUIVADO
    S-->>C: 409 PROJETO_BLOQUEADO
    C-->>N: 409 (botão Reabrir)
  else inválido
    S->>S: validate (DEMANDA + outra fase, ≤ 2 tags, DependencyGraph.assertNoCycle)
    S-->>C: 422 VALIDACAO details por campo
    C-->>N: 422
  else ok
    S->>S: version divergente → último-vence (aviso CONFLITO_ULTIMO_VENCE)
    S->>S: isStructural(diff) = true (prazo de ProjectTask)
    S->>R: update project_schemes, project_tasks · insert project_versions (n+1, ESTRUTURAL, diffJson, snapshotJson)
    S->>R: autosave_draft_json = null · insert audit_log PROJECT_UPDATED
    S-->>C: ProjectView {version n+1, warning?}
    C-->>N: 200 (Toast + aviso se último-vence)
    EV->>OS: index ws-projects
    EV->>RD: DEL card:project:{id}
    EV->>CS: Notification PRAZO_PROXIMO ao responsável da tarefa alterada
    EV->>R: hasBlockingPending se a tarefa é EM_USO de outro dono
  end

  Note over U,EV: Tarefa — contrato REAL em 17/10/2026 (PUT com version no corpo), jornada «Edição concorrente (duas abas)»
  U->>N: abre /tasks/{id}/edit em duas abas (TaskForm modo edit)
  N->>C: GET /api/tasks/{id}
  C->>S: TaskService.get(user, id)
  S->>S: ResourceAuthorizer.require(viewer, tarefa, VIEW)
  S-->>C: TaskView (version n, editable)
  C-->>N: 200 TaskView (editable falso → Somente leitura)
  U->>N: na aba 1 altera critérios e salva
  N->>C: PUT /api/tasks/{id} TaskRequest com version n
  C->>S: TaskService.update(user, id, TaskInput, n, ctx)
  S->>R: TaskRepositoryPort.update(tarefa, briefing, n) em tasks e task_briefs
  S->>R: AuditLogPort.record TASK_UPDATED (version n+1)
  S-->>C: TaskView (version n+1)
  C-->>N: 200 e volta para /tasks/{id}
  U->>N: na aba 2 altera o texto e salva com a versão antiga
  N->>C: PUT /api/tasks/{id} TaskRequest com version n
  C->>S: TaskService.update(user, id, TaskInput, n, ctx)
  S->>S: ResourceAuthorizer.require(viewer, tarefa, EDIT)
  alt invisível para quem pede
    S-->>C: 404 NAO_ENCONTRADO (mesma resposta de id inexistente)
    C-->>N: 404
  else visível sem permissão de edição
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else CONCLUIDA ou ARQUIVADA (TaskState.isReadOnly)
    S-->>C: 409 TAREFA_BLOQUEADA
    C-->>N: 409
  else inválido
    S-->>C: 422 VALIDACAO details.fields
    C-->>N: 422 com erro junto do campo
  else MODELO_PUBLICO ou OFERECIDA mudando visibility ou accessClass
    S-->>C: 409 OFERTA_ATIVA
    C-->>N: 409 (retirar oferta antes, RF40)
  else versão n já superada pela aba 1
    S->>R: TaskRepositoryPort.update(tarefa, briefing, n)
    R-->>S: OptimisticLockingFailureException
    S-->>C: 409 EDICAO_CONCORRENTE (GlobalExceptionHandler)
    C-->>N: 409
    N-->>U: aviso de alteração em outro lugar, o texto da segunda aba é preservado, botão Recarregar versão atual
    U->>N: Recarregar versão atual
    N->>C: GET /api/tasks/{id}
    C-->>N: 200 TaskView (version n+1) substitui o formulário
  else ok
    S->>S: DeadlineService.compute → legalDueAt (planejado)
    S->>R: TaskRepositoryPort.update (version n+1) e AuditLogPort.record TASK_UPDATED
    S-->>C: TaskView
    C-->>N: 200
    EV->>OS: index ws-tasks (planejado)
    EV->>R: rebuildMosaic nos projetos que contêm a tarefa e ProjectTask.snapshotJson em projetos de terceiros (planejado)
    EV->>RD: DEL card:task:{id} (planejado, sem rascunho no servidor)
  end

  Note over U,EV: Reabrir — (planejado) para projeto e tarefa
  U->>N: Reabrir projeto ARQUIVADO com justificativa
  N->>C: POST /api/projects/{id}/reopen {reason}
  C->>S: ProjectEditService.reopen
  alt justificativa com menos de 10 caracteres
    S-->>C: 422 VALIDACAO details.reason
    C-->>N: 422
  else ok
    S->>R: ProjectStatusStateMachine ARQUIVADO → RASCUNHO · project_versions (REABERTURA) · audit_log PROJECT_REOPENED
    S-->>C: ProjectView
    C-->>N: 200
  end
```

## 4. Máquina de estados

Entidade central: **`ProjectScheme.status`** (`ProjectStatus`) no recorte da edição — quais estados aceitam `PATCH` e como se reabre; a máquina completa está no RF5 §4. Para a tarefa vale `TaskState` (RF4/RF6 §4): a edição de dados é permitida em RASCUNHO, DISPONIVEL, EM_USO e BLOQUEADA; `CONCLUIDA`/`ARQUIVADA` exigem Reabrir; `MODELO_PUBLICO`/`OFERECIDA` não mudam visibilidade/classificação (`409 OFERTA_ATIVA`). **Real (17/10/2026):** essas duas regras da tarefa já valem (`TaskState.isReadOnly()` → `409 TAREFA_BLOQUEADA`; `TaskState.locksVisibility()` → `409 OFERTA_ATIVA`) e a tela mostra «Somente leitura» para tarefa concluída ou arquivada; **Reabrir** com justificativa segue **(planejado)** — a tabela do `TaskState` já permite CONCLUIDA → EM_USO/DISPONIVEL e ARQUIVADA → DISPONIVEL por `POST /api/tasks/{id}/transitions` (RF41), sem justificativa obrigatória, e a tela não oferece o botão. A máquina de `ProjectStatus` abaixo é toda **(planejado)**.

```mermaid
stateDiagram-v2
  direction LR
  state "EDITAVEL (RASCUNHO · PUBLICADO · EM_DECISAO · APROVADO · EM_EXECUCAO · DEVOLVIDO)" as EDT
  state "CONCLUIDO" as CON
  state "ARQUIVADO" as ARQ

  [*] --> EDT : criado no RF5 (RASCUNHO)
  EDT --> EDT : PATCH /api/projects/{id} válido · ProjectVersion(ESTRUTURAL | DADOS) · ProjectUpdated · autosave limpo
  EDT --> EDT : version divergente → último-vence com aviso CONFLITO_ULTIMO_VENCE (RF22.CA04)
  EDT --> CON : última ProjectTask concluída (RF8.CA05) · ProjectVersion(CONCLUSAO)
  CON --> ARQ : arquivar
  EDT --> ARQ : arquivar
  CON --> EDT : POST /api/projects/{id}/reopen [reason ≥ 10] · ProjectVersion(REABERTURA) · PROJECT_REOPENED
  ARQ --> EDT : POST /api/projects/{id}/reopen [reason ≥ 10]
  note right of CON
    PATCH → 409 PROJETO_BLOQUEADO.
    Reabrir sem justificativa → 422 VALIDACAO.
  end note
  note right of EDT
    Rascunho de autosave em autosaveDraftJson
    (tarefa: Redis draft:task:{id}:{userId}, 7 d)
    nunca publica sem Salvar (CA04).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(shell)/tasks/[id]/edit (real: TaskForm modo edit) · app/(shell)/projects/[id]/edit (planejado · aba Ficha; Quadro/Linha do tempo/Mesa = RF22)"]
    TFE["(real) components/tasks/TaskForm.tsx (409 preserva o texto + Recarregar versão atual) · lib/tasks/client.ts tasksApi.get/update · requestFromView"]
    UI["packages/ui: Input, Select, Textarea, Switch, TypeChip, Due (⚖), Tag, PhaseBar, Dialog (rascunho, reabrir), Toast, Banner (⛔ hasBlockingPending)"]
    BFF["app/bff/tasks/* · app/bff/projects/*"]
    PG --> UI
    PG --> BFF
    PG --> TFE
    TFE --> BFF
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig · SessionActiveFilter · CurrentUserArgumentResolver"]
    EC["TaskController GET/PUT /api/tasks/{id} (real) · TaskEditController · ProjectEditController (planejado)"]
    GEH["GlobalExceptionHandler (403, 404, 409 EDICAO_CONCORRENTE, 422)"]
  end
  subgraph WSAPP["ws-application"]
    ACV["acervo: TaskService (real) · TaskEditService · DeadlineService · TaskStateMachine (planejado)"]
    PRJ["(planejado) projects: ProjectEditService · DependencyGraph · ProjectStatusStateMachine · DraftService"]
    SECU["security: ResourceAuthorizer.require + AccessPolicy.decide (real) · Guard (real) · canEdit de projeto (planejado)"]
    PORTS["ports: TaskRepositoryPort · AuditLogPort (real) · ProjectRepositoryPort · DraftStorePort · SearchIndexPort · CardCachePort · NotificationPort · AuditLogPort"]
    EVT["(planejado) events: TaskUpdated · ProjectUpdated · TaskReopened · ProjectReopened (AFTER_COMMIT)"]
    ACV --> SECU
    PRJ --> SECU
    ACV --> PORTS
    PRJ --> PORTS
    ACV --> EVT
    PRJ --> EVT
  end
  subgraph WSDOM["ws-domain"]
    DOM["acervo: TaskItem · TaskBrief (real, V36) · TaskStateLog · LegalDeadlineRule · projects: ProjectScheme · ProjectTask · ProjectVersion · ProjectTaskDependency · identity: Department · enums TaskState/ProjectStatus/Visibility/AccessClassification"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: JpaAcervoAdapters (real, version com PESSIMISTIC_FORCE_INCREMENT) · Jpa*Repository de projeto (planejado)"]
    RDS["cache-redis (RedisAdaptersConfig): draft:task:{id}:{userId} TTL 7 d · card cache"]
    OSE["search-opensearch: ws-tasks · ws-projects"]
    CAS["persistence-cassandra: notifications_by_user"]
    S3["storage-s3: mosaicos recalculados"]
  end

  BFF -->|"REST JSON"| SEC --> EC --> ACV
  EC --> PRJ
  EC --> GEH
  MY -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  OSE -.implementa.-> PORTS
  CAS -.implementa.-> PORTS
  S3 -.implementa.-> PORTS
  ACV --> DOM
  PRJ --> DOM
  MY --> DB[("MySQL 8.4")]
  RDS --> RD[("Redis 7")]
  OSE --> OSX[("OpenSearch 2.19")]
  CAS --> CDB[("Cassandra 4.1")]
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF12.CA01 | `TaskEditController.editForm`, `ProjectEditController.editForm`, `TaskEditService.editForm`, `ProjectEditService.editForm`, `AccessPolicy.canEdit`, `Department.headUserId`; real: `TaskController.get`, `TaskService.get`, `TaskView.editable`, `ResourceAuthorizer.require`, `AccessPolicy.decide` | `A1`→`F1`→`S1`→`S2`→`F2`, `E403`, `E404` | 1–10 (projeto); real: 32–37 | — | `PG`, `UI`, `SECU`, `TFE` | **real** para tarefa (`TaskServiceTest.colegaDaEmpresaVeMasNaoEdita`, `sigilosoNaoEhVistoPorColegaNemAdminSemVinculo`; `tasks.test.tsx` «404 diz que não existe ou não há acesso»; `97611a0`, `013657a`); projeto e chefe do departamento planejados |
| RF12.CA02 | `ProjectEditService.update`, `DeadlineService`, `LegalDeadlineRule`, `DependencyGraph.assertNoCycle`; real: `TaskController.update` (`TaskRequest.version`), `TaskService.update/validate`, `TaskRepositoryPort.update`, `GlobalExceptionHandler` | `S4`→`S5`→`E422`, `S7`→`S8`→`E409V`→`F8` | 14–22 (projeto); real: 39–41, 45–48, 55–56, 59–66 | `EDT`→`EDT` (último-vence) | `ACV`, `PRJ`, `GEH`, `MY`, `TFE` | **real** para tarefa com o contrato `PUT` + `version` e `409 EDICAO_CONCORRENTE` (`TaskServiceTest.editarPreservaConteudoEExigeVersaoAtual`, `TaskControllerWebTest.edicaoExigeVersaoEPropagaConflitoEAusencia`, `TaskPersistenceIT.salvaReabreEditaOBriefingESobeAVersao`, `tasks.test.tsx` «422 do servidor aparece junto do campo; 409 mantém o texto e oferece recarregar»; jornada «Edição concorrente (duas abas)», captura 04; `97611a0`, `013657a`); categoria×tipo, tags, prazo legal e projeto planejados |
| RF12.CA03 | `ProjectVersion` (`ProjectVersionReason`), `ProjectEditService.isStructural/diffLegivel`, `TaskStateLog`, `AuditLogPort` | `S9`, `S10` | 23–25 (projeto); real: 42, 68 | `EDT`→`EDT` | `PRJ`, `MY` | **real** para tarefa: `AuditLog TASK_UPDATED` com a nova `version` (`97611a0`); `task_state_log` só nas transições (RF41); `ProjectVersion` planejado |
| RF12.CA04 | `DraftService`, `DraftStorePort`, `ProjectScheme.autosaveDraftJson` | `A2`→`F3`→`D1`, `A3`→`F4` | 10–13, 25 | nota de `EDT` | `RDS`, `UI` (`Dialog`) | planejado (o real só avisa ao sair com alterações não salvas, `beforeunload` no `TaskForm`, e não grava rascunho) |
| RF12.CA05 | `TaskEditService.reopen`, `ProjectEditService.reopen`, `TaskStateMachine`, `ProjectStatusStateMachine`, `TaskItem.offeredInCounter`; real: `TaskState.isReadOnly/locksVisibility` | `S3`→`E409B`, `S6`→`E409O`, `A5`→`F6`→`R1`, `E422` | 17–18, 74–79 (planejado); real: 53–54, 57–58 | `CON`→`EDT`, `ARQ`→`EDT`, nota de `CON` | `ACV`, `PRJ` | **real** para `409 TAREFA_BLOQUEADA` (`TaskServiceTest.transicoesSeguemATabelaEBloqueioExigeCausa`; tela «Somente leitura», captura 06) e `409 OFERTA_ATIVA` (`TaskService.update`, sem teste dedicado); Reabrir com justificativa planejado (RF40/RF41) |
| RF12.CA06 | eventos `TaskUpdated`/`ProjectUpdated`, `SearchIndexPort`, `CardCachePort`, `ProjectTask.snapshotJson`, `NotificationPort`, `ProjectScheme.hasBlockingPending` | `EV` | 28–31, 71–73 | — | `EVT`, `OSE`, `RDS`, `CAS`, `S3` | planejado (RF23.CA03, RF38.CA03) |
